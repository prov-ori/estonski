// Общие утилиты. Без зависимостей.

/** Мини-hyperscript: h('div', {class:'x', onclick}, 'text', child…). Текст всегда как textNode (без innerHTML). */
export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

/** Как el.replaceChildren, но раскрывает массивы и пропускает null/false (нативный метод превращает их в текст). */
export function setChildren(el, ...kids) {
  const flat = kids.flat(Infinity).filter((k) => k != null && k !== false);
  el.replaceChildren(...flat.map((k) => (k.nodeType ? k : document.createTextNode(String(k)))));
}

/** Как el.append, но пропускает null/undefined/false и раскрывает массивы. */
export function addChildren(el, ...kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

export function shuffle(arr) {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Нормализация ответа: NFC (раскладки могут давать составные символы), регистр, пробелы, финальная пунктуация. */
export const norm = (s) =>
  String(s ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '');
export const stripMarks = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
export const hasCyrillic = (s) => /[Ѐ-ӿ]/.test(s);

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function countWords(s) {
  return String(s || '').trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ---- загрузка JSON ----
const cache = new Map();
const INHERIT = ['topic', 'level', 'status'];

/** Вложенные элементы с id наследуют topic/level/status от ближайшего предка. */
export function inherit(node, ctx = {}) {
  if (Array.isArray(node)) { node.forEach((n) => inherit(n, ctx)); return; }
  if (!node || typeof node !== 'object') return;
  const c = { ...ctx };
  for (const k of INHERIT) if (node[k]) c[k] = node[k];
  if (node.id) for (const k of INHERIT) if (!node[k] && c[k]) node[k] = c[k];
  for (const v of Object.values(node)) if (v && typeof v === 'object') inherit(v, c);
}

export function loadJSON(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
          return r.json();
        })
        .then((j) => { inherit(j); return j; })
        .catch((e) => { cache.delete(path); throw e; })
    );
  }
  return cache.get(path);
}
export const content = (name) => loadJSON(`content/${name}.json`);
export const config = (name) => loadJSON(`config/${name}.json`);

export async function topicMap() {
  const t = await config('topics');
  const m = new Map();
  for (const g of ['grammar', 'themes', 'skills']) for (const x of t[g]) m.set(x.id, { ...x, group: g });
  return m;
}

// ---- таймер (на Date.now, не копит дрейф) ----
export function createTimer({ seconds, onTick, onEnd }) {
  let end = 0, left = seconds, id = null;
  const tick = () => {
    left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    onTick && onTick(left);
    if (left <= 0) { stop(); onEnd && onEnd(); }
  };
  function start() { if (id) return; end = Date.now() + left * 1000; id = setInterval(tick, 250); tick(); }
  function stop() { if (id) { clearInterval(id); id = null; } }
  function reset(s = seconds) { stop(); left = s; onTick && onTick(left); }
  return { start, stop, reset, get left() { return left; }, get running() { return !!id; } };
}
