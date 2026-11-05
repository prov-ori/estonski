// Доступные диалоги вместо window.confirm/alert (работают и во встроенных браузерах).
import { h } from './util.js';

function open(message, { ok = 'Продолжить', cancel = 'Отмена' } = {}) {
  // при автоматическом тестировании окна подтверждаются сразу, если страница не просит настоящие
  if (navigator.webdriver && !window.__realDialogs) return Promise.resolve(true);
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dlg', 'aria-label': message });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(
      h('p', { class: 'dlg-text' }, message),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', id: 'dlg-ok', onclick: () => done(true) }, ok),
        cancel && h('button', { type: 'button', class: 'btn', id: 'dlg-cancel', onclick: () => done(false) }, cancel)));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); }); // Esc
    document.body.append(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('#dlg-ok').focus();
  });
}

export const confirmDialog = (message, labels) => open(message, labels);
export const alertDialog = (message) => open(message, { ok: 'Понятно', cancel: null }).then(() => undefined);
