// Общий тренажёр «вопрос за вопросом» с мгновенной проверкой. Используется в грамматике, практике дня, ошибках и тренажёрах.
import { h, shuffle, pct, setChildren } from './util.js';
import { renderQuestion } from './question.js';
import { store } from './store.js';

/** Сначала ошибки, затем не виденные, затем остальные; внутри групп порядок случайный. */
export function prioritize(entries) {
  const g = { missed: [], fresh: [], rest: [] };
  for (const e of entries) {
    const a = store.getAnswer(e.q.id);
    (!a ? g.fresh : !a.ok ? g.missed : g.rest).push(e);
  }
  return [...shuffle(g.missed), ...shuffle(g.fresh), ...shuffle(g.rest)];
}

/**
 * entries: [{q, module}]. opts: {onDone(score,total), again(), extraButtons, record=true}
 * Возвращает функцию остановки (ничего не требует очистки, но сохраняет единый интерфейс).
 */
export function runTrainer(area, entries, opts = {}) {
  const record = opts.record !== false;
  let i = 0, score = 0;
  const wrongOnes = [];
  const total = entries.length;

  function next() {
    if (i >= total) return done();
    const { q, module } = entries[i];
    let graded = false;
    const last = i === total - 1;
    const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { i++; next(); } }, last ? 'Завершить' : 'Дальше →');
    const api = renderQuestion(q, {
      immediate: true,
      onGraded: (g) => {
        if (graded) return; graded = true;
        if (g.ok) score++; else wrongOnes.push(q);
        if (record) store.recordAnswer({ id: q.id, module, topic: q.topic, ok: g.ok });
        nextBtn.hidden = false; nextBtn.focus();
      },
    });
    setChildren(area,
      h('p', { class: 'muted', role: 'status' }, `Задание ${i + 1} из ${total}`),
      h('progress', { max: total, value: i + 1, 'aria-label': 'Прогресс сессии' }),
      h('div', { class: 'card' }, api.el, h('div', { class: 'row' }, nextBtn)));
    api.focusPrompt();
  }

  function done() {
    opts.onDone && opts.onDone(score, total);
    setChildren(area,
      h('div', { class: 'card result' },
        h('h2', null, 'Сессия завершена'),
        h('p', { class: 'big' }, `${score} из ${total} (${pct(score, total)} %)`),
        wrongOnes.length ? h('p', { class: 'muted' }, `Ошибок: ${wrongOnes.length}. Они сохранены — к ним можно вернуться в разделе «Мои ошибки».`) : h('p', { class: 'muted' }, 'Без ошибок — отлично!')),
      h('div', { class: 'row' },
        opts.again && h('button', { class: 'btn primary', type: 'button', onclick: opts.again }, 'Ещё раз'),
        opts.extraButtons,
        h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
  }

  if (!total) setChildren(area, h('p', { class: 'notice' }, 'Нет заданий для этой сессии.'));
  else next();
}
