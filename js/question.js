// Единый рендер вопросов: choice | tf | input | match.
import { h, shuffle, norm, stripMarks, hasCyrillic, setChildren } from './util.js';
import { charPad } from './widgets.js';
import { store } from './store.js';

let uid = 0;
const TF_OPTIONS = ['Õige — верно', 'Vale — неверно'];

/**
 * opts: {number, immediate, onGraded(g)}
 * immediate: проверка сразу (для choice/tf варианты — кнопки; для input/match — кнопка «Проверить» / Enter).
 * Возвращает {el, answered(), grade(), showResult(g), lock(), focus()}.
 */
export function renderQuestion(q, opts = {}) {
  const id = `q${++uid}`;
  const promptId = `${id}-p`;
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const root = h('div', { class: 'question', 'data-qid': q.id });
  let locked = false;
  let api;

  const prompt = h('div', { class: 'q-prompt', id: promptId, tabindex: '-1' },
    opts.number != null && h('span', { class: 'q-num' }, `${opts.number}. `),
    h('span', { class: 'q-et', lang: 'et' }, q.prompt_et),
    q.hint && h('span', { class: 'q-hint', lang: 'et' }, ' ' + q.hint),
    q.prompt_ru && h('div', { class: 'q-ru muted', lang: 'ru' }, q.prompt_ru));
  root.append(prompt);

  const optLang = q.options_lang || 'et';
  let getValue, doGrade, markResult, setLocked, focusFirst;

  const finish = () => {
    if (locked) return;
    const g = api.grade();
    api.lock();
    api.showResult(g);
    opts.onGraded && opts.onGraded(g);
  };

  if (q.type === 'choice' || q.type === 'tf') {
    const labels = q.type === 'tf' ? TF_OPTIONS : q.options;
    const correct = q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer;
    const order = q.type === 'tf' || q.fixed ? labels.map((_, i) => i) : shuffle(labels.map((_, i) => i));
    let chosen = null;
    const nodes = [];
    const group = h('div', { class: 'options', role: q.type === 'tf' || !opts.immediate ? 'radiogroup' : 'group', 'aria-labelledby': promptId });
    const mark = (n, text) => { const m = n.querySelector('.mark'); if (m) m.textContent = text; };

    order.forEach((i) => {
      const text = h('span', { class: 'opt-text', lang: q.type === 'tf' ? 'ru' : optLang }, labels[i]);
      const m = h('span', { class: 'mark' });
      let node, input;
      if (opts.immediate) {
        node = h('button', { type: 'button', class: 'opt', 'data-i': i, onclick: () => { if (locked) return; chosen = i; nodes.forEach((x) => x.node.classList.toggle('chosen', x.i === i)); finish(); } }, text, m);
        input = node;
      } else {
        input = h('input', { type: 'radio', name: id, value: String(i), onchange: () => { chosen = i; nodes.forEach((x) => x.node.classList.toggle('chosen', x.i === i)); opts.onChange && opts.onChange(); } });
        node = h('label', { class: 'opt' }, input, text, m);
      }
      nodes.push({ i, node, input });
      group.append(node);
    });
    root.append(group);
    getValue = () => chosen;
    doGrade = () => {
      const ok = chosen === correct;
      return { ok, got: ok ? 1 : 0, max: 1, answered: chosen != null, given: chosen == null ? '—' : labels[chosen], correct: labels[correct] };
    };
    markResult = () => nodes.forEach((x) => {
      if (x.i === correct) { x.node.classList.add('is-correct'); mark(x.node, ' ✓ верный ответ'); }
      else if (x.i === chosen) { x.node.classList.add('is-wrong'); mark(x.node, ' ✗ ваш ответ'); }
    });
    setLocked = () => nodes.forEach((x) => { if (x.input.tagName === 'INPUT') x.input.disabled = true; else x.input.setAttribute('aria-disabled', 'true'); });
    focusFirst = () => nodes[0] && nodes[0].input.focus();
  } else if (q.type === 'input') {
    const input = h('input', {
      type: 'text', class: 'text-input', lang: 'et', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      'aria-labelledby': promptId, inputmode: 'text',
      oninput: () => opts.onChange && opts.onChange(),
      onkeydown: (e) => { if (e.key === 'Enter' && opts.immediate) { e.preventDefault(); finish(); } },
    });
    const row = h('div', { class: 'input-row' }, input);
    root.append(row, charPad(input));
    if (opts.immediate) root.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', onclick: finish }, 'Проверить')));
    getValue = () => input.value;
    doGrade = () => {
      const v = input.value;
      const ok = norm(v) === norm(q.answer);
      let note = '';
      if (!ok && v.trim()) {
        if (hasCyrillic(v)) note = 'В ответе есть кириллица — переключите раскладку или используйте кнопки букв. ';
        else if (norm(stripMarks(v)) === norm(stripMarks(q.answer))) note = 'Почти: проверьте õ / ä / ö / ü. ';
      }
      return { ok, got: ok ? 1 : 0, max: 1, answered: !!v.trim(), given: v.trim() || '—', correct: q.answer, note };
    };
    markResult = (g) => input.classList.add(g.ok ? 'is-correct' : 'is-wrong');
    setLocked = () => { input.readOnly = true; };
    focusFirst = () => input.focus();
  } else if (q.type === 'match') {
    const selects = [];
    const rows = q.items.map((it, k) => {
      const sel = h('select', { class: 'select', 'aria-label': `Подходит к: ${it.left}`, onchange: () => opts.onChange && opts.onChange() },
        h('option', { value: '' }, '— выберите —'),
        shuffleIdx(q.options.length, `${q.id}`).map((i) => h('option', { value: String(i), lang: 'et' }, q.options[i])));
      selects.push(sel);
      const res = h('span', { class: 'mark' });
      return h('div', { class: 'match-row' }, h('span', { class: 'match-left', lang: 'et' }, it.left), sel, res);
    });
    root.append(h('div', { class: 'match' }, rows));
    if (opts.immediate) root.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', onclick: finish }, 'Проверить')));
    getValue = () => selects.map((s) => (s.value === '' ? null : +s.value));
    doGrade = () => {
      let got = 0;
      const vals = getValue();
      q.items.forEach((it, k) => { if (vals[k] === it.answer) got++; });
      const ok = got === q.items.length;
      return {
        ok, got, max: q.items.length, answered: vals.some((v) => v != null),
        given: vals.map((v, k) => `${q.items[k].left} → ${v == null ? '—' : q.options[v]}`).join('; '),
        correct: q.items.map((it) => `${it.left} → ${q.options[it.answer]}`).join('; '),
      };
    };
    markResult = () => {
      const vals = getValue();
      rows.forEach((r, k) => {
        const good = vals[k] === q.items[k].answer;
        r.classList.add(good ? 'is-correct' : 'is-wrong');
        r.querySelector('.mark').textContent = good ? ' ✓' : ` ✗ верно: ${q.options[q.items[k].answer]}`;
      });
    };
    setLocked = () => selects.forEach((s) => { s.disabled = true; });
    focusFirst = () => selects[0] && selects[0].focus();
  } else {
    root.append(h('p', { class: 'notice warn' }, `Неизвестный тип вопроса: ${q.type}`));
    getValue = () => null; doGrade = () => ({ ok: false, got: 0, max: 1, answered: false, given: '—', correct: '—' });
    markResult = () => {}; setLocked = () => {}; focusFirst = () => {};
  }

  root.append(fb);

  api = {
    el: root,
    q,
    value: getValue,
    answered: () => doGrade().answered,
    grade: doGrade,
    lock() { locked = true; setLocked(); },
    get locked() { return locked; },
    focus: focusFirst,
    focusPrompt: () => prompt.focus(),
    showResult(g) {
      markResult(g);
      fb.className = 'feedback ' + (g.ok ? 'ok' : 'bad');
      setChildren(fb, 
        h('strong', null, !g.answered ? 'Нет ответа. ' : g.ok ? 'Верно. ' : g.got > 0 ? `Частично верно (${g.got} из ${g.max}). ` : 'Неверно. '),
        !g.ok && h('span', null, 'Правильный ответ: ', h('span', { lang: q.type === 'match' ? 'et' : (q.type === 'tf' ? 'ru' : (q.options_lang || 'et')), class: 'ans' }, g.correct), '. '),
        g.note || '',
        h('span', { class: 'expl' }, q.explanation_ru),
        q.ru && h('div', { class: 'q-tr' }, 'Перевод: ', q.ru)
      );
    },
  };
  return api;
}

