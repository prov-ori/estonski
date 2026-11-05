#!/usr/bin/env node
// Заготовка задания чтения из внешнего текста (без вопросов — их нужно дописать!).
// node tools/import-text.js текст.txt --id r-30 --topic city --title-et "Pealkiri" --title-ru "Заголовок"
//   --kind open --license "CC BY-SA 4.0" --url https://... --author "Автор" [--adapted] [--permission "..."]
// Результат: inbox/<id>.json (вне content/, чтобы незаконченное не ломало validate.js).
// Дальше: добавьте questions, проверьте узел source, перенесите объект в content/reading.json и запустите node validate.js.
const fs = require('fs'), path = require('path');
const a = process.argv.slice(2);
if (!a[0] || a[0].startsWith('--')) { console.error('Использование: node tools/import-text.js текст.txt --id r-30 --topic city --title-et ... --kind open --license ... --url ...'); process.exit(2); }
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d; };
const text = fs.readFileSync(a[0], 'utf8').replace(/\r\n/g, '\n').trim();
const words = text.split(/\s+/).length;
const item = {
  id: opt('id', 'r-NEW'), topic: opt('topic', 'school'), level: opt('level', 'B1'), status: 'draft',
  title_et: opt('title-et', 'TODO'), title_ru: opt('title-ru', 'TODO'),
  explanation_ru: 'TODO: что тренирует этот текст.',
  source: { title: opt('source-title', opt('title-et', 'TODO')), kind: opt('kind', 'open'), url: opt('url', ''), author: opt('author', ''), license: opt('license', ''), adapted: a.includes('--adapted'), retrieved: new Date().toISOString().slice(0, 10) },
  text_et: text,
  questions: [],
};
if (opt('permission')) item.source.permission = opt('permission');
if (!item.source.url) delete item.source.url;
if (!item.source.author) delete item.source.author;
if (!item.source.license) delete item.source.license;
fs.mkdirSync(path.join(__dirname, '..', 'inbox'), { recursive: true });
const out = path.join(__dirname, '..', 'inbox', `${item.id}.json`);
fs.writeFileSync(out, JSON.stringify(item, null, 1) + '\n');
console.log(`Создано ${path.relative(process.cwd(), out)} (слов в тексте: ${words}).`);
console.log('Ориентир для B1: 120–250 слов; 6–7 вопросов разных типов (choice, tf, match, input); у каждого — explanation_ru с цитатой «…» из текста (она подсветится в тексте).');
if (words > 300) console.log('Текст длинный — сократите или разбейте на части (адаптацию отметьте --adapted).');
