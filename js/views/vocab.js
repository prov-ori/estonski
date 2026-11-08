// Карточки с системой Лейтнера: 5 коробок. Верно → коробка+1, интервал растёт; неверно → коробка 1, повтор в этой же сессии.
import { h, content, config, shuffle, norm, fmtDate, setChildren, addChildren } from '../util.js';
import { store } from '../store.js';
import { charPad, speakButton } from '../widgets.js';
import { runTrainer } from '../trainer.js';
import { vocabQuiz } from '../gen.js';

const DAY = 86400000;
const INTERVAL_DAYS = [1, 2, 4, 8, 16]; // коробки 1..5
const SESSION_SIZE = 10;

export function rate(id, ok, now = Date.now()) {
  const prev = store.getCard(id);
  const box = ok ? Math.min(5, (prev ? prev.box : 0) + 1) : 1;
  store.setCard(id, { box, due: ok ? now + INTERVAL_DAYS[box - 1] * DAY : now });
  store.touch(1);
}

export default {
  title: 'Словарь',
  async mount(root, args) {
    const [data, topicsCfg] = await Promise.all([content('vocab'), config('topics')]);
    const themes = topicsCfg.themes;
    const filter = args[0] || 'all';
    const levels = ['A2', 'B1', 'B2', 'C1'];
    const level = levels.includes(args[1]) ? args[1] : '';
    const cards = level ? data.items.filter((c) => c.level === level) : data.items;
    let dir = 'et-ru'; // et-ru | ru-et | type
    const inScope = cards.filter((c) => filter === 'all' || c.topic === filter);

    const boxCounts = () => {
      const b = [0, 0, 0, 0, 0, 0];
      cards.forEach((c) => { const r = store.getCard(c.id); b[r ? r.box : 0]++; });
      return b;
    };

    function header() {
      const b = boxCounts();
      return h('div', null,
        h('h1', null, 'Словарь'),
        h('p', { class: 'lead' }, 'Карточки по школьным темам. Правильно вспомнили — карточка уходит в следующую «коробку» и вернётся позже; ошиблись — вернётся в первую.'),
        h('nav', { class: 'chips', 'aria-label': 'Уровни словаря' },
          ['', ...levels].map((value) => h('a', { class: 'chip', href: '#/vocab/all' + (value ? '/' + value : ''), 'aria-current': value === level ? 'true' : null }, value || 'Все уровни'))),
        h('nav', { class: 'chips', 'aria-label': 'Темы словаря' },
          chip('all', `Все (${cards.length})`),
          themes.filter((t) => cards.some((c) => c.topic === t.id)).map((t) => chip(t.id, `${t.name_ru} (${cards.filter((c) => c.topic === t.id).length})`))),
        h('p', { class: 'muted', 'aria-label': 'Коробки Лейтнера' }, `Новые: ${b[0]} · коробка 1: ${b[1]} · 2: ${b[2]} · 3: ${b[3]} · 4: ${b[4]} · 5: ${b[5]}`));
    }
    function chip(id, label) {
      return h('a', { class: 'chip', href: `#/vocab/${id}${level ? '/' + level : ''}`, 'aria-current': id === filter ? 'true' : null }, label);
    }

    const area = h('div', { class: 'trainer' });
    addChildren(root, header(), area);

    function menu() {
      const now = Date.now();
      const due = inScope.filter((c) => { const r = store.getCard(c.id); return r && r.due <= now; });
      const fresh = inScope.filter((c) => !store.getCard(c.id));
      const nextDue = inScope.map((c) => store.getCard(c.id)).filter(Boolean).filter((r) => r.due > now).map((r) => r.due).sort((a, b) => a - b)[0];
      const modeSel = h('select', { class: 'select', id: 'dir', onchange: (e) => { dir = e.target.value; } },
        h('option', { value: 'et-ru' }, 'Эстонский → русский'),
        h('option', { value: 'ru-et' }, 'Русский → эстонский'),
        h('option', { value: 'type' }, 'Русский → эстонский (вводить с клавиатуры)'));
      modeSel.value = dir;
      setChildren(area, 
        h('div', { class: 'card' },
          h('p', null, `К повторению: ${due.length} · новых: ${fresh.length}`),
          nextDue && !due.length && !fresh.length && h('p', { class: 'muted' }, `Всё повторено. Следующее повторение: ${fmtDate(nextDue)}.`),
          h('div', { class: 'field' }, h('label', { for: 'dir' }, 'Режим'), modeSel),
          h('div', { class: 'row' },
            h('button', { class: 'btn primary', type: 'button', disabled: !due.length && !fresh.length, onclick: () => session([...shuffle(due), ...shuffle(fresh)].slice(0, SESSION_SIZE), false) }, 'Начать сессию'),
            h('button', { class: 'btn', type: 'button', disabled: !inScope.length, onclick: () => session(shuffle(inScope).slice(0, SESSION_SIZE), true) }, 'Потренироваться без учёта сроков'),
            h('button', { class: 'btn', type: 'button', disabled: inScope.length < 5, onclick: quiz }, 'Тест с вариантами ответа'),
            h('button', { class: 'btn', type: 'button', onclick: bankExercises }, 'Задания по словам (15)'),
            h('a', { class: 'btn ghost', href: '#/wordlist' }, 'Список слов с поиском')),
          h('p', { class: 'muted small-text' }, 'В режиме тренировки коробки не меняются.')));
    }

    async function bankExercises() {
      const g = (await content('grammar')).items.filter((q) => q.kind === 'vocab' && (filter === 'all' || q.topic === filter));
      const entries = g.map((q) => ({ q, module: 'grammar' }));
      const { prioritize } = await import('../trainer.js');
      runTrainer(area, prioritize(entries).slice(0, 15), { again: bankExercises, extraButtons: h('button', { class: 'btn', type: 'button', onclick: () => { root.replaceChildren(header(), area); menu(); } }, 'В меню') });
    }

    function quiz() {
      const qd = dir === 'et-ru' ? 'et-ru' : 'ru-et';
      const qs = vocabQuiz(inScope, qd, 10);
      runTrainer(area, qs.map((q) => ({ q, module: 'vocab' })), { again: quiz, extraButtons: h('button', { class: 'btn', type: 'button', onclick: () => { root.replaceChildren(header(), area); menu(); } }, 'В меню') });
    }

    function session(queue, practice) {
      if (!queue.length) return menu();
      const q = [...queue];
      const total = queue.length;
      let done = 0, right = 0;

      function nextCard() {
        if (!q.length) return end();
        const c = q[0];
        const reverse = dir !== 'et-ru';
        const front = reverse ? h('p', { class: 'card-front', lang: 'ru' }, c.ru) : h('p', { class: 'card-front', lang: 'et' }, c.et, c.forms && h('span', { class: 'forms' }, ` (${c.forms})`), speakButton(c.et, 'Прослушать слово'));
        const back = h('div', { class: 'card-back', hidden: true, 'aria-live': 'polite' },
          reverse ? h('p', { class: 'card-front', lang: 'et' }, c.et, c.forms && h('span', { class: 'forms' }, ` (${c.forms})`), speakButton(c.et, 'Прослушать слово')) : h('p', { class: 'card-front', lang: 'ru' }, c.ru),
          h('p', { lang: 'et' }, c.example_et, ' ', speakButton(c.example_et, 'Прослушать пример')), h('p', { class: 'muted' }, c.example_ru), h('p', { class: 'muted small-text' }, c.explanation_ru));
        const resolve = (ok) => {
          if (!practice) rate(c.id, ok);
          q.shift();
          if (ok) right++; else q.push(c); // ошибка → повтор в конце сессии
          done++;
          nextCard();
        };
        const controls = h('div', { class: 'row' });
        let typed;
        if (dir === 'type') {
          typed = h('input', { type: 'text', class: 'text-input', lang: 'et', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Эстонское слово', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check.click(); } } });
          var check = h('button', { class: 'btn primary', type: 'button', onclick: () => {
            const ok = norm(typed.value) === norm(c.et);
            typed.readOnly = true; check.hidden = true; back.hidden = false;
            verdict.textContent = ok ? 'Верно!' : `Неверно. Правильно: ${c.et}`;
            verdict.className = 'feedback ' + (ok ? 'ok' : 'bad');
            const next = h('button', { class: 'btn primary', type: 'button', onclick: () => resolve(ok) }, 'Дальше →');
            setChildren(controls, next); next.focus();
          } }, 'Проверить');
          var verdict = h('div', { role: 'status', 'aria-live': 'polite' });
          controls.append(check);
        } else {
          const know = h('button', { class: 'btn primary', type: 'button', onclick: () => resolve(true) }, 'Знаю (1)');
          const dont = h('button', { class: 'btn', type: 'button', onclick: () => resolve(false) }, 'Не знаю (2)');
          const show = h('button', { class: 'btn primary', type: 'button', onclick: () => { back.hidden = false; setChildren(controls, know, dont); know.focus(); } }, 'Показать ответ');
          controls.append(show);
          cardKeys = (e) => {
            if (e.target.closest && e.target.closest('input,textarea,select')) return;
            if (!back.hidden && e.key === '1') resolve(true);
            else if (!back.hidden && e.key === '2') resolve(false);
          };
        }
        const card = h('div', { class: 'card flash' },
          h('p', { class: 'muted', role: 'status' }, `Осталось карточек: ${q.length} · ${practice ? 'тренировка' : 'повторение'}`),
          front,
          typed && [typed, charPad(typed)],
          typeof verdict !== 'undefined' && dir === 'type' ? verdict : null,
          back, controls);
        setChildren(area, card);
        (typed || controls.querySelector('button')).focus();
      }
      function end() {
        cardKeys = null;
        setChildren(area, h('div', { class: 'card result' }, h('h2', null, 'Сессия завершена'),
          h('p', { class: 'big' }, `Карточек: ${total}`), h('p', { class: 'muted' }, `Ответов «знаю»: ${right} из ${done}. Ошибочные карточки были показаны повторно.`)),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { setChildren(root, header(), area); menu(); } }, 'В меню'), h('a', { class: 'btn', href: '#/progress' }, 'Прогресс')));
      }
      nextCard();
    }

    let cardKeys = null;
    const onKey = (e) => cardKeys && cardKeys(e);
    document.addEventListener('keydown', onKey);
    menu();
    return () => document.removeEventListener('keydown', onKey);
  },
};
