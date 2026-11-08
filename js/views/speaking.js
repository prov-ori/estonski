import { h, content, config, addChildren, topicMap } from '../util.js';
import { store } from '../store.js';
import { seriesLinks } from '../series.js';
import { timerWidget, recorderWidget, checklistWidget, filteredList, nextLink, splitView, speakButton } from '../widgets.js';

export function cardBlock(c) {
  if (c.kind === 'monologue' || c.kind === 'interview') {
    return h('div', null,
      h('p', { class: 'lead' }, c.situation_ru),
      h('div', { class: 'card role' }, h('h2', null, c.kind === 'monologue' ? 'План монолога' : 'Вопросы интервьюера'), h('ol', null, c.prompts_et.map((p) => h('li', { lang: 'et' }, p, ' ', speakButton(p, 'Прослушать вопрос'))))),
      h('details', null, h('summary', null, 'Полезные фразы'), h('ul', null, c.phrases_et.map((p) => h('li', { lang: 'et' }, p)))),
      c.model_et && h('details', { class: 'sample' }, h('summary', null, 'Образец монолога (откройте после своей попытки)'), h('p', { lang: 'et' }, c.model_et), h('p', { class: 'muted small-text' }, 'Это один из возможных вариантов, не единственно верный.')));
  }
  const role = (r) => h('div', { class: 'card role' }, h('h2', null, r.title_ru), h('ul', null, r.prompts_et.map((p) => h('li', { lang: 'et' }, p))));
  return h('div', null,
    h('p', { class: 'lead' }, c.situation_ru),
    h('div', { class: 'grid two' }, role(c.role_a), role(c.role_b)),
    h('details', null, h('summary', null, 'Полезные фразы'), h('ul', null, c.phrases_et.map((p) => h('li', { lang: 'et' }, p)))));
}

export default {
  title: 'Говорение',
  async mount(root, args) {
    const [data, fmt] = await Promise.all([content('speaking'), config('exam-format')]);
    const topicNames = await topicMap();
    const card = data.items.find((x) => x.id === args[0]);
    if (!card) {
      addChildren(root, 
        h('h1', null, 'Говорение'),
        h('p', { class: 'lead' }, 'Выберите диалог, интервью или монолог. Запишите ответ и оцените его по чек-листу.'),
        h('p', { class: 'notice privacy' }, h('strong', null, 'Запись только у вас. '), 'Звук записывается в браузере и никуда не отправляется.'),
        filteredList(data.items, topicNames, (rows) => h('div', { class: 'grid' }, rows.map((t) => h('a', { class: 'card link-card', href: `#/speaking/${t.id}` }, h('h2', null, t.title_ru), h('p', { class: 'muted small-text' }, t.level), h('p', { class: 'muted' }, t.situation_ru)))), { withLevels: true }));
      return;
    }
    const series = await seriesLinks(card, 'speaking');
    const saved = store.getSpeaking(card.id);
    const tw = timerWidget({ seconds: fmt.speaking_practice_minutes * 60, label: 'Таймер' });
    const rec = recorderWidget();
    const cl = checklistWidget(data.checklist, saved.checks, (checks) => store.setSpeaking(card.id, { checks }));
    addChildren(root, 
      h('p', null, h('a', { href: '#/speaking' }, '← Все карточки'), '  ', nextLink(data.items, card.id, 'speaking', 'Следующая карточка →'), '  ', h('button', { class: 'btn small', type: 'button', onclick: () => window.print() }, 'Печать')),
      h('h1', null, 'Говорение: ' + card.title_ru),
      series,
      splitView([cardBlock(card), h('p', { class: 'muted' }, card.explanation_ru)],
      [h('div', { class: 'card' }, tw.el, h('p', { class: 'muted small-text' }, `Время тренировочное (${fmt.speaking_practice_minutes} мин, config/exam-format.json, не проверено на harno.ee).`)),
      h('h2', null, 'Запись и прослушивание'), rec.el,
      h('h2', null, 'Самооценка'), h('p', { class: 'muted' }, 'Прослушайте запись и отметьте выполненное. Оценки от тренажёра нет.'), cl.el], { leftTitle: 'карточка' }));
    return () => { tw.timer.stop(); rec.destroy(); };
  },
};
