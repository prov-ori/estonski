import { h, addChildren, setChildren } from '../util.js';
import { runTrainer, prioritize } from '../trainer.js';
import { standaloneQuestions } from '../index.js';
import { store } from '../store.js';

export default {
  title: 'Мои ошибки',
  async mount(root) {
    const all = await standaloneQuestions();
    const missed = all.filter((e) => { const a = store.getAnswer(e.q.id); return a && !a.ok; });
    addChildren(root,
      h('h1', null, 'Мои ошибки'),
      h('p', { class: 'lead' }, 'Здесь собраны задания из грамматики, диагностики и пробных экзаменов, на которые вы в последний раз ответили неверно. Верный ответ уберёт задание из списка.'));
    const area = h('div', { class: 'trainer' });
    root.append(area);
    if (!missed.length) {
      setChildren(area, h('p', { class: 'notice' }, 'Ошибок нет. Потренируйтесь в ', h('a', { href: '#/grammar' }, 'грамматике'), ' или пройдите ', h('a', { href: '#/daily' }, 'практику дня'), '.'));
      return;
    }
    const start = () => runTrainer(area, prioritize(missed), { again: () => { location.hash = '#/mistakes'; window.dispatchEvent(new HashChangeEvent('hashchange')); } });
    setChildren(area, h('div', { class: 'card' }, h('p', null, `Заданий с ошибками: ${missed.length}`), h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать разбор'))));
  },
};
