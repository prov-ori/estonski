// Панель текста: абзацы, источник, подсветка доказательств, словарик из карточек сайта.
import { h } from './util.js';
import { speakButton } from './widgets.js';

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const WORD = /[\p{L}]+/gu;

const stems = (str) => new Set((str.toLowerCase().match(/[\p{L}]{4,}/gu) || []).map((w) => w.slice(0, 5)));

/**
 * Фраза-доказательство для вопроса: q.evidence → цитата «…» из объяснения, найденная в тексте →
 * иначе предложение текста, максимально совпадающее по словам с вопросом и верным ответом (приблизительно).
 */
export function evidenceFor(q, text) {
  if (q.type === 'tf3' && q.answer === 'ns') return null; // «в тексте не сказано» — подсвечивать нечего
  const t = norm(text);
  if (/^\(\d+\) ___$/.test(q.prompt_et || '') && text.includes(q.prompt_et)) return q.prompt_et; // пропуск в тексте
  const cands = [];
  if (q.evidence) cands.push(...[].concat(q.evidence));
  else for (const m of (q.explanation_ru || '').matchAll(/«([^»]+)»/g)) cands.push(m[1]);
  for (let c of cands) {
    c = c.replace(/[….]+$/, '').replace(/^[.…\s]+/, '').trim();
    if (c.length >= 4 && t.includes(norm(c))) return c;
  }
  if (q.type === 'input' || q.type === 'match' || q.evidence) return null;
  // запасной вариант: самое похожее предложение
  const key = stems(q.prompt_et + ' ' + (q.type === 'choice' && q.options ? q.options[q.answer] : ''));
  let best = null, bestScore = 1;
  for (const line of text.split(/\n+/)) for (const sent of (line.match(/[^.!?]+[.!?]*\s*/g) || [line])) {
    const ss = stems(sent);
    let score = 0;
    key.forEach((w) => { if (ss.has(w)) score++; });
    if (score > bestScore) { bestScore = score; best = sent.trim(); }
  }
  return best;
}

function paragraphNodes(text, phrase) {
  const paras = text.split(/\n\s*\n/);
  return paras.map((p) => {
    const lines = p.split('\n');
    const nodes = [];
    lines.forEach((line, i) => {
      const idx = phrase ? line.toLowerCase().indexOf(phrase.toLowerCase()) : -1;
      if (idx >= 0) {
        nodes.push(line.slice(0, idx), h('mark', { class: 'evidence' }, line.slice(idx, idx + phrase.length)), line.slice(idx + phrase.length));
      } else nodes.push(line);
      if (i < lines.length - 1) nodes.push(h('br'));
    });
    return h('p', { lang: 'et' }, nodes);
  });
}

/** Слова текста, которые есть в карточках сайта (по основной форме и формам склонения). */
export function glossaryFor(text, vocab) {
  const map = new Map();
  for (const c of vocab) {
    const words = new Set([c.et, ...String(c.forms || '').split(/[,\s]+/)].map((w) => w.toLowerCase()).filter((w) => w.length > 2 && !w.includes(' ')));
    for (const w of words) if (!map.has(w)) map.set(w, c);
  }
  const found = [];
  const seen = new Set();
  for (const m of text.matchAll(WORD)) {
    const c = map.get(m[0].toLowerCase());
    if (c && !seen.has(c.id)) { seen.add(c.id); found.push(c); }
  }
  return found;
}

/**
 * item: {title_et, text_et, source?}. Возвращает элемент с методами highlight(phrase), clear().
 */
export function textPane(item, vocab = [], { exam = false } = {}) {
  const body = h('div', { class: 'text-body' });
  const draw = (phrase) => {
    const paras = paragraphNodes(item.text_et, phrase);
    body.replaceChildren(...(exam ? paras : paras.map((p, i) => h('div', { class: 'para' }, p, speakButton(item.text_et.split(/\n\s*\n/)[i], 'Прослушать абзац')))));
  };
  draw(null);
  const gl = vocab.length ? glossaryFor(item.text_et, vocab) : [];
  const el = h('article', { class: 'text card', 'aria-label': item.title_et },
    h('h2', { lang: 'et' }, item.title_et), body,
    item.source && sourceLine(item.source),
    gl.length > 0 && h('details', { class: 'glossary' },
      h('summary', null, `Слова из текста (${gl.length})`),
      h('ul', null, gl.map((c) => h('li', null, h('strong', { lang: 'et' }, c.et), ` — ${c.ru}`)))));
  el.highlight = (phrase) => {
    draw(phrase);
    const mark = body.querySelector('mark');
    if (mark) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  el.clearHighlight = () => draw(null);
  return el;
}

export function sourceLine(src) {
  return h('p', { class: 'source muted small-text' },
    'Источник: ', src.url ? h('a', { href: src.url, rel: 'noopener noreferrer' }, src.title) : src.title,
    src.author ? `, ${src.author}` : '', src.license ? `. Лицензия: ${src.license}` : '', src.adapted ? '. Текст адаптирован.' : '');
}