// Порядок вариантов в match перемешивается один раз на вопрос (устойчиво внутри сессии).
const idxCache = new Map();
function shuffleIdx(n, key) {
  const k = `${key}:${n}`;
  if (!idxCache.has(k)) idxCache.set(k, shuffle([...Array(n).keys()]));
  return idxCache.get(k);
}

/**
 * Набор вопросов (чтение, аудирование, диагностика, пробный экзамен).
 * Проверка — вручную: gradeAll({reveal}).
 */
export function questionSet(questions, { start = 1, onChange } = {}) {
  const items = questions.map((q, i) => ({ q, api: renderQuestion(q, { number: start + i, onChange }) }));
  const el = h('div', { class: 'qset' }, items.map((x) => x.api.el));
  return {
    el, items,
    answeredCount: () => items.filter((x) => x.api.answered()).length,
    gradeAll({ reveal = true } = {}) {
      let got = 0, max = 0;
      const results = items.map(({ q, api }) => {
        const g = api.grade();
        got += g.got; max += g.max;
        if (reveal) { api.lock(); api.showResult(g); }
        return { q, g };
      });
      return { got, max, results };
    },
  };
}

/** Записать результаты набора в прогресс. */
export function saveResults(results, module) {
  store.recordMany(results.map(({ q, g }) => ({ id: q.id, module, topic: q.topic, ok: g.ok })));
}
