#!/usr/bin/env node
/* Создаёт аудиозаписи для раздела «Аудирование» из content/listening.json.
 * Нужны программы espeak-ng (с эстонским голосом), ffmpeg и ffprobe в PATH.
 *   node tools/gen-audio.js            — только отсутствующие и устаревшие записи
 *   node tools/gen-audio.js --all      — пересоздать все
 *   node tools/gen-audio.js --only l-01,l-02
 * Результат: audio/<id>.mp3 и config/audio.json (id → {file, hash, seconds}).
 * hash = sha1 текста реплик; если текст задания изменился, validate.js сообщит, что запись устарела.
 * Записи — синтез речи (espeak-ng): звучат одинаково на любом устройстве, но менее естественно, чем живой диктор. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'audio');
const IDX = path.join(ROOT, 'config', 'audio.json');
const VOICES = { A: 'et+m2', B: 'et+f3' }; // два диктора для диалогов
const SPEED = '135'; // слов в минуту (чуть медленнее обычной речи)
const PAUSE = 0.45;  // секунд тишины после реплики

const scriptHash = (lines) => crypto.createHash('sha1').update(lines.map((l) => `${l.sp}|${l.text}`).join('\n')).digest('hex');
exports.scriptHash = scriptHash;

// ---- числа словами (копия правил из js/gen.js; цифры espeak читает неточно) ----
const U = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa'];
const T = ['kümme', 'üksteist', 'kaksteist', 'kolmteist', 'neliteist', 'viisteist', 'kuusteist', 'seitseteist', 'kaheksateist', 'üheksateist'];
const D = ['', '', 'kakskümmend', 'kolmkümmend', 'nelikümmend', 'viiskümmend', 'kuuskümmend', 'seitsekümmend', 'kaheksakümmend', 'üheksakümmend'];
const num = (n) => (n === 0 ? 'null' : n === 100 ? 'sada' : n < 10 ? U[n] : n < 20 ? T[n - 10] : (n % 10 ? `${D[Math.floor(n / 10)]} ${U[n % 10]}` : D[Math.floor(n / 10)]));
function prepare(text) {
  return text
    .replace(/(\d{1,2})\.(\d{2})/g, (_, h, m) => `${num(+h)} ${m === '00' ? '' : (+m < 10 ? 'null ' : '') + num(+m)}`.trim())
    .replace(/\b(\d{1,3})\b/g, (_, n) => num(+n))
    .replace(/[–—]/g, ' ');
}

exports.prepare = prepare;
if (require.main !== module) return;

const run = (cmd, args, opt = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opt });
  if (r.error || r.status !== 0) { console.error(`Ошибка ${cmd}: ${(r.error && r.error.message) || r.stderr}`); process.exit(1); }
  return r.stdout;
};
for (const tool of ['espeak-ng', 'ffmpeg', 'ffprobe']) {
  const r = spawnSync(tool, ['--version'], { encoding: 'utf8' });
  if (r.error) { console.error(`Не найден ${tool}. Установите: sudo apt-get install espeak-ng ffmpeg`); process.exit(2); }
}
const voices = spawnSync('espeak-ng', ['--voices=et'], { encoding: 'utf8' }).stdout || '';
if (!/\bet\b/.test(voices)) { console.error('В espeak-ng нет эстонского голоса (et).'); process.exit(2); }

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const all = args.includes('--all');
const items = [...JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'listening.json'), 'utf8')).items, ...JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'mock-exam.json'), 'utf8')).items.map(x=>x.parts.listening).filter(x=>x.script_et)];
const idx = fs.existsSync(IDX) ? JSON.parse(fs.readFileSync(IDX, 'utf8')) : { _comment: '', engine: 'espeak-ng', items: {} };
idx._comment = 'Аудиозаписи: tools/gen-neural-audio.py или tools/gen-audio.js. hash — sha1 реплик задания.';
idx.engine = 'mixed (see each entry)';
fs.mkdirSync(OUT_DIR, { recursive: true });

let made = 0;
for (const it of items) {
  if (only && !only.includes(it.id)) continue;
  const hash = scriptHash(it.script_et);
  const file = path.join('audio', `${it.id}.mp3`);
  const cur = idx.items[it.id];
  if (cur?.engine === 'neural') {
    if (cur.hash !== hash) { console.error(it.id + ': нейрозапись устарела; запустите python tools/gen-neural-audio.py'); process.exitCode = 1; }
    continue;
  }
  if (!all && cur && cur.hash === hash && fs.existsSync(path.join(ROOT, file))) continue;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'estaudio-'));
  const wavs = it.script_et.map((l, i) => {
    const w = path.join(tmp, `${i}.wav`);
    run('espeak-ng', ['-v', VOICES[l.sp] || VOICES.A, '-s', SPEED, '-w', w, '--', prepare(l.text)]);
    return w;
  });
  const inputs = wavs.flatMap((w) => ['-i', w]);
  const filt = wavs.map((_, i) => `[${i}:a]aresample=22050,apad=pad_dur=${PAUSE}[a${i}]`).join(';') + ';' + wavs.map((_, i) => `[a${i}]`).join('') + `concat=n=${wavs.length}:v=0:a=1[out]`;
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', filt, '-map', '[out]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '56k', path.join(ROOT, file)]);
  const secs = parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(ROOT, file)]));
  idx.items[it.id] = { engine: 'espeak-ng', file: file.split(path.sep).join('/'), hash, seconds: Math.round(secs * 10) / 10 };
  fs.rmSync(tmp, { recursive: true, force: true });
  made++;
  console.log(`✓ ${it.id}: ${idx.items[it.id].seconds} с`);
}
// удаляем записи заданий, которых больше нет
const ids = new Set(items.map((i) => i.id));
for (const id of Object.keys(idx.items)) if (!ids.has(id)) { try { fs.unlinkSync(path.join(ROOT, idx.items[id].file)); } catch { /* ignore */ } delete idx.items[id]; }
idx.engine = Object.values(idx.items).every(x=>x.engine==='neural') ? 'neural' : 'mixed (see each entry)';
fs.writeFileSync(IDX, JSON.stringify(idx, null, 2) + '\n');
console.log(`Готово: создано ${made}, всего записей ${Object.keys(idx.items).length} из ${items.length}.`);
