// Прогресс в localStorage. Все чтения/записи — в try/catch; при недоступном хранилище работаем из памяти.
const KEY = 'estonski.v1';

const empty = () => ({ v: 1, answers: {}, cards: {}, diag: null, mock: [], writing: {}, speaking: {}, activity: {} });

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKey = (key) => typeof key === 'string' && key.length > 0 && !(key in Object.prototype);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const records = {
  answers: (a) => isObject(a) && safeKey(a.m) && safeKey(a.t) && count(a.r) && count(a.w) && typeof a.ok === 'boolean' && Number.isFinite(a.ts),
  cards: (c) => isObject(c) && count(c.box) && Number.isFinite(c.due),
  writing: (w) => isObject(w) && (w.text === undefined || typeof w.text === 'string') && (w.checks === undefined || isObject(w.checks)),
  speaking: (s) => isObject(s) && (s.checks === undefined || isObject(s.checks)),
  activity: count,
};
const validMock = (m) => isObject(m) && [m.ts, m.pct, m.got, m.max].every(Number.isFinite);
const validDiag = (d) => isObject(d) && Number.isFinite(d.ts) && typeof d.zoneLabel === 'string' && count(d.got) && count(d.max);

function sanitize(d) {
  const e = empty();
  if (!d || typeof d !== 'object' || d.v !== 1) return e;
  for (const [key, valid] of Object.entries(records)) {
    if (isObject(d[key])) e[key] = Object.fromEntries(Object.entries(d[key]).filter(([id, value]) => safeKey(id) && valid(value)));
  }
  if (validDiag(d.diag)) e.diag = d.diag;
  if (Array.isArray(d.mock)) e.mock = d.mock.filter(validMock);
  return e;
}

let state;
let persistent = true;

function bump(n) {
  const k = dayKey();
  state.activity[k] = (state.activity[k] || 0) + n;
  // храним только последние ~120 дней
  const keys = Object.keys(state.activity).sort();
  while (keys.length > 120) delete state.activity[keys.shift()];
}

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : empty();
  } catch {
    persistent = false; // хранилище недоступно или данные повреждены
    return empty();
  }
}
state = load();

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    persistent = false;
  }
}

export const DAILY_GOAL = 10;
const DAY_MS = 86400000;
const Q_INTERVAL_DAYS = [1, 3, 7, 14, 30]; // интервалы повторения вопросов по коробкам 1..5

/** Обновляет коробку и срок повторения вопроса: верно → выше коробка, неверно → снова сегодня. */
function srs(prev, ok, now) {
  const box = ok ? Math.min(5, ((prev && prev.b) || 0) + 1) : 0;
  return { b: box, d: ok ? now + Q_INTERVAL_DAYS[box - 1] * DAY_MS : now };
}
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export const store = {
  get persistent() { return persistent; },
  get state() { return state; },

  recordAnswer({ id, module, topic, ok }) {
    const prev = state.answers[id] || { r: 0, w: 0 };
    state.answers[id] = { m: module, t: topic, ok: !!ok, r: prev.r + (ok ? 1 : 0), w: prev.w + (ok ? 0 : 1), ts: Date.now(), ...srs(prev, ok, Date.now()) };
    bump(1);
    save();
  },
  recordMany(list) {
    for (const a of list) {
      const prev = state.answers[a.id] || { r: 0, w: 0 };
      state.answers[a.id] = { m: a.module, t: a.topic, ok: !!a.ok, r: prev.r + (a.ok ? 1 : 0), w: prev.w + (a.ok ? 0 : 1), ts: Date.now(), ...srs(prev, a.ok, Date.now()) };
    }
    bump(list.length);
    save();
  },
  /** Учёт активности без ответа на вопрос (например, повторение карточки). */
  touch(n = 1) { bump(n); save(); },
  todayCount: () => state.activity[dayKey()] || 0,
  /** Серия: подряд идущие дни с активностью (сегодняшний день не обязателен, если вчера была активность). */
  streak() {
    let n = 0;
    const d = new Date();
    if (!state.activity[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (state.activity[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  lastDays(count = 7) {
    const out = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const x = new Date(d); x.setDate(d.getDate() - i);
      out.push({ key: dayKey(x), n: state.activity[dayKey(x)] || 0, date: x });
    }
    return out;
  },
  exportJSON: () => JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 1),
  /** Возвращает {ok, error}. Заменяет весь прогресс только если файл корректен. */
  importJSON(text) {
    try {
      const d = JSON.parse(text);
      if (!isObject(d) || d.v !== 1 || !isObject(d.answers)) return { ok: false, error: 'Это не файл прогресса этого тренажёра.' };
      const invalidRecord = Object.entries(records).some(([key, valid]) => d[key] !== undefined &&
        (!isObject(d[key]) || !Object.entries(d[key]).every(([id, value]) => safeKey(id) && valid(value))));
      if (invalidRecord || (d.mock !== undefined && (!Array.isArray(d.mock) || !d.mock.every(validMock))) ||
          (d.diag != null && !validDiag(d.diag))) {
        return { ok: false, error: 'В файле повреждены записи прогресса. Текущие данные сохранены.' };
      }
      state = sanitize(d);
      save();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Файл не читается (повреждённый JSON).' };
    }
  },
  getAnswer: (id) => state.answers[id] || null,
  /** Нужно ли повторить вопрос сейчас (старые записи без срока: верные — через 3 дня после ответа). */
  isDue(id, now = Date.now()) {
    const a = state.answers[id];
    if (!a) return false;
    const d = a.d !== undefined ? a.d : (a.ok ? a.ts + 3 * DAY_MS : 0);
    return d <= now;
  },
  /** Сводка по набору вопросов: сколько отвечено и сколько верно в последний раз. */
  summary(ids) {
    let answered = 0, ok = 0;
    for (const id of ids) { const a = state.answers[id]; if (a) { answered++; if (a.ok) ok++; } }
    return { answered, ok, total: ids.length };
  },

  getCard: (id) => state.cards[id] || null,
  setCard(id, rec) { state.cards[id] = rec; save(); },

  getDiag: () => state.diag,
  setDiag(d) { state.diag = d; save(); },

  getMock: () => state.mock,
  addMock(r) { state.mock = [...state.mock, r].slice(-20); save(); },

  getWriting: (id) => state.writing[id] || { text: '', checks: {} },
  setWriting(id, patch) { state.writing[id] = { ...store.getWriting(id), ...patch, ts: Date.now() }; save(); },
  getSpeaking: (id) => state.speaking[id] || { checks: {} },
  setSpeaking(id, patch) { state.speaking[id] = { ...store.getSpeaking(id), ...patch, ts: Date.now() }; save(); },

  reset() {
    state = empty();
    try { window.localStorage.removeItem(KEY); } catch { persistent = false; }
  },
};
