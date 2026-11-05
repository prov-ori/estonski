// Файл создан tools/build-sw.js — не редактируйте вручную.
const CACHE = 'estonski-2ce4d56e08';
const FILES = [
 "./",
 "config/exam-format.json",
 "config/topics.json",
 "content/diagnostic.json",
 "content/dictation.json",
 "content/forms.json",
 "content/grammar.json",
 "content/listening.json",
 "content/mock-exam.json",
 "content/order.json",
 "content/reading.json",
 "content/speaking.json",
 "content/vocab.json",
 "content/writing.json",
 "css/style.css",
 "icon.svg",
 "index.html",
 "js/app.js",
 "js/gen.js",
 "js/index.js",
 "js/question.js",
 "js/speech.js",
 "js/store.js",
 "js/trainer.js",
 "js/util.js",
 "js/views/about.js",
 "js/views/daily.js",
 "js/views/diagnostic.js",
 "js/views/drills.js",
 "js/views/grammar.js",
 "js/views/home.js",
 "js/views/listening.js",
 "js/views/mistakes.js",
 "js/views/mock.js",
 "js/views/progress.js",
 "js/views/reading.js",
 "js/views/reference.js",
 "js/views/speaking.js",
 "js/views/vocab.js",
 "js/views/wordlist.js",
 "js/views/writing.js",
 "js/widgets.js",
 "manifest.webmanifest"
];

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
