#!/usr/bin/env node
// Генерирует sw.js: список файлов для офлайна + версия кэша (хэш содержимого). Запуск: node tools/build-sw.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = ['index.html', 'manifest.webmanifest', 'icon.svg',
  ...walk(path.join(ROOT, 'css')), ...walk(path.join(ROOT, 'js')), ...walk(path.join(ROOT, 'content')), ...walk(path.join(ROOT, 'config'))]
  .map((f) => (path.isAbsolute(f) ? path.relative(ROOT, f) : f)).map((f) => f.split(path.sep).join('/')).sort();
const hash = crypto.createHash('sha1');
files.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(ROOT, f))));
const version = hash.digest('hex').slice(0, 10);
const src = `// Файл создан tools/build-sw.js — не редактируйте вручную.
const CACHE = 'estonski-${version}';
const FILES = ${JSON.stringify(['./', ...files], null, 1)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// сначала сеть (свежий контент), при отсутствии сети — кэш
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./')))
  );
});
`;
fs.writeFileSync(path.join(ROOT, 'sw.js'), src);
console.log(`sw.js: ${files.length} файлов, версия ${version}`);
