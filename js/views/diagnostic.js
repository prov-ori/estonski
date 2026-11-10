import { h, content, topicMap, pct, fmtDate, setChildren, shuffle } from '../util.js';
import { renderQuestion } from '../question.js';
import { store } from '../store.js';
import { confirmDialog } from '../dialog.js';

function computeZone(byLevel, rules) {
  const acc = (l) => (byLevel[l] && byLevel[l].max ? byLevel[l].got / byLevel[l].max : 0);
  if (acc('B1') >= rules.above.b1_min && acc('B2') >= rules.above.b2_min) return 'above';
  if (acc('A2') >= rules.b1.a2_min && acc('B1') >= rules.b1.b1_min) return 'b1';
  return 'a2';
}
const ZONE_TEXT = {
  a2: ['A2 (ниже B1)', 'Базовые темы ещё нестабильны. Начните с грамматики и словаря по слабым темам.'],
  b1: ['B1', 'Результат в районе уровня B1. Закрепляйте слабые темы и пробуйте все модули.'],
  above: ['выше B1', 'Вы уверенно справились с заданиями B1 и частью заданий выше. Проверьте себя на пробном экзамене.'],
};

export default {
  title: 'Диагностика',
  async mount(root, args) {
    const [data, topics] = await Promise.all([content('diagnostic'), topicMap()]);
    const advanced = args[0] === 'advanced';
    const title = advanced ? 'Диагностика B2–C1' : 'Диагностика';
    const bank = data.items.filter((q) => (q.advanced === true) === advanced);
    const quota = advanced ? { B2: 8, C1: 8 } : { A2: 7, B1: 8, B2: 5 };
    const alternateMode = () => h('a', { class: 'btn', href: advanced ? '#/diagnostic' : '#/diagnostic/advanced' },
      advanced ? 'Диагностика A2–B2' : 'Диагностика B2–C1');
    let items = [];
    const sample = () => Object.entries(quota).flatMap(([level, n]) =>
      shuffle(bank.filter((q) => q.level === level)).slice(0, n));
    const answers = [];
    let idx = 0;

    function intro() {
      const last = store.getDiag(advanced);
      setChildren(root,
        h('h1', null, title),
        h('p', { class: 'lead' }, advanced
          ? `8 вопросов B2 и 8 вопросов C1 из банка в ${bank.length} заданий. Вы будете выбирать формулировки, редактировать фразы и вводить формы слов. Ответы и объяснения появятся в конце.`
          : `20 вопросов уровней A2, B1 и B2 из банка в ${bank.length} заданий. Ответы и объяснения появятся в конце.`),
        h('p', { class: 'notice warn' }, advanced
          ? 'Тест проверяет отдельные темы грамматики и редактирования. Уровень владения языком по этому результату определить нельзя.'
          : 'Это не оценка экзамена и не прогноз результата. Двадцати вопросов мало для точной оценки: итог — только ориентировочная зона и список тем, на которые стоит обратить внимание.'),
        last && h('p', { class: 'muted' }, `Прошлый результат (${fmtDate(last.ts)}): ${advanced ? '' : last.zoneLabel + ', '}${last.got} из ${last.max}.`),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onclick: start }, last ? 'Пройти заново' : 'Начать'),
          alternateMode()));
    }

    function start() {
      answers.length = 0;
      items = sample();
      items.forEach((q) => answers.push(renderQuestion(q, { number: null })));
      idx = 0;
      show();
    }

    function show() {
      const api = answers[idx];
      const last = idx === items.length - 1;
      const prog = h('progress', { max: items.length, value: idx + 1, 'aria-label': 'Прогресс теста' });
      setChildren(root, 
        h('h1', null, title),
        h('p', { class: 'muted', role: 'status' }, `Вопрос ${idx + 1} из ${items.length}`), prog,
        h('div', { class: 'card' }, api.el),
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', disabled: idx === 0, onclick: () => { idx--; show(); } }, '← Назад'),
          last
            ? h('button', { class: 'btn primary', type: 'button', onclick: finish }, 'Завершить тест')
            : h('button', { class: 'btn primary', type: 'button', onclick: () => { idx++; show(); } }, 'Дальше →')));
      const h1 = root.querySelector('h1'); if (h1) h1.setAttribute('tabindex', '-1');
      api.focusPrompt();
    }

    async function finish() {
      const unanswered = answers.filter((a) => !a.answered()).length;
      if (unanswered && !(await confirmDialog(`Без ответа осталось вопросов: ${unanswered}. Они будут засчитаны как неверные. Завершить?`, { ok: 'Завершить' }))) return;
      const byLevel = {}, byTopic = {};
      let got = 0, max = 0;
      const rec = [];
      answers.forEach((api) => {
        const g = api.grade(), q = api.q;
        got += g.got; max += g.max;
        (byLevel[q.level] ||= { got: 0, max: 0 }).got += g.got; byLevel[q.level].max += g.max;
        (byTopic[q.topic] ||= { got: 0, max: 0 }).got += g.got; byTopic[q.topic].max += g.max;
        rec.push({ id: q.id, module: 'diagnostic', topic: q.topic, ok: g.ok });
      });
      store.recordMany(rec);
      const threshold = advanced ? 1 : data.zone_rules.weak_topic_below;
      const weak = Object.entries(byTopic).filter(([, v]) => v.got / v.max < threshold).map(([t]) => t);
      const result = { ts: Date.now(), got, max, byLevel, weak };
      if (!advanced) {
        result.zone = computeZone(byLevel, data.zone_rules);
        result.zoneLabel = ZONE_TEXT[result.zone][0];
      }
      store.setDiag(result, advanced);
      showResult(result);
    }

    function showResult(r) {
      const name = (t) => (topics.get(t) ? topics.get(t).name_ru : t);
      const link = (t) => (topics.get(t)?.group === 'grammar' ? `#/grammar/${t}` : topics.get(t)?.group === 'themes' ? '#/vocab' : '#/');
      setChildren(root,
        h('h1', null, advanced ? 'Результат диагностики B2–C1' : 'Результат диагностики'),
        h('div', { class: 'card result' },
          !advanced && h('p', { class: 'big' }, `Ориентировочная зона: ${r.zoneLabel}`),
          !advanced && h('p', null, ZONE_TEXT[r.zone][1]),
          h('p', { class: advanced ? 'big' : 'muted' }, `Верно: ${r.got} из ${r.max} (${pct(r.got, r.max)} %).`)),
        h('p', { class: 'notice warn' }, advanced
          ? 'Баллы показывают результат по этому набору заданий. Для проверки навыков чтения, аудирования, письма и говорения выберите пробный вариант.'
          : 'Это ориентир по 20 вопросам, а не оценка экзамена. Не используйте результат для выводов о сдаче.'),
        h('h2', null, 'По уровням'),
        h('ul', null, Object.entries(r.byLevel).map(([l, score]) => h('li', null, `${!advanced && l === 'B2' ? 'выше B1' : l}: ${score.got} из ${score.max}`))),
        h('h2', null, advanced ? 'Темы, в которых были ошибки' : 'Слабые темы'),
        r.weak.length
          ? h('ul', null, r.weak.map((t) => h('li', null, advanced ? name(t) : h('a', { href: link(t) }, name(t)))))
          : h('p', null, 'Явных слабых тем не найдено — продолжайте тренировать все разделы.'),
        h('h2', null, 'Разбор ответов'),
        answers.map((api, i) => {
          const g = api.grade();
          return h('details', { class: 'review ' + (g.ok ? 'ok' : 'bad') },
            h('summary', null, `${i + 1}. ${g.ok ? '✓' : '✗'} `, h('span', { lang: 'et' }, api.q.prompt_et)),
            h('p', null, 'Ваш ответ: ', h('span', { lang: api.q.options_lang || 'et' }, g.given)),
            !g.ok && h('p', null, 'Верно: ', h('span', { lang: api.q.options_lang || 'et' }, g.correct)),
            h('p', null, api.q.explanation_ru));
        }),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Пройти заново'),
          advanced && r.weak.length > 0 && h('a', { class: 'btn', href: '#/mistakes' }, 'Повторить ошибки'),
          advanced && h('a', { class: 'btn', href: '#/mock' }, 'Пробные варианты'),
          alternateMode(),
          h('a', { class: 'btn', href: '#/progress' }, 'К прогрессу')));
      const heading = root.querySelector('h1');
      heading.tabIndex = -1;
      heading.focus();
    }

    intro();
  },
};
