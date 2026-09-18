import type { pages } from '@/db/schema';

type PageInsert = typeof pages.$inferInsert;

const reservedSlugs = [
  '/login',
  '/account',
  '/admin',
  '/catalog',
  '/api',
  '/llms.txt',
  '/llms-full.txt',
  '/robots.txt',
  '/sitemap.xml',
];

export function normalizePageSlug(value: unknown) {
  if (typeof value !== 'string') throw new Error('slug должен быть строкой');
  const slug = value.trim().startsWith('/') ? value.trim() : `/${value.trim()}`;
  const normalized = slug === '/' ? '/' : slug.replace(/\/+$/, '');
  if (
    normalized.length < 2 ||
    normalized.length > 180 ||
    !/^\/[a-z0-9а-яё][a-z0-9а-яё/_-]*$/i.test(normalized)
  ) {
    throw new Error('slug может содержать только буквы, цифры, /, _ и -');
  }
  if (
    reservedSlugs.some(
      (reserved) =>
        normalized === reserved || normalized.startsWith(`${reserved}/`),
    )
  ) {
    throw new Error('Этот адрес зарезервирован движком');
  }
  return normalized;
}

function validateBlocks(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50)
    throw new Error('blocks должен содержать не более 50 блоков');
  let total = 0;
  for (const block of value) {
    if (
      typeof block !== 'string' &&
      (!block || typeof block !== 'object' || Array.isArray(block))
    ) {
      throw new Error('Каждый блок должен быть текстом или объектом');
    }
    const size = JSON.stringify(block).length;
    if (size > 12000) throw new Error('Один блок слишком большой');
    total += size;
  }
  if (total > 50000) throw new Error('Содержимое страницы слишком большое');
  return value;
}

function validateSeo(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('seo должен быть объектом');
  const source = value as Record<string, unknown>;
  const seo: Record<string, string> = {};
  for (const key of ['title', 'description', 'keywords']) {
    if (source[key] === undefined) continue;
    if (typeof source[key] !== 'string' || source[key].length > 320)
      throw new Error(`seo.${key} имеет некорректный размер`);
    seo[key] = source[key].trim();
  }
  return seo;
}

export function pageInput(body: Record<string, unknown>, partial = false) {
  const result: Partial<PageInsert> = {};
  if (!partial || body.slug !== undefined) result.slug = normalizePageSlug(body.slug);
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160)
      throw new Error('title обязателен и должен быть не длиннее 160 символов');
    result.title = body.title.trim();
  }
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published')
      throw new Error('status должен быть draft или published');
    result.status = body.status;
  }
  if (!partial || body.blocks !== undefined) result.blocks = validateBlocks(body.blocks);
  if (!partial || body.seo !== undefined) result.seo = validateSeo(body.seo);
  return result;
}

export function pagePathForSlug(slug: string) {
  return slug === '/' ? '/' : slug;
}
