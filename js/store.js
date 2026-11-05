// Прогресс в localStorage. Все чтения/записи — в try/catch; при недоступном хранилище работаем из памяти.
const KEY = 'estonski.v1';

const empty = () => ({ v: 1, answers: {}, cards: {}, diag: null, mock: [], writing: {}, speaking: {}, activity: {} });

function sanitize(d) {
  const e = empty();
  if (!d || typeof d !== 'object' || d.v !== 1) return e;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (isObj(d.answers)) e.answers = d.answers;
  if (isObj(d.cards)) e.cards = d.cards;
  if (isObj(d.writing)) e.writing = d.writing;
  if (isObj(d.speaking)) e.speaking = d.speaking;
  if (isObj(d.activity)) e.activity = d.activity;
  if (isObj(d.diag)) e.diag = d.diag;
  if (Array.isArray(d.mock)) e.mock = d.mock;
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
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export const store = {
  get persistent() { return persistent; },
  get state() { return state; },

  recordAnswer({ id, module, topic, ok }) {
    const prev = state.answers[id] || { r: 0, w: 0 };
    state.answers[id] = { m: module, t: topic, ok: !!ok, r: prev.r + (ok ? 1 : 0), w: prev.w + (ok ? 0 : 1), ts: Date.now() };
    bump(1);
    save();
  },
  recordMany(list) {
    for (const a of list) {
      const prev = state.answers[a.id] || { r: 0, w: 0 };
      state.answers[a.id] = { m: a.module, t: a.topic, ok: !!a.ok, r: prev.r + (a.ok ? 1 : 0), w: prev.w + (a.ok ? 0 : 1), ts: Date.now() };
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
      if (!d || d.v !== 1 || typeof d.answers !== 'object') return { ok: false, error: 'Это не файл прогресса этого тренажёра.' };
      state = sanitize(d);
      save();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Файл не читается (повреждённый JSON).' };
    }
  },
  getAnswer: (id) => state.answers[id] || null,
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
