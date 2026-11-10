// Regression coverage for static audio, split layouts, sources and route races.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const size=fs.statSync(file).size;
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),size-1):size-1;
  if(start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
  res.writeHead(range?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  fs.createReadStream(file,{start,end}).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const base=`http://localhost:${server.address().port}/`;
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined});
  try {
    for(const width of [390,1280]){
      const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
      await context.addInitScript(()=>{window.synthCalls=0;Object.defineProperty(window,'speechSynthesis',{value:{getVoices(){window.synthCalls++;return [];},cancel(){},addEventListener(){},removeEventListener(){}}});});
      const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'#/listening/l-01');
      await page.waitForSelector('.listening audio');
      assert.equal(await page.evaluate(()=>window.synthCalls),0,'audio must not query device voices');
      await page.getByRole('button',{name:'▶ Слушать',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.listening audio').currentTime>0);
      await page.getByRole('button',{name:'Пауза',exact:true}).click();
      assert(await page.locator('audio').evaluate(a=>a.paused));
      await page.getByRole('button',{name:'Продолжить',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.listening audio').paused);
      assert((await page.locator('.listening').innerText()).includes('Прослушиваний: 1'));
      await page.locator('audio').evaluate(a=>{a.pause();a.currentTime=15;});
      await page.getByRole('button',{name:'↶ 10 секунд',exact:true}).click();
      assert(Math.abs(await page.locator('audio').evaluate(a=>a.currentTime)-5)<0.3);
      await page.selectOption('[aria-label="Скорость записи"]','1.25');
      assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),1.25);
      const audio=await page.locator('audio').elementHandle();
      await page.evaluate(()=>{location.hash='#/reading/r-01';});
      await page.waitForSelector('.open-tasks');
      assert(await audio.evaluate(a=>a.paused&&!a.hasAttribute('src')));
      for(const route of ['reading/r-01','writing/w-01','speaking/s-01','originals/source-ai-article-C1']){
        await page.goto(base+'#/'+route);await page.waitForSelector('.split');
        const left=await page.locator('.pane-left').boundingBox(),right=await page.locator('.pane-right').boundingBox();
        assert(width<960?left.y+left.height<=right.y+1:left.x+left.width<=right.x+1,route+' layout');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
        if(process.env.SHOTS_DIR && route==='reading/r-01'){fs.mkdirSync(process.env.SHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SHOTS_DIR,'reading-'+width+'.png')});}
      }
      await page.locator('.open-tasks textarea').first().fill('Minu vastus allika põhjal.');
      await page.reload();await page.waitForSelector('.open-tasks textarea');
      assert.equal(await page.locator('.open-tasks textarea').first().inputValue(),'Minu vastus allika põhjal.');
      await page.locator('.skip').focus();await page.keyboard.press('Enter');
      assert(await page.locator('main').evaluate(el=>el===document.activeElement));
      assert.equal(await page.locator('main h1').count(),1);
      if(width===1280){
        const index=JSON.parse(fs.readFileSync(path.join(root,'config/audio.json'),'utf8'));
        for(const [id,entry] of Object.entries(index.items)){
          const duration=await page.evaluate(async file=>{
            const a=new Audio(file);a.preload='auto';
            await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('audio timeout')),10000);a.oncanplay=()=>{clearTimeout(timer);resolve();};a.onerror=()=>{clearTimeout(timer);reject(Error('decode failure'));};});
            const d=a.duration;a.removeAttribute('src');a.load();return d;
          },entry.file);
          assert(Math.abs(duration-entry.seconds)<1,id+' duration');
        }
        console.log(Object.keys(index.items).length+' MP3s decoded successfully');
      }
      assert.deepEqual(errors,[]);await context.close();console.log('PASS '+width+'px: playback, pause, speed, seeking, cleanup, layout, saved answers');
    }
    const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
    let release,started;const delayed=new Promise(r=>release=r),requested=new Promise(r=>started=r);
    await page.route('**/content/reading.json',async route=>{started();await delayed;await route.fulfill({contentType:'application/json',body:fs.readFileSync(path.join(root,'content/reading.json'),'utf8')});});
    await page.goto(base+'#/reading/r-01');await requested;
    await page.evaluate(()=>location.hash='#/writing/w-01');await page.waitForSelector('textarea');release();
    await page.waitForTimeout(300);assert.equal(await page.locator('main h1').count(),1);assert((await page.locator('main h1').innerText()).startsWith('Письмо:'));
    await page.goto(base+'#/%E0%A4%A');await page.waitForSelector('main h1');assert((await page.locator('main h1').innerText()).includes('не найдена'));
    await context.close();console.log('PASS route race and malformed URL');

    const compact = await browser.newContext({ viewport: { width: 320, height: 568 }, serviceWorkers: 'block' });
    const narrow = await compact.newPage();
    await compact.addInitScript(() => {
      localStorage.setItem('estonski.prefs', JSON.stringify({ font: 'xlarge' }));
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => new Promise(resolve => {
        window.grantMicrophone = () => resolve({ getTracks: () => [{ stop() { window.microphoneReleased = true; } }] });
      }) });
    });
    await narrow.goto(base + '#/speaking/s-01');
    await narrow.getByRole('button', { name: 'Меню', exact: true }).click();
    const lastLink = narrow.locator('#nav').getByRole('link', { name: 'Прогресс', exact: true });
    await lastLink.scrollIntoViewIfNeeded();
    const lastBox = await lastLink.boundingBox();
    assert(lastBox.y >= 0 && lastBox.y + lastBox.height <= 568, 'last menu item stays within the viewport');
    await lastLink.focus();
    await narrow.keyboard.press('Escape');
    assert.equal(await narrow.locator('#menu-btn').getAttribute('aria-expanded'), 'false');
    assert(await narrow.locator('#menu-btn').evaluate(button => button === document.activeElement));
    await narrow.getByRole('button', { name: /Записать/ }).click();
    await narrow.waitForFunction(() => typeof window.grantMicrophone === 'function');
    await narrow.evaluate(() => { location.hash = '#/reading/level-C1'; });
    await narrow.locator('a[href="#/reading/r-forecast-c1"]').waitFor();
    await narrow.evaluate(() => window.grantMicrophone());
    await narrow.waitForFunction(() => window.microphoneReleased);
    await narrow.locator('a[href="#/reading/r-forecast-c1"]').click();
    await narrow.locator('.open-tasks textarea').first().waitFor();
    assert.equal(await narrow.locator('.qset .question').count(), 6);
    assert(await narrow.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await narrow.setViewportSize({ width: 1024, height: 420 });
    const contextBox = await narrow.locator('.pane-left').boundingBox();
    const tasksBox = await narrow.locator('.pane-right').boundingBox();
    assert(contextBox.x + contextBox.width <= tasksBox.x + 1);
    assert.equal(await narrow.locator('.pane-left').evaluate(el => getComputedStyle(el).position), 'static');
    await compact.close();
    console.log('PASS 320px menu, keyboard focus, delayed microphone cleanup and C1 reading on short screens');

    const levels = await browser.newPage({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    for (const [section, id, count, ready] of [
      ['listening', 'l-exhibition-c1', 4, '.listening audio'],
      ['writing', 'w-shift-summary-c1', 9, 'textarea'],
      ['speaking', 's-school-rules-c1', 9, '.role'],
    ]) {
      await levels.goto(base + '#/' + section);
      await levels.getByLabel('Уровень', { exact: true }).selectOption('C1');
      assert.equal(await levels.locator('main .link-card').count(), count);
      await levels.locator(`a[href="#/${section}/${id}"]`).click();
      await levels.locator(ready).first().waitFor();
      if (section !== 'listening') {
        const sample = levels.locator('details.sample');
        await sample.locator('summary').click();
        assert(await sample.locator('p[lang="et"]').isVisible());
      }
    }
    await levels.goto(base + '#/listening');
    await levels.getByLabel('Уровень', { exact: true }).selectOption('B2');
    assert.equal(await levels.locator('main .link-card').count(), 5);
    await levels.locator('a[href="#/listening/l-canteen-b2"]').click();
    await levels.getByRole('button', { name: '▶ Слушать', exact: true }).click();
    await levels.waitForFunction(() => document.querySelector('.listening audio')?.currentTime > 0);
    await levels.goto(base + '#/reading/level-C1');
    await levels.locator('a[href="#/reading/r-committee-c1"]').waitFor();
    assert.equal(await levels.locator('main .link-card').count(), 7);
    await levels.locator('a[href="#/reading/r-committee-c1"]').click();
    await levels.locator('.open-tasks textarea').first().waitFor();
    assert.equal(await levels.locator('.qset .question').count(), 5);
    assert.equal(await levels.locator('.open-tasks textarea').count(), 3);
    await levels.goto(base + '#/vocab');
    await levels.getByRole('navigation', { name: 'Уровни словаря' }).getByRole('link', { name: 'C1', exact: true }).click();
    await levels.getByRole('link', { name: 'Все (20)', exact: true }).waitFor();
    await levels.goto(base + '#/lessons');
    await levels.getByLabel('Уровень', { exact: true }).selectOption('C1');
    assert.equal(await levels.locator('main .link-card').count(), 4);
    await levels.locator('a[href="#/lessons/ls-conditional-c1"]').click();
    await levels.getByRole('link', { name: 'Практика по теме', exact: true }).click();
    const grammarLevel = levels.getByLabel('Уровень', { exact: true });
    await grammarLevel.waitFor();
    assert.equal(await grammarLevel.inputValue(), 'C1');
    await levels.getByRole('button', { name: 'Начать', exact: true }).click();
    await levels.getByText('Задание 1 из 10 · C1', { exact: true }).waitFor();
    await levels.goto(base + '#/drills/fix');
    await levels.getByLabel('Уровень', { exact: true }).selectOption('B2');
    await levels.getByRole('button', { name: 'Начать (10 заданий)', exact: true }).click();
    await levels.getByText('Задание 1 из 10 · B2', { exact: true }).waitFor();
    await levels.goto(base + '#/drills/forms');
    await levels.getByLabel('Уровень', { exact: true }).selectOption('C1');
    await levels.getByLabel('Что тренируем', { exact: true }).selectOption('verbs');
    await levels.getByRole('button', { name: 'Начать (10 заданий)', exact: true }).click();
    await levels.getByText('Задание 1 из 10 · C1', { exact: true }).waitFor();
    await levels.goto(base + '#/drills/order');
    await levels.getByLabel('Уровень', { exact: true }).selectOption('B2');
    await levels.getByRole('button', { name: 'Начать (10 заданий)', exact: true }).click();
    await levels.getByText('Задание 1 из 10 · B2', { exact: true }).waitFor();
    const orderRows = JSON.parse(fs.readFileSync(path.join(root, 'content/order.json'), 'utf8')).items;
    const parts = levels.getByRole('group', { name: 'Части предложения' });
    const translation = await levels.locator('.q-prompt .muted').innerText();
    const sentence = orderRows.find(row => row.level === 'B2' && row.ru === translation);
    assert(sentence);
    for (const chunk of sentence.chunks_et) await parts.getByRole('button', { name: chunk, exact: true }).click();
    await levels.getByRole('button', { name: 'Проверить', exact: true }).click();
    await levels.locator('.feedback.ok').waitFor();
    assert(await levels.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await levels.close();
    console.log('PASS advanced level filters and lesson-to-practice navigation');

    const diag = await browser.newPage({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await diag.addInitScript(() => {
      Math.random = () => 0.9999;
      window.__realDialogs = true;
      if (!localStorage.getItem('estonski.v1')) {
        localStorage.setItem('estonski.v1', JSON.stringify({
          v: 1, answers: {}, diag: { ts: 1, zoneLabel: 'B1', got: 12, max: 20 },
        }));
      }
    });
    const diagBank = new Map(JSON.parse(fs.readFileSync(path.join(root, 'content/diagnostic.json'), 'utf8')).items.map(q => [q.id, q]));
    await diag.goto(base + '#/diagnostic');
    await diag.getByRole('link', { name: 'Диагностика B2–C1', exact: true }).click();
    await diag.getByRole('button', { name: 'Начать', exact: true }).click();
    const ids = new Set();
    for (let i = 0; i < 16; i++) {
      await diag.getByText(`Вопрос ${i + 1} из 16`, { exact: true }).waitFor();
      const question = diag.locator('.question');
      const id = await question.getAttribute('data-qid');
      const q = diagBank.get(id);
      assert(q?.advanced);
      assert.equal(q.level, i < 8 ? 'B2' : 'C1');
      ids.add(id);
      if (i === 15) break;
      if (q.type === 'input') await question.locator('input[type=text]').fill(q.also_ok?.[0] || q.answer);
      else await question.locator(`input[value="${q.answer}"]`).check({ force: true });
      assert.equal(await question.locator('.feedback').innerText(), '');
      await diag.getByRole('button', { name: 'Дальше →', exact: true }).click();
      if (i === 0) {
        await diag.getByRole('button', { name: '← Назад', exact: true }).click();
        assert.equal(await diag.locator('.question input[type=text]').inputValue(), q.answer);
        await diag.getByRole('button', { name: 'Дальше →', exact: true }).click();
      }
    }
    assert.equal(ids.size, 16);
    await diag.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await diag.getByRole('dialog').getByRole('button', { name: 'Отмена', exact: true }).click();
    await diag.getByText('Вопрос 16 из 16', { exact: true }).waitFor();
    await diag.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await diag.getByRole('dialog').getByRole('button', { name: 'Завершить', exact: true }).click();
    await diag.getByRole('heading', { name: 'Результат диагностики B2–C1', exact: true }).waitFor();
    await diag.getByText('B2: 8 из 8', { exact: true }).waitFor();
    await diag.getByText('C1: 7 из 8', { exact: true }).waitFor();
    assert.equal(await diag.locator('details.review').count(), 16);
    assert(await diag.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await diag.getByRole('link', { name: 'Повторить ошибки', exact: true }).click();
    await diag.getByText('Заданий с ошибками: 1', { exact: true }).waitFor();
    await diag.reload();
    await diag.goto(base + '#/progress');
    await diag.getByRole('heading', { name: 'Последняя диагностика B2–C1', exact: true }).waitFor();
    const saved = await diag.evaluate(() => JSON.parse(localStorage.getItem('estonski.v1')));
    assert.deepEqual([saved.diag.zoneLabel, saved.diag.got, saved.diagAdvanced.got, saved.diagAdvanced.max], ['B1', 12, 15, 16]);
    await diag.close();
    console.log('PASS advanced diagnostics, alternate answers, review, mobile layout and separate saved scores');

    const practice = await browser.newPage({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await practice.addInitScript(() => {
      if (window.speechSynthesis) window.speechSynthesis.getVoices = () => [];
    });
    await practice.goto(base + '#/drills/dictation');
    await practice.getByLabel('Уровень', { exact: true }).selectOption('C1');
    await practice.getByRole('button', { name: 'Начать (8 фраз)', exact: true }).click();
    await practice.getByText('Фраза 1 из 8 · C1', { exact: true }).waitFor();
    await practice.getByRole('button', { name: '▶ Слушать', exact: true }).click();
    await practice.waitForFunction(() => document.querySelector('.trainer audio')?.currentTime > 0);
    const recording = await practice.locator('.trainer audio').getAttribute('src');
    const item = JSON.parse(fs.readFileSync(path.join(root, 'content/dictation.json'), 'utf8')).items
      .find(row => recording === `audio/${row.id}.mp3`);
    assert.equal(item.level, 'C1');
    assert(await practice.locator('.trainer .q-et').isHidden());
    await practice.getByRole('textbox', { name: 'Ваш ответ' }).fill(item.text_et);
    await practice.getByRole('button', { name: 'Проверить', exact: true }).click();
    await practice.locator('.feedback.ok').waitFor();
    await practice.goto(base + '#/mock');
    for (const [variant, range] of [['mock-06', '180–240'], ['mock-07', '230–320']]) {
      await practice.locator('#mock').selectOption(variant);
      await practice.getByRole('checkbox', { name: /Использовать таймер частей/ }).uncheck();
      await practice.getByRole('button', { name: 'Начать пробный экзамен', exact: true }).click();
      for (let i = 1; i <= 4; i++) {
        await practice.getByRole('heading', { name: new RegExp(`Часть ${i} из 5`) }).waitFor();
        if (i === 4) await practice.getByText(new RegExp(range)).first().waitFor();
        await practice.getByRole('button', { name: 'Завершить часть →', exact: true }).click();
      }
      await practice.getByRole('button', { name: 'Завершить экзамен', exact: true }).click();
      await practice.getByRole('heading', { name: 'Результат пробного экзамена', exact: true }).waitFor();
      assert.equal(await practice.locator('.threshold').count(), 0);
      await practice.getByRole('button', { name: 'В начало', exact: true }).click();
    }
    await practice.close();
    console.log('PASS recorded C1 dictation and both five-part advanced practice variants');

    const progress = await browser.newPage({serviceWorkers:'block'});
    await progress.goto(base);
    const imported = await progress.evaluate(async () => {
      const {store} = await import('/js/store.js');
      store.setWriting('w-01', { text: 'Minu tekst' });
      const before = localStorage.getItem('estonski.v1');
      const malformed = [{v:1,answers:null}, {v:1,answers:[]}, {v:1,answers:{bad:null}}, {v:1,answers:{},mock:[null]}];
      return malformed.every(data => !store.importJSON(JSON.stringify(data)).ok) &&
        localStorage.getItem('estonski.v1') === before && store.getWriting('w-01').text === 'Minu tekst';
    });
    assert(imported, 'malformed imports must preserve the saved progress');
    await progress.close();
    console.log('PASS malformed progress imports preserve drafts');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
