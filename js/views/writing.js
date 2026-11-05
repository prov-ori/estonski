import { seriesLinks } from '../series.js';
import { h, content, config, countWords, addChildren } from '../util.js';
import { store } from '../store.js';
import { charPad, timerWidget, checklistWidget } from '../widgets.js';

const GROUPS = { greeting: 'Приветствие', closing: 'Завершение', add: 'Добавление', contrast: 'Противопоставление', cause: 'Причина', result: 'Следствие', example: 'Пример', order: 'Порядок', opinion: 'Мнение', condition: 'Условие' };

/** Редактор с счётчиком слов; используется и в пробном экзамене. */
export function editor({ initial = '', range, onInput }) {
  const ta = h('textarea', { class: 'text-area', rows: '10', lang: 'et', autocomplete: 'off', autocapitalize: 'sentences', spellcheck: 'false', 'aria-label': 'Ваш текст', 'aria-describedby': 'wc' });
  ta.value = initial;
  const wc = h('p', { id: 'wc', class: 'muted', role: 'status', 'aria-live': 'polite' });
  const upd = () => {
    const n = countWords(ta.value);
    const [lo, hi] = range;
    const state = n < lo ? `ещё минимум ${lo - n}` : n > hi ? `больше ориентира на ${n - hi}` : 'в пределах ориентира';
    wc.textContent = `Слов: ${n}. Ориентир для тренировки: ${lo}–${hi} (${state}). Это не требование экзамена.`;
  };
  ta.addEventListener('input', () => { upd(); onInput && onInput(ta.value); });
  upd();
  return { el: h('div', null, ta, charPad(ta), wc), ta };
}

export default {
  title: 'Письмо',
  async mount(root, args) {
    const [data, fmt] = await Promise.all([content('writing'), config('exam-format')]);
    const task = data.items.find((x) => x.id === args[0]);
    const series = await seriesLinks(task, 'writing');
    if (series) root.append(series);

    if (!task) {
      addChildren(root,
        h('h1', null, 'Письмо'),
        h('p', { class: 'lead' }, 'Выберите задание, пишите с таймером и счётчиком слов, потом проверьте себя по чек-листу.'),
        h('p', { class: 'notice warn' }, 'Автоматической оценки нет — и не будет: тренажёр не умеет надёжно оценивать тексты. Проверьте себя по чек-листу или покажите текст учителю.'),
        h('div', { class: 'grid' }, data.items.map((t) => {
          const saved = store.getWriting(t.id);
          return h('a', { class: 'card link-card', href: `#/writing/${t.id}` }, h('h3', null, t.title_ru), h('p', { class: 'muted' }, t.kind === 'email' ? 'Письмо / e-mail' : 'Рассуждение'), saved.text && h('p', { class: 'muted small-text' }, `Есть черновик: ${countWords(saved.text)} слов`));
        })),
        h('h2', null, 'Связки и полезные фразы'), connectors(data.connectors));
      return;
    }

    const saved = store.getWriting(task.id);
    const range = task.practice_words || fmt.writing_practice_words;
    const ed = editor({ initial: saved.text || '', range, onInput: (v) => store.setWriting(task.id, { text: v }) });
    const tw = timerWidget({ seconds: fmt.writing_practice_minutes * 60, label: 'Таймер' });
    const cl = checklistWidget(data.checklist, saved.checks, (checks) => store.setWriting(task.id, { checks }));
    addChildren(root,
      h('p', null, h('a', { href: '#/writing' }, '← Все задания')),
      h('h1', null, 'Письмо: ' + task.title_ru),
      h('div', { class: 'card' },
        h('p', { class: 'q-et', lang: 'et' }, task.prompt_et),
        h('p', { class: 'muted' }, task.prompt_ru),
        h('p', null, h('strong', null, 'Раскройте в тексте:')),
        h('ul', null, task.content_points_et.map((p, i) => h('li', null, h('span', { lang: 'et' }, p), ' ', h('span', { class: 'muted' }, `— ${task.content_points_ru[i]}`)))),
        h('details', null, h('summary', null, 'Подсказка по заданию'), h('p', null, task.explanation_ru))),
      h('div', { class: 'card' },
        tw.el,
        h('p', { class: 'muted small-text' }, `Время тренировочное (${fmt.writing_practice_minutes} мин, config/exam-format.json, не проверено на harno.ee). Таймер не ограничивает ввод.`),
        ed.el,
        h('p', { class: 'muted small-text' }, 'Черновик сохраняется автоматически, только в вашем браузере.'),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (window.confirm('Очистить текст?')) { ed.ta.value = ''; ed.ta.dispatchEvent(new Event('input')); } } }, 'Очистить текст'))),
      h('h2', null, 'Самопроверка'),
      h('p', { class: 'muted' }, 'Отметьте всё, что выполнено. Это не оценка, а подсказка, что доработать.'),
      cl.el,
      h('h2', null, 'Связки и полезные фразы'), connectors(data.connectors));
    return () => tw.timer.stop();
  },
};

function connectors(list) {
  const groups = {};
  list.forEach((c) => (groups[c.group] ||= []).push(c));
  return h('div', { class: 'connectors' }, Object.entries(groups).map(([g, arr]) =>
    h('details', null, h('summary', null, GROUPS[g] || g),
      h('ul', null, arr.map((c) => h('li', null, h('strong', { lang: 'et' }, c.et), ' — ', c.ru, h('div', { class: 'muted small-text' }, c.explanation_ru)))))));
}
