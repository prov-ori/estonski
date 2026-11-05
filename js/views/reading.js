import { h, content, pct, setChildren, addChildren } from '../util.js';
import { questionSet, saveResults } from '../question.js';

/** Блок «текст + вопросы» — используется и в пробном экзамене. */
export function textBlock(item, { start = 1 } = {}) {
  const paras = item.text_et.split(/\n\s*\n/).map((p) => h('p', { lang: 'et' }, p.split('\n').flatMap((l, i, a) => (i < a.length - 1 ? [l, h('br')] : [l]))));
  return h('article', { class: 'text card', 'aria-label': item.title_et }, h('h2', { lang: 'et' }, item.title_et), paras);
}

export default {
  title: 'Чтение',
  async mount(root, args) {
    const data = await content('reading');
    const id = args[0];
    const item = data.items.find((x) => x.id === id);

    if (!item) {
      addChildren(root, 
        h('h1', null, 'Чтение'),
        h('p', { class: 'lead' }, 'Тексты с вопросами трёх типов: выбор ответа, верно/неверно, соответствие (плюс короткий ответ с клавиатуры).'),
        h('div', { class: 'grid' }, data.items.map((t) =>
          h('a', { class: 'card link-card', href: `#/reading/${t.id}` }, h('h3', { lang: 'et' }, t.title_et), h('p', { class: 'muted' }, t.title_ru), h('p', { class: 'muted small-text' }, `${t.questions.length} вопросов`)))));
      return;
    }

    const set = questionSet(item.questions);
    const result = h('div', { role: 'status', 'aria-live': 'polite' });
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      const un = set.items.length - set.answeredCount();
      if (un && !window.confirm(`Без ответа: ${un}. Проверить всё равно?`)) return;
      const r = set.gradeAll();
      saveResults(r.results, 'reading');
      checkBtn.disabled = true;
      setChildren(result, h('div', { class: 'card result' }, h('p', { class: 'big' }, `Верно: ${r.got} из ${r.max} (${pct(r.got, r.max)} %)`), h('p', { class: 'muted' }, item.explanation_ru)));
      result.scrollIntoView({ block: 'nearest' });
    } }, 'Проверить ответы');

    addChildren(root, 
      h('p', null, h('a', { href: '#/reading' }, '← Все тексты')),
      h('h1', null, 'Чтение: ' + item.title_ru),
      textBlock(item),
      h('h2', null, 'Вопросы'),
      set.el,
      h('div', { class: 'row' }, checkBtn, h('a', { class: 'btn', href: '#/reading' }, 'Другой текст')),
      result);
  },
};
