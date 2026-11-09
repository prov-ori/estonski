// Тренажёры: формы слов, числительные и время, порядок слов, диктант.
import { h, content, config, shuffle, norm, pct, addChildren, setChildren } from '../util.js';
import { runTrainer } from '../trainer.js';
import { formsSession, numberQuestion } from '../gen.js';
import { store } from '../store.js';
import { charPad } from '../widgets.js';
import { findEtVoice, resetVoice, createPlayer, speechSupported } from '../speech.js';

const HUB = [
  ['forms', 'Формы слов', 'Падежи существительных и формы глаголов: выбор или ввод.'],
  ['numbers', 'Числительные и время', 'Числа, время (pool kaheksa), даты. Задания создаются по правилам.'],
  ['order', 'Порядок слов', 'Соберите предложение из слов.'],
  ['fix', 'Исправь ошибку', 'В предложении одна ошибка: напечатайте верный вариант.'],
  ['dictation', 'Диктант', 'Слушайте фразу и печатайте её с клавиатуры.'],
];

const sel = (id, opts, value, on) => {
  const s = h('select', { class: 'select', id, onchange: (e) => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v }, l)));
  s.value = value; return s;
};
const field = (label, id, control) => h('div', { class: 'field' }, h('label', { for: id }, label), control);
const levelField = (id, items, selected, onChange) => {
  const levels = [...new Set(items.map((item) => item.level))].sort();
  return field('Уровень', id, sel(id, levels.map((value) => [value, value]), selected, onChange));
};

export default {
  title: 'Тренажёры',
  async mount(root, args) {
    const sub = args[0];
    if (!sub) {
      addChildren(root, h('h1', null, 'Тренажёры'),
        h('p', { class: 'lead' }, 'Тренировка отдельных навыков. Ответы записываются в «Прогресс», а ошибки учитываются в практике дня.'),
        h('div', { class: 'grid' }, [...HUB.map(([id, t, d]) => h('a', { class: 'card link-card', href: `#/drills/${id}` }, h('h2', null, t), h('p', { class: 'muted' }, d))),
          h('a', { class: 'card link-card', href: '#/pronunciation' }, h('h2', null, 'Произношение'), h('p', { class: 'muted' }, 'Звуки õ ä ö ü, ударение, долгота, повторение фраз с записью.'))]));
      return;
    }
    const meta = HUB.find((x) => x[0] === sub);
    if (!meta) { addChildren(root, h('h1', null, 'Тренажёр не найден'), h('a', { href: '#/drills' }, 'Все тренажёры')); return; }
    addChildren(root, h('p', null, h('a', { href: '#/drills' }, '← Все тренажёры')), h('h1', null, meta[1]), h('p', { class: 'lead' }, meta[2]));
    const area = h('div', { class: 'trainer' });
    root.append(area);
    if (sub === 'forms') return forms(area);
    if (sub === 'numbers') return numbers(area);
    if (sub === 'order') return order(area);
    if (sub === 'fix') return fixes(area);
    return dictation(area);
  },
};

// ---------- формы слов ----------
async function forms(area) {
  const data = (await content('forms')).items;
  let kind = 'nouns', mode = 'choice', level = 'B1';
  function menu() {
    setChildren(area, h('div', { class: 'card' },
      levelField('forms-level', data, level, (value) => { level = value; }),
      field('Что тренируем', 'k', sel('k', [['nouns', 'Падежи существительных'], ['verbs', 'Формы глаголов']], kind, (v) => { kind = v; })),
      field('Режим', 'm', sel('m', [['choice', 'Выбор из вариантов'], ['input', 'Ввод с клавиатуры']], mode, (v) => { mode = v; })),
      h('p', { class: 'muted small-text' }, 'В заданиях только такие формы, которые отличаются друг от друга — совпадающие (например, родительный и партитив у слова kool) не спрашиваются.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (10 заданий)'))));
  }
  function start() {
    const qs = formsSession(data.filter((entry) => entry.level === level), kind, mode, 10);
    runTrainer(area, qs.map((q) => ({ q, module: 'drills' })), { again: start,
      extraButtons: h('button', { class: 'btn', type: 'button', onclick: menu }, 'Изменить настройки') });
  }
  menu();
}

