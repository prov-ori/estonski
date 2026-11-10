import { h, content, topicMap, pct, fmtDate, addChildren, setChildren } from '../util.js';
import { store, DAILY_GOAL } from '../store.js';
import { getPrefs, setPref } from '../prefs.js';
import { standaloneQuestions } from '../index.js';
import { dueCount } from '../trainer.js';

const DAY = 86400000;
const monday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

/** Фаза подготовки по числу оставшихся недель. */
export function phase(weeksLeft) {
  if (weeksLeft > 16) return { name: 'База', text: 'Закрепляем грамматику и слова, проходим уроки, начинаем читать и слушать. Цель недели — привычка заниматься ежедневно.', mocks: 0 };
  if (weeksLeft > 6) return { name: 'Навыки', text: 'Больше чтения, аудирования, письма и говорения; ошибки разбираем регулярно. Раз в 3–4 недели — пробный экзамен.', mocks: 0.3 };
  if (weeksLeft > 0) return { name: 'Пробники и повторение', text: 'Каждую неделю пробный экзамен или его часть, разбор ошибок и повторение слабых тем. Режим экзамена включайте для чтения и аудирования.', mocks: 1 };
  return { name: 'Экзамен прошёл или идёт сегодня', text: 'Дата в прошлом — выберите новую дату экзамена.', mocks: 0 };
}

export default {
  title: 'План подготовки',
  async mount(root) {
    const prefs = getPrefs();
    const [all, topics, writing] = await Promise.all([standaloneQuestions(), topicMap(), content('writing')]);
    const today = new Date();
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const left = (Date.parse(prefs.examDate) - todayUTC) / DAY;
    const ph = phase(Math.ceil(left / 7));
    const ws = monday();
    const weekAnswers = Object.values(store.state.answers).filter((a) => a.ts >= ws);
    const byMod = (m) => weekAnswers.filter((a) => a.m === m).length;
    const writingDone = writing.items.map((item) => store.getWriting(item.id)).filter((w) => w.ts >= ws && w.text?.trim()).length;
    const speakingDone = Object.values(store.state.speaking).filter((s) => s.ts >= ws).length;
    const daysActive = store.lastDays(7).filter((d) => d.date.getTime() >= ws && d.n > 0).length;
    const mockThisWeek = store.getMock().filter((m) => m.ts >= ws).length;
    const mockTarget = ph.mocks >= 1 ? 1 : 0;
    const due = dueCount(all);
    const stats = {};
    Object.values(store.state.answers).forEach((a) => { const t = (stats[a.t] ||= { r: 0, w: 0 }); t.r += a.r; t.w += a.w; });
    const weak = Object.entries(stats).filter(([, v]) => v.r + v.w >= 3 && v.r / (v.r + v.w) < 0.7).sort((a, b) => a[1].r / (a[1].r + a[1].w) - b[1].r / (b[1].r + b[1].w)).slice(0, 3);
    const diag = store.getDiag() || store.getDiag(true);

    const row = (label, done, target, href, unit = '') => h('li', { class: 'plan-row' },
      h('a', { href }, label), h('span', { class: done >= target ? 'ok-text' : 'muted' }, ` ${Math.min(done, 9999)} из ${target}${unit}${done >= target ? ' ✓' : ''}`),
      h('progress', { max: target, value: Math.min(done, target), 'aria-label': label }));

    const dateInput = h('input', { type: 'date', class: 'text-input', id: 'exam-date', value: prefs.examDate, onchange: (e) => { if (e.target.value) { setPref('examDate', e.target.value); location.hash = '#/plan'; window.dispatchEvent(new HashChangeEvent('hashchange')); } } });
    addChildren(root,
      h('h1', null, 'План подготовки'),
      h('p', { class: 'lead' }, 'Недельные цели считаются по вашим ответам. Тренажёр ничего не отправляет и не напоминает сам — заглядывайте сюда раз в день.'),
      h('div', { class: 'card' },
        h('p', { class: 'big' }, left > 0 ? `До экзамена: ${left} дн.` : left === 0 ? 'Экзамен сегодня' : 'Дата экзамена прошла'),
        h('div', { class: 'field' }, h('label', { for: 'exam-date' }, 'Дата экзамена (по умолчанию условная — апрель 2027; уточните на harno.ee)'), dateInput),
        h('p', null, h('strong', null, `Этап: ${ph.name}. `), ph.text)),
      !diag && h('p', { class: 'notice' }, 'Диагностики ещё не было — ', h('a', { href: '#/diagnostic' }, 'пройдите её'), ', чтобы увидеть слабые темы.'),
      h('div', { class: 'card' }, h('h2', null, 'Цели этой недели'),
        h('ul', { class: 'plan' },
          row('Дни занятий', daysActive, 5, '#/daily', ' дн.'),
          row('Практика и грамматика (ответов)', byMod('grammar') + byMod('drills'), DAILY_GOAL * 5, '#/daily'),
          row('Чтение (ответов)', byMod('reading'), 12, '#/reading'),
          row('Аудирование (ответов)', byMod('listening'), 10, '#/listening'),
          row('Письмо (текстов)', writingDone, 1, '#/writing'),
          row('Говорение (записей и самооценок)', speakingDone, 1, '#/speaking'),
          mockTarget ? row('Пробный экзамен', mockThisWeek, mockTarget, '#/mock') : null)),
      h('div', { class: 'card' }, h('h2', null, 'На что обратить внимание'),
        h('p', null, due ? `К повторению сегодня: ${due} заданий — ` : 'К повторению заданий нет. ', due ? h('a', { href: '#/daily' }, 'начать практику дня') : ''),
        weak.length ? h('ul', null, weak.map(([t, v]) => h('li', null, h('a', { href: topics.get(t)?.group === 'grammar' ? `#/grammar/${t}` : '#/lessons' }, topics.get(t) ? topics.get(t).name_ru : t), ` — ${pct(v.r, v.r + v.w)} % за ${v.r + v.w} ответов; полезно открыть `, h('a', { href: '#/lessons' }, 'урок'), ' по теме.'))) : h('p', { class: 'muted' }, 'Слабых тем пока нет (нужно хотя бы по 3 ответа в теме).')),
      h('p', { class: 'muted small-text' }, `Недельные цели — ориентир автора, а не требование экзамена. Неделя считается с понедельника (${fmtDate(ws).slice(0, 10)}).`));
    void setChildren;
  },
};
