import { h, content, shuffle, addChildren } from '../util.js';
import { speakButton, recorderWidget } from '../widgets.js';
import { runTrainer } from '../trainer.js';
import { findEtVoice, voiceKind } from '../speech.js';

const wordRow = (w) => h('li', null, h('strong', { lang: 'et' }, w.et), ' ', speakButton(w.et, 'Прослушать'), ' — ', w.ru);

export default {
  title: 'Произношение',
  async mount(root) {
    const data = await content('pronunciation');
    const by = (k) => data.items.filter((x) => x.kind === k);
    const letters = by('letter');
    const voice = await findEtVoice();
    const kind = voice ? voiceKind(voice) : null;
    const rec = recorderWidget();
    const area = h('div', { class: 'trainer' });

    addChildren(root,
      h('p', null, h('a', { href: '#/drills' }, '← Тренажёры')),
      h('h1', null, 'Произношение'),
      h('p', { class: 'lead' }, 'Звуки, которых нет в русском, ударение и долгота. Слушайте, повторяйте вслух и записывайте себя.'),
      !voice
        ? h('p', { class: 'notice warn' }, 'На этом устройстве нет голоса для озвучки (кнопок «🔊» не будет): ориентируйтесь на описания. Как подключить голос — в разделе «Аудирование».')
        : kind !== 'et' ? h('p', { class: 'notice warn' }, `Эстонского голоса нет, используется ${kind === 'fi' ? 'финский' : 'другой'} голос (${voice.name}). Он может искажать õ, ä и долготу звуков, поэтому доверяйте описаниям и живой речи.`) : null,
      letters.map((l) => h('section', { class: 'card' }, h('h2', null, `${l.letter.toUpperCase()} ${l.letter}`), h('p', null, l.explanation_ru), h('ul', { class: 'examples' }, l.words.map(wordRow)))),
      by('stress').map((s) => h('section', { class: 'card' }, h('h2', null, s.title_ru), h('p', null, s.explanation_ru), h('ul', { class: 'examples' }, s.words.map(wordRow)))),
      by('length').map((s) => h('section', { class: 'card' }, h('h2', null, s.title_ru), h('p', null, s.explanation_ru),
        s.pairs.map((p) => h('div', null, h('h3', null, p.title), h('ul', { class: 'examples' }, p.words.map(wordRow)))))),
      h('section', { class: 'card' }, h('h2', null, 'Тренажёр написания'), h('p', null, 'Прослушайте слово (если есть озвучка) или прочитайте перевод и напечатайте эстонское слово. Особое внимание — буквам õ, ä, ö, ü.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: start }, 'Начать (10 слов)')), area),
      by('phrases').map((p) => h('section', { class: 'card' }, h('h2', null, p.title_ru), h('p', null, p.explanation_ru),
        h('ol', { class: 'phrases' }, p.phrases.map((f) => h('li', null, h('span', { lang: 'et' }, f.et), ' ', speakButton(f.et, 'Прослушать фразу'), h('span', { class: 'muted' }, ` — ${f.ru}`)))),
        h('h3', null, 'Запись и сравнение'), rec.el)));

    function start() {
      const words = shuffle(letters.flatMap((l) => l.words)).slice(0, 10);
      const qs = words.map((w, i) => ({ id: `pr-w-${w.et}`, topic: 'spelling', level: 'B1', status: 'draft', type: 'input', prompt_et: 'Kirjuta sõna: ___', prompt_ru: w.ru, speak: w.et, answer: w.et, explanation_ru: `${w.et} — ${w.ru}. Проверьте õ, ä, ö, ü и двойные согласные.` }));
      runTrainer(area, qs.map((q) => ({ q, module: 'drills' })), { again: start });
    }
    return () => rec.destroy();
  },
};