// ---------- числительные ----------
async function numbers(area) {
  let kind = 'numbers';
  setChildren(area, h('div', { class: 'card' },
    field('Что тренируем', 'k', sel('k', [['numbers', 'Числа 0–100'], ['time', 'Время (pool, veerand, kolmveerand)'], ['dates', 'Даты (порядковые числительные)']], kind, (v) => { kind = v; })),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (10 заданий)'))));
  function start() {
    const qs = [];
    let guard = 0;
    while (qs.length < 10 && guard++ < 100) { const q = numberQuestion(kind); if (!qs.some((x) => x.id === q.id)) qs.push(q); }
    runTrainer(area, qs.map((q) => ({ q, module: 'drills' })), { again: start, extraButtons: h('a', { class: 'btn', href: '#/drills/numbers' }, 'Изменить настройки') });
  }
}

// ---------- исправь ошибку ----------
async function fixes(area) {
  const items = (await content('fixes')).items;
  const levels = [...new Set(items.map((item) => item.level))].sort();
  let level = 'all';
  const start = () => {
    const matching = level === 'all' ? items : items.filter((item) => item.level === level);
    const qs = shuffle(matching).slice(0, 10).map((x) => ({
      id: x.id, topic: x.topic, level: x.level, status: x.status, type: 'input',
      prompt_et: `Paranda viga: ${x.wrong_et}`, answer: x.answer_et, also_ok: x.also_ok, explanation_ru: x.explanation_ru,
    }));
    runTrainer(area, qs.map((q) => ({ q, module: 'drills' })), { again: start,
      extraButtons: h('button', { class: 'btn', type: 'button', onclick: menu }, 'Изменить уровень') });
  };
  function menu() {
    setChildren(area, h('div', { class: 'card' }, h('p', null, 'В каждом предложении одна ошибка. Напечатайте всё предложение правильно (регистр и точка в конце не важны).'),
      field('Уровень', 'fix-level', sel('fix-level', [['all', 'Все уровни'], ...levels.map((value) => [value, value])], level, (value) => { level = value; })),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (10 заданий)'))));
  }
  menu();
}

// ---------- порядок слов ----------
const words = (s) => s.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);

async function order(area) {
  const items = (await content('order')).items;
  let level = 'B1';
  const start = () => {
    const queue = shuffle(items.filter((item) => item.level === level)).slice(0, 10);
    let i = 0, score = 0;
    const next = () => {
      if (i >= queue.length) {
        setChildren(area, h('div', { class: 'card result' }, h('h2', null, 'Сессия завершена'), h('p', { class: 'big' }, `${score} из ${queue.length} (${pct(score, queue.length)} %)`)),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Ещё раз'),
            h('button', { class: 'btn', type: 'button', onclick: menu }, 'Изменить уровень'), h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
        return;
      }
      const it = queue[i];
      const chunks = it.chunks_et;
      const tokens = shuffle((chunks || words(it.answer_et)).map((w, k) => ({ w, k })));
      const chosen = [];
      let done = false;
      const bank = h('div', { class: 'tokens', role: 'group', 'aria-label': chunks ? 'Части предложения' : 'Слова' });
      const built = h('div', { class: 'tokens built', role: 'group', 'aria-label': 'Ваше предложение', 'aria-live': 'polite' });
      const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
      const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Проверить');
      const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { i++; next(); } }, i === queue.length - 1 ? 'Завершить' : 'Дальше →');
      const draw = () => {
        setChildren(bank, tokens.filter((t) => !chosen.includes(t)).map((t) => h('button', { type: 'button', class: 'token', lang: 'et', disabled: done, onclick: () => { chosen.push(t); draw(); } }, t.w)));
        setChildren(built, chosen.length ? chosen.map((t) => h('button', { type: 'button', class: 'token placed', lang: 'et', disabled: done, 'aria-label': `${t.w} — убрать`, onclick: () => { chosen.splice(chosen.indexOf(t), 1); draw(); } }, t.w)) : h('span', { class: 'muted' }, chunks ? 'Выберите части предложения по порядку' : 'Нажимайте на слова ниже по порядку'));
      };
      function check() {
        if (done) return;
        const normalize = chunks ? (text) => text.trim().replace(/\s+/g, ' ') : (text) => words(text).join(' ');
        const got = normalize(chosen.map((t) => t.w).join(' '));
        const ok = [it.answer_et, ...(it.also_ok || [])].some((a) => normalize(a) === got) && chosen.length === tokens.length;
        done = true; if (ok) score++;
        store.recordAnswer({ id: it.id, module: 'drills', topic: it.topic, ok });
        draw();
        fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
        setChildren(fb, h('strong', null, ok ? 'Верно. ' : 'Неверно. '), !ok && h('span', null, 'Один из верных вариантов: ', h('span', { lang: 'et', class: 'ans' }, it.answer_et), '. '),
          (it.also_ok || []).length > 0 && h('span', null, 'Допустимо также: ', h('span', { lang: 'et' }, it.also_ok.join(' / ')), '. '), h('span', { class: 'expl' }, it.explanation_ru), h('div', { class: 'q-tr' }, 'Перевод: ', it.ru));
        checkBtn.hidden = true; nextBtn.hidden = false; nextBtn.focus();
      }
      draw();
      setChildren(area, h('p', { class: 'muted', role: 'status' }, `Задание ${i + 1} из ${queue.length} · ${it.level}`), h('progress', { max: queue.length, value: i + 1, 'aria-label': 'Прогресс' }),
        h('div', { class: 'card' }, h('p', { class: 'q-prompt' }, 'Составьте предложение: ', h('span', { class: 'muted' }, it.ru)), built, bank,
          h('div', { class: 'row' }, checkBtn, h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (!done) { chosen.length = 0; draw(); } } }, 'Сбросить'), nextBtn), fb));
    };
    next();
  };
  function menu() {
    setChildren(area, h('div', { class: 'card' },
      levelField('order-level', items, level, (value) => { level = value; }),
      h('p', null, 'Соберите предложение из слов на B1 или из смысловых частей на B2 и C1. Нажмите на выбранную часть ещё раз, чтобы вернуть её.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (10 заданий)'))));
  }
  menu();
}

