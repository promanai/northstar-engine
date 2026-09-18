import { canManagePages, type ContentActor } from './access-policy';
import { pageInput } from './page-policy';
import { pageStore, type StoredPage } from './page-store';
import { RequestFailure } from './request-security';

export function requirePageAccess(
  actor: ContentActor | null,
  action: 'read' | 'write',
) {
  if (!canManagePages(actor, action))
    throw new RequestFailure(
      'Недостаточно прав для управления страницами',
      403,
    );
  return actor!;
}
function revision(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new RequestFailure('Требуется целая revision >= 0');
  return value;
}
function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    throw new RequestFailure('Неизвестное поле');
}
const conflict = () =>
  new RequestFailure(
    'Страница уже изменена. Загрузите актуальную версию; ваш текст не потерян.',
    409,
  );

export async function listPages(actor: ContentActor | null) {
  return pageStore().list(canManagePages(actor, 'read'));
}
export async function readPage(actor: ContentActor | null, id: string) {
  const page = await pageStore().get(id);
  if (!page || (page.status !== 'published' && !canManagePages(actor, 'read')))
    throw new RequestFailure('Страница не найдена', 404);
  return page;
}
export async function pageHistory(
  actor: ContentActor | null,
  id: string,
  before?: number,
) {
  requirePageAccess(actor, 'read');
  await readPage(actor, id);
  if (before !== undefined) revision(before);
  return pageStore().history(id, before);
}

export async function changePage(
  actor: ContentActor | null,
  source: 'rest' | 'mcp',
  action: 'create' | 'update' | 'delete' | 'restore',
  id: string | undefined,
  body: Record<string, unknown>,
) {
  const user = requirePageAccess(actor, 'write');
  if (action === 'restore') requirePageAccess(actor, 'read');
  fields(
    body,
    action === 'delete'
      ? ['revision', 'confirm']
      : action === 'restore'
        ? ['revision', 'targetRevision', 'confirm']
        : [
            'title',
            'slug',
            'status',
            'blocks',
            'seo',
            ...(action === 'update' ? ['revision'] : []),
          ],
  );
  const store = pageStore();
  const current = action === 'create' ? null : await store.get(id ?? '');
  if (action !== 'create' && !current)
    throw new RequestFailure('Страница не найдена', 404);
  if (current && current.revision !== revision(body.revision)) throw conflict();
  if ((action === 'delete' || action === 'restore') && body.confirm !== true)
    throw new RequestFailure('Требуется confirm: true');
  if (current?.status === 'deleted' && action !== 'restore')
    throw new RequestFailure(
      'Страница в корзине. Сначала восстановите её.',
      409,
    );
  let input;
  try {
    if (action === 'restore') {
      const snapshot = await store.version(id!, revision(body.targetRevision));
      if (!snapshot || snapshot.status === 'deleted')
        throw new RequestFailure(
          'Выберите существующую версию до удаления',
          404,
        );
      // Restoring never republishes old content without a separate explicit save.
      input = { ...pageInput(snapshot), status: 'draft' };
    } else
      input =
        action === 'delete'
          ? { status: 'deleted' }
          : pageInput(body, action === 'update');
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректная страница',
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const next = {
    id: current?.id ?? crypto.randomUUID(),
    title: '',
    slug: '',
    blocks: [],
    seo: {},
    status: 'draft',
    createdAt: now,
    ...current,
    ...input,
    revision: current ? current.revision + 1 : 0,
    updatedAt: now,
  } as StoredPage;
  try {
    if (
      !(await store.save(
        next,
        current,
        user.id,
        user.tokenId ?? null,
        source,
        action,
      ))
    )
      throw conflict();
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    if (/UNIQUE constraint failed: pages.slug/i.test(String(error)))
      throw new RequestFailure(
        'Адрес уже занят, в том числе страницей в корзине',
        409,
      );
    throw error;
  }
  return next;
}
