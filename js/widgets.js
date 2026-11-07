// Общие виджеты: панель эстонских букв, таймер, запись голоса, чек-лист.
import { h, createTimer, fmtTime } from './util.js';

/** Кнопки õ ä ö ü š ž: ввод не зависит от раскладки клавиатуры. */
export function charPad(target) {
  let upper = false;
  const chars = ['õ', 'ä', 'ö', 'ü', 'š', 'ž'];
  const wrap = h('div', { class: 'charpad', role: 'group', 'aria-label': 'Эстонские буквы' });
  const btns = chars.map((c) =>
    h('button', {
      type: 'button', class: 'btn small char', lang: 'et',
      'aria-label': `Вставить ${c}`,
      onmousedown: (e) => e.preventDefault(), // не снимаем фокус с поля
      onclick: () => {
        const ch = upper ? c.toUpperCase() : c;
        const s = target.selectionStart ?? target.value.length;
        const e = target.selectionEnd ?? s;
        target.setRangeText(ch, s, e, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.focus();
      },
    }, c)
  );
  const shift = h('button', {
    type: 'button', class: 'btn small', 'aria-pressed': 'false', 'aria-label': 'Заглавные буквы',
    onmousedown: (e) => e.preventDefault(),
    onclick: () => {
      upper = !upper;
      shift.setAttribute('aria-pressed', String(upper));
      btns.forEach((b, i) => { b.textContent = upper ? chars[i].toUpperCase() : chars[i]; });
    },
  }, '⇧');
  wrap.append(h('span', { class: 'muted small-text' }, 'Буквы: '), ...btns, shift);
  return wrap;
}

/** Таймер с кнопками. Возвращает {el, timer}. */
export function timerWidget({ seconds, label = 'Таймер', onEnd, autoStart = false, compact = false }) {
  const out = h('span', { class: 'timer-out', role: 'timer', 'aria-live': 'off' }, fmtTime(seconds));
  const status = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const timer = createTimer({
    seconds,
    onTick: (s) => { out.textContent = fmtTime(s); out.classList.toggle('low', s <= 60 && s > 0); },
    onEnd: () => { status.textContent = 'Время вышло'; out.classList.add('low'); onEnd && onEnd(); },
  });
  const toggle = h('button', { type: 'button', class: 'btn small', onclick: () => {
    if (timer.running) { timer.stop(); toggle.textContent = 'Продолжить'; } else { timer.start(); toggle.textContent = 'Пауза'; }
  } }, 'Старт');
  const reset = h('button', { type: 'button', class: 'btn small ghost', onclick: () => { timer.reset(); toggle.textContent = 'Старт'; status.textContent = ''; } }, 'Сбросить');
  const el = h('div', { class: 'timer' + (compact ? ' compact' : '') },
    h('span', { class: 'timer-label' }, label + ': '), out, !compact && toggle, !compact && reset, status);
  if (autoStart) { timer.start(); toggle.textContent = 'Пауза'; }
  return { el, timer, toggle };
}

/** Запись голоса: только в памяти вкладки, никуда не отправляется. */
export function recorderWidget() {
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const takes = [];
  let active = null;
  const list = h('ul', { class: 'takes' });
  const msg = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const notice = h('p', { class: 'notice privacy' },
    h('strong', null, 'Конфиденциальность: '),
    'запись хранится только в памяти этой вкладки вашего браузера и никуда не отправляется. Если закрыть или перезагрузить страницу, записи исчезнут.');
  const recBtn = h('button', { type: 'button', class: 'btn primary', onclick: start }, '● Записать');
  const stopBtn = h('button', { type: 'button', class: 'btn', onclick: stop, disabled: true }, '■ Остановить');
  const el = h('div', { class: 'recorder' }, notice,
    supported ? h('div', { class: 'row' }, recBtn, stopBtn) : h('p', { class: 'notice warn' }, 'Ваш браузер не поддерживает запись звука (MediaRecorder). Можно потренироваться без записи или открыть сайт в современном Chrome, Firefox или Safari.'),
    msg, list);

  async function start() {
    msg.textContent = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        addTake(blob);
        active = null;
        recBtn.disabled = false; stopBtn.disabled = true;
        msg.textContent = 'Запись сохранена ниже. Прослушайте её и заполните чек-лист.';
      };
      rec.start();
      active = rec;
      recBtn.disabled = true; stopBtn.disabled = false;
      msg.textContent = 'Идёт запись…';
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      msg.textContent = denied
        ? 'Нет доступа к микрофону. Разрешите его в настройках браузера (значок замка рядом с адресом) и попробуйте снова.'
        : 'Не удалось начать запись: микрофон не найден или занят.';
    }
  }
  function stop() { if (active && active.state !== 'inactive') active.stop(); }
  function addTake(blob) {
    const url = URL.createObjectURL(blob);
    const n = takes.length + 1;
    const ext = /ogg/.test(blob.type) ? 'ogg' : /mp4/.test(blob.type) ? 'm4a' : 'webm';
    const li = h('li', null,
      h('span', { class: 'take-n' }, `Запись ${n}`),
      h('audio', { controls: true, src: url, 'aria-label': `Запись ${n}` }),
      h('a', { class: 'btn small ghost', href: url, download: `zapis-${n}.${ext}` }, 'Скачать'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { URL.revokeObjectURL(url); li.remove(); } }, 'Удалить'));
    takes.push(url);
    list.append(li);
  }
  function destroy() {
    try { if (active && active.state !== 'inactive') active.stop(); } catch { /* ignore */ }
    takes.forEach((u) => URL.revokeObjectURL(u));
  }
  return { el, destroy };
}

