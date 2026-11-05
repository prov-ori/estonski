import { h, content, config, addChildren } from '../util.js';
import { numberWord, ordinalWord, timeWords, monthName } from '../gen.js';
import { CASE_INFO } from '../gen.js';

const table = (head, rows, cap) => h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('caption', { class: 'sr-only' }, cap),
  h('thead', null, h('tr', null, head.map((x) => h('th', { scope: 'col' }, x)))),
  h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => (i === 0 ? h('th', { scope: 'row', lang: 'et' }, c) : h('td', { lang: 'et' }, c))))))));

export default {
  title: 'Справочник',
  async mount(root) {
    const [topics, forms, writing] = await Promise.all([config('topics'), content('forms'), content('writing')]);
    const nouns = forms.items.filter((x) => x.id.startsWith('f-n-'));
    const verbs = forms.items.filter((x) => x.id.startsWith('f-v-'));
    const keys = Object.keys(CASE_INFO);
    addChildren(root,
      h('h1', null, 'Справочник'),
      h('p', { class: 'lead' }, 'Памятки и таблицы для быстрого обращения. Все материалы — черновики автора, сверяйте со словарём и учителем.'),
      h('h2', null, 'Памятки по темам'),
      topics.grammar.map((t) => h('details', { class: 'sheet' }, h('summary', null, t.name_ru), h('ul', null, t.cheatsheet_ru.map((l) => h('li', null, l))))),
      h('h2', null, 'Падежи: вопросы'),
      table(['Падеж', 'Вопрос'], [['nimetav', 'кто? что?'], ...keys.map((k) => [CASE_INFO[k][0], CASE_INFO[k][1]])], 'Падежи и вопросы'),
      h('h2', null, 'Падежи существительных: примеры'),
      table(['Слово', 'Род.', 'Парт.', 'Куда?', 'Где?', 'Откуда?', 'Кому/на что', 'Где (на)', 'От чего'], nouns.map((n) => [`${n.et} (${n.ru})`, n.forms.gen, n.forms.part, n.forms.ill, n.forms.ine, n.forms.ela, n.forms.all, n.forms.ade, n.forms.abl]), 'Формы существительных'),
      h('h2', null, 'Глаголы: основные формы'),
      table(['Глагол', 'da-инф.', 'ma, я', 'ta, он', 'прош., я', '-nud', 'повел.'], verbs.map((v) => [`${v.et} (${v.ru})`, v.forms.da, v.forms.pres1, v.forms.pres3, v.forms.past1, v.forms.nud, v.forms.imp]), 'Формы глаголов'),
      h('h2', null, 'Числа 0–100'),
      table(['Число', 'Слово'], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 30, 40, 50, 60, 70, 80, 90, 99, 100].map((n) => [String(n), numberWord(n)]), 'Числа'),
      h('h2', null, 'Порядковые числительные и месяцы'),
      table(['№', 'Порядковое', 'Месяц'], Array.from({ length: 12 }, (_, i) => [String(i + 1), ordinalWord(i + 1), monthName(i)]), 'Порядковые и месяцы'),
      h('h2', null, 'Время'),
      table(['Время', 'По-эстонски'], [[7, 0], [7, 15], [7, 30], [7, 45], [12, 15], [12, 30], [12, 45]].map(([a, b]) => [`${a}.${String(b).padStart(2, '0')}`, timeWords(a, b)]), 'Время'),
      h('p', { class: 'muted' }, 'Запомните: 7.30 = pool kaheksa (половина восьмого) — называется следующий час.'),
      h('h2', null, 'Связки для письма'),
      writing.connectors.map((c) => h('p', null, h('strong', { lang: 'et' }, c.et), ` — ${c.ru}`)));
  },
};
