#!/usr/bin/env node
/* validate.js — проверка content/*.json и config/*.json. Запуск: node validate.js
 * Без зависимостей. Код выхода 1, если есть ошибки. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LEVELS = new Set(['A2', 'B1', 'B2', 'C1']);
const STATUSES = new Set(['draft', 'reviewed']);
const QTYPES = new Set(['choice', 'tf', 'tf3', 'input', 'match']);
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

const eff_topic_of = (q) => q.topic || '';
function checkQuestion(file, q) {
  if (file.endsWith('grammar.json') && q.type !== 'tf' && !['transform', 'errors', 'spelling'].includes(eff_topic_of(q)) && !/___/.test(q.prompt_et || '')) warn(file, q.id, 'нет пропуска ___ в prompt_et');
  const w = q.id;
  if (typeof q.prompt_et !== 'string' || !q.prompt_et.trim()) err(file, w, 'нет prompt_et');
  if (typeof q.prompt_et === 'string' && hasCyr(q.prompt_et)) err(file, w, 'кириллица в prompt_et (лишняя русская буква в эстонском тексте?)');
  switch (q.type) {
    case 'choice': {
      const o = q.options;
      if (!Array.isArray(o) || o.length < 3) { err(file, w, 'choice: нужно минимум 3 options'); break; }
      if (o.some((x) => typeof x !== 'string' || !x.trim())) err(file, w, 'choice: пустой вариант');
      if (new Set(o.map((x) => String(x).normalize('NFC').trim())).size !== o.length) err(file, w, 'choice: повторяющиеся варианты — неоднозначный правильный ответ');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= o.length) err(file, w, `choice: answer должен быть индексом 0..${o.length - 1}`);
      if ('answers' in q) err(file, w, 'choice: поле answers запрещено — ответ ровно один');
      if (o.every((x) => x.split(/\s+/).length >= 3)) { const L = o.map((x) => x.length); if (L[q.answer] === Math.max(...L) && L.filter((l) => l === L[q.answer]).length === 1) warn(file, w, 'верный вариант самый длинный — подсказка для угадывания'); }
      if (q.options_lang !== 'ru') for (const x of o) if (typeof x === 'string' && hasCyr(x)) err(file, w, `кириллица в эстонском варианте «${x}» (добавьте options_lang: "ru", если вариант русский)`);
      break;
    }
    case 'tf':
      if (typeof q.answer !== 'boolean') err(file, w, 'tf: answer должен быть true/false');
      break;
    case 'tf3':
      if (![true, false, 'ns'].includes(q.answer)) err(file, w, "tf3: answer должен быть true, false или 'ns'");
      break;
    case 'input':
      if (typeof q.answer !== 'string' || !q.answer.trim()) err(file, w, 'input: нужен непустой строковый answer');
      else if (hasCyr(q.answer)) err(file, w, 'input: кириллица в правильном ответе');
      if ('answers' in q) err(file, w, 'input: поле answers запрещено — основной ответ один, допустимые варианты — в also_ok');
      if (q.also_ok !== undefined && !(Array.isArray(q.also_ok) && q.also_ok.every((x) => typeof x === 'string' && x.trim() && !hasCyr(x)))) err(file, w, 'input: also_ok должен быть массивом непустых строк без кириллицы');
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
}

const SRC_KINDS = new Set(['open', 'public-domain', 'exam', 'news', 'textbook', 'blog', 'other']);
const SRC_NEED_PERMISSION = new Set(['exam', 'news', 'textbook', 'blog', 'other']);
function checkSource(file, id, src) {
  if (!src || typeof src !== 'object') return err(file, id, 'source должен быть объектом');
  if (!src.title) err(file, id, 'source.title обязателен');
  if (!SRC_KINDS.has(src.kind)) err(file, id, `source.kind «${src.kind}» — допустимо: ${[...SRC_KINDS].join(' | ')}`);
  if (src.kind === 'open' && (!src.license || !src.url)) err(file, id, 'source (open): нужны license и url');
  if (src.kind === 'public-domain' && !src.license) err(file, id, 'source (public-domain): укажите, почему материал свободен (license)');
  if (SRC_NEED_PERMISSION.has(src.kind) && (!src.permission || !src.url)) err(file, id, `source (${src.kind}): нужны url и permission — как получено разрешение на использование`);
  if (src.retrieved && !/^\d{4}-\d{2}-\d{2}$/.test(src.retrieved)) err(file, id, 'source.retrieved — дата YYYY-MM-DD');
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
      else if (!LEVELS.has(eff.level)) err(file, id, `level «${eff.level}» — допустимо A2 | B1 | B2 | C1`);
      if (node.source !== undefined) checkSource(file, id, node.source);
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
for (const c of (data.speaking?.items || [])) {
  if (c.kind === 'monologue' || c.kind === 'interview') need(c.prompts_et?.length >= 3, 'content/speaking.json', c.id, 'для монолога и интервью нужен prompts_et (минимум 3)');
  else need(c.role_a?.prompts_et?.length && c.role_b?.prompts_et?.length, 'content/speaking.json', c.id, 'нужны role_a/role_b с prompts_et');
}
for (const m of (data['mock-exam']?.items || [])) {
  for (const p of (fmt?.parts || [])) need(m.parts && m.parts[p.id], 'content/mock-exam.json', m.id, `нет части «${p.id}» из config/exam-format.json`);
}
for (const c of (data.vocab?.items || [])) need(c.et && c.ru && c.example_et, 'content/vocab.json', c.id, 'нужны et, ru, example_et');
const dg = data.diagnostic?.items || [];
const lv = (l) => dg.filter((x) => x.level === l && x.advanced !== true).length;
need(lv('A2') >= 7 && lv('B1') >= 8 && lv('B2') >= 5, 'content/diagnostic.json', 'items', `в банке нужно минимум 7 A2, 8 B1, 5 B2 (сейчас ${lv('A2')}/${lv('B1')}/${lv('B2')}) — из него случайно берётся тест из 20 вопросов`);
for (const q of dg) {
  need(q.advanced === undefined || q.advanced === true, 'content/diagnostic.json', q.id, 'advanced допускает только true');
  if (q.advanced || q.level === 'C1') need(q.advanced === true && ['B2', 'C1'].includes(q.level), 'content/diagnostic.json', q.id, 'расширенный тест содержит только B2 и C1, все вопросы C1 относятся к нему');
}
for (const level of ['B2', 'C1']) {
  need(dg.filter((q) => q.level === level && q.advanced === true).length >= 8, 'content/diagnostic.json', 'items', `в расширенном банке нужно минимум 8 вопросов ${level}`);
}

// refs в пробных экзаменах
for (const m of (data['mock-exam']?.items || [])) {
  for (const [k, part] of Object.entries(m.parts || {})) {
    if (part.ref !== undefined) need(seenIds.has(part.ref), 'content/mock-exam.json', `${m.id}.${k}`, `ref «${part.ref}» не найден`);
  }
}
// pronunciation
for (const p of (data.pronunciation?.items || [])) {
  const ok = { letter: () => p.letter && p.words?.length >= 3 && p.words.every((w) => w.et && w.ru && !hasCyr(w.et)), stress: () => p.words?.length, length: () => p.pairs?.length && p.pairs.every((x) => x.words?.length >= 2 && x.words.every((w) => w.et && w.ru && !hasCyr(w.et))), phrases: () => p.phrases?.length >= 5 && p.phrases.every((f) => f.et && f.ru && !hasCyr(f.et)) }[p.kind];
  need(ok && ok(), 'content/pronunciation.json', p.id, 'kind должен быть letter | stress | length | phrases с корректными данными');
}
// аудиозаписи для аудирования (config/audio.json создаёт tools/gen-audio.js)
{
  const { scriptHash } = require('./tools/gen-audio.js');
  const audio = readJSON('config/audio.json');
  const listening = [...(data.listening?.items || []), ...(data['mock-exam']?.items || []).map(x=>x.parts.listening).filter(x=>x.script_et)];
  listening.push(...(data.dictation?.items || []).filter(item => item.recorded)
    .map(item => ({ id: item.id, script_et: [{ sp: 'A', text: item.text_et }] })));
  const idxItems = (audio && audio.items) || {};
  let missing = 0;
  for (const it of listening) {
    const a = idxItems[it.id];
    if (!a) { missing++; continue; }
    need(a.file && fs.existsSync(path.join(ROOT, a.file)), 'config/audio.json', it.id, `файл записи «${a.file}» не найден`);
    need(a.hash === scriptHash(it.script_et), 'config/audio.json', it.id, 'запись устарела: текст задания изменился — запустите node tools/gen-audio.js');
  }
  for (const id of Object.keys(idxItems)) need(listening.some((x) => x.id === id), 'config/audio.json', id, 'запись для несуществующего задания');
  if (missing) {
    const msg = `нет аудиозаписи у ${missing} из ${listening.length} заданий с озвучкой (создайте записи: node tools/gen-audio.js)`;
    if (process.argv.includes('--require-audio')) errors.push('config/audio.json: ' + msg); else warns.push('config/audio.json: ' + msg);
  }
}
// fixes и lessons
for (const x of (data.fixes?.items || [])) {
  need(x.wrong_et && x.answer_et && x.wrong_et !== x.answer_et, 'content/fixes.json', x.id, 'wrong_et и answer_et обязательны и должны различаться');
  for (const a of (x.also_ok || [])) need(a !== x.wrong_et && !hasCyr(a), 'content/fixes.json', x.id, `also_ok «${a}» совпадает с ошибочным или содержит кириллицу`);
}
for (const l of (data.lessons?.items || [])) {
  need(l.title_ru && Array.isArray(l.sections) && l.sections.length && Array.isArray(l.mistakes), 'content/lessons.json', l.id, 'нужны title_ru, sections и mistakes');
  for (const m of (l.mistakes || [])) need(m.wrong && m.right && m.wrong !== m.right && m.why, 'content/lessons.json', l.id, `ошибка «${m.wrong}»: wrong, right и why обязательны, wrong ≠ right`);
  need(!l.practice || /^(grammar|drills)\//.test(l.practice), 'content/lessons.json', l.id, 'practice — маршрут вида grammar/<тема> или drills/<раздел>');
}
// forms
for (const f of (data.forms?.items || [])) {
  const need9 = ['nom', 'gen', 'part', 'ill', 'ine', 'ela', 'all', 'ade', 'abl'];
  const need7 = ['ma', 'da', 'pres1', 'pres3', 'past1', 'nud', 'imp'];
  const keys = f.id.startsWith('f-n-') ? need9 : need7;
  for (const k of keys) need(f.forms && typeof f.forms[k] === 'string' && f.forms[k] && !hasCyr(f.forms[k]), 'content/forms.json', f.id, `нет формы «${k}» (или кириллица)`);
}
// order: also_ok — перестановки основного ответа
const toks = (t) => t.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
for (const o of (data.order?.items || [])) {
  need(o.answer_et && o.ru, 'content/order.json', o.id, 'нужны answer_et и ru');
  if (o.chunks_et !== undefined) need(Array.isArray(o.chunks_et) && o.chunks_et.length >= 2 &&
    o.chunks_et.every(chunk => typeof chunk === 'string' && chunk.trim()) &&
    o.chunks_et.join(' ') === o.answer_et, 'content/order.json', o.id, 'части предложения должны составлять основной ответ');
  for (const a of (o.also_ok || [])) need(toks(a) === toks(o.answer_et), 'content/order.json', o.id, `also_ok «${a}» — не перестановка слов основного ответа`);
  need(o.answer_et && !hasCyr(o.answer_et), 'content/order.json', o.id, 'кириллица в answer_et');
}
for (const o of (data.dictation?.items || [])) need(o.text_et && o.ru && !hasCyr(o.text_et), 'content/dictation.json', o.id, 'нужны text_et (без кириллицы) и ru');
// повтор одинаковых заданий в грамматике
const seenP = new Map();
for (const q of (data.grammar?.items || [])) {
  const key = nn(q.prompt_et + ' ' + (q.hint || ''));
  if (seenP.has(key)) warn('content/grammar.json', q.id, `такой же prompt, как у ${seenP.get(key)}`); else seenP.set(key, q.id);
}

// индекс серий должен быть актуален
try {
  const r = require('child_process').spawnSync('node', [path.join(ROOT, 'tools', 'build-index.js'), '--check'], { encoding: 'utf8' });
  if (r.status !== 0) errors.push('config/series.json устарел — запустите node tools/build-index.js');
} catch (e) { warns.push('не удалось проверить config/series.json'); }

for (const item of data.sources?.items || []) {
  need(String(item.url || '').startsWith('https://') && item.publisher && item.checked_on && item.guide_ru,'content/sources.json',item.id,'нет происхождения или HTTPS-ссылки');
  need(item.tasks?.length >= 6 && item.tasks.every(q=>q.prompt_et && q.rubric_ru),'content/sources.json',item.id,'нужны вопросы с критериями');
}
for (const item of data.reading?.items || []) if (item.review_questions) need(item.review_questions.every(q=>q.prompt_et && q.rubric_ru),'content/reading.json',item.id,'нет критерия открытого ответа');
// ---- отчёт ----
const counts = {
  'Грамматика (вопросы)': data.grammar?.items?.length,
  'Диагностика (вопросы)': data.diagnostic?.items?.length,
  'Словарь (карточки)': data.vocab?.items?.length,
  'Чтение (тексты)': data.reading?.items?.length,
  'Аудирование (тексты)': data.listening?.items?.length,
  'Письмо (задания)': data.writing?.items?.length,
  'Говорение (карточки)': data.speaking?.items?.length,
  'Маршруты к оригиналам B1–C1': data.sources?.items?.length,
  'Развёрнутые вопросы к чтению': data.reading?.items?.reduce((n,x)=>n+(x.review_questions?.length||0),0),
  'Пробные экзамены': data['mock-exam']?.items?.length,
  'Формы слов (существительные + глаголы)': data.forms?.items?.length,
  'Порядок слов': data.order?.items?.length,
  'Диктанты': data.dictation?.items?.length,
};
console.log('Содержимое:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v ?? 0}`);
console.log(`Всего элементов с id: ${seenIds.size}`);
if (warns.length) { console.log(`\nПредупреждения (${warns.length}):`); warns.forEach((w) => console.log('  ! ' + w)); }
if (errors.length) { console.log(`\nОШИБКИ (${errors.length}):`); errors.forEach((e) => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\n✓ Валидация пройдена');
