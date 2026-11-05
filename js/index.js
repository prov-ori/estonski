// Индекс контента: быстрый поиск вопросов и элементов по id.
import { content } from './util.js';

let cache = null;

/** Все «самостоятельные» вопросы (без контекста текста): грамматика, диагностика, языковой блок пробников. */
export async function standaloneQuestions() {
  if (cache) return cache;
  const [g, d, m] = await Promise.all([content('grammar'), content('diagnostic'), content('mock-exam')]);
  const list = [];
  g.items.forEach((q) => list.push({ q, module: 'grammar' }));
  d.items.forEach((q) => list.push({ q, module: 'diagnostic' }));
  m.items.forEach((mock) => (mock.parts.language ? mock.parts.language.questions : []).forEach((q) => list.push({ q, module: 'mock' })));
  cache = list;
  return list;
}

/** Нужная часть пробника по ссылке {ref} (или сам объект, если задание встроено). */
export async function resolvePart(part) {
  if (!part.ref) return part;
  const files = ['reading', 'listening', 'writing', 'speaking'];
  const all = await Promise.all(files.map((f) => content(f)));
  for (const d of all) {
    const found = d.items.find((x) => x.id === part.ref);
    if (found) return found;
  }
  throw new Error(`ref ${part.ref} не найден`);
}
