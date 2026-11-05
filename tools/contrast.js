#!/usr/bin/env node
// Проверка контраста пар цветов из css/style.css (WCAG AA: текст >= 4.5, элементы интерфейса >= 3).
const fs = require('fs');
const css = fs.readFileSync(require('path').join(__dirname, '..', 'css', 'style.css'), 'utf8');

function vars(block) {
  const m = {};
  for (const [, k, v] of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) m[k] = v;
  return m;
}
const light = vars(css.match(/:root\s*\{([^}]*)\}/)[1]);
const dark = { ...light, ...vars(css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)[1]) };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const text = [
  ['text', 'bg'], ['text', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'primary-soft'],
  ['on-primary', 'primary'], ['primary', 'bg'], ['primary', 'surface'], ['primary', 'primary-soft'],
  ['text', 'primary-soft'], ['ok', 'ok-bg'], ['text', 'ok-bg'], ['bad', 'bad-bg'], ['text', 'bad-bg'],
  ['warn', 'warn-bg'], ['text', 'warn-bg'], ['bad-bg', 'bad'], ['bad', 'surface'], ['ok', 'surface'], ['bad', 'bg'],
];
const ui = [['line-strong', 'surface'], ['line-strong', 'bg'], ['focus', 'bg'], ['focus', 'surface'], ['primary', 'surface'], ['ok', 'ok-bg'], ['bad', 'bad-bg']];
let fail = 0;
const high = { ...light, ...vars(css.match(/html\[data-contrast="high"\]\s*\{([^}]*)\}/)[1]) };
for (const [name, pal] of [['light', light], ['dark', dark], ['high-contrast', high]]) {
  console.log(`\n== ${name} ==`);
  for (const [a, b] of text) { const r = ratio(pal[a], pal[b]); const okk = r >= 4.5; if (!okk) fail++; console.log(`${okk ? 'OK  ' : 'FAIL'} text ${a} on ${b}: ${r.toFixed(2)}`); }
  for (const [a, b] of ui) { const r = ratio(pal[a], pal[b]); const okk = r >= 3; if (!okk) fail++; console.log(`${okk ? 'OK  ' : 'FAIL'} ui   ${a} vs ${b}: ${r.toFixed(2)}`); }
}
console.log(fail ? `\n${fail} пар(ы) не проходят AA` : '\nВсе пары проходят WCAG AA');
process.exit(fail ? 1 : 0);
