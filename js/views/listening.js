import { seriesLinks } from '../series.js';
import { h, content, pct, setChildren, addChildren } from '../util.js';
import { questionSet, saveResults } from '../question.js';
import { findEtVoice, resetVoice, createPlayer, speechSupported } from '../speech.js';

/**
 * Плеер + стенограмма. Возвращает {el, reveal(), destroy(), hasVoice()}.
 * Если эстонского голоса нет — честно сообщаем и даём явную кнопку «Показать текст»; текст всегда доступен после проверки.
 */
export function listeningBlock(item, { onVoice } = {}) {
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, 'Ищу эстонский голос…');
  const plays = h('span', { class: 'muted' }, 'Прослушиваний: 0');
  const transcript = h('details', { class: 'transcript', hidden: true },
    h('summary', null, 'Текст записи'),
    item.script_et.map((l) => h('p', { lang: 'et' }, item.script_et.some((x) => x.sp === 'B') ? h('strong', null, `${l.sp}: `) : null, l.text)));
  const controls = h('div', { class: 'row' });
  const el = h('div', { class: 'card listening' }, status, controls, plays, transcript);
  let player = null, count = 0, voiceFound = false;

  function reveal() { transcript.hidden = false; transcript.open = true; }

  async function init() {
    const voice = await findEtVoice();
    voiceFound = !!voice;
    onVoice && onVoice(voiceFound);
    if (!voice) {
      setChildren(status, 
        h('strong', null, speechSupported() ? 'На этом устройстве нет эстонского голоса (et-EE). ' : 'Браузер не поддерживает синтез речи. '),
        'Запасной вариант: ответьте на вопросы, прочитав текст — нажмите «Показать текст». В любом случае текст откроется после проверки ответов.');
      setChildren(controls, 
        h('button', { class: 'btn primary', type: 'button', onclick: reveal }, 'Показать текст'),
        speechSupported() && h('button', { class: 'btn', type: 'button', onclick: () => { resetVoice(); status.textContent = 'Ищу эстонский голос…'; init(); } }, 'Проверить голос ещё раз'));
      return;
    }
    status.textContent = `Голос: ${voice.name} (${voice.lang})`;
    const rate = h('select', { class: 'select', id: 'rate-' + item.id, 'aria-label': 'Скорость речи' },
      h('option', { value: '0.75' }, 'Медленно'), h('option', { value: '0.9', selected: true }, 'Обычно'), h('option', { value: '1' }, 'Быстрее'));
    player = createPlayer(item.script_et, voice, (s) => {
      playBtn.disabled = s === 'playing'; stopBtn.disabled = s !== 'playing';
      if (s === 'ended' || s === 'stopped') status.textContent = 'Готово. Можно прослушать ещё раз.';
      if (s === 'playing') status.textContent = 'Звучит запись…';
      if (s === 'error') status.textContent = 'Ошибка воспроизведения. Нажмите «Слушать» ещё раз или покажите текст.';
    });
    const playBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { count++; plays.textContent = `Прослушиваний: ${count}`; player.play(parseFloat(rate.value)); } }, '▶ Слушать');
    const stopBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: () => player.stop() }, '■ Стоп');
    setChildren(controls, playBtn, stopBtn, rate, h('button', { class: 'btn ghost', type: 'button', onclick: reveal }, 'Показать текст'));
  }
  init();
  return { el, reveal, hasVoice: () => voiceFound, destroy: () => { if (player) player.stop(); else { try { speechSynthesis.cancel(); } catch { /* ignore */ } } } };
}

export const SYNTH_NOTE = 'Озвучка — это синтез речи вашего устройства (Web Speech API), а не записи с экзамена. Голос, темп, паузы и качество звука на экзамене будут другими; тренажёр помогает привыкнуть к слуховому восприятию, но не имитирует экзаменационные записи.';

export default {
  title: 'Аудирование',
  async mount(root, args) {
    const data = await content('listening');
    const item = data.items.find((x) => x.id === args[0]);
    const series = await seriesLinks(item, 'listening');
    if (series) root.append(series);
    if (!item) {
      addChildren(root, 
        h('h1', null, 'Аудирование'),
        h('p', { class: 'notice warn' }, SYNTH_NOTE),
        h('div', { class: 'grid' }, data.items.map((t) =>
          h('a', { class: 'card link-card', href: `#/listening/${t.id}` }, h('h3', { lang: 'et' }, t.title_et), h('p', { class: 'muted' }, t.title_ru), h('p', { class: 'muted small-text' }, `${t.questions.length} вопросов`)))));
      return;
    }
    const block = listeningBlock(item);
    const set = questionSet(item.questions);
    const result = h('div', { role: 'status', 'aria-live': 'polite' });
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      const un = set.items.length - set.answeredCount();
      if (un && !window.confirm(`Без ответа: ${un}. Проверить всё равно?`)) return;
      const r = set.gradeAll();
      saveResults(r.results, 'listening');
      block.reveal();
      checkBtn.disabled = true;
      setChildren(result, h('div', { class: 'card result' }, h('p', { class: 'big' }, `Верно: ${r.got} из ${r.max} (${pct(r.got, r.max)} %)`), h('p', { class: 'muted' }, item.explanation_ru)));
    } }, 'Проверить ответы');
    addChildren(root, 
      h('p', null, h('a', { href: '#/listening' }, '← Все записи')),
      h('h1', null, 'Аудирование: ' + item.title_ru),
      h('p', { class: 'notice warn' }, SYNTH_NOTE),
      block.el,
      h('h2', null, 'Вопросы'), set.el,
      h('div', { class: 'row' }, checkBtn, h('a', { class: 'btn', href: '#/listening' }, 'Другая запись')),
      result);
    return () => block.destroy();
  },
};
