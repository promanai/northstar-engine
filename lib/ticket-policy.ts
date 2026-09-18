import type { ContentActor } from './access-policy';

export function ticketAccess(actor: ContentActor | null, write = false) {
  return (
    !!actor &&
    ['customer', 'owner', 'admin'].includes(actor.role) &&
    (!actor.tokenId ||
      !!actor.scopes?.some(
        (s) => s === '*' || s === `tickets:${write ? 'write' : 'read'}`,
      ))
  );
}
export function ticketInput(value: Record<string, unknown>, create: boolean) {
  const fields = create
    ? ['subject', 'body', 'idempotencyKey', 'confirm']
    : ['action', 'body', 'revision', 'idempotencyKey', 'confirm'];
  if (Object.keys(value).some((k) => !fields.includes(k)))
    throw new Error('Неизвестные поля обращения');
  if (value.confirm !== true) throw new Error('Подтвердите действие');
  if (
    typeof value.idempotencyKey !== 'string' ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(value.idempotencyKey)
  )
    throw new Error('Требуется корректный idempotencyKey');
  const action = create ? 'message' : value.action;
  if (
    typeof action !== 'string' ||
    !['message', 'close', 'reopen'].includes(action)
  )
    throw new Error('Неизвестное действие');
  const text = (item: unknown, max: number, name: string) => {
    if (
      typeof item !== 'string' ||
      !item.trim() ||
      item.trim().length > max ||
      Array.from(item).some(
        (c) => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c),
      )
    )
      throw new Error(`Некорректное поле: ${name}`);
    return item.trim();
  };
  const subject = create ? text(value.subject, 160, 'тема') : undefined;
  const body =
    action === 'message' ? text(value.body, 8000, 'сообщение') : null;
  if (action !== 'message' && value.body !== undefined)
    throw new Error('Для смены статуса сообщение не передаётся');
  if (
    !create &&
    (!Number.isSafeInteger(value.revision) || Number(value.revision) < 1)
  )
    throw new Error('Требуется текущая revision');
  return {
    subject,
    body,
    action: action as 'message' | 'close' | 'reopen',
    revision: create ? 0 : Number(value.revision),
    idempotencyKey: value.idempotencyKey,
  };
}

export function ticketCursor(value: unknown) {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new Error('Некорректный курсор');
  const match = /^(\d{1,15})_([a-f0-9-]{36})$/.exec(value);
  if (!match || !Number.isSafeInteger(Number(match[1])))
    throw new Error('Некорректный курсор');
  return { time: Number(match[1]), id: match[2] };
}
