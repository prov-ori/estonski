import { h, content } from './util.js';

// Resolve links across skills; each task retains its own progress and draft.
export async function seriesLinks(item, module) {
  if (!item) return null;
  const modules = ['reading', 'listening', 'writing', 'speaking'];
  const groups = await Promise.all(modules.map(async name => ({ name, data: await content(name) })));
  const all = groups.flatMap(({ name, data }) => data.items.map(task => ({ task, name })));
  const parent = item.parent_id && all.find(({ task }) => task.id === item.parent_id);
  const children = all.filter(({ task }) => task.parent_id === item.id);
  if (!parent && !children.length) return null;
  const link = ({ task, name }, label) => h('a', { class: 'btn', href: `#/${name}/${task.id}` }, label + ': ' + task.title_ru);
  return h('nav', { class: 'card', 'aria-label': 'Этапы задания' },
    h('p', { class: 'muted' }, 'Серия заданий: выполняйте этапы по порядку. Прогресс каждого этапа сохраняется отдельно.'),
    h('div', { class: 'row' }, parent && link(parent, '← Исходное задание'), children.map(child => link(child, child.name === module ? 'Продолжить →' : 'Другой навык →'))));
}
