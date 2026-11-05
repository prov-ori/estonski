#!/usr/bin/env node
// Дымовой тест в настоящем браузере: node tools/smoke.js [--shots DIR]
// Открывает каждую страницу, ловит ошибки консоли, проходит основные сценарии, проверяет сохранение прогресса после перезагрузки.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json; charset=utf-8' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let failures = 0;
const ok = (c, msg) => { console.log(`${c ? '  ok  ' : ' FAIL '} ${msg}`); if (!c) failures++; };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

  for (const [label, vp] of [['mobile', { width: 390, height: 800 }], ['desktop', { width: 1280, height: 900 }]]) {
    console.log(`\n=== ${label} ${vp.width}px ===`);
    const ctx = await browser.newContext({ viewport: vp, permissions: ['microphone'], deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url()));
    page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
    page.on('dialog', (d) => d.accept());
    const shot = async (n) => { if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, `${label}-${n}.png`), fullPage: true }); } };
    const go = async (hash) => { await page.goto(base + '#/' + hash); await page.waitForSelector('main h1', { timeout: 5000 }); await page.waitForTimeout(150); };
    const noOverflow = async (n) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${n}: нет горизонтальной прокрутки`);

    // 1. все страницы открываются
    const ids = (file, route) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', file + '.json'), 'utf8')).items.map((x) => `${route}/${x.id}`);
    const ALL = ['', 'daily', 'diagnostic', 'grammar', 'grammar/cases', 'grammar/mistakes', 'drills', 'drills/forms', 'drills/numbers', 'drills/order', 'drills/dictation', 'vocab', 'wordlist', 'reading', 'listening', 'writing', 'speaking', 'mock', 'mistakes', 'reference', 'progress', 'about',
      ...ids('reading', 'reading'), ...ids('listening', 'listening'), ...ids('writing', 'writing'), ...ids('speaking', 'speaking')];
    for (const r of ALL) {
      await go(r);
      ok((await page.locator('footer .disclaimer').innerText()).startsWith('Неофициальный тренажёр. Не связан с HARNO'), `страница #/${r}: футер на месте`);
      await noOverflow('#/' + r);
      const txt = await page.locator('main').innerText();
      ok(!(r === 'reference' ? /\[object|\bundefined\b|NaN/ : /\[object|\bundefined\b|\bnull\b|NaN/).test(txt), `страница #/${r}: нет служебного мусора в тексте`);
    }
    await shot('home');

    // 2. грамматика: ответ → сохранение → после перезагрузки в прогрессе
    await go('grammar/cases');
    await page.getByRole('button', { name: 'Начать' }).click();
    ok(!(await page.getByRole('button', { name: /Дальше|Завершить/ }).isVisible().catch(() => false)), 'грамматика: кнопка «Дальше» скрыта до ответа');
    const first = page.locator('.question');
    const isInput = await first.locator('input.text-input').count();
    if (isInput) { await first.locator('input.text-input').fill('zzz'); await page.getByRole('button', { name: 'Проверить' }).click(); }
    else await first.locator('button.opt').first().click();
    ok(await page.locator('.feedback.ok, .feedback.bad').count() === 1, 'грамматика: мгновенная проверка показала результат');
    ok((await page.locator('.feedback').innerText()).length > 20, 'грамматика: есть объяснение по-русски');
    await shot('grammar');
    await page.reload(); await page.waitForSelector('main h1');
    await go('progress');
    ok((await page.locator('main').innerText()).includes('Падежи'), 'прогресс: тема «Падежи» после перезагрузки');

    // 2b. фильтры грамматики и пустой ответ
    await go('grammar');
    await page.locator('#type').selectOption('input');
    await page.locator('#size').selectOption('20');
    await page.getByRole('button', { name: 'Начать' }).click();
    ok((await page.locator('main').innerText()).includes('Задание 1 из 20'), 'грамматика: размер сессии применяется');
    ok(await page.locator('input.text-input').count() === 1, 'грамматика: фильтр «ввод с клавиатуры» даёт задания с вводом');
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    ok((await page.locator('.feedback').innerText()).includes('Сначала заполните'), 'пустой ответ не засчитывается и не блокирует вопрос');
    ok(await page.locator('.text-input').isEditable(), 'после пустого ответа поле остаётся доступным для ввода');

    // 3. ввод õ ä ö ü кнопками
    await go('grammar/cases');
    await page.getByRole('button', { name: 'Начать' }).click();
    for (let k = 0; k < 8 && !(await page.locator('input.text-input').count()); k++) { await page.locator('button.opt').first().click(); await page.getByRole('button', { name: /Дальше|Завершить/ }).click(); }
    if (await page.locator('input.text-input').count()) {
      await page.locator('input.text-input').focus();
      await page.getByRole('button', { name: 'Вставить õ' }).click();
      await page.getByRole('button', { name: 'Вставить ü' }).click();
      ok((await page.locator('input.text-input').inputValue()) === 'õü', 'кнопки букв вставляют õ ü');
    } else ok(false, 'не нашёл вопрос с вводом');

    // 4. диагностика целиком
    await go('diagnostic');
    await page.getByRole('button', { name: /Начать|Пройти заново/ }).click();
    for (let k = 0; k < 20; k++) {
      await page.locator('.question input[type=radio]').first().check({ force: true });
      const btn = page.getByRole('button', { name: /Дальше|Завершить тест/ });
      await btn.click();
    }
    await page.waitForSelector('text=Ориентировочная зона');
    ok(true, 'диагностика: показан результат с зоной');
    ok((await page.locator('main').innerText()).includes('не оценка экзамена'), 'диагностика: оговорка «не оценка экзамена»');
    await shot('diag-result');
    await page.reload(); await go('progress');
    ok((await page.locator('main').innerText()).includes('Последняя диагностика'), 'диагностика сохранена после перезагрузки');

    // 5. словарь
    await go('vocab');
    await page.getByRole('button', { name: 'Начать сессию' }).click();
    await page.getByRole('button', { name: 'Показать ответ' }).click();
    await page.getByRole('button', { name: /Знаю/ }).click();
    const boxes = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('estonski.v1')).cards).length);
    ok(boxes === 1, 'словарь: карточка записана в Лейтнер');
    await shot('vocab');

    // 6. чтение
    await go('reading/r-01');
    await page.getByRole('button', { name: 'Проверить ответы' }).click();
    ok((await page.locator('.result .big').innerText()).includes('Верно:'), 'чтение: проверка показала счёт');
    await shot('reading');

    // 7. аудирование: в headless нет голоса → запасной вариант
    await go('listening/l-01');
    await page.waitForSelector('text=нет эстонского голоса', { timeout: 4000 }).catch(() => {});
    const noVoice = (await page.locator('.listening').innerText()).includes('нет эстонского голоса');
    ok(noVoice || (await page.locator('.listening').innerText()).includes('Голос:'), 'аудирование: статус голоса показан');
    await page.getByRole('button', { name: 'Проверить ответы' }).click();
    ok(await page.locator('.transcript:not([hidden])').count() === 1, 'аудирование: стенограмма открылась после попытки');
    ok((await page.locator('main').innerText()).includes('не записи с экзамена'), 'аудирование: честная оговорка про синтез');
    await shot('listening');

    // 8. письмо: текст с õ сохраняется
    await go('writing/w-01');
    await page.locator('textarea').fill('Tere, Karl! Tule õhtul külla.');
    await page.reload(); await page.waitForSelector('textarea');
    ok((await page.locator('textarea').inputValue()).includes('õhtul'), 'письмо: черновик с õ сохранился');
    ok((await page.locator('#wc').innerText()).includes('Слов: 5'), 'письмо: счётчик слов = 5');
    await page.getByRole('checkbox').first().check();
    await page.reload(); await page.waitForSelector('textarea');
    ok(await page.getByRole('checkbox').first().isChecked(), 'письмо: чек-лист сохранён');
    await shot('writing');

    // 9. говорение: запись
    await go('speaking/s-01');
    await page.getByRole('button', { name: /Записать/ }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Остановить/ }).click();
    await page.waitForSelector('.takes audio', { timeout: 5000 });
    ok(true, 'говорение: запись создана и доступна для прослушивания');
    ok((await page.locator('.recorder').innerText()).includes('никуда не отправляется'), 'говорение: на экране сказано, что запись не отправляется');
    await shot('speaking');

    // 10. пробный экзамен без таймера
    await go('mock');
    await page.getByRole('checkbox', { name: /Использовать таймер/ }).uncheck();
    await page.getByRole('button', { name: 'Начать пробный экзамен' }).click();
    for (let k = 0; k < 5; k++) {
      await page.waitForSelector('h1:has-text("Часть")');
      if (k === 2) { const i = page.locator('input.text-input').first(); await i.fill('kolmteist'); }
      await shot(`mock-part${k + 1}`);
      await page.getByRole('button', { name: /Завершить (часть|экзамен)/ }).click();
    }
    await page.waitForSelector('text=Ориентировочно:');
    ok((await page.locator('main').innerText()).includes('Разбор ошибок'), 'пробный: есть разбор ошибок');
    ok(await page.locator('.threshold .marker').count() === 1, 'пробный: отметка порога на шкале');
    await shot('mock-result');


    // 10b. практика дня
    await go('daily');
    await page.getByRole('button', { name: 'Начать сессию' }).click();
    for (let k = 0; k < 10; k++) {
      const q = page.locator('.question');
      if (await q.locator('input.text-input').count()) { await q.locator('input.text-input').fill('x'); await page.getByRole('button', { name: 'Проверить' }).click(); }
      else await q.locator('button.opt').first().click();
      await page.getByRole('button', { name: /Дальше|Завершить/ }).click();
    }
    await page.waitForSelector('text=Сессия завершена');
    ok(true, 'практика дня: сессия из 10 заданий пройдена');
    await go('daily');
    const todayN = Number(((await page.locator('main').innerText()).match(/Сегодня: (\d+) из 10/) || [])[1]);
    ok(todayN >= 10, `практика дня: дневная цель считается (сегодня ${todayN})`);
    await go('mistakes');
    ok((await page.locator('main').innerText()).includes('Заданий с ошибками') || (await page.locator('main').innerText()).includes('Ошибок нет'), 'мои ошибки: страница работает');

    // 10c. тренажёры
    await go('drills/forms');
    await page.getByRole('button', { name: /Начать/ }).click();
    await page.locator('button.opt').first().click();
    ok(await page.locator('.feedback.ok, .feedback.bad').count() === 1, 'формы слов: мгновенная проверка');
    await go('drills/numbers');
    await page.getByRole('button', { name: /Начать/ }).click();
    ok(await page.locator('.question').count() === 1, 'числительные: задание показано');
    await go('drills/order');
    await page.getByRole('button', { name: /Начать/ }).click();
    const tokenCount = await page.locator('.tokens:not(.built) .token').count();
    for (let k = 0; k < tokenCount; k++) await page.locator('.tokens:not(.built) .token').first().click();
    await page.getByRole('button', { name: 'Проверить' }).click();
    ok(await page.locator('.feedback.ok, .feedback.bad').count() === 1, 'порядок слов: проверка работает');
    await go('drills/dictation');
    await page.getByRole('button', { name: /Начать/ }).click();
    ok((await page.locator('main').innerText()).includes('режим переписывания'), 'диктант: запасной режим без эстонского голоса');
    await page.locator('input.text-input').fill('zzz');
    await page.getByRole('button', { name: 'Проверить' }).click();
    ok((await page.locator('.diff').count()) === 1, 'диктант: показан разбор ошибок по словам');

    // 10d. словарь: тест и список слов
    await go('vocab');
    await page.getByRole('button', { name: 'Тест с вариантами ответа' }).click();
    await page.locator('button.opt').first().click();
    ok(await page.locator('.feedback').count() === 1, 'словарь: тест с вариантами работает');
    await go('wordlist');
    await page.locator('#q').fill('raamat');
    ok((await page.locator('#cnt').innerText()).includes('Найдено слов: 1') || (await page.locator('.words li').count()) >= 1, 'список слов: поиск работает');

    // 10e. пробный 2 (ссылки на задания других разделов)
    await go('mock');
    await page.locator('#mock').selectOption('mock-02');
    await page.getByRole('checkbox', { name: /Использовать таймер/ }).uncheck();
    await page.getByRole('button', { name: 'Начать пробный экзамен' }).click();
    for (let k = 0; k < 5; k++) { await page.waitForSelector('h1:has-text("Часть")'); await page.getByRole('button', { name: /Завершить (часть|экзамен)/ }).click(); }
    await page.waitForSelector('text=Ориентировочно:');
    ok(true, 'пробный экзамен 2 (с ref-заданиями) пройден');

    // 10f. тема и размер текста
    await go('');
    await page.locator('#pref-theme').selectOption('dark');
    await page.locator('#pref-font').selectOption('large');
    await page.reload(); await page.waitForSelector('main h1');
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && document.documentElement.getAttribute('data-font') === 'large'), 'тема и размер текста сохраняются');
    await page.locator('#pref-theme').selectOption('light');
    await page.locator('#pref-font').selectOption('normal');

    // 10g. экспорт и импорт прогресса
    await go('progress');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Скачать прогресс' }).click()]);
    const dlPath = await dl.path();
    const exported = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
    ok(exported.v === 1 && Object.keys(exported.answers).length > 5, 'экспорт: файл прогресса содержит ответы');
    await page.evaluate(() => localStorage.removeItem('estonski.v1'));
    await page.reload(); await page.waitForSelector('main h1');
    await go('progress');
    await page.locator('#imp').setInputFiles(dlPath);
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('estonski.v1')).answers).length > 5), 'импорт: прогресс восстановлен из файла');
    const bad = path.join(path.dirname(dlPath), 'bad.json'); fs.writeFileSync(bad, '{not json');
    await page.locator('#imp').setInputFiles(bad); await page.waitForTimeout(300);
    ok((await page.locator('main').innerText()).includes('не читается'), 'импорт: битый файл отклонён с сообщением');
    ok(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('estonski.v1')).answers).length > 5), 'импорт: битый файл не стёр прогресс');

    // 10h. фильтр по темам и переход к следующему заданию
    await go('reading');
    ok(await page.locator('#topic-filter').count() === 1, 'чтение: есть фильтр по темам');
    const before = await page.locator('.card.link-card').count();
    await page.locator('#topic-filter').selectOption('city');
    const after = await page.locator('.card.link-card').count();
    ok(after > 0 && after < before, `чтение: фильтр по теме сокращает список (${before} → ${after})`);
    await go('reading/r-01');
    await page.getByRole('link', { name: /Следующий текст/ }).click();
    await page.waitForSelector('main h1');
    ok(!(await page.evaluate(() => location.hash)).endsWith('r-01'), 'чтение: «Следующий текст» ведёт на другое задание');
    await go('writing/w-01');
    ok(await page.getByRole('link', { name: /Следующее задание/ }).count() === 1, 'письмо: есть переход к следующему заданию');
    await go('grammar/adjectives');
    await page.getByRole('button', { name: 'Начать' }).click();
    ok(await page.locator('.question').count() === 1, 'грамматика: тема «Прилагательные» работает');
    await go('drills/forms');
    await page.locator('#k').selectOption('verbs');
    await page.locator('#m').selectOption('input');
    await page.getByRole('button', { name: /Начать/ }).click();
    ok(await page.locator('input.text-input').count() === 1, 'формы глаголов: режим ввода работает');

    // 10i. раскладка «материал слева — вопросы справа»
    await go('reading/r-01');
    const lay = await page.evaluate(() => {
      const l = document.querySelector('.pane-left').getBoundingClientRect(), r = document.querySelector('.pane-right').getBoundingClientRect();
      return { sideBySide: r.left > l.left + 50 && Math.abs(r.top - l.top) < 40, stacked: r.top > l.bottom - 5 };
    });
    if (vp.width >= 1000) ok(lay.sideBySide, 'раскладка: текст слева, вопросы справа (компьютер)');
    else ok(lay.stacked, 'раскладка: на телефоне вопросы под текстом');
    if (vp.width < 1000) {
      await page.getByRole('button', { name: /Свернуть: текст/ }).click();
      ok(!(await page.locator('.pane-left .text').isVisible()), 'телефон: текст сворачивается');
      await page.getByRole('button', { name: /Показать: текст/ }).click();
      ok(await page.locator('.pane-left .text').isVisible(), 'телефон: текст разворачивается');
    }
    await page.locator('.question').first().locator('input[type=radio]').first().check({ force: true });
    await page.getByRole('button', { name: 'Проверить ответы' }).click();
    await page.getByRole('button', { name: 'Показать в тексте' }).first().click();
    ok(await page.locator('mark.evidence').count() === 1, 'подсветка места ответа в тексте работает');
    for (const r of ['writing/w-01', 'speaking/s-01', 'listening/l-01']) {
      await go(r);
      const sbs = await page.evaluate(() => { const l = document.querySelector('.pane-left').getBoundingClientRect(), rr = document.querySelector('.pane-right').getBoundingClientRect(); return rr.left > l.left + 50 ? 'side' : 'stack'; });
      ok(sbs === (vp.width >= 1000 ? 'side' : 'stack'), `раскладка #/${r}: ${sbs}`);
    }
    await go('sources');
    ok((await page.locator('main').innerText()).includes('Эстонские пословицы'), 'страница «Источники» показывает материал с источником');
    await go('reading/r-15');
    ok((await page.locator('.source').innerText()).includes('Лицензия'), 'у текста с источником показана лицензия');

    // 10j. серии заданий (parent_id) и уровни
    for (const module of ['reading', 'listening', 'writing', 'speaking']) {
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', module + '.json'), 'utf8'));
      for (const task of data.items.filter((x) => x.parent_id)) {
        await go(`${module}/${task.id}`);
        ok(await page.locator('nav[aria-label="Этапы задания"]').count() === 1, `${module}/${task.id}: есть навигация по серии`);
        ok(await page.getByRole('link', { name: /Исходное задание/ }).count() === 1, `${module}/${task.id}: есть обратная ссылка`);
      }
    }
    await go('reading/r-01');
    await page.getByRole('link', { name: /Продолжить/ }).first().click();
    await page.waitForSelector('nav[aria-label="Этапы задания"]');
    ok((await page.evaluate(() => location.hash)).includes('r-01-part2'), 'серия: переход к продолжению работает');
    await go('writing/w-01-reply');
    await page.locator('textarea').fill('Aitäh vastuse eest! Pakun uut aega.');
    await go('writing/w-01');
    ok(!(await page.locator('textarea').inputValue()).includes('Pakun uut aega'), 'серия: черновик продолжения отделён от исходного');
    await go('writing/w-01-reply');
    ok((await page.locator('textarea').inputValue()).includes('Pakun uut aega'), 'серия: черновик продолжения сохраняется');
    await go('reading/level-B2');
    ok((await page.locator('.chip[aria-current="true"]').innerText()) === 'B2', 'чтение: фильтр уровня B2 выбран');
    ok(await page.locator('.card.link-card').count() > 0, 'чтение: уровень B2 содержит тексты');

    // 11. клавиатура: первый Tab — ссылка «К содержимому»
    await go('');
    await page.reload(); await page.waitForSelector('main h1');
    await page.keyboard.press('Tab');
    ok((await page.evaluate(() => document.activeElement.className)) === 'skip', 'клавиатура: первый Tab попадает на skip-ссылку');

    // 12. прогресс и сброс
    await go('progress');
    await shot('progress');
    await page.getByRole('button', { name: 'Сбросить весь прогресс' }).click();
    await page.getByRole('button', { name: 'Да, удалить всё' }).click();
    ok(await page.evaluate(() => !localStorage.getItem('estonski.v1') || JSON.parse(localStorage.getItem('estonski.v1')).diag === null), 'сброс очистил хранилище');

    // 13. сайт работает при недоступном localStorage
    const ctx2 = await browser.newContext({ viewport: vp });
    await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    const p2 = await ctx2.newPage();
    const e2 = [];
    p2.on('pageerror', (e) => e2.push(e.message));
    await p2.goto(base + '#/grammar/cases');
    await p2.waitForSelector('main h1');
    await p2.getByRole('button', { name: 'Начать' }).click();
    await p2.locator('button.opt, input.text-input').first().click();
    ok(e2.length === 0, 'без localStorage: нет ошибок, тренажёр работает');
    ok((await p2.locator('main').innerText()).includes('не даёт сохранять'), 'без localStorage: пользователь предупреждён');
    await ctx2.close();

    ok(errs.length === 0, `консоль без ошибок и предупреждений${errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''}`);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(failures ? `\nПровалено проверок: ${failures}` : '\nВсе проверки пройдены');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
