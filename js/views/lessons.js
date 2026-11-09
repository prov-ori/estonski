import { h, content, addChildren, topicMap } from '../util.js';
import { speakButton, filteredList } from '../widgets.js';

export default {
  title: 'Уроки',
  async mount(root, args) {
    const data = await content('lessons');
    const l = data.items.find((x) => x.id === args[0]);
    if (!l) {
      const topics = await topicMap();
      addChildren(root, h('h1', null, 'Мини-уроки'),
        h('p', { class: 'lead' }, 'Короткие объяснения с примерами и типичными ошибками русскоговорящих. После каждого урока — кнопка с практикой по теме.'),
        filteredList(data.items, topics, (rows) => h('div', { class: 'grid' }, rows.map((x) =>
          h('a', { class: 'card link-card', href: `#/lessons/${x.id}` }, h('h2', null, x.title_ru), h('p', { class: 'muted' }, x.level + ' · ' + x.intro_ru)))), { withLevels: true }),
        h('p', null, h('a', { href: '#/reference' }, 'Справочник: таблицы форм, числа, время, связки')));
      return;
    }
    const i = data.items.indexOf(l);
    const next = data.items[(i + 1) % data.items.length];
    addChildren(root,
      h('p', null, h('a', { href: '#/lessons' }, '← Все уроки')),
      h('h1', null, l.title_ru), h('p', { class: 'lead' }, l.level + ' · ' + l.intro_ru),
      l.sections.map((s) => h('section', { class: 'card' }, h('h2', null, s.h), s.p.map((t) => h('p', null, t)),
        s.examples.length > 0 && h('ul', { class: 'examples' }, s.examples.map((e) => h('li', null, h('strong', { lang: 'et' }, e.et), ' ', speakButton(e.et, 'Прослушать'), ' — ', e.ru))))),
      l.mistakes.length > 0 && h('section', { class: 'card' }, h('h2', null, 'Типичные ошибки'),
        h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Типичные ошибки' }, h('table', { class: 'table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, '✗ Неверно'), h('th', { scope: 'col' }, '✓ Верно'), h('th', { scope: 'col' }, 'Почему'))),
          h('tbody', null, l.mistakes.map((m) => h('tr', null, h('td', { lang: 'et', class: 'wrong' }, m.wrong), h('td', { lang: 'et', class: 'right' }, m.right), h('td', null, m.why))))))),
      l.reference_url && h('p', { class: 'muted' }, h('a', { href: l.reference_url }, 'Справочник Института эстонского языка (EKI)')),
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/${l.practice}` }, 'Практика по теме'), h('a', { class: 'btn', href: `#/lessons/${next.id}` }, 'Следующий урок →')));
  },
};
