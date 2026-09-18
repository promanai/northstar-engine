import { env } from 'cloudflare:workers';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { RequestFailure } from '@/lib/request-security';
import { canAnalyzeFile, bytesBase64 } from './chat-file-policy';
import type { ChatAttachment } from './attachment-policy';
import {
  fileDisposition,
  fileQuota,
  uploadKey,
  validateStoredFile,
  fileLimit,
} from '@/lib/file-policy';

type FileRow = {
  id: string;
  userId: string | null;
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  status: string;
  requestKey: string | null;
  contentHash: string | null;
  createdAt: number;
  updatedAt: number;
};
const columns =
  'id, user_id AS userId, object_key AS objectKey, filename, content_type AS contentType, size, status, request_key AS requestKey, content_hash AS contentHash, created_at AS createdAt, updated_at AS updatedAt';
const now = () => Math.floor(Date.now() / 1000);
export function requireFileAccess(actor: ContentActor | null, write = false) {
  if (!actor) throw new RequestFailure('Требуется авторизация', 401);
  if (
    (!isAdministrator(actor.role) && actor.role !== 'customer') ||
    (actor.tokenId &&
      !actor.scopes?.includes('*') &&
      !actor.scopes?.includes(write ? 'files:write' : 'files:read'))
  )
    throw new RequestFailure('Недостаточно прав на файлы', 403);
  return actor;
}
function bucket() {
  if (!env.FILES)
    throw new RequestFailure('Хранилище файлов не подключено', 503);
  return env.FILES;
}
function view(row: FileRow) {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    status: row.status,
    createdAt: new Date(row.createdAt * 1000).toISOString(),
    updatedAt: new Date(row.updatedAt * 1000).toISOString(),
    downloadUrl:
      row.status === 'uploaded' ? `/api/files/${row.id}/download` : null,
    recoverable: row.status !== 'uploading' || row.updatedAt < now() - 900,
  };
}
async function find(id: string) {
  return env.DB.prepare(`SELECT ${columns} FROM files WHERE id = ?`)
    .bind(id)
    .first<FileRow>();
}
async function owned(actor: ContentActor | null, id: string, write = false) {
  const user = requireFileAccess(actor, write);
  const row = await find(id);
  if (!row || (row.userId !== user.id && !isAdministrator(user.role)))
    throw new RequestFailure('Файл не найден', 404);
  return row;
}
export async function listFiles(
  actor: ContentActor | null,
  all = false,
  before?: string,
) {
  const user = requireFileAccess(actor);
  if (all && !isAdministrator(user.role))
    throw new RequestFailure('Только администратор видит все файлы', 403);
  if (before !== undefined && !/^[A-Za-z0-9_-]{1,100}$/.test(before))
    throw new RequestFailure('Некорректный курсор');
  const rows = (
    await env.DB.prepare(
      `SELECT ${columns} FROM files WHERE status != 'deleted' ${all ? '' : 'AND user_id = ?'} ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT 50`,
    )
      .bind(...(all ? [] : [user.id]), ...(before ? [before] : []))
      .all<FileRow>()
  ).results;
  const usage = await env.DB.prepare(
    "SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE user_id = ? AND status != 'deleted'",
  )
    .bind(user.id)
    .first<{ count: number; bytes: number }>();
  return {
    files: rows.map(view),
    nextBefore: rows.length === 50 ? rows.at(-1)!.id : null,
    usage,
    limits: fileQuota(env as unknown as Record<string, unknown>),
  };
}
export async function getFile(actor: ContentActor | null, id: string) {
  return view(await owned(actor, id));
}
export async function fileForAnalysis(
  actor: ContentActor | null,
  id: string,
): Promise<ChatAttachment> {
  const row = await owned(actor, id);
  // Administrative read privileges are not consent to send someone else's file to AI.
  if (!canAnalyzeFile(actor, row.userId))
    throw new RequestFailure(
      'Для анализа можно использовать только собственный файл',
      403,
    );
  if (row.status !== 'uploaded' || !row.contentHash)
    throw new RequestFailure(
      'Файл недоступен для анализа. При необходимости загрузите его заново.',
      409,
    );
  const object = await bucket().get(row.objectKey);
  if (!object) throw new RequestFailure('Содержимое файла отсутствует', 404);
  if (object.size !== row.size || object.size < 1 || object.size > fileLimit) {
    await object.body.cancel();
    throw new RequestFailure(
      'Содержимое файла не соответствует сохранённым данным',
      409,
    );
  }
  const reader = object.body.getReader();
  const bytes = new Uint8Array(object.size);
  let offset = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > bytes.length) {
        await reader.cancel();
        throw new RequestFailure('Превышен размер файла', 413);
      }
      bytes.set(value, offset);
      offset += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (offset !== row.size || hash !== row.contentHash)
    throw new RequestFailure('Целостность файла не подтверждена', 409);
  try {
    validateStoredFile(row.filename, row.contentType, bytes);
  } catch {
    throw new RequestFailure('Файл не прошёл повторную проверку формата', 422);
  }
  if ((await find(id))?.status !== 'uploaded')
    throw new RequestFailure('Файл удалён во время чтения', 409);
  return {
    name: row.filename,
    mime: row.contentType,
    data: bytesBase64(bytes),
  };
}
export async function downloadFile(actor: ContentActor | null, id: string) {
  const row = await owned(actor, id);
  if (row.status !== 'uploaded')
    throw new RequestFailure('Файл недоступен для скачивания', 409);
  const object = await bucket().get(row.objectKey);
  if (!object)
    throw new RequestFailure('Содержимое файла отсутствует в хранилище', 404);
  return new Response(object.body, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(object.size),
      'content-disposition': fileDisposition(row.filename),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'referrer-policy': 'no-referrer',
    },
  });
}
async function removeObject(row: FileRow) {
  // Tombstone is retained: a repeated delete can clean up an uncertain/late R2 write.
  await env.DB.prepare(
    "UPDATE files SET status = 'deleting', updated_at = ? WHERE id = ? AND status != 'deleted'",
  )
    .bind(now(), row.id)
    .run();
  await bucket().delete(row.objectKey);
  await env.DB.prepare(
    "UPDATE files SET status = 'deleted', updated_at = ? WHERE id = ?",
  )
    .bind(now(), row.id)
    .run();
}
export async function deleteFile(
  actor: ContentActor | null,
  id: string,
  confirm: unknown,
) {
  if (confirm !== true)
    throw new RequestFailure('Удаление необратимо. Требуется confirm: true');
  const row = await owned(actor, id, true);
  if (row.status === 'uploading' && row.updatedAt >= now() - 900)
    throw new RequestFailure(
      'Загрузка ещё выполняется. Повторите очистку через 15 минут',
      409,
    );
  await removeObject(row);
  return { file: view((await find(id))!) };
}
export async function uploadFile(
  actor: ContentActor | null,
  key: unknown,
  file: File,
) {
  const user = requireFileAccess(actor, true);
  const storage = bucket();
  let requestKey: string, info: ReturnType<typeof validateStoredFile>;
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    requestKey = uploadKey(key);
    info = validateStoredFile(file.name, file.type, bytes);
  } catch (error) {
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректный файл',
    );
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  const existing = () =>
    env.DB.prepare(
      `SELECT ${columns} FROM files WHERE user_id = ? AND request_key = ?`,
    )
      .bind(user.id, requestKey)
      .first<FileRow>();
  const replay = (row: FileRow) => {
    if (
      row.contentHash !== hash ||
      row.filename !== info.filename ||
      row.contentType !== info.contentType
    )
      throw new RequestFailure('Этот ключ использован для другого файла', 409);
    if (row.status !== 'uploaded')
      throw new RequestFailure(
        'Операция уже зарегистрирована. Проверьте раздел «Файлы»; для новой загрузки нужен новый ключ',
        409,
      );
    return { file: view(row), replayed: true };
  };
  const previous = await existing();
  if (previous) return replay(previous);
  const quota = fileQuota(env as unknown as Record<string, unknown>),
    id = crypto.randomUUID(),
    time = now();
  const objectKey = `uploads/${user.id}/${id}`;
  const inserted =
    await env.DB.prepare(`INSERT INTO files (id, user_id, object_key, filename, content_type, size, status, request_key, content_hash, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, 'uploading', ?, ?, ?, ?
    WHERE (SELECT COUNT(*) FROM files WHERE user_id = ? AND status != 'deleted') < ?
      AND (SELECT COALESCE(SUM(size), 0) FROM files WHERE user_id = ? AND status != 'deleted') + ? <= ?
      AND (SELECT COUNT(*) FROM files WHERE status != 'deleted') < ?
      AND (SELECT COALESCE(SUM(size), 0) FROM files WHERE status != 'deleted') + ? <= ?
    ON CONFLICT(user_id, request_key) DO NOTHING`)
      .bind(
        id,
        user.id,
        objectKey,
        info.filename,
        info.contentType,
        info.size,
        requestKey,
        hash,
        time,
        time,
        user.id,
        quota.userCount,
        user.id,
        info.size,
        quota.userBytes,
        quota.siteCount,
        info.size,
        quota.siteBytes,
      )
      .run();
  if (!inserted.meta.changes) {
    const concurrent = await existing();
    if (concurrent) return replay(concurrent);
    throw new RequestFailure(
      'Достигнута квота файлов пользователя или сайта. Удалите ненужные файлы',
      409,
    );
  }
  try {
    await storage.put(objectKey, bytes, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { ownerId: user.id },
    });
    const result = await env.DB.prepare(
      "UPDATE files SET status = 'uploaded', updated_at = ? WHERE id = ? AND status = 'uploading'",
    )
      .bind(now(), id)
      .run();
    if (!result.meta.changes) throw new Error('Upload cancelled during write');
    return { file: view((await find(id))!), replayed: false };
  } catch {
    // Do not destroy a successful write if acknowledgement from D1 was lost.
    try {
      const row = await find(id);
      if (row?.status === 'uploaded')
        return { file: view(row), replayed: false };
      if (row) await removeObject(row);
    } catch {
      console.error('File upload cleanup pending; metadata retained', id);
    }
    throw new RequestFailure(
      'Не удалось подтвердить сохранение файла. Проверьте раздел «Файлы» перед новой попыткой; незавершённую операцию при необходимости можно удалить',
      503,
    );
  }
}
