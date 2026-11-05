import { h, content, topicMap, pct, fmtDate, setChildren } from '../util.js';
import { store, DAILY_GOAL } from '../store.js';
import { bar } from '../widgets.js';

const MODNAME = { diagnostic: 'Диагностика', grammar: 'Грамматика', reading: 'Чтение', listening: 'Аудирование', mock: 'Пробный экзамен', drills: 'Тренажёры', vocab: 'Словарь (тест)' };
const MODLINK = { diagnostic: '#/diagnostic', grammar: '#/grammar', reading: '#/reading', listening: '#/listening', mock: '#/mock', drills: '#/drills', vocab: '#/vocab' };

function transferBox(rerender) {
  const msg = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp', class: 'sr-only', onchange: async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!window.confirm('Загрузить прогресс из файла? Текущий прогресс на этом устройстве будет заменён.')) { e.target.value = ''; return; }
    const r = store.importJSON(await f.text());
    if (r.ok) rerender(); else { msg.textContent = r.error; msg.className = 'notice warn'; }
    e.target.value = '';
  } });
  const dl = h('button', { class: 'btn', type: 'button', onclick: () => {
    const url = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'estonski-progress.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg.textContent = 'Файл сохранён.';
  } }, 'Скачать прогресс');
  return h('div', null, h('div', { class: 'row' }, dl, h('label', { class: 'btn', for: 'imp', tabindex: '0', role: 'button', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } }, 'Загрузить из файла'), file), msg);
}

