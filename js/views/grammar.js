import { h, content, config, shuffle, pct, setChildren, addChildren } from '../util.js';
import { renderQuestion } from '../question.js';
import { store } from '../store.js';

export default {
  title: 'Грамматика',
  async mount(root, args) {
    const [data, topicsCfg] = await Promise.all([content('grammar'), config('topics')]);
    const topics = topicsCfg.grammar;
    const filter = args[0] || 'all';
    const all = data.items;

    const countFor = (id) => all.filter((q) => q.topic === id).length;
    const missed = () => all.filter((q) => { const a = store.getAnswer(q.id); return a && !a.ok; });
    let pool;
    if (filter === 'mistakes') pool = missed();
    else if (filter === 'all') pool = all;
    else pool = all.filter((q) => q.topic === filter);

    const chips = h('nav', { class: 'chips', 'aria-label': 'Темы грамматики' },
      chip('all', `Все (${all.length})`),
      topics.map((t) => chip(t.id, `${t.name_ru} (${countFor(t.id)})`)),
      chip('mistakes', `Мои ошибки (${missed().length})`));
    function chip(id, label) {
      return h('a', { class: 'chip', href: `#/grammar/${id === 'all' ? '' : id}`, 'aria-current': id === filter ? 'true' : null }, label);
    }

    const sheetTopic = topics.find((t) => t.id === filter);
    addChildren(root, 
      h('h1', null, 'Грамматика'),
      h('p', { class: 'lead' }, 'Выберите тему, отвечайте — проверка сразу, с объяснением по-русски. В заданиях с полем ввода пользуйтесь кнопками õ ä ö ü.'),
      chips,
      sheetTopic && h('details', { class: 'sheet' }, h('summary', null, `Памятка: ${sheetTopic.name_ru}`), h('ul', null, sheetTopic.cheatsheet_ru.map((l) => h('li', null, l)))));

    const area = h('div', { class: 'trainer', 'aria-live': 'off' });
    addChildren(root, area);

    if (!pool.length) {
      addChildren(area, h('p', { class: 'notice' }, filter === 'mistakes' ? 'Ошибок пока нет — отличная работа! Потренируйтесь на любой теме.' : 'В этой теме пока нет заданий.'));
      return;
    }

    let queue, i, score;
    function begin() {
      queue = shuffle(pool); i = 0; score = 0;
      next();
    }
    function next() {
      if (i >= queue.length) return summary();
      const q = queue[i];
      let graded = false;
      const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => { i++; next(); } }, i === queue.length - 1 ? 'Завершить' : 'Дальше →');
      const api = renderQuestion(q, {
        immediate: true, number: null,
        onGraded: (g) => {
          if (graded) return; graded = true;
          if (g.ok) score++;
          store.recordAnswer({ id: q.id, module: 'grammar', topic: q.topic, ok: g.ok });
          nextBtn.hidden = false; nextBtn.focus();
        },
      });
      setChildren(area, 
        h('p', { class: 'muted', role: 'status' }, `Задание ${i + 1} из ${queue.length}`),
        h('progress', { max: queue.length, value: i + 1, 'aria-label': 'Прогресс сессии' }),
        h('div', { class: 'card' }, api.el, h('div', { class: 'row' }, nextBtn)));
      api.focusPrompt();
    }
    function summary() {
      setChildren(area, 
        h('div', { class: 'card result' }, h('h2', null, 'Сессия завершена'), h('p', { class: 'big' }, `${score} из ${queue.length} (${pct(score, queue.length)} %)`),
          h('p', { class: 'muted' }, 'Ошибки сохранены в «Мои ошибки» — вернитесь к ним позже.')),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => { if (filter === 'mistakes') location.hash = '#/grammar/mistakes'; begin(); } }, 'Ещё раз'),
          h('a', { class: 'btn', href: '#/grammar/mistakes' }, 'Мои ошибки'),
          h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
    }
    begin();
  },
};
