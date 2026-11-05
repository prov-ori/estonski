// Web Speech API (синтез речи) для аудирования. Голос et-EE может отсутствовать — это нормальный сценарий.
let voicePromise = null;

export const speechSupported = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export function resetVoice() { voicePromise = null; }

// ---- выбор голоса: выбранный пользователем → эстонский → финский (самый близкий) ----
const VOICE_KEY = 'estonski.voice';
const savedVoice = () => { try { return localStorage.getItem(VOICE_KEY); } catch { return null; } };
export function setPreferredVoice(uri) {
  try { if (uri) localStorage.setItem(VOICE_KEY, uri); else localStorage.removeItem(VOICE_KEY); } catch { /* ignore */ }
  voicePromise = null;
}
const langOf = (v) => String(v.lang || '').toLowerCase().replace('_', '-');
/** 'et' | 'fi' | 'other' */
export function voiceKind(v) { const l = langOf(v); return /^et(-|$)/.test(l) ? 'et' : /^fi(-|$)/.test(l) ? 'fi' : 'other'; }
const rawVoices = () => { try { return speechSynthesis.getVoices(); } catch { return []; } };
function bestVoice() {
  const vs = rawVoices();
  const uri = savedVoice();
  return (uri && vs.find((v) => v.voiceURI === uri)) || vs.find((v) => voiceKind(v) === 'et') || vs.find((v) => voiceKind(v) === 'fi') || null;
}

/** Лучший доступный голос (выбранный → эстонский → финский) или null. */
export function findEtVoice() {
  if (!speechSupported()) return Promise.resolve(null);
  if (voicePromise) return voicePromise;
  voicePromise = new Promise((resolve) => {
    const first = bestVoice();
    if (first || rawVoices().length) return resolve(first); // список уже загружен: ждать нечего
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { speechSynthesis.removeEventListener('voiceschanged', on); } catch { /* ignore */ }
      resolve(bestVoice());
    };
    const on = () => { if (bestVoice()) finish(); };
    try { speechSynthesis.addEventListener('voiceschanged', on); } catch { /* ignore */ }
    setTimeout(finish, 1500);
  });
  return voicePromise;
}

/** Все голоса устройства: сначала эстонские и финские. */
export async function allVoices() {
  await findEtVoice();
  const rank = { et: 0, fi: 1, other: 2 };
  return [...rawVoices()].sort((x, y) => rank[voiceKind(x)] - rank[voiceKind(y)] || langOf(x).localeCompare(langOf(y)) || x.name.localeCompare(y.name));
}

/** Проигрыватель по репликам {sp, text}. Реплики B звучат ниже, чтобы различать собеседников. */
export function createPlayer(lines, voice, onState) {
  let token = 0;
  let playing = false;
  const emit = (s) => onState && onState(s);

  function play(rate = 0.9) {
    stop(true);
    const my = ++token;
    let i = 0;
    playing = true;
    emit('playing');
    const next = () => {
      if (my !== token) return;
      if (i >= lines.length) { playing = false; emit('ended'); return; }
      const l = lines[i++];
      const u = new SpeechSynthesisUtterance(l.text);
      u.voice = voice;
      u.lang = voice.lang || 'et-EE';
      u.rate = rate;
      u.pitch = l.sp === 'B' ? 0.8 : 1;
      u.onend = () => setTimeout(next, 350);
      u.onerror = () => { if (my === token) { playing = false; emit('error'); } };
      speechSynthesis.speak(u);
    };
    next();
  }
  function stop(silent) {
    token++;
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
    if (playing && !silent) emit('stopped');
    playing = false;
  }
  return { play, stop, get playing() { return playing; } };
}

let current = null;
/** Озвучить фрагмент один раз; предыдущая озвучка прерывается. Возвращает false, если голоса нет. */
export async function speakText(text, rate = 0.9) {
  const voice = await findEtVoice();
  if (!voice) return false;
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang || 'et-EE'; u.rate = rate;
  current = u;
  speechSynthesis.speak(u);
  return true;
}
export function stopSpeaking() { try { speechSynthesis.cancel(); } catch { /* ignore */ } current = null; }
