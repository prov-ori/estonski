// Генераторы заданий: числительные, время, даты, формы слов, лексический тест.
// Эстонские числительные собираются по правилам, поэтому ответ всегда один и проверяем.
import { shuffle } from './util.js';

const UNITS = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa'];
const TEENS = ['kümme', 'üksteist', 'kaksteist', 'kolmteist', 'neliteist', 'viisteist', 'kuusteist', 'seitseteist', 'kaheksateist', 'üheksateist'];
const TENS = ['', '', 'kakskümmend', 'kolmkümmend', 'nelikümmend', 'viiskümmend', 'kuuskümmend', 'seitsekümmend', 'kaheksakümmend', 'üheksakümmend'];
const ORD = ['', 'esimene', 'teine', 'kolmas', 'neljas', 'viies', 'kuues', 'seitsmes', 'kaheksas', 'üheksas', 'kümnes', 'üheteistkümnes', 'kaheteistkümnes'];
const MONTHS = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august', 'september', 'oktoober', 'november', 'detsember'];
const HOURS = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa', 'kümme', 'üksteist', 'kaksteist'];

export function numberWord(n) {
  if (n === 0) return 'null';
  if (n === 100) return 'sada';
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return u ? `${TENS[t]} ${UNITS[u]}` : TENS[t];
}
export const ordinalWord = (n) => ORD[n];
export const monthName = (i) => MONTHS[i];

/** Время по-эстонски: 7.15 → kell veerand kaheksa. */
export function timeWords(h, m) {
  const next = (h % 12) + 1;
  if (m === 0) return `kell ${HOURS[h]}`;
  if (m === 15) return `kell veerand ${HOURS[next]}`;
  if (m === 30) return `kell pool ${HOURS[next]}`;
  return `kell kolmveerand ${HOURS[next]}`; // 45
}
const fmt = (h, m) => `${h}.${String(m).padStart(2, '0')}`;
const pick = (arr, n) => shuffle(arr).slice(0, n);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const base = (id, topic, o) => ({ id, topic, level: 'B1', status: 'draft', ...o });

/** Один вопрос по числительным. */
export function numberQuestion(kind) {
  if (kind === 'numbers') {
    const n = rnd(0, 100);
    if (Math.random() < 0.5) {
      return base(`gen:n:${n}:w`, 'numerals', { type: 'input', prompt_et: `Kirjuta sõnadega: ${n}`, answer: numberWord(n), explanation_ru: `${n} = ${numberWord(n)}. Десятки пишутся слитно (kakskümmend), единицы добавляются через пробел.` });
    }
    const opts = new Set([n]);
    const cands = [n + 10, n - 10, n + 1, n - 1, Number(String(n).split('').reverse().join('')), n + 20, n - 20];
    for (const c of shuffle(cands)) if (c >= 0 && c <= 100) opts.add(c);
    const options = [...opts].slice(0, 4).map(String);
    if (!options.includes(String(n))) options[0] = String(n);
    return base(`gen:n:${n}:d`, 'numerals', { type: 'choice', prompt_et: numberWord(n), prompt_ru: 'Какое это число?', options, options_lang: 'ru', answer: options.indexOf(String(n)), explanation_ru: `${numberWord(n)} = ${n}.` });
  }
  if (kind === 'time') {
    const h = rnd(1, 12), m = [0, 15, 30, 45][rnd(0, 3)];
    const ans = timeWords(h, m);
    if (Math.random() < 0.5) {
      return base(`gen:t:${h}.${m}:w`, 'numerals', { type: 'input', prompt_et: `Kirjuta sõnadega: kell ${fmt(h, m)}`, answer: ans, explanation_ru: `${fmt(h, m)} = ${ans}. Правило: :15 — veerand, :30 — pool, :45 — kolmveerand, и называется СЛЕДУЮЩИЙ час.` });
    }
    const all = []; for (let hh = 1; hh <= 12; hh++) for (const mm of [0, 15, 30, 45]) all.push([hh, mm]);
    const others = pick(all.filter(([a, b]) => timeWords(a, b) !== ans), 3);
    const options = shuffle([[h, m], ...others]).map(([a, b]) => fmt(a, b));
    return base(`gen:t:${h}.${m}:d`, 'numerals', { type: 'choice', prompt_et: ans, prompt_ru: 'Сколько времени? (формат часы.минуты)', options, options_lang: 'ru', answer: options.indexOf(fmt(h, m)), explanation_ru: `${ans} = ${fmt(h, m)}. Называется следующий час: pool kaheksa = 7.30.` });
  }
  // дата: порядковое числительное + месяц
  const d = rnd(1, 12), mo = rnd(0, 11);
  const ans = `${ORD[d]} ${MONTHS[mo]}`;
  return base(`gen:d:${d}.${mo + 1}`, 'numerals', { type: 'input', prompt_et: `Kirjuta sõnadega: ${d}. ${MONTHS[mo]}`, answer: ans, explanation_ru: `Дата — порядковое числительное: ${ORD[d]} ${MONTHS[mo]}. (Порядковые: esimene, teine, kolmas, neljas, viies, kuues, seitsmes, kaheksas, üheksas, kümnes.)` });
}

