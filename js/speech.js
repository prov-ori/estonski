// Web Speech API (синтез речи) для аудирования. Голос et-EE может отсутствовать — это нормальный сценарий.
let voicePromise = null;

export const speechSupported = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export function resetVoice() { voicePromise = null; }

export function findEtVoice() {
  if (!speechSupported()) return Promise.resolve(null);
  if (voicePromise) return voicePromise;
  voicePromise = new Promise((resolve) => {
    const pick = () => {
      try { return speechSynthesis.getVoices().find((v) => /^et([-_]|$)/i.test(v.lang)) || null; } catch { return null; }
    };
    const first = pick();
    if (first) return resolve(first);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { speechSynthesis.removeEventListener('voiceschanged', on); } catch { /* ignore */ }
      resolve(pick());
    };
    const on = () => { if (pick()) finish(); };
    try { speechSynthesis.addEventListener('voiceschanged', on); } catch { /* ignore */ }
    setTimeout(finish, 1500);
  });
  return voicePromise;
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
