// Настройки оформления и режима (отдельно от прогресса, ключ estonski.prefs).
const KEY = 'estonski.prefs';
const DEFAULTS = { theme: 'auto', font: 'normal', read: 'normal', contrast: 'normal', exam: 'off', examDate: '2027-04-15' };

export function getPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export function setPref(key, value) {
  const p = { ...getPrefs(), [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  applyPrefs(p);
  return p;
}
export function applyPrefs(p = getPrefs()) {
  const r = document.documentElement;
  if (p.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  r.setAttribute('data-font', p.font);
  r.setAttribute('data-read', p.read);
  r.setAttribute('data-contrast', p.contrast);
}
/** Режим экзамена: без словарика, подсветки доказательств и озвучки текста; ограниченное число прослушиваний. */
export const isExamMode = () => getPrefs().exam === 'on';
export const MAX_PLAYS_EXAM = 2;
