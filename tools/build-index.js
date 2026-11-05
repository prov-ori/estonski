#!/usr/bin/env node
// Индекс серий заданий (config/series.json): id → {module, title_ru, parent_id}. Нужен, чтобы страница задания
// не загружала четыре больших JSON ради поиска «исходного» и «продолжений». node tools/build-index.js [--check]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const modules = ['reading', 'listening', 'writing', 'speaking'];
const idx = {};
for (const m of modules) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', m + '.json'), 'utf8'));
  for (const t of d.items) idx[t.id] = { module: m, title_ru: t.title_ru, ...(t.parent_id ? { parent_id: t.parent_id } : {}) };
}
const out = JSON.stringify({ _comment: 'Создан tools/build-index.js — не редактируйте вручную.', items: idx }, null, 1) + '\n';
const file = path.join(ROOT, 'config', 'series.json');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (cur !== out) { console.error('config/series.json устарел. Запустите: node tools/build-index.js'); process.exit(1); }
  console.log('config/series.json актуален');
} else { fs.writeFileSync(file, out); console.log(`config/series.json: ${Object.keys(idx).length} заданий`); }