// ---- формы слов ----
export const CASE_INFO = {
  gen: ['omastav', 'родительный (чей?)'],
  part: ['osastav', 'партитив (кого? что?)'],
  ill: ['sisseütlev', 'куда? во что?'],
  ine: ['seesütlev', 'где? в чём?'],
  ela: ['seestütlev', 'откуда? из чего?'],
  all: ['alaleütlev', 'на что? кому?'],
  ade: ['alalütlev', 'где? на чём?'],
  abl: ['alaltütlev', 'откуда? от кого?'],
  pln: ['nimetav mitmus', 'мн. ч., именительный (kes? mis? — несколько)'],
  plp: ['osastav mitmus', 'мн. ч., партитив (keda? mida? — несколько)'],
};
export const VERB_INFO = {
  da: ['da-инфинитив', 'после tahan, saan, oskan, võin (но pean + ma-форма)'],
  pres1: ['1 л. ед. ч. настоящего (ma …)', 'я …'],
  pres3: ['3 л. ед. ч. настоящего (ta …)', 'он/она …'],
  past1: ['1 л. ед. ч. прошедшего (ma … eile)', 'я … (вчера)'],
  nud: ['причастие на -nud (olen …)', 'перфект'],
  imp: ['повелительное, 2 л. ед. ч.', '… ! (ты)'],
};

function distinctTargets(forms, keys) {
  const counts = {};
  Object.values(forms).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return keys.filter((k) => counts[forms[k]] === 1);
}

/** Вопрос по формам слова. mode: 'choice' | 'input'. */
export function formsQuestion(entry, mode) {
  const isNoun = entry.id.startsWith('f-n-');
  const info = isNoun ? CASE_INFO : VERB_INFO;
  const keys = distinctTargets(entry.forms, Object.keys(info));
  if (!keys.length) return null;
  const key = pick(keys, 1)[0];
  const answer = entry.forms[key];
  const [label, hint] = info[key];
  const sentenceBase = isNoun ? entry.et : entry.forms.ma;
  const explanation = Object.entries(entry.forms).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const common = { prompt_et: `${sentenceBase} → ___`, hint: `(${label}: ${hint})`, ru: `${entry.et} — ${entry.ru}`, explanation_ru: `Формы слова ${entry.et} (${entry.ru}): ${explanation}.` };
  const id = `gen:f:${entry.id}:${key}`;
  if (mode === 'input') return base(id, entry.topic, { type: 'input', answer, ...common });
  const others = [...new Set(Object.values(entry.forms).filter((v) => v !== answer))];
  const options = shuffle([answer, ...pick(others, 3)]);
  return base(id, entry.topic, { type: 'choice', options, answer: options.indexOf(answer), ...common });
}

export function formsSession(entries, kind, mode, count = 10) {
  const pool = entries.filter((e) => (kind === 'nouns' ? e.id.startsWith('f-n-') : e.id.startsWith('f-v-')));
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const q = formsQuestion(pool[rnd(0, pool.length - 1)], mode);
    if (q && !out.some((x) => x.id === q.id)) out.push(q);
  }
  return out;
}

// ---- лексический тест из карточек ----
export function vocabQuiz(cards, dir, count = 10) {
  const out = [];
  const chosen = shuffle(cards).slice(0, count);
  for (const c of chosen) {
    const otherCards = cards.filter((x) => x.id !== c.id && (dir === 'et-ru' ? x.ru !== c.ru : x.et !== c.et));
    const sameTopic = otherCards.filter((x) => x.topic === c.topic);
    const pool = shuffle(sameTopic.length >= 3 ? sameTopic : otherCards);
    const picked = [];
    const seen = new Set([dir === 'et-ru' ? c.ru : c.et]);
    for (const x of pool) { const v = dir === 'et-ru' ? x.ru : x.et; if (!seen.has(v)) { seen.add(v); picked.push(v); } if (picked.length === 3) break; }
    const correct = dir === 'et-ru' ? c.ru : c.et;
    const options = shuffle([correct, ...picked]);
    out.push({
      id: `vq:${dir}:${c.id}`, topic: c.topic, level: c.level, status: c.status, type: 'choice',
      prompt_et: dir === 'et-ru' ? c.et : c.ru,
      prompt_ru: dir === 'et-ru' ? 'Выберите перевод.' : 'Выберите эстонское слово.',
      options, options_lang: dir === 'et-ru' ? 'ru' : 'et', answer: options.indexOf(correct),
      explanation_ru: `${c.et} (${c.forms}) — ${c.ru}. Пример: ${c.example_et}`, _card: c.id,
    });
  }
  return out;
}
