import { env } from 'cloudflare:workers';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { chatRequests } from '@/db/schema';
import { CHAT_LEASE_MS } from './chat-request-policy';
import { digest } from './security-policy';

export function chatRequestId(
  userId: string | undefined,
  guestHash: string | null,
  key: string,
) {
  if (!userId && !guestHash) throw new Error('Missing chat identity');
  return digest(
    JSON.stringify([userId ? `user:${userId}` : `guest:${guestHash}`, key]),
  );
}

type RequestRow = {
  id: string;
  fingerprint: string;
  conversation_id: string;
  state: string;
  lease_until: number;
  response: string | null;
  http_status: number | null;
};
export function chatReply(
  body: unknown,
  status = 200,
  state = 'completed',
  retryAfter?: number,
) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-chat-request-state': state,
      ...(retryAfter ? { 'retry-after': String(retryAfter) } : {}),
    },
  });
}
// No automatic lease takeover: a crashed request may already have been billed.
export async function beginChatRequest(
  id: string,
  fingerprint: string,
  conversationId: string,
) {
  const now = Date.now();
  const unknown = JSON.stringify({
    error:
      'Исход предыдущей попытки неизвестен. Она не будет отправлена AI повторно. Проверьте историю диалога.',
    code: 'chat_outcome_unknown',
  });
  await env.DB.prepare(`UPDATE chat_requests SET state = 'unknown', response = ?, http_status = 409
    WHERE conversation_id = ? AND state = 'pending' AND lease_until <= ?`)
    .bind(unknown, conversationId, now)
    .run();
  // Also expire a first-turn retry, whose caller does not yet know its conversation ID.
  await env.DB.prepare(`UPDATE chat_requests SET state = 'unknown', response = ?, http_status = 409
    WHERE id = ? AND state = 'pending' AND lease_until <= ?`)
    .bind(unknown, id, now)
    .run();
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO chat_requests
    (id, fingerprint, conversation_id, state, lease_until, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?)`)
    .bind(id, fingerprint, conversationId, now + CHAT_LEASE_MS, now)
    .run();
  const row = await env.DB.prepare('SELECT * FROM chat_requests WHERE id = ?')
    .bind(id)
    .first<RequestRow>();
  if (!row)
    return {
      response: chatReply(
        {
          error:
            'В этом диалоге уже готовится ответ. Повторите отправку после его завершения.',
          code: 'chat_busy',
        },
        409,
        'busy',
        3,
      ),
    };
  if (row.fingerprint !== fingerprint)
    return {
      response: chatReply(
        {
          error: 'Этот идентификатор уже использован для другого сообщения.',
          code: 'chat_key_conflict',
        },
        409,
        'conflict',
      ),
    };
  if (result.meta.changes === 1)
    return { id: row.id, conversationId: row.conversation_id };
  if (row.state === 'pending')
    return {
      response: chatReply(
        {
          error:
            'Ответ ещё готовится. Повторная отправка проверит ту же попытку без нового AI-запроса.',
          code: 'chat_pending',
        },
        409,
        'pending',
        3,
      ),
    };
  const saved = JSON.parse(row.response!);
  const failed = row.state === 'failed';
  return {
    replayConversationId:
      row.state === 'completed' ? row.conversation_id : undefined,
    response: chatReply(
      failed ? saved.body : saved,
      row.http_status!,
      row.state,
      failed && saved.retryUntil
        ? Math.max(1, Math.ceil((saved.retryUntil - Date.now()) / 1000))
        : undefined,
    ),
  };
}
// Included LAST in the same batch as messages. A lost/expired lease violates NOT NULL
// and rolls back every message, fencing off a late provider response.
export function completeChatRequest(id: string, body: unknown) {
  return getDb()
    .update(chatRequests)
    .set({
      state: sql`CASE WHEN ${chatRequests.state} = 'pending' AND ${chatRequests.leaseUntil} > ${Date.now()} THEN 'completed' ELSE NULL END`,
      response: JSON.stringify(body),
      httpStatus: 200,
    })
    .where(eq(chatRequests.id, id));
}
export async function failChatRequest(id: string, response: Response) {
  const retryAfter = Number(response.headers.get('retry-after'));
  const changed = await getDb()
    .update(chatRequests)
    .set({
      state: 'failed',
      response: JSON.stringify({
        body: await response.clone().json(),
        ...(retryAfter > 0
          ? { retryUntil: Date.now() + retryAfter * 1000 }
          : {}),
      }),
      httpStatus: response.status,
    })
    .where(and(eq(chatRequests.id, id), eq(chatRequests.state, 'pending')))
    .returning({ id: chatRequests.id });
  return changed.length === 1;
}
