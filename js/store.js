// Прогресс в localStorage. Все чтения/записи — в try/catch; при недоступном хранилище работаем из памяти.
const KEY = 'estonski.v1';

const empty = () => ({ v: 1, answers: {}, cards: {}, diag: null, mock: [], writing: {}, speaking: {} });

function sanitize(d) {
  const e = empty();
  if (!d || typeof d !== 'object' || d.v !== 1) return e;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (isObj(d.answers)) e.answers = d.answers;
  if (isObj(d.cards)) e.cards = d.cards;
  if (isObj(d.writing)) e.writing = d.writing;
  if (isObj(d.speaking)) e.speaking = d.speaking;
  if (isObj(d.diag)) e.diag = d.diag;
  if (Array.isArray(d.mock)) e.mock = d.mock;
  return e;
}

let state;
let persistent = true;

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

export const store = {
  get persistent() { return persistent; },
  get state() { return state; },

  recordAnswer({ id, module, topic, ok }) {
    const prev = state.answers[id] || { r: 0, w: 0 };
    state.answers[id] = { m: module, t: topic, ok: !!ok, r: prev.r + (ok ? 1 : 0), w: prev.w + (ok ? 0 : 1), ts: Date.now() };
    save();
  },
  recordMany(list) {
    for (const a of list) {
      const prev = state.answers[a.id] || { r: 0, w: 0 };
      state.answers[a.id] = { m: a.module, t: a.topic, ok: !!a.ok, r: prev.r + (a.ok ? 1 : 0), w: prev.w + (a.ok ? 0 : 1), ts: Date.now() };
    }
    save();
  },
  getAnswer: (id) => state.answers[id] || null,

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
