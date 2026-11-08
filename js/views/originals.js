import { splitView } from '../widgets.js';
import {h,content,addChildren} from '../util.js';
import {openTasks} from '../open-tasks.js';
export default {
  title:'Оригиналы B1 · B2 · C1',
  async mount(root,args){
    const data=await content('sources');
    const item=data.items.find(x=>x.id===args[0]);
    if(!item){
      const level=['B1','B2','C1'].includes(args[0])?args[0]:'B1';
      addChildren(root,h('h1',null,'Оригиналы: B1 · B2 · C1'),
        h('p',{class:'lead'},'Читайте настоящие публикации на сайте издателя, затем выполняйте задания здесь. Один источник можно изучать на разных уровнях: меняется глубина анализа, а не сам оригинал.'),
        h('p',{class:'notice'},'У Harno доступны официальные образцы и архивы. Уровни заданий к публикациям показывают ориентировочную сложность работы с оригиналом.'),
        h('nav',{class:'chips','aria-label':'Уровень источников'},['B1','B2','C1'].map(l=>h('a',{class:'chip',href:'#/originals/'+l,'aria-current':level===l?'true':null},l))),
        h('div',{class:'grid'},data.items.filter(x=>x.level===level).map(x=>h('a',{class:'card link-card',href:'#/originals/'+x.id},h('h2',null,x.title_ru),h('p',null,`${x.level} · ${x.kind} · ${x.tasks.length} заданий`),h('p',{class:'muted'},x.publisher)))));
      return;
    }
    addChildren(root,h('a',{href:'#/originals/'+item.level},'← Материалы '+item.level),h('h1',null,item.title_ru),
      splitView([h('p',null,`${item.level} · ${item.publisher} · ${item.kind}`),
      h('p',{class:'muted'},`Источник проверен: ${item.checked_on}.${item.published_on ? ' Дата публикации: '+item.published_on+'.' : ''}`),
      h('p',null,item.guide_ru),
      h('a',{class:'btn primary',href:item.url,target:'_blank',rel:'noopener noreferrer'},'Открыть оригинал ↗'),
      h('p',{class:'muted'},item.explanation_ru)],openTasks(item.id,item.tasks)));
  }
};
