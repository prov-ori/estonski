import { h, content, config, pct, setChildren, addChildren, topicMap } from '../util.js';
import { filteredList, nextLink, splitView } from '../widgets.js';
import { questionSet, saveResults } from '../question.js';
import { store } from '../store.js';
import { confirmDialog } from '../dialog.js';
import { isExamMode, MAX_PLAYS_EXAM } from '../prefs.js';
import { sourceLine } from '../textpane.js';
import { seriesLinks } from '../series.js';
import { findEtVoice, resetVoice, createPlayer, speechSupported, allVoices, voiceKind, setPreferredVoice } from '../speech.js';

/**
 * Плеер + стенограмма. Возвращает {el, reveal(), destroy(), hasVoice()}.
 * Если эстонского голоса нет — честно сообщаем и даём явную кнопку «Показать текст»; текст всегда доступен после проверки.
 */
export function listeningBlock(item, { onVoice, maxPlays } = {}) {
  const limit = maxPlays || (isExamMode() ? MAX_PLAYS_EXAM : 0);
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, 'Ищу эстонский голос…');
  const plays = h('span', { class: 'muted' }, 'Прослушиваний: 0');
  const transcript = h('details', { class: 'transcript', hidden: true },
    h('summary', null, 'Текст записи'),
    item.script_et.map((l) => h('p', { lang: 'et' }, item.script_et.some((x) => x.sp === 'B') ? h('strong', null, `${l.sp}: `) : null, l.text)));
  const controls = h('div', { class: 'row' });
  const el = h('div', { class: 'card listening' }, status, controls, plays, transcript, item.source && sourceLine(item.source));
  let player = null, count = 0, voiceFound = false, destroyed = false, generation = 0, heard = false, revealed = false;
  let mode = 'audio', audioFailed = false, audioEl = null;

  /** Запись из config/audio.json (создаёт tools/gen-audio.js), если она есть для этого задания. */
  async function audioEntry() {
    try { const e = ((await config('audio')).items || {})[item.id]; return e && e.file ? e : null; } catch { return null; }
  }
  function stopAudio() { if (audioEl) { try { audioEl.pause(); audioEl.currentTime = 0; } catch { /* ignore */ } } }

  // MP3 playback never waits for or requires system speech voices.
  function initAudio(entry) {
    voiceFound = true;
    onVoice && onVoice(true);
    const audio = h('audio', { src: entry.file, preload: 'metadata', controls: !limit, 'aria-label': 'Запись задания' });
    audioEl = audio;
    let fresh = true;
    const updateCount = () => { plays.textContent = 'Прослушиваний: ' + count + (limit ? ' из ' + limit : ''); };
    const rate = h('select', { class:'select', 'aria-label':'Скорость записи', onchange: () => { audio.playbackRate = Number(rate.value); } },
      [0.75, 0.8, 1, 1.15, 1.25].map(v => h('option', { value:v, selected:v===1 }, v+'×')));
    status.textContent = 'Запись тренажёра: ' + (entry.engine === 'neural' ? 'эстонские нейроголоса Anu и Kert.' : 'синтетическая речь.') + ' Устанавливать голос не нужно.';
    const playBtn = h('button', { class:'btn primary', type:'button', onclick: async () => {
      if (destroyed || (limit && count >= limit)) return;
      audio.currentTime = 0; fresh = true;
      playBtn.disabled = true;
      try { await audio.play(); } catch { if (!destroyed) { playBtn.disabled = false; status.textContent = 'Не удалось запустить запись. Нажмите «Слушать» ещё раз.'; } }
    } }, '▶ Слушать');
    const pauseBtn = h('button', { class:'btn', type:'button', disabled:true, onclick: async () => {
      if (!audio.paused) audio.pause();
      else { try { await audio.play(); } catch { status.textContent = 'Не удалось продолжить. Повторите попытку.'; } }
    } }, 'Пауза');
    const stopBtn = h('button', { class:'btn', type:'button', disabled:true, onclick: () => {
      audio.pause(); audio.currentTime = 0; fresh = true;
      pauseBtn.disabled = true; stopBtn.disabled = true;
      playBtn.disabled = !!limit && count >= limit;
      status.textContent = playBtn.disabled ? 'Лимит прослушиваний исчерпан.' : 'Остановлено.';
    } }, '■ Стоп');
    audio.addEventListener('playing', () => {
      if (destroyed) { audio.pause(); return; }
      if (fresh) { if (limit && count >= limit) { audio.pause(); return; } count++; fresh = false; updateCount(); }
      heard = true; playBtn.disabled = true; pauseBtn.disabled = false; stopBtn.disabled = false;
      pauseBtn.textContent = 'Пауза'; status.textContent = 'Звучит запись…';
    });
    audio.addEventListener('pause', () => { if (!destroyed && !audio.ended) { pauseBtn.textContent = 'Продолжить'; status.textContent = 'Пауза.'; } });
    audio.addEventListener('ended', () => {
      fresh = true; playBtn.disabled = !!limit && count >= limit; pauseBtn.disabled = true; stopBtn.disabled = true;
      status.textContent = playBtn.disabled ? 'Лимит прослушиваний исчерпан.' : 'Готово. Можно прослушать ещё раз.';
    });
    audio.addEventListener('error', () => { if (!destroyed && audio === audioEl) { audioFailed = true; init(); } });
    setChildren(controls, audio, h('div', {class:'row'}, playBtn, pauseBtn, stopBtn, h('label',null,'Скорость ',rate)),
      !limit && h('div',{class:'row'},
        h('button',{class:'btn',type:'button',onclick:()=>{if(Number.isFinite(audio.duration)) audio.currentTime=Math.max(0,audio.currentTime-10);}},'↶ 10 секунд'),
        h('a',{class:'btn',href:entry.file,download:item.id+'.mp3'},'Скачать MP3'),
        h('a',{class:'btn',href:entry.file,target:'_blank',rel:'noopener'},'Открыть аудио отдельно')),
      h('button', {class:'btn ghost',type:'button',onclick:reveal},'Показать текст'));
  }

  function reveal() { revealed = true; transcript.hidden = false; transcript.open = true; }

  async function init() {
    const current = ++generation;
    if (destroyed) return;
    player && player.stop();
    stopAudio();
    const entry = await audioEntry();
    if (destroyed || current !== generation) return;
    if (entry && !audioFailed && mode === 'audio') {
      return initAudio(entry);
    }
    const voice = await findEtVoice();
    const voices = speechSupported() ? await allVoices() : [];
    if (destroyed || current !== generation) return;
    voiceFound = !!voice;
    onVoice && onVoice(voiceFound);
    const kind = voice ? voiceKind(voice) : null;

    // выбор голоса и инструкция показываются всегда, когда эстонского голоса нет
    const voiceSel = voices.length ? h('div', { class: 'field' },
      h('label', { for: 'voice-' + item.id }, 'Голос'),
      h('select', { class: 'select', id: 'voice-' + item.id, onchange: (e) => { setPreferredVoice(e.target.value); init(); } },
        voices.map((v) => h('option', { value: v.voiceURI, selected: voice && v.voiceURI === voice.voiceURI }, `${v.name} (${v.lang})${voiceKind(v) === 'et' ? ' — эстонский' : voiceKind(v) === 'fi' ? ' — финский, близкий' : ''}`)))) : null;
    const help = kind === 'et' ? null : h('details', { class: 'voice-help' },
      h('summary', null, 'Как получить эстонский голос'),
      h('ul', null,
        h('li', null, 'Компьютер: в Microsoft Edge обычно доступны эстонские голоса (Anu, Kert) — откройте сайт в Edge.'),
        h('li', null, 'Android: Настройки → Язык и ввод → Синтез речи → Google → Установить голосовые данные → эстонский (если есть в списке).'),
        h('li', null, 'iPhone и iPad: Настройки → Универсальный доступ → Устный контент → Голоса — добавьте эстонский, если он есть.'),
        h('li', null, 'После установки закройте и снова откройте браузер и нажмите «Проверить голос ещё раз».'),
        h('li', null, 'Набор голосов зависит от устройства; если эстонского нет, пользуйтесь финским или режимом чтения.')));
    const backToAudio = entry ? h('button', { class: 'btn', type: 'button', onclick: () => { mode = 'audio'; audioFailed = false; init(); } }, audioFailed ? 'Повторить загрузку записи' : 'Вернуться к записи тренажёра') : null;
    const recheck = speechSupported() ? h('button', { class: 'btn', type: 'button', onclick: () => { resetVoice(); setChildren(status, 'Ищу голос…'); init(); } }, 'Проверить голос ещё раз') : null;

    if (!voice) {
      setChildren(status,
        h('strong', null, speechSupported() ? 'На этом устройстве нет эстонского или финского голоса. ' : 'Браузер не поддерживает синтез речи. '),
        voices.length ? 'Можно выбрать любой другой голос из списка, но эстонские слова он будет читать неверно. ' : '',
        'Запасной вариант: прочитайте текст — «Показать текст». В любом случае текст откроется после проверки ответов.');
      setChildren(controls, h('button', { class: 'btn primary', type: 'button', onclick: reveal }, 'Показать текст'), backToAudio, recheck);
      if (voiceSel) controls.append(voiceSel);
      if (help) controls.append(help);
      return;
    }
    setChildren(status,
      kind === 'et' ? h('span', null, `Голос: ${voice.name} (${voice.lang})`)
        : kind === 'fi' ? h('span', null, h('strong', null, 'Эстонского голоса нет — используется финский. '), `${voice.name} (${voice.lang}). Звучит близко к эстонскому, но с неточностями (например, õ, долгота звуков). Эстонский голос лучше — см. подсказку ниже.`)
          : h('span', null, h('strong', null, 'Выбран голос не эстонский. '), `${voice.name} (${voice.lang}). Эстонские слова он прочитает неверно — используйте только для привыкания к темпу.`));
    const rate = h('select', { class: 'select', id: 'rate-' + item.id, 'aria-label': 'Скорость речи' },
      h('option', { value: '0.75' }, 'Медленно'), h('option', { value: '0.9', selected: true }, 'Обычно'), h('option', { value: '1' }, 'Быстрее'));
    player = createPlayer(item.script_et, voice, (s) => {
      playBtn.disabled = s === 'playing' || playBtn.dataset.spent === '1'; stopBtn.disabled = s !== 'playing';
      if (s === 'ended' || s === 'stopped') status.textContent = 'Готово. Можно прослушать ещё раз.';
      if (s === 'playing') { heard = kind === 'et'; status.textContent = 'Звучит запись…'; }
      if (s === 'error') status.textContent = 'Ошибка воспроизведения. Нажмите «Слушать» ещё раз, выберите другой голос или покажите текст.';
    });
    const playBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      if (limit && count >= limit) return;
      count++; plays.textContent = `Прослушиваний: ${count}${limit ? ' из ' + limit : ''}`; player.play(parseFloat(rate.value));
      if (limit && count >= limit) { playBtn.dataset.spent = '1'; status.textContent = 'Лимит прослушиваний исчерпан.'; }
    } }, '▶ Слушать');
    const stopBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: () => player.stop() }, '■ Стоп');
    setChildren(controls, playBtn, stopBtn, rate, h('button', { class: 'btn ghost', type: 'button', onclick: reveal }, 'Показать текст'), backToAudio, recheck);
    if (voiceSel) controls.append(voiceSel);
    if (help) controls.append(help);
  }
  init();
  return { el, reveal, hasVoice: () => heard && !revealed, destroy: () => { destroyed = true; generation++; stopAudio(); if (audioEl) { audioEl.removeAttribute('src'); audioEl.load(); } if (player) player.stop(); else { try { speechSynthesis.cancel(); } catch { /* ignore */ } } } };
}

