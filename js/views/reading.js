import { seriesLinks } from '../series.js';
import { h, content, countWords, pct, setChildren, addChildren, topicMap } from '../util.js';
import { filteredList, nextLink, splitView } from '../widgets.js';
import { textPane, evidenceFor } from '../textpane.js';
import { questionSet, saveResults } from '../question.js';
import { store } from '../store.js';

/** Блок текста (используется и в пробном экзамене): с источником, словариком и подсветкой. */
export function textBlock(item, vocab = []) {
  return textPane(item, vocab);
}

function statusLine(t) {
  const sm = store.summary(t.questions.map((q) => q.id));
  const lvl = `${t.level} · ${countWords(t.text_et)} слов · ${t.questions.length} вопросов`;
  if (!sm.answered) return `${lvl} · не пройдено`;
  return sm.ok === sm.total ? `${lvl} · решено полностью ✓` : `${lvl} · верно ${sm.ok} из ${sm.total}`;
}

export default {
  title: 'Чтение',
  async mount(root, args) {
    const data = await content('reading');
    const topicNames = await topicMap();
    const id = args[0];
    const item = data.items.find((x) => x.id === id);

    if (!item) {
      const requestedLevel = args[0] && args[0].startsWith('level-') ? args[0].slice(6) : 'B1-B2';
      const shown = data.items.filter((t) => (requestedLevel === 'B1-B2' ? ['B1', 'B2'].includes(t.level) : t.level === requestedLevel));
      addChildren(root, 
        h('h1', null, 'Чтение'),
        h('p', { class: 'lead' }, 'Тексты с вопросами трёх типов: выбор ответа, верно/неверно, соответствие (плюс короткий ответ с клавиатуры).'),
        h('nav', { class: 'chips', 'aria-label': 'Уровень чтения' }, ['B1-B2', 'B1', 'B2', 'A2'].map((l) => h('a', { class: 'chip', href: '#/reading/level-' + l, 'aria-current': l === requestedLevel ? 'true' : null }, l))),
        filteredList(shown, topicNames, (rows) => h('div', { class: 'grid' }, rows.map((t) =>
          h('a', { class: 'card link-card', href: `#/reading/${t.id}` }, h('h2', { lang: 'et' }, t.title_et), h('p', { class: 'muted' }, t.title_ru), h('p', { class: 'muted small-text' }, statusLine(t)))))));
      return;
    }

    const vocab = (await content('vocab')).items;
    const series = await seriesLinks(item, 'reading');
    const set = questionSet(item.questions);
    const pane = textPane(item, vocab);
    const result = h('div', { role: 'status', 'aria-live': 'polite' });
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      const un = set.items.length - set.answeredCount();
      if (un && !window.confirm(`Без ответа: ${un}. Проверить всё равно?`)) return;
      const r = set.gradeAll();
      saveResults(r.results, 'reading');
      checkBtn.disabled = true;
      // «Показать в тексте»: подсвечиваем место, где находится ответ
      set.items.forEach(({ q, api }) => {
        const ev = evidenceFor(q, item.text_et);
        const fbEl = api.el.querySelector('.feedback');
        if (ev && fbEl) fbEl.append(h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => pane.highlight(ev) }, 'Показать в тексте')));
      });
      setChildren(result, h('div', { class: 'card result' }, h('p', { class: 'big' }, `Верно: ${r.got} из ${r.max} (${pct(r.got, r.max)} %)`), h('p', { class: 'muted' }, item.explanation_ru)));
      result.scrollIntoView({ block: 'nearest' });
    } }, 'Проверить ответы');

    addChildren(root,
      h('p', null, h('a', { href: '#/reading' }, '← Все тексты')),
      h('h1', null, 'Чтение: ' + item.title_ru),
      h('p', { class: 'muted' }, `${item.level} · ${countWords(item.text_et)} слов`),
      series,
      splitView(pane, [
        h('h2', null, 'Вопросы'), set.el,
        h('div', { class: 'row' }, checkBtn, nextLink(data.items, item.id, 'reading', 'Следующий текст →'), h('a', { class: 'btn', href: '#/reading' }, 'Все тексты')),
        result], { leftTitle: 'текст' }));
  },
};
