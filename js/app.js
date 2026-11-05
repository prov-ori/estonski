// Роутер и каркас. Маршруты вида #/grammar/cases.
import { h, config, setChildren } from './util.js';
import { store } from './store.js';

const MODULES = [
  ['daily', 'Практика', 'views/daily.js'],
  ['diagnostic', 'Диагностика', 'views/diagnostic.js'],
  ['grammar', 'Грамматика', 'views/grammar.js'],
  ['drills', 'Тренажёры', 'views/drills.js'],
  ['vocab', 'Словарь', 'views/vocab.js'],
  ['reading', 'Чтение', 'views/reading.js'],
  ['listening', 'Аудирование', 'views/listening.js'],
  ['writing', 'Письмо', 'views/writing.js'],
  ['speaking', 'Говорение', 'views/speaking.js'],
  ['mock', 'Пробник', 'views/mock.js'],
  ['reference', 'Справочник', 'views/reference.js'],
  ['progress', 'Прогресс', 'views/progress.js'],
];
const EXTRA = { about: 'views/about.js', mistakes: 'views/mistakes.js', wordlist: 'views/wordlist.js', '': 'views/home.js' };
export const NAV = MODULES.map(([id, title]) => ({ id, title }));

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menu-btn');
let cleanup = null;
let renderToken = 0;
let firstRender = true;

function buildNav() {
  setChildren(nav, ...MODULES.map(([id, title]) => h('a', { href: `#/${id}`, 'data-id': id }, title)));
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

function setActive(name) {
  nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.id === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}

async function render() {
  const my = ++renderToken;
  const hash = location.hash.replace(/^#\/?/, '');
  const [name = '', ...args] = hash.split('/').map(decodeURIComponent);
  const entry = MODULES.find((m) => m[0] === name);
  const file = entry ? entry[2] : EXTRA[name];
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  setActive(name);
  setChildren(main, h('p', { class: 'muted' }, 'Загрузка…'));
  if (!file) {
    setChildren(main, h('h1', null, 'Страница не найдена'), h('p', null, h('a', { href: '#/' }, 'На главную')));
    document.title = 'Не найдено — Eesti keel B1';
    return;
  }
  try {
    const mod = await import(`./${file}`);
    if (my !== renderToken) return; // пользователь уже ушёл на другую страницу
    const view = mod.default;
    setChildren(main, );
    const c = await view.mount(main, args);
    if (my !== renderToken) { if (typeof c === 'function') c(); return; }
    cleanup = c;
    document.title = `${view.title} — Eesti keel B1`;
    if (!store.persistent) {
      main.prepend(h('p', { class: 'notice warn' }, 'Браузер не даёт сохранять данные (приватный режим или запрет хранилища). Тренажёр работает, но прогресс исчезнет после закрытия вкладки.'));
    }
    const h1 = main.querySelector('h1');
    // при первой загрузке фокус не трогаем (иначе пропадёт доступ к шапке с клавиатуры); при переходах — на заголовок
    if (h1 && !firstRender) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    firstRender = false;
    window.scrollTo(0, 0);
  } catch (e) {
    console.warn(e);
    setChildren(main, 
      h('h1', null, 'Не удалось загрузить страницу'),
      h('p', { class: 'notice warn' }, 'Что-то пошло не так при загрузке данных. Если вы открыли index.html двойным щелчком (file://), браузер блокирует загрузку JSON — запустите локальный сервер: python3 -m http.server — и откройте http://localhost:8000. На GitHub Pages всё работает без этого.'),
      h('pre', { class: 'small-text' }, String(e && e.message || e)));
  }
}

// ---- оформление: тема и размер текста (хранится отдельно от прогресса) ----
const PREF_KEY = 'estonski.prefs';
function readPrefs() {
  try { return { theme: 'auto', font: 'normal', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { theme: 'auto', font: 'normal' }; }
}
function applyPrefs(p) {
  const r = document.documentElement;
  if (p.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  r.setAttribute('data-font', p.font);
}
function buildPrefs() {
  const prefs = readPrefs();
  const save = () => { applyPrefs(prefs); try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } };
  const mk = (id, label, key, opts) => {
    const s = h('select', { class: 'select', id, onchange: (e) => { prefs[key] = e.target.value; save(); } }, opts.map(([v, l]) => h('option', { value: v }, l)));
    s.value = prefs[key];
    return h('div', { class: 'pref' }, h('label', { for: id }, label), s);
  };
  const box = document.getElementById('prefs');
  if (box) setChildren(box, mk('pref-theme', 'Тема', 'theme', [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']]), mk('pref-font', 'Размер текста', 'font', [['normal', 'Обычный'], ['large', 'Крупный'], ['xlarge', 'Очень крупный']]));
  applyPrefs(prefs);
}

buildPrefs();
buildNav();
window.addEventListener('hashchange', render);
render();

// офлайн-режим: service worker (необязателен, сайт работает и без него)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
