import { h, shuffle, addChildren, setChildren, pct } from '../util.js';
import { runTrainer, prioritize } from '../trainer.js';
import { standaloneQuestions } from '../index.js';
import { store, DAILY_GOAL } from '../store.js';

const SIZE = 10;

export function dailyStatus() {
  const n = store.todayCount();
  const streak = store.streak();
  return { n, streak, done: n >= DAILY_GOAL };
}

export default {
  title: 'Практика дня',
  async mount(root) {
    const all = await standaloneQuestions();
    const st = dailyStatus();
    addChildren(root,
      h('h1', null, 'Практика дня'),
      h('p', { class: 'lead' }, 'Короткая смешанная сессия: сначала то, в чём вы ошибались, затем новое и давно не повторявшееся. Десять заданий в день лучше, чем два часа раз в неделю.'),
      h('div', { class: 'card' },
        h('p', { class: 'big' }, `Сегодня: ${st.n} из ${DAILY_GOAL}`),
        h('progress', { max: DAILY_GOAL, value: Math.min(st.n, DAILY_GOAL), 'aria-label': 'Дневная цель' }),
        h('p', { class: 'muted' }, st.streak ? `Серия: ${st.streak} ${plural(st.streak)} подряд.` : 'Серия начнётся после первого ответа сегодня.'),
        st.done && h('p', { class: 'ok-text' }, 'Дневная цель выполнена — можно заниматься дальше, если хочется.')));
    const area = h('div', { class: 'trainer' });
    root.append(area);

    function start() {
      // задания из диагностики не больше 3, чтобы не перекосить сессию
      const entries = prioritize(all.map((e) => ({ ...e })));
      const picked = [];
      let diag = 0;
      for (const e of entries) {
        if (e.module === 'diagnostic') { if (diag >= 3) continue; diag++; }
        picked.push(e);
        if (picked.length === SIZE) break;
      }
      runTrainer(area, shuffle(picked), { again: start, extraButtons: [h('a', { class: 'btn', href: '#/vocab' }, 'Карточки'), h('a', { class: 'btn', href: '#/drills' }, 'Тренажёры')] });
    }
    setChildren(area, h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать сессию')));
  },
};

function plural(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
  return 'дней';
}