export const SYNTH_NOTE = 'Озвучка — синтез речи (готовая запись тренажёра или голос вашего устройства), а не записи с экзамена. Голос, темп, паузы и качество звука на экзамене будут другими; тренажёр помогает привыкнуть к слуховому восприятию, но не имитирует экзаменационные записи.';

function statusLine(t) {
  const sm = store.summary(t.questions.map((q) => q.id));
  const lvl = `${t.level} · ${t.questions.length} вопросов`;
  if (!sm.answered) return `${lvl} · не пройдено`;
  return sm.ok === sm.total ? `${lvl} · решено полностью ✓` : `${lvl} · верно ${sm.ok} из ${sm.total}`;
}

export default {
  title: 'Аудирование',
  async mount(root, args) {
    const data = await content('listening');
    const topicNames = await topicMap();
    const item = data.items.find((x) => x.id === args[0]);
    if (!item) {
      addChildren(root, 
        h('h1', null, 'Аудирование'),
        h('p', { class: 'notice warn' }, SYNTH_NOTE),
        filteredList(data.items, topicNames, (rows) => h('div', { class: 'grid' }, rows.map((t) =>
          h('a', { class: 'card link-card', href: `#/listening/${t.id}` }, h('h2', { lang: 'et' }, t.title_et), h('p', { class: 'muted' }, t.title_ru), h('p', { class: 'muted small-text' }, statusLine(t)))))));
      return;
    }
    const series = await seriesLinks(item, 'listening');
    const block = listeningBlock(item);
    const set = questionSet(item.questions);
    const result = h('div', { role: 'status', 'aria-live': 'polite' });
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const un = set.items.length - set.answeredCount();
      if (un && !(await confirmDialog(`Без ответа: ${un}. Проверить всё равно?`))) return;
      const r = set.gradeAll();
      saveResults(r.results, 'listening');
      block.reveal();
      checkBtn.disabled = true;
      setChildren(result, h('div', { class: 'card result' }, h('p', { class: 'big' }, `Верно: ${r.got} из ${r.max} (${pct(r.got, r.max)} %)`), h('p', { class: 'muted' }, item.explanation_ru)));
    } }, 'Проверить ответы');
    addChildren(root, 
      h('p', null, h('a', { href: '#/listening' }, '← Все записи')),
      h('h1', null, 'Аудирование: ' + item.title_ru),
      series,
      splitView([h('p', { class: 'notice warn' }, SYNTH_NOTE), block.el],
        [h('h2', null, 'Вопросы'), set.el,
      h('div', { class: 'row' }, checkBtn, nextLink(data.items, item.id, 'listening', 'Следующая запись →'), h('a', { class: 'btn', href: '#/listening' }, 'Все записи')),
      result], { leftTitle: 'запись' }));
    return () => block.destroy();
  },
};
