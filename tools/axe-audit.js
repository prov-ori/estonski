#!/usr/bin/env node
// Аудит доступности: axe-core на всех страницах (светлая и тёмная тема, телефон и компьютер).
// Нужен пакет axe-core: AXE=/путь/к/axe.min.js node tools/axe-audit.js   (или npm i axe-core в корне)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const AXE = process.env.AXE || path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
if (!fs.existsSync(AXE)) { console.error('Не найден axe.min.js; задайте AXE=...'); process.exit(2); }
const M = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': M[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
});
const ids = (f, route) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f + '.json'), 'utf8')).items.slice(0, 3).map((x) => `${route}/${x.id}`);
const ROUTES = ['originals','originals/source-ai-article-C1', '', 'daily', 'pronunciation', 'plan', 'lessons', 'lessons/ls-01', 'drills/fix', 'diagnostic', 'grammar', 'grammar/cases', 'drills', 'drills/forms', 'drills/order', 'drills/dictation', 'vocab', 'wordlist', 'reading', 'listening', 'writing', 'speaking', 'mock', 'reference', 'progress', 'about',
  ...ids('reading', 'reading'), ...ids('listening', 'listening'), ...ids('writing', 'writing'), ...ids('speaking', 'speaking')];
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined});
  const found = new Map();
  for (const scheme of ['light', 'dark']) for (const [vn, vp] of [['mobile', { width: 390, height: 800 }], ['desktop', { width: 1366, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, colorScheme: scheme });
    const p = await ctx.newPage();
    for (const r of ROUTES) {
      await p.goto(base + '#/' + r); await p.waitForSelector('main h1'); await p.waitForTimeout(150);
      await p.addScriptTag({ path: AXE });
      const res = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
      for (const v of res.violations) for (const n of v.nodes) {
        const key = `${v.id}|${n.target.join(' ')}`;
        if (!found.has(key)) found.set(key, { id: v.id, impact: v.impact, help: v.help, target: n.target.join(' '), where: [] });
        found.get(key).where.push(`${scheme}/${vn}/#/${r}`);
      }
    }
    await ctx.close();
  }
  await b.close(); srv.close();
  const byRule = {};
  for (const x of found.values()) (byRule[x.id] ||= []).push(x);
  for (const [rule, arr] of Object.entries(byRule)) {
    console.log(`\n[${arr[0].impact}] ${rule}: ${arr[0].help} — уникальных узлов: ${arr.length}`);
    arr.slice(0, 4).forEach((x) => console.log(`   ${x.target}  (${x.where.slice(0, 2).join(', ')}${x.where.length > 2 ? ` +${x.where.length - 2}` : ''})`));
  }
  console.log(found.size ? `\nНарушений (уникальных): ${found.size}` : '\nНарушений нет');
  process.exit(found.size ? 1 : 0);
})();
