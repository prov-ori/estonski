import { h, content, config, shuffle, addChildren, setChildren } from '../util.js';
import { runTrainer, prioritize } from '../trainer.js';
import { store } from '../store.js';

const SIZES = [['10', '10 заданий'], ['20', '20 заданий'], ['all', 'Все задания темы']];

export default {
  title: 'Грамматика',
  async mount(root, args) {
    const [data, topicsCfg] = await Promise.all([content('grammar'), config('topics')]);
    const topics = topicsCfg.grammar;
    const filter = args[0] || 'all';
    const all = data.items;
    let size = '10';

    const countFor = (id) => all.filter((q) => q.topic === id).length;
    const missed = () => all.filter((q) => { const a = store.getAnswer(q.id); return a && !a.ok; });
    const acc = (id) => {
      let r = 0, w = 0;
      all.filter((q) => q.topic === id).forEach((q) => { const a = store.getAnswer(q.id); if (a) { r += a.r; w += a.w; } });
      return r + w ? ` · ${Math.round((100 * r) / (r + w))} %` : '';
    };
    const chip = (id, label) => h('a', { class: 'chip', href: `#/grammar/${id === 'all' ? '' : id}`, 'aria-current': id === filter ? 'true' : null }, label);

    let pool;
    if (filter === 'mistakes') pool = missed();
    else if (filter === 'all') pool = all;
    else pool = all.filter((q) => q.topic === filter);

    const sheetTopic = topics.find((t) => t.id === filter);
    addChildren(root,
      h('h1', null, 'Грамматика'),
      h('p', { class: 'lead' }, 'Выберите тему и отвечайте: проверка сразу, с объяснением по-русски. Сначала предлагаются задания, в которых вы ошибались, и ещё не виденные. В заданиях с полем ввода пользуйтесь кнопками õ ä ö ü.'),
      h('nav', { class: 'chips', 'aria-label': 'Темы грамматики' },
        chip('all', `Все (${all.length})`),
        topics.map((t) => chip(t.id, `${t.name_ru} (${countFor(t.id)})${acc(t.id)}`)),
        chip('mistakes', `Мои ошибки (${missed().length})`)),
      h('p', { class: 'muted small-text' }, 'Другие виды тренировки: ', h('a', { href: '#/drills' }, 'тренажёры'), ' (формы слов, числительные, порядок слов, диктант) и ', h('a', { href: '#/reference' }, 'справочник'), '.'),
      sheetTopic && h('details', { class: 'sheet', open: true }, h('summary', null, `Памятка: ${sheetTopic.name_ru}`), h('ul', null, sheetTopic.cheatsheet_ru.map((l) => h('li', null, l)))));

    const area = h('div', { class: 'trainer' });
    root.append(area);

    function menu() {
      if (!pool.length) {
        setChildren(area, h('p', { class: 'notice' }, filter === 'mistakes' ? 'Ошибок пока нет — отлично! Потренируйтесь на любой теме.' : 'В этой теме пока нет заданий.'));
        return;
      }
      const sel = h('select', { class: 'select', id: 'size', onchange: (e) => { size = e.target.value; } }, SIZES.map(([v, l]) => h('option', { value: v }, l)));
      sel.value = size;
      setChildren(area, h('div', { class: 'card' },
        h('p', null, `В выбранной теме заданий: ${pool.length}`),
        h('div', { class: 'field' }, h('label', { for: 'size' }, 'Размер сессии'), sel),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать'))));
    }
    function start() {
      let entries = prioritize(pool.map((q) => ({ q, module: 'grammar' })));
      if (size !== 'all') entries = entries.slice(0, Number(size));
      runTrainer(area, entries, { again: start, extraButtons: h('a', { class: 'btn', href: '#/grammar' }, 'Выбрать другую тему') });
    }
    menu();
  },
};
