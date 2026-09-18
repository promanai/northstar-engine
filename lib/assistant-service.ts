import { env } from 'cloudflare:workers';
import { documentStore } from '@/lib/document-store';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { RequestFailure } from '@/lib/request-security';
import {
  assistantInput,
  defaultAssistant,
  expectedRevision,
  recordFields,
  type AssistantConfig,
} from '@/lib/admin-policy';
export function canReadAdminResource(
  actor: ContentActor,
  resource: 'assistant' | 'customers',
) {
  return (
    isAdministrator(actor.role) &&
    (!actor.tokenId ||
      actor.scopes?.includes('*') ||
      actor.scopes?.includes(`${resource}:read`))
  );
}
export function requireAdminResource(
  actor: ContentActor | null,
  resource: 'assistant' | 'customers',
  write = false,
) {
  if (
    !actor ||
    !isAdministrator(actor.role) ||
    (actor.tokenId &&
      !actor.scopes?.includes('*') &&
      !actor.scopes?.includes(`${resource}:${write ? 'write' : 'read'}`))
  )
    throw new RequestFailure('Недостаточно прав', 403);
  return actor;
}
export function checked<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректный запрос',
    );
  }
}
async function store() {
  const row = await env.DB.prepare(
    'SELECT name, system_prompt AS systemPrompt, default_locale AS defaultLocale, status FROM assistant_profiles ORDER BY updated_at DESC, id DESC LIMIT 1',
  ).first<AssistantConfig>();
  const fallback = row
    ? { ...row, status: row.status === 'active' ? 'active' : 'disabled' }
    : defaultAssistant;
  return documentStore<AssistantConfig>('assistant-profile', fallback);
}
// Server-only runtime reader. After the first managed save, legacy tables are no longer authoritative.
export async function runtimeAssistant() {
  return (await (await store()).read()).value;
}
export async function readAssistant(actor: ContentActor | null) {
  requireAdminResource(actor, 'assistant');
  const state = await (await store()).read();
  return { ...state.value, revision: state.revision };
}
export async function assistantHistory(
  actor: ContentActor | null,
  before?: number,
) {
  requireAdminResource(actor, 'assistant');
  if (before !== undefined) checked(() => expectedRevision(before));
  return (await store()).history(before);
}
export async function changeAssistant(
  actor: ContentActor | null,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireAdminResource(actor, 'assistant', true);
  const restore = Object.hasOwn(body, 'targetRevision');
  checked(() =>
    recordFields(
      body,
      restore
        ? ['revision', 'targetRevision', 'confirm']
        : [
            'revision',
            'confirm',
            'name',
            'systemPrompt',
            'defaultLocale',
            'status',
          ],
    ),
  );
  if (body.confirm !== true)
    throw new RequestFailure(
      'Изменения влияют на ответы консультанта. Требуется confirm: true',
    );
  const expected = checked(() => expectedRevision(body.revision));
  const documents = await store(),
    current = await documents.read();
  const conflict = () =>
    new RequestFailure(
      'Ассистент уже изменён. Загрузите актуальную версию и сравните с вашим текстом.',
      409,
    );
  if (current.revision !== expected) throw conflict();
  const target = restore
    ? checked(() => expectedRevision(body.targetRevision))
    : null;
  let value: AssistantConfig;
  if (target !== null) {
    requireAdminResource(actor, 'assistant');
    const old = await documents.version(target);
    if (!old) throw new RequestFailure('Версия не найдена', 404);
    value = { ...defaultAssistant, ...checked(() => assistantInput(old)) };
  } else value = { ...current.value, ...checked(() => assistantInput(body)) };
  if (
    !(await documents.save(
      current,
      value,
      user.id,
      user.tokenId ?? null,
      source,
      target,
    ))
  )
    throw conflict();
  return canReadAdminResource(user, 'assistant')
    ? { ...value, revision: current.revision + 1 }
    : { revision: current.revision + 1 };
}