/** Чек-лист: groups=[{id, criterion_ru, checks_ru[]}], saved={key:true}. */
export function checklistWidget(groups, saved, onChange) {
  const state = { ...(saved || {}) };
  const total = groups.reduce((n, g) => n + g.checks_ru.length, 0);
  const tally = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const upd = () => { tally.textContent = `Отмечено ${Object.values(state).filter(Boolean).length} из ${total}`; };
  const el = h('div', { class: 'checklist' }, groups.map((g) =>
    h('fieldset', null,
      h('legend', null, g.criterion_ru),
      h('p', { class: 'muted small-text' }, g.explanation_ru),
      g.checks_ru.map((t, i) => {
        const key = `${g.id}:${i}`;
        const cb = h('input', { type: 'checkbox', checked: !!state[key], onchange: () => { state[key] = cb.checked; upd(); onChange && onChange({ ...state }); } });
        return h('label', { class: 'check' }, cb, h('span', null, t));
      }))), tally);
  upd();
  return { el };
}

export function bar(value, max, label) {
  const p = max ? Math.round((100 * value) / max) : 0;
  return h('div', { class: 'bar', role: 'img', 'aria-label': `${label}: ${p}%` }, h('div', { class: 'bar-fill', style: `width:${p}%` }));
}

/** Список с фильтром по теме: renderItems(items) → узел. Возвращает контейнер. */
export function filteredList(items, topicNames, renderItems) {
  let topic = 'all';
  const topics = [...new Set(items.map((x) => x.topic))];
  const box = h('div', { class: 'filtered' });
  const list = h('div');
  const sel = h('select', { class: 'select', id: 'topic-filter', onchange: (e) => { topic = e.target.value; draw(); } },
    h('option', { value: 'all' }, `Все темы (${items.length})`),
    topics.map((t) => h('option', { value: t }, `${topicNames.get(t) ? topicNames.get(t).name_ru : t} (${items.filter((x) => x.topic === t).length})`)));
  function draw() {
    const rows = items.filter((x) => topic === 'all' || x.topic === topic);
    list.replaceChildren(renderItems(rows));
  }
  box.append(h('div', { class: 'field' }, h('label', { for: 'topic-filter' }, 'Тема'), sel), list);
  draw();
  return box;
}

/** Ссылка на следующее задание в списке (по кругу). */
export function nextLink(items, currentId, route, label = 'Следующее задание →') {
  const i = items.findIndex((x) => x.id === currentId);
  const next = items[(i + 1) % items.length];
  return next && next.id !== currentId ? h('a', { class: 'btn primary', href: `#/${route}/${next.id}` }, label) : null;
}

/** Включает широкую раскладку страницы (две колонки). Класс снимается роутером при смене страницы. */
export function wideLayout() {
  const m = document.getElementById('main');
  if (m) m.classList.add('wide');
}

/**
 * Две колонки: материал (текст, задание, карточка) слева, ответы справа.
 * На узком экране — друг под другом; материал можно свернуть, а кнопка «↑ …» возвращает к нему.
 */
export function splitView(left, right, { leftTitle = 'Материал' } = {}) {
  const body = h('div', { class: 'pane-body' }, left);
  const toggle = h('button', {
    type: 'button', class: 'btn small pane-toggle', 'aria-expanded': 'true',
    onclick: () => {
      const c = leftPane.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!c));
      toggle.textContent = c ? `Показать: ${leftTitle}` : `Свернуть: ${leftTitle}`;
    },
  }, `Свернуть: ${leftTitle}`);
  const leftPane = h('section', { class: 'pane pane-left', 'aria-label': leftTitle, tabindex: '0' }, toggle, body);
  const toText = h('div', { class: 'to-text-wrap' }, h('button', {
    type: 'button', class: 'btn small primary to-text',
    onclick: () => {
      if (leftPane.classList.contains('collapsed')) toggle.click();
      leftPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
      leftPane.focus({ preventScroll: true });
    },
  }, `↑ ${leftTitle}`));
  const rightPane = h('section', { class: 'pane pane-right', 'aria-label': 'Задания и ответы' }, right, toText);
  return h('div', { class: 'split' }, leftPane, rightPane);
}

/** Кнопка «🔊»: появляется, только если на устройстве есть эстонский голос. */
export function speakButton(text, label = 'Прослушать') {
  const btn = h('button', { type: 'button', class: 'btn small ghost speak', 'aria-label': label, title: label, hidden: true,
    onclick: () => { import('./speech.js').then((m) => m.speakText(text)); } }, '🔊');
  import('./speech.js').then((m) => m.findEtVoice()).then((v) => { if (v) btn.hidden = false; });
  return btn;
}
