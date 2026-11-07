import {h} from './util.js';
import {store} from './store.js';

export function openTasks(key, questions) {
  return h('section', {class:'open-tasks'}, h('h2',null,'Развёрнутые ответы'),
    h('p',{class:'muted'},'Ответы сохраняются в этом браузере. Самопроверка по критериям; автоматические баллы за эти ответы не начисляются.'),
    questions.map((q,i)=>{
      const id = `${key}-open-${i}`;
      const saved = store.getWriting(id);
      const input = h('textarea',{class:'text-area',rows:5,lang:'et','aria-label':q.prompt_et,oninput:e=>store.setWriting(id,{text:e.target.value})});
      input.value=saved.text||'';
      return h('div',{class:'card'},h('h3',{lang:'et'},`${i+1}. ${q.prompt_et}`),input,
        h('details',null,h('summary',null,'Критерии самопроверки'),h('p',null,q.rubric_ru)));
    }));
}
