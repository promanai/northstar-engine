import { env } from 'cloudflare:workers';
import { isLite } from './engine-mode';
import { isAdministrator, type ContentActor } from './access-policy';
import { documentStore } from './document-store';
import {
  defaultNavigation,
  resolveNavigation,
  validateNavigation,
  type NavigationConfig,
} from './navigation-policy';
import { RequestFailure } from './request-security';
const store = () =>
  documentStore<NavigationConfig>('navigation', defaultNavigation);
export function requireNavigationAccess(
  user: ContentActor | null,
  write = false,
) {
  if (
    !user ||
    !isAdministrator(user.role) ||
    (user.tokenId &&
      !user.scopes?.includes('*') &&
      !user.scopes?.includes(write ? 'site:write' : 'site:read'))
  )
    throw new RequestFailure('Недостаточно прав для навигации', 403);
  return user;
}
export async function readNavigation(user: ContentActor | null) {
  requireNavigationAccess(user);
  return store().read();
}
export async function publicNavigation() {
  if (isLite()) return resolveNavigation(defaultNavigation, []);
  const { value } = await store().read();
  const config = validateNavigation(value);
  const ids = [
    ...new Set(
      [...config.menu, ...config.tabs]
        .filter((i) => i.visible && i.kind === 'page')
        .map((i) => i.target),
    ),
  ];
  const pages = ids.length
    ? (
        await env.DB.prepare(
          `SELECT id, slug FROM pages WHERE status = 'published' AND id IN (${ids.map(() => '?').join(',')})`,
        )
          .bind(...ids)
          .all<{ id: string; slug: string }>()
      ).results
    : [];
  return resolveNavigation(config, pages);
}
export async function publicNavigationPage(id: string) {
  const row = await env.DB.prepare(
    "SELECT title, slug, blocks FROM pages WHERE id = ? AND status = 'published'",
  )
    .bind(id)
    .first<{ title: string; slug: string; blocks: string }>();
  if (!row)
    throw new RequestFailure('Страница не опубликована или удалена', 404);
  return {
    title: row.title,
    slug: row.slug,
    blocks: JSON.parse(row.blocks) as unknown[],
  };
}
function revision(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new RequestFailure('Требуется целая revision >= 0');
  return value;
}
export async function navigationHistory(
  user: ContentActor | null,
  before?: number,
) {
  requireNavigationAccess(user);
  if (before !== undefined) revision(before);
  return store().history(before);
}
export async function changeNavigation(
  user: ContentActor | null,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const actor = requireNavigationAccess(user, true);
  const restore = Object.hasOwn(body, 'targetRevision');
  if (
    Object.keys(body).some(
      (k) =>
        !(
          restore
            ? ['revision', 'targetRevision', 'confirm']
            : ['revision', 'value', 'confirm']
        ).includes(k),
    )
  )
    throw new RequestFailure('Неизвестное поле');
  if (body.confirm !== true)
    throw new RequestFailure(
      'Подтвердите изменение публичной навигации: confirm: true',
    );
  const expected = revision(body.revision),
    current = await store().read();
  if (expected !== current.revision)
    throw new RequestFailure(
      'Навигация уже изменена. Загрузите актуальную версию.',
      409,
    );
  let value = body.value;
  const target = restore ? revision(body.targetRevision) : null;
  if (target !== null) {
    requireNavigationAccess(user);
    value = await store().version(target);
    if (!value) throw new RequestFailure('Версия не найдена', 404);
  }
  let config: NavigationConfig;
  try {
    config = validateNavigation(value);
  } catch (error) {
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректная навигация',
    );
  }
  const pageIds = [
    ...new Set(
      [...config.menu, ...config.tabs]
        .filter((i) => i.kind === 'page')
        .map((i) => i.target),
    ),
  ];
  if (pageIds.length) {
    const existing = await env.DB.prepare(
      `SELECT id FROM pages WHERE id IN (${pageIds.map(() => '?').join(',')})`,
    )
      .bind(...pageIds)
      .all();
    if (existing.results.length !== pageIds.length)
      throw new RequestFailure(
        'Одна из страниц не существует. Выберите страницу из списка.',
      );
  }
  if (
    !(await store().save(
      current,
      config,
      actor.id,
      actor.tokenId ?? null,
      source,
      target,
    ))
  )
    throw new RequestFailure(
      'Навигация уже изменена. Загрузите актуальную версию.',
      409,
    );
  return { revision: current.revision + 1, value: config };
}
