import { h, content, config, norm, setChildren, addChildren } from '../util.js';

export default {
  title: 'Список слов',
  async mount(root) {
    const [data, topicsCfg] = await Promise.all([content('vocab'), config('topics')]);
    const themes = topicsCfg.themes;
    const name = (id) => (themes.find((t) => t.id === id) || {}).name_ru || id;
    let q = '', topic = 'all';
    const input = h('input', { type: 'search', class: 'text-input', id: 'q', placeholder: 'Эстонское или русское слово', autocomplete: 'off', 'aria-describedby': 'cnt', oninput: (e) => { q = e.target.value; draw(); } });
    const select = h('select', { class: 'select', id: 't', onchange: (e) => { topic = e.target.value; draw(); } }, h('option', { value: 'all' }, 'Все темы'), themes.map((t) => h('option', { value: t.id }, t.name_ru)));
    const count = h('p', { id: 'cnt', class: 'muted', role: 'status', 'aria-live': 'polite' });
    const list = h('div', { class: 'wordlist' });
    function draw() {
      const nq = norm(q);
      const rows = data.items.filter((c) => (topic === 'all' || c.topic === topic) && (!nq || norm(c.et).includes(nq) || norm(c.ru).includes(nq) || norm(c.forms).includes(nq)));
      count.textContent = `Найдено слов: ${rows.length} из ${data.items.length}`;
      setChildren(list, rows.length ? h('ul', { class: 'words' }, rows.map((c) => h('li', null,
        h('div', null, h('strong', { lang: 'et' }, c.et), ' ', h('span', { class: 'forms', lang: 'et' }, `(${c.forms})`), ' — ', c.ru),
        h('div', { class: 'muted small-text', lang: 'et' }, c.example_et), h('div', { class: 'muted small-text' }, `${c.example_ru} · ${name(c.topic)}${c.status === 'draft' ? ' · черновик' : ''}`)))) : h('p', { class: 'notice' }, 'Ничего не найдено.'));
    }
    addChildren(root, h('p', null, h('a', { href: '#/vocab' }, '← К карточкам')), h('h1', null, 'Список слов'),
      h('p', { class: 'lead' }, 'Все слова из карточек: поиск по эстонскому, русскому или по форме слова.'),
      h('div', { class: 'grid two' }, h('div', { class: 'field' }, h('label', { for: 'q' }, 'Поиск'), input), h('div', { class: 'field' }, h('label', { for: 't' }, 'Тема'), select)), count, list);
    draw();
  },
};
