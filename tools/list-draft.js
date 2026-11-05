#!/usr/bin/env node
// Список всех эстонских предложений со status "draft" — для проверки учителем/носителем.
// node tools/list-draft.js            → печатает в консоль и пишет DRAFT_REVIEW.md
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'content');
const INHERIT = ['topic', 'level', 'status'];

const out = [];      // {file, id, text}
const perFile = {};

function addText(file, id, text) {
  const t = String(text).trim();
  if (!t) return;
  out.push({ file, id, text: t });
  perFile[file] = (perFile[file] || 0) + 1;
}
const sentences = (s) => s.split(/\n+/).flatMap((p) => p.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || []).map((x) => x.trim()).filter(Boolean);

function fill(q) {
  // подставляет верный ответ в пропуск ___ — получается целое предложение для проверки
  if (q.type === 'choice' && typeof q.answer === 'number') return q.prompt_et.replace('___', q.options[q.answer]);
  if (q.type === 'input') return q.prompt_et.replace('___', q.answer);
  return q.prompt_et;
}

function walk(file, node, ctx) {
  if (Array.isArray(node)) { node.forEach((n) => walk(file, n, ctx)); return; }
  if (!node || typeof node !== 'object') return;
  const eff = { ...ctx };
  for (const k of INHERIT) if (node[k]) eff[k] = node[k];
  if (node.id && eff.status === 'draft') {
    const id = node.id;
    if (node.type) {
      addText(file, id, fill(node));
      if (node.type === 'choice' && node.options_lang !== 'ru' && node.options.some((o) => o.split(' ').length >= 3)) node.options.forEach((o) => addText(file, id + ' (вариант)', o));
      if (node.type === 'match') { node.items.forEach((i) => addText(file, id + ' (левая часть)', i.left)); node.options.forEach((o) => addText(file, id + ' (вариант)', o)); }
    }
    if (node.et && !node.type && typeof node.forms !== 'object') addText(file, id, node.forms ? `${node.et} (${node.forms})` : node.et);
    for (const k of ['example_et', 'title_et', 'prompt_et_extra']) if (node[k]) addText(file, id, node[k]);
    if (node.wrong_et) addText(file, id + ' (с ошибкой)', node.wrong_et);
    if (node.model_et) sentences(node.model_et).forEach((t) => addText(file, id + ' (образец)', t));
    if (node.sample_et) sentences(node.sample_et).forEach((t) => addText(file, id + ' (образец)', t));
    if (Array.isArray(node.examples)) node.examples.forEach((e) => e.et && addText(file, id, e.et));
    if (Array.isArray(node.mistakes)) node.mistakes.forEach((m) => { addText(file, id + ' (неверно)', m.wrong); addText(file, id + ' (верно)', m.right); });
    if (node.answer_et) addText(file, id, node.answer_et);
    if (Array.isArray(node.also_ok)) node.also_ok.forEach((t) => addText(file, id + ' (вариант)', t));
    if (node.forms && typeof node.forms === 'object' && !Array.isArray(node.forms)) addText(file, id, `${node.et}: ${Object.values(node.forms).join(', ')}`);
    if (node.text_et) sentences(node.text_et).forEach((s) => addText(file, id, s));
    if (Array.isArray(node.script_et)) node.script_et.forEach((l) => addText(file, id, l.text));
    if (!node.type && node.prompt_et) addText(file, id, node.prompt_et);
    if (Array.isArray(node.content_points_et)) node.content_points_et.forEach((p) => addText(file, id, p));
    if (Array.isArray(node.prompts_et)) node.prompts_et.forEach((p) => addText(file, id, p));
    if (Array.isArray(node.phrases_et)) node.phrases_et.forEach((p) => addText(file, id, p));
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') walk(file, v, eff);
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  walk(f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), {});
}

// убираем точные дубли внутри файла
const seen = new Set();
const uniq = out.filter((o) => { const k = o.file + '|' + o.text; if (seen.has(k)) return false; seen.add(k); return true; });

let md = '# Эстонские предложения со статусом draft — на проверку носителю или учителю\n\n';
md += `Всего: ${uniq.length}. Сгенерировано \`node tools/list-draft.js\`. После проверки меняйте status на \`reviewed\` в соответствующем JSON.\n\n`;
md += '> В заданиях с пропуском показано предложение с подставленным верным ответом. Неверные варианты (distractors) намеренно содержат ошибки и здесь не перечислены.\n';
let cur = '';
for (const o of uniq) {
  if (o.file !== cur) { cur = o.file; md += `\n## ${cur} (${uniq.filter((x) => x.file === cur).length})\n\n`; }
  md += `- \`${o.id}\` — ${o.text.replace(/\n/g, ' ')}\n`;
}
fs.writeFileSync(path.join(ROOT, 'DRAFT_REVIEW.md'), md);
for (const o of uniq) console.log(`${o.file.replace('.json', '')}\t${o.id}\t${o.text.replace(/\n/g, ' ')}`);
console.error(`\nИтого: ${uniq.length} предложений/фраз. Файл: DRAFT_REVIEW.md`);