// ---------- диктант ----------
export function diffWords(user, correct) {
  const a = words(user), b = words(correct);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push(['ok', b[j]]); i++; j++; }
    else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) { out.push(['miss', b[j]]); j++; }
    else { out.push(['extra', a[i]]); i++; }
  }
  return out;
}

async function dictation(area) {
  const [data, recordings, voice] = await Promise.all([content('dictation'), config('audio').catch(() => ({})), findEtVoice()]);
  const items = data.items;
  const levels = [...new Set(items.map((item) => item.level))].sort();
  let level = 'B1';
  let player = null;
  let audio = null;
  const cleanup = () => {
    if (player) { player.stop(); player = null; }
    if (audio) {
      const current = audio;
      audio = null;
      current.pause();
      current.removeAttribute('src');
      current.load();
    }
  };
  const start = () => {
    const queue = shuffle(items.filter((item) => item.level === level)).slice(0, 8);
    let i = 0, score = 0;
    const next = () => {
      cleanup();
      if (i >= queue.length) {
        setChildren(area, h('div', { class: 'card result' }, h('h2', null, 'Диктант завершён'), h('p', { class: 'big' }, `Без ошибок: ${score} из ${queue.length}`)),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Ещё раз'),
            h('button', { class: 'btn', type: 'button', onclick: menu }, 'Изменить уровень'), h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
        return;
      }
      const it = queue[i];
      const input = h('input', { type: 'text', class: 'text-input', lang: 'et', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Ваш ответ',
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } } });
      const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
      const file = recordings.items?.[it.id]?.file;
      const shown = !file && !voice;
      const textBox = h('p', { class: 'q-et', lang: 'et', hidden: !shown }, it.text_et);
      const controls = h('div', { class: 'row' });
      const fallback = h('p', { class: 'notice warn', role: 'status', hidden: !shown }, 'Эстонского голоса нет на этом устройстве — режим переписывания: перепишите показанный текст.');
      if (file) {
        const recording = h('audio', { src: file, preload: 'none', hidden: true });
        audio = recording;
        const unavailable = () => {
          if (audio !== recording) return;
          fallback.textContent = 'Запись не загрузилась. Можно переписать показанную фразу или ещё раз нажать «Слушать».';
          fallback.hidden = false;
          textBox.hidden = false;
        };
        recording.addEventListener('error', unavailable);
        const rate = sel('rate', [['0.75', 'Медленно'], ['1', 'Обычно']], '0.75', () => {});
        controls.append(recording, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
          try {
            if (recording.error) recording.load();
            recording.currentTime = 0;
            recording.playbackRate = Number(rate.value);
            await recording.play();
          } catch { unavailable(); }
        } }, '▶ Слушать'), h('label', { for: 'rate' }, 'Скорость'), rate);
      } else if (voice) {
        player = createPlayer([{ sp: 'A', text: it.text_et }], voice, () => {});
        const rate = sel('rate', [['0.75', 'Медленно'], ['0.9', 'Обычно']], '0.75', () => {});
        controls.append(h('button', { class: 'btn primary', type: 'button', onclick: () => player.play(parseFloat(rate.value)) }, '▶ Слушать'), h('label', { for: 'rate' }, 'Скорость'), rate);
      }
      const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Проверить');
      const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { i++; next(); } }, i === queue.length - 1 ? 'Завершить' : 'Дальше →');
      function check() {
        if (nextBtn.hidden === false) return;
        const diff = diffWords(input.value, it.text_et);
        const ok = diff.every(([t]) => t === 'ok') && words(input.value).length > 0;
        if (ok) score++;
        store.recordAnswer({ id: it.id, module: 'drills', topic: it.topic, ok });
        input.readOnly = true; textBox.hidden = false;
        fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
        setChildren(fb, h('strong', null, ok ? 'Без ошибок. ' : 'Есть ошибки. '),
          !ok && h('span', { class: 'diff', lang: 'et' }, diff.map(([t, w]) => h('span', { class: `d-${t}` }, t === 'miss' ? `[нужно: ${w}] ` : t === 'extra' ? `[лишнее: ${w}] ` : `${w} `))),
          h('span', { class: 'expl' }, `${it.explanation_ru} Перевод: ${it.ru}`));
        checkBtn.hidden = true; nextBtn.hidden = false; nextBtn.focus();
      }
      setChildren(area, h('p', { class: 'muted', role: 'status' }, `Фраза ${i + 1} из ${queue.length} · ${it.level}`), h('progress', { max: queue.length, value: i + 1, 'aria-label': 'Прогресс' }),
        h('div', { class: 'card' },
          fallback,
          controls, textBox, h('div', { class: 'field' }, h('label', { for: 'dk' }, 'Напишите фразу'), (input.id = 'dk', input)), charPad(input),
          h('div', { class: 'row' }, checkBtn, nextBtn), fb));
      input.focus();
    };
    next();
  };
  function menu() {
    setChildren(area, h('div', { class: 'card' },
      field('Уровень', 'dictation-level', sel('dictation-level', levels.map((value) => [value, value]), level, (value) => { level = value; })),
      h('p', null, 'Прослушайте фразу и напечатайте её. Регистр и основные знаки препинания не проверяются.'),
      h('p', { class: 'muted small-text' }, 'Для B2 и C1 есть готовые записи. На B1 используется голос устройства или режим переписывания.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (8 фраз)'), !voice && speechSupported() && h('button', { class: 'btn', type: 'button', onclick: () => { resetVoice(); location.reload(); } }, 'Проверить голос ещё раз'))));
  }
  menu();
  return cleanup;
}