export default {
  title: 'Прогресс',
  async mount(root) {
    const topics = await topicMap();
    const files = ['grammar', 'diagnostic', 'reading', 'listening', 'mock-exam'];
    const loaded = await Promise.all(files.map((f) => content(f)));
    const prompts = new Map(); // id -> текст вопроса
    const collect = (node) => {
      if (Array.isArray(node)) return node.forEach(collect);
      if (!node || typeof node !== 'object') return;
      if (node.id && node.prompt_et) prompts.set(node.id, node.hint ? `${node.prompt_et} ${node.hint}` : node.prompt_et);
      Object.values(node).forEach((v) => v && typeof v === 'object' && collect(v));
    };
    loaded.forEach(collect);

    const entries = Object.entries(store.state.answers);
    const render = () => {
      const ans = Object.entries(store.state.answers);
      const byMod = {}, byTopic = {};
      ans.forEach(([, a]) => {
        const m = (byMod[a.m] ||= { r: 0, w: 0 });
        m.r += a.r; m.w += a.w;
        const t = (byTopic[a.t] ||= { r: 0, w: 0, last: 0 });
        t.r += a.r; t.w += a.w;
      });
      const topicRows = Object.entries(byTopic).sort((a, b) => (a[1].r / (a[1].r + a[1].w)) - (b[1].r / (b[1].r + b[1].w)));
      const weak = topicRows.filter(([, v]) => v.r + v.w >= 3 && v.r / (v.r + v.w) < 0.7);
      const missed = ans.filter(([, a]) => !a.ok).sort((a, b) => b[1].ts - a[1].ts).slice(0, 10);
      const cards = Object.values(store.state.cards);
      const diag = store.getDiag();
      const mocks = store.getMock();
      const name = (t) => (topics.get(t) ? topics.get(t).name_ru : t);
      const link = (t) => { const g = topics.get(t)?.group; return g === 'grammar' ? `#/grammar/${t}` : g === 'themes' ? `#/vocab/${t}` : t === 'order' ? '#/drills/order' : t === 'dictation' ? '#/drills/dictation' : '#/drills'; };

      const resetBox = h('div', { class: 'reset' });
      const showConfirm = () => setChildren(resetBox, 
        h('p', { class: 'notice warn', role: 'alert' }, 'Удалить весь прогресс (ответы, карточки, черновики писем, отметки чек-листов) на этом устройстве? Это нельзя отменить.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn danger', type: 'button', onclick: () => { store.reset(); render(); } }, 'Да, удалить всё'),
          h('button', { class: 'btn', type: 'button', onclick: () => setChildren(resetBox, resetBtn) }, 'Отмена')));
      const resetBtn = h('button', { class: 'btn danger-outline', type: 'button', onclick: showConfirm }, 'Сбросить весь прогресс');
      resetBox.append(resetBtn);

      setChildren(root, 
        h('h1', null, 'Прогресс'),
        !ans.length && !cards.length && !diag
          ? h('p', { class: 'notice' }, 'Пока нет данных. Пройдите ', h('a', { href: '#/diagnostic' }, 'диагностику'), ' или потренируйтесь в ', h('a', { href: '#/grammar' }, 'грамматике'), '.')
          : null,
        h('p', { class: 'muted' }, 'Данные хранятся только в этом браузере. Процент — по последним и накопленным ответам; он ориентировочный.'),
        h('h2', null, 'Активность'),
        h('p', null, `Серия: ${store.streak()} дн. · сегодня: ${store.todayCount()} из ${DAILY_GOAL} ответов (цель на день)`),
        h('ul', { class: 'activity' }, store.lastDays(7).map((d) => h('li', null,
          h('span', { class: 'act-day' }, d.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'numeric' })),
          bar(Math.min(d.n, DAILY_GOAL), DAILY_GOAL, `Активность ${d.key}`), h('span', { class: 'muted' }, ` ${d.n}`)))),
        h('h2', null, 'По разделам'),
        Object.keys(byMod).length
          ? h('table', { class: 'table' }, h('caption', { class: 'sr-only' }, 'Сводка по разделам'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Раздел'), h('th', { scope: 'col' }, 'Верно'), h('th', { scope: 'col' }, 'Всего'), h('th', { scope: 'col' }, '%'))),
              h('tbody', null, Object.entries(byMod).map(([m, v]) => h('tr', null, h('th', { scope: 'row' }, h('a', { href: MODLINK[m] || '#/' }, MODNAME[m] || m)), h('td', null, v.r), h('td', null, v.r + v.w), h('td', null, pct(v.r, v.r + v.w) + ' %')))))
          : h('p', { class: 'muted' }, 'Нет ответов.'),
        h('h2', null, 'По темам'),
        topicRows.length
          ? h('ul', { class: 'topic-list' }, topicRows.map(([t, v]) => h('li', null,
              h('div', { class: 'topic-head' }, h('a', { href: link(t) }, name(t)), h('span', { class: 'muted' }, `${pct(v.r, v.r + v.w)} % (${v.r} из ${v.r + v.w})`)),
              bar(v.r, v.r + v.w, name(t)))))
          : h('p', { class: 'muted' }, 'Нет данных по темам.'),
        h('h2', null, 'Слабые места'),
        weak.length
          ? h('ul', null, weak.map(([t, v]) => h('li', null, h('a', { href: link(t) }, name(t)), ` — ${pct(v.r, v.r + v.w)} % за ${v.r + v.w} ответов`)))
          : h('p', { class: 'muted' }, 'Слабых тем нет (учитываются темы минимум с 3 ответами и точностью ниже 70 %).'),
        missed.length > 0 && h('div', null, h('h3', null, 'Последние ошибки'), h('p', null, h('a', { class: 'btn', href: '#/mistakes' }, 'Разобрать ошибки')),
          h('ul', null, missed.map(([id, a]) => h('li', null, h('span', { lang: 'et' }, prompts.get(id) || id), ' ', h('span', { class: 'muted small-text' }, `(${MODNAME[a.m] || a.m})`))))),
        h('h2', null, 'Словарь'),
        h('p', null, cards.length ? `Карточек в работе: ${cards.length}. В коробках 4–5: ${cards.filter((c) => c.box >= 4).length}.` : 'Карточки ещё не начаты.'),
        diag && h('div', null, h('h2', null, 'Последняя диагностика'), h('p', null, `${fmtDate(diag.ts)}: ориентировочная зона ${diag.zoneLabel}, ${diag.got} из ${diag.max}.`)),
        mocks.length > 0 && h('div', null, h('h2', null, 'Пробные экзамены'), h('ul', null, [...mocks].reverse().slice(0, 5).map((r) => h('li', null, `${fmtDate(r.ts)}: ${r.pct} % (ориентировочно)`)))),
        h('h2', null, 'Перенос между устройствами'),
        h('p', { class: 'muted' }, 'Сохраните прогресс в файл и загрузите его на другом устройстве. Файл остаётся у вас: никуда не отправляется.'),
        transferBox(render),
        h('h2', null, 'Сброс'), resetBox);
    };
    render();
  },
};
