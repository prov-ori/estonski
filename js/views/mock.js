// Пробный экзамен: части подряд на таймере. Процент считается ТОЛЬКО по автоматически проверяемым частям.
import { h, content, config, countWords, pct, fmtDate, setChildren, addChildren } from '../util.js';
import { questionSet } from '../question.js';
import { store } from '../store.js';
import { timerWidget, recorderWidget, checklistWidget, bar } from '../widgets.js';
import { textBlock } from './reading.js';
import { listeningBlock, SYNTH_NOTE } from './listening.js';
import { editor } from './writing.js';
import { cardBlock } from './speaking.js';

export default {
  title: 'Пробный экзамен',
  async mount(root) {
    const [mockData, fmt, writingData, speakingData] = await Promise.all([content('mock-exam'), config('exam-format'), content('writing'), content('speaking')]);
    const mock = mockData.items[0];
    const parts = fmt.parts;
    let useTimer = true;
    let partIdx = 0;
    const done = {}; // partId -> {got,max,results,fallback} | {text} | {}
    let live = null; // {destroy, finish}
    let notice = '';

    function intro() {
      const hist = store.getMock();
      setChildren(root, 
        h('h1', null, 'Пробный экзамен'),
        h('p', { class: 'lead' }, 'Все части подряд. Ответы вводятся с клавиатуры, на экзамене в EIS — тоже. Не переключайте страницу в середине: незавершённый пробник не сохраняется.'),
        h('div', { class: 'notice warn' },
          h('p', null, h('strong', null, 'Что здесь условно. '), 'Длительность частей, их состав и порог 60 % взяты из ', h('code', null, 'config/exam-format.json'), ' с пометкой «не проверено» (verified: ', String(fmt.verified), '). Проверьте актуальный формат на ', h('a', { href: fmt.check_at, rel: 'noopener' }, 'harno.ee'), '.'),
          h('p', null, 'Процент считается только по автоматически проверяемым частям. Письмо и говорение вы оцениваете сами по чек-листам.')),
        h('ol', null, parts.map((p) => h('li', null, `${p.title_ru} — ${p.practice_minutes} мин (тренировочно)${p.scored_automatically ? '' : ', самооценка'}`))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: useTimer, onchange: (e) => { useTimer = e.target.checked; } }), h('span', null, 'Использовать таймер частей (по истечении времени ответы сохраняются и открывается следующая часть)')),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { partIdx = 0; notice = ''; startPart(); } }, 'Начать пробный экзамен')),
        hist.length > 0 && h('div', null, h('h2', null, 'Прошлые попытки'), h('ul', null, [...hist].reverse().slice(0, 5).map((r) => h('li', null, `${fmtDate(r.ts)} — ${r.pct} % (${r.got}/${r.max})`)))));
    }

    function startPart() {
      if (live) { live.destroy(); live = null; }
      if (partIdx >= parts.length) return results();
      const p = parts[partIdx];
      const q = mock.parts[p.id];
      const body = h('div');
      let finished = false;
      const finishPart = (byTimer) => {
        if (finished) return; finished = true;
        done[p.id] = { ...live.collect(), byTimer };
        if (byTimer) notice = `Время части «${p.title_ru}» вышло — ответы сохранены.`; else notice = '';
        partIdx++; startPart();
      };
      const tw = useTimer ? timerWidget({ seconds: p.practice_minutes * 60, label: 'Осталось', onEnd: () => finishPart(true), autoStart: true }) : null;
      live = build(p, q, body);
      const prevDestroy = live.destroy;
      live.destroy = () => { prevDestroy && prevDestroy(); tw && tw.timer.stop(); };
      setChildren(root, 
        h('h1', null, `Часть ${partIdx + 1} из ${parts.length}: ${p.title_ru}`),
        notice && h('p', { class: 'notice warn', role: 'status' }, notice),
        tw && h('div', { class: 'sticky-timer card' }, tw.el),
        body,
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { if (window.confirm('Завершить часть и перейти дальше? Вернуться будет нельзя.')) finishPart(false); } }, partIdx === parts.length - 1 ? 'Завершить экзамен' : 'Завершить часть →')));
      const h1 = root.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }

    function build(p, q, body) {
      if (p.id === 'listening') {
        const block = listeningBlock(q);
        const set = questionSet(q.questions);
        addChildren(body, h('p', { class: 'notice warn' }, SYNTH_NOTE), block.el, set.el);
        return { destroy: () => block.destroy(), collect: () => { const r = set.gradeAll({ reveal: false }); return { ...r, fallback: !block.hasVoice() }; } };
      }
      if (p.id === 'reading') {
        const set = questionSet(q.questions);
        addChildren(body, textBlock(q), h('h2', null, 'Вопросы'), set.el);
        return { collect: () => set.gradeAll({ reveal: false }) };
      }
      if (p.id === 'language') {
        const set = questionSet(q.questions);
        addChildren(body, set.el);
        return { collect: () => set.gradeAll({ reveal: false }) };
      }
      if (p.id === 'writing') {
        let text = '';
        const ed = editor({ range: fmt.writing_practice_words, onInput: (v) => { text = v; } });
        addChildren(body, h('div', { class: 'card' }, h('p', { class: 'q-et', lang: 'et' }, q.prompt_et), h('p', { class: 'muted' }, q.prompt_ru),
          h('ul', null, q.content_points_et.map((x, i) => h('li', null, h('span', { lang: 'et' }, x), ' ', h('span', { class: 'muted' }, `— ${q.content_points_ru[i]}`))))), ed.el);
        return { collect: () => ({ text }) };
      }
      // speaking
      const rec = recorderWidget();
      addChildren(body, cardBlock(q), rec.el);
      return { destroy: () => rec.destroy(), collect: () => ({}) };
    }

    function results() {
      const scored = parts.filter((p) => p.scored_automatically);
      let got = 0, max = 0;
      const rows = scored.map((p) => {
        const r = done[p.id] || { got: 0, max: 0, results: [] };
        got += r.got; max += r.max;
        return { p, r };
      });
      const percent = pct(got, max);
      const threshold = fmt.pass_threshold_percent;
      const rec = [];
      rows.forEach(({ r }) => (r.results || []).forEach(({ q, g }) => rec.push({ id: q.id, module: 'mock', topic: q.topic, ok: g.ok })));
      store.recordMany(rec);
      store.addMock({ ts: Date.now(), pct: percent, got, max, parts: Object.fromEntries(rows.map(({ p, r }) => [p.id, [r.got, r.max]])) });

      const wrong = rows.flatMap(({ p, r }) => (r.results || []).filter((x) => !x.g.ok).map((x) => ({ p, ...x })));
      const writeP = parts.find((p) => p.id === 'writing');
      const speakP = parts.find((p) => p.id === 'speaking');
      setChildren(root, 
        h('h1', null, 'Результат пробного экзамена'),
        h('div', { class: 'card result' },
          h('p', { class: 'big' }, `Ориентировочно: ${percent} %`),
          h('p', null, percent >= threshold ? `Это не ниже условного порога ${threshold} %.` : `Это ниже условного порога ${threshold} %.`),
          h('div', { class: 'threshold', role: 'img', 'aria-label': `Результат ${percent}%, порог ${threshold}%` },
            h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: `width:${percent}%` })), h('div', { class: 'marker', style: `left:${threshold}%` }, h('span', null, `${threshold} %`))),
          h('p', { class: 'muted' }, `Набрано ${got} из ${max} условных баллов (${fmt.practice_points_per_answer} балл за ответ).`)),
        h('p', { class: 'notice warn' }, 'Цифра — ориентир только по автоматически проверяемым частям. Письмо и говорение в процент не входят. Порог взят из config/exam-format.json (verified: ' + fmt.verified + ') — это не предсказание результата и не оценка экзамена.'),
        h('h2', null, 'По частям'),
        h('ul', null, rows.map(({ p, r }) => h('li', null, `${p.title_ru}: ${r.got} из ${r.max}`, r.byTimer ? ' (время вышло)' : '', r.fallback ? ' — голоса нет, текст был показан, часть засчитана как чтение' : ''))),
        h('h2', null, `${writeP.title_ru} (самооценка)`),
        done.writing && done.writing.text
          ? h('div', { class: 'card' }, h('p', { class: 'muted' }, `Ваш текст: ${countWords(done.writing.text)} слов.`), h('p', { lang: 'et', class: 'preline' }, done.writing.text))
          : h('p', { class: 'muted' }, 'Текст не написан.'),
        checklistWidget(writingData.checklist, {}, null).el,
        h('h2', null, `${speakP.title_ru} (самооценка)`),
        h('p', { class: 'muted' }, 'Записи с этой страницы уже удалены из памяти. Для самооценки по записи используйте раздел «Говорение».'),
        h('p', null, h('a', { href: '#/speaking' }, 'К разделу «Говорение»')),
        h('h2', null, `Разбор ошибок (${wrong.length})`),
        wrong.length ? wrong.map(({ p, q, g }) => h('details', { class: 'review bad' },
          h('summary', null, `${p.title_ru}: `, h('span', { lang: 'et' }, q.prompt_et)),
          h('p', null, 'Ваш ответ: ', g.answered ? g.given : 'нет ответа'), h('p', null, 'Верно: ', g.correct), g.note && h('p', null, g.note), h('p', null, q.explanation_ru), q.ru && h('p', { class: 'muted' }, 'Перевод: ' + q.ru)))
          : h('p', null, 'Ошибок нет.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: intro }, 'В начало'), h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
    }

    intro();
    return () => { if (live) live.destroy(); };
  },
};
