import { h, content, addChildren } from '../util.js';
import { sourceLine } from '../textpane.js';

const KIND = { open: 'Открытые лицензии', 'public-domain': 'Общественное достояние и фольклор', exam: 'Материалы экзаменов (с разрешением)', news: 'Новости (с разрешением)', textbook: 'Учебники (с разрешением)', blog: 'Блоги (с разрешением)', other: 'Прочее (с разрешением)' };

export default {
  title: 'Источники',
  async mount(root) {
    const files = ['reading', 'listening', 'writing', 'speaking', 'dictation'];
    const all = await Promise.all(files.map((f) => content(f)));
    const rows = [];
    all.forEach((d, i) => d.items.forEach((x) => { if (x.source) rows.push({ file: files[i], item: x }); }));
    const total = all.reduce((n, d) => n + d.items.length, 0);
    const groups = {};
    rows.forEach((r) => (groups[r.item.source.kind] ||= []).push(r));
    addChildren(root,
      h('h1', null, 'Источники и лицензии'),
      h('p', { class: 'lead' }, `Из ${total} текстов и заданий разделов чтения, аудирования, письма, говорения и диктантов материалы с внешним источником перечислены ниже; все остальные написаны автором тренажёра.`),
      h('p', { class: 'notice' }, 'Тексты из внешних источников используются только при открытой лицензии, как общественное достояние или с подтверждённым разрешением правообладателя. Они могут быть сокращены или адаптированы под уровень B1; в таком случае это указано.'),
      rows.length
        ? Object.entries(groups).map(([kind, arr]) => h('section', null,
            h('h2', null, KIND[kind] || kind),
            h('ul', null, arr.map(({ file, item }) => h('li', null,
              h('a', { href: `#/${file === 'dictation' ? 'drills/dictation' : file}/${file === 'dictation' ? '' : item.id}` }, item.title_et || item.title_ru || item.id),
              sourceLine(item.source),
              item.source.permission ? h('p', { class: 'muted small-text' }, `Разрешение: ${item.source.permission}`) : null,
              item.source.note ? h('p', { class: 'muted small-text' }, item.source.note) : null)))))
        : h('p', { class: 'notice' }, 'Материалов с внешним источником пока нет.'));
  },
};
