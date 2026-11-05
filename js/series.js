import { h, config } from './util.js';

// Ссылки между заданиями серии; у каждого этапа свой прогресс и черновик.
// Используется маленький индекс config/series.json (создаёт tools/build-index.js), а не четыре полных файла контента.
export async function seriesLinks(item, module) {
  if (!item) return null;
  const all = Object.entries((await config('series')).items).map(([id, t]) => ({ task: { id, ...t }, name: t.module }));
  const parent = item.parent_id && all.find(({ task }) => task.id === item.parent_id);
  const children = all.filter(({ task }) => task.parent_id === item.id);
  if (!parent && !children.length) return null;
  const link = ({ task, name }, label) => h('a', { class: 'btn', href: `#/${name}/${task.id}` }, label + ': ' + task.title_ru);
  return h('nav', { class: 'card', 'aria-label': 'Этапы задания' },
    h('p', { class: 'muted' }, 'Серия заданий: выполняйте этапы по порядку. Прогресс каждого этапа сохраняется отдельно.'),
    h('div', { class: 'row' }, parent && link(parent, '← Исходное задание'), children.map((child) => link(child, child.name === module ? 'Продолжить →' : 'Другой навык →'))));
}
