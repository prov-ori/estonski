#!/usr/bin/env node
/* validate.js — проверка content/*.json и config/*.json. Запуск: node validate.js
 * Без зависимостей. Код выхода 1, если есть ошибки. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LEVELS = new Set(['A2', 'B1', 'B2']);
const STATUSES = new Set(['draft', 'reviewed']);
const QTYPES = new Set(['choice', 'tf', 'input', 'match']);
const INHERIT = ['topic', 'level', 'status'];
const errors = [];
const warns = [];
const err = (file, where, msg) => errors.push(`${file} › ${where}: ${msg}`);
const warn = (file, where, msg) => warns.push(`${file} › ${where}: ${msg}`);

function readJSON(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    errors.push(`${rel}: не читается как JSON (${e.message})`);
    return null;
  }
}

// ---- config ----
const fmt = readJSON('config/exam-format.json');
if (fmt) {
  if (fmt.verified !== false && fmt.verified !== true) err('config/exam-format.json', 'verified', 'нужно булево поле verified');
  if (fmt.verified === true) warn('config/exam-format.json', 'verified', 'verified: true — убедитесь, что значения сверены с harno.ee');
  if (!fmt._comment || !/harno\.ee/.test(fmt._comment)) err('config/exam-format.json', '_comment', 'нужен комментарий «проверить на harno.ee»');
  if (!Array.isArray(fmt.parts) || !fmt.parts.length) err('config/exam-format.json', 'parts', 'нет списка частей');
  else for (const p of fmt.parts) {
    if (!p.id || !p.title_ru) err('config/exam-format.json', 'parts', `часть без id/title_ru: ${JSON.stringify(p)}`);
    if (!(p.practice_minutes > 0)) err('config/exam-format.json', `parts.${p.id}`, 'practice_minutes должно быть > 0');
  }
  if (typeof fmt.pass_threshold_percent !== 'number') err('config/exam-format.json', 'pass_threshold_percent', 'нужно число');
}
const topicsCfg = readJSON('config/topics.json');
const TOPICS = new Set();
if (topicsCfg) {
  for (const group of ['grammar', 'themes', 'skills']) {
    if (!Array.isArray(topicsCfg[group])) { err('config/topics.json', group, 'нет списка'); continue; }
    for (const t of topicsCfg[group]) {
      if (!t.id || !t.name_ru) err('config/topics.json', group, `тема без id/name_ru: ${JSON.stringify(t)}`);
      if (TOPICS.has(t.id)) err('config/topics.json', group, `дубль темы ${t.id}`);
      TOPICS.add(t.id);
    }
  }
}

// ---- content ----
const seenIds = new Map(); // id -> file
const stats = {};

const hasCyr = (s) => /[Ѐ-ӿ]/.test(s);
const nn = (s) => String(s).normalize('NFC').trim().toLowerCase();

function checkQuestion(file, q) {
  const w = q.id;
  if (typeof q.prompt_et !== 'string' || !q.prompt_et.trim()) err(file, w, 'нет prompt_et');
  if (typeof q.prompt_et === 'string' && hasCyr(q.prompt_et)) err(file, w, 'кириллица в prompt_et (лишняя русская буква в эстонском тексте?)');
  switch (q.type) {
    case 'choice': {
      const o = q.options;
      if (!Array.isArray(o) || o.length < 3) { err(file, w, 'choice: нужно минимум 3 options'); break; }
      if (o.some((x) => typeof x !== 'string' || !x.trim())) err(file, w, 'choice: пустой вариант');
      if (new Set(o.map(nn)).size !== o.length) err(file, w, 'choice: повторяющиеся варианты — неоднозначный правильный ответ');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= o.length) err(file, w, `choice: answer должен быть индексом 0..${o.length - 1}`);
      if ('answers' in q) err(file, w, 'choice: поле answers запрещено — ответ ровно один');
      if (q.options_lang !== 'ru') for (const x of o) if (typeof x === 'string' && hasCyr(x)) err(file, w, `кириллица в эстонском варианте «${x}» (добавьте options_lang: "ru", если вариант русский)`);
      break;
    }
    case 'tf':
      if (typeof q.answer !== 'boolean') err(file, w, 'tf: answer должен быть true/false');
      break;
    case 'input':
      if (typeof q.answer !== 'string' || !q.answer.trim()) err(file, w, 'input: нужен непустой строковый answer');
      else if (hasCyr(q.answer)) err(file, w, 'input: кириллица в правильном ответе');
      if ('answers' in q) err(file, w, 'input: поле answers запрещено — ответ ровно один');
      break;
    case 'match': {
      const o = q.options, it = q.items;
      if (!Array.isArray(o) || o.length < 2) { err(file, w, 'match: нужны options'); break; }
      if (!Array.isArray(it) || it.length < 2) { err(file, w, 'match: нужны items'); break; }
      if (new Set(o.map(nn)).size !== o.length) err(file, w, 'match: повторяющиеся options');
      const used = new Set();
      for (const [i, x] of it.entries()) {
        if (!x.left) err(file, w, `match.items[${i}]: нет left`);
        if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer >= o.length) err(file, w, `match.items[${i}]: answer вне диапазона`);
        else if (used.has(x.answer)) err(file, w, `match.items[${i}]: один вариант выбран дважды — ответ неоднозначен`);
        else used.add(x.answer);
      }
      if (o.length <= it.length) warn(file, w, 'match: нет лишнего варианта (угадывание станет проще)');
      break;
    }
  }
  if (q.type === 'choice' || q.type === 'input') {
    if (q.prompt_et && !/___/.test(q.prompt_et) && /grammar|mock-01-g/.test(w) && !/^mock/.test(w)) warn(file, w, 'нет пропуска ___ в prompt_et');
  }
}

function walk(file, node, ctx, where) {
  if (Array.isArray(node)) { node.forEach((n, i) => walk(file, n, ctx, `${where}[${i}]`)); return; }
  if (!node || typeof node !== 'object') return;
  const eff = { ...ctx };
  for (const k of INHERIT) if (node[k] !== undefined) eff[k] = node[k];
  if (node.id !== undefined) {
    const id = node.id;
    if (typeof id !== 'string' || !id) err(file, where, 'id должен быть непустой строкой');
    else {
      if (seenIds.has(id)) err(file, id, `дубль id (также в ${seenIds.get(id)})`);
      seenIds.set(id, file);
      stats[file] = (stats[file] || 0) + 1;
      if (typeof node.explanation_ru !== 'string' || !node.explanation_ru.trim()) err(file, id, 'нет explanation_ru');
      if (!eff.status) err(file, id, 'нет status (и не наследуется)');
      else if (!STATUSES.has(eff.status)) err(file, id, `status «${eff.status}» — допустимо draft | reviewed`);
      if (!eff.topic) err(file, id, 'нет topic');
      else if (!TOPICS.has(eff.topic)) err(file, id, `topic «${eff.topic}» отсутствует в config/topics.json`);
      if (!eff.level) err(file, id, 'нет level');
      else if (!LEVELS.has(eff.level)) err(file, id, `level «${eff.level}» — допустимо A2 | B1 | B2`);
      if (node.type !== undefined) {
        if (!QTYPES.has(node.type)) err(file, id, `неизвестный type «${node.type}»`);
        else checkQuestion(file, node);
      }
    }
  }
  for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') walk(file, v, eff, `${where}.${k}`);
}

const dir = path.join(ROOT, 'content');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
if (!files.length) errors.push('content/: нет JSON-файлов');
const data = {};
for (const f of files) {
  const rel = `content/${f}`;
  const j = readJSON(rel);
  if (!j) continue;
  data[f.replace('.json', '')] = j;
  if (!Array.isArray(j.items) || !j.items.length) err(rel, 'items', 'нужен непустой массив items');
  walk(rel, j, {}, '$');
}

// ---- структурные проверки по модулям ----
const need = (cond, file, where, msg) => { if (!cond) err(file, where, msg); };
for (const t of (data.reading?.items || [])) {
  need(t.text_et && t.title_et, 'content/reading.json', t.id, 'нужны title_et и text_et');
  need(Array.isArray(t.questions) && t.questions.length >= 3, 'content/reading.json', t.id, 'нужно минимум 3 вопроса');
  const types = new Set((t.questions || []).map((q) => q.type));
  if (types.size < 2) warn('content/reading.json', t.id, 'вопросы одного типа — нужны разные типы');
}
for (const t of (data.listening?.items || [])) {
  need(Array.isArray(t.script_et) && t.script_et.every((l) => l.text), 'content/listening.json', t.id, 'нужен script_et: [{sp,text}]');
  need(Array.isArray(t.questions) && t.questions.length >= 3, 'content/listening.json', t.id, 'нужно минимум 3 вопроса');
}
for (const t of (data.writing?.items || [])) need(t.prompt_et && Array.isArray(t.content_points_et), 'content/writing.json', t.id, 'нужны prompt_et и content_points_et');
need(Array.isArray(data.writing?.checklist) && data.writing.checklist.length === 5, 'content/writing.json', 'checklist', 'ожидается 5 критериев');
for (const c of (data.speaking?.items || [])) need(c.role_a?.prompts_et?.length && c.role_b?.prompts_et?.length, 'content/speaking.json', c.id, 'нужны role_a/role_b с prompts_et');
for (const m of (data['mock-exam']?.items || [])) {
  for (const p of (fmt?.parts || [])) need(m.parts && m.parts[p.id], 'content/mock-exam.json', m.id, `нет части «${p.id}» из config/exam-format.json`);
}
for (const c of (data.vocab?.items || [])) need(c.et && c.ru && c.example_et, 'content/vocab.json', c.id, 'нужны et, ru, example_et');
need((data.diagnostic?.items || []).length === 20, 'content/diagnostic.json', 'items', `ожидается 20 вопросов, найдено ${(data.diagnostic?.items || []).length}`);

// ---- отчёт ----
const counts = {
  'Грамматика (вопросы)': data.grammar?.items?.length,
  'Диагностика (вопросы)': data.diagnostic?.items?.length,
  'Словарь (карточки)': data.vocab?.items?.length,
  'Чтение (тексты)': data.reading?.items?.length,
  'Аудирование (тексты)': data.listening?.items?.length,
  'Письмо (задания)': data.writing?.items?.length,
  'Говорение (карточки)': data.speaking?.items?.length,
  'Пробные экзамены': data['mock-exam']?.items?.length,
};
console.log('Содержимое:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v ?? 0}`);
console.log(`Всего элементов с id: ${seenIds.size}`);
if (warns.length) { console.log(`\nПредупреждения (${warns.length}):`); warns.forEach((w) => console.log('  ! ' + w)); }
if (errors.length) { console.log(`\nОШИБКИ (${errors.length}):`); errors.forEach((e) => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\n✓ Валидация пройдена');
