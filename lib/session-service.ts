import { env } from 'cloudflare:workers';
import { verifyPassword } from '@/lib/auth';
import { RequestFailure } from '@/lib/request-security';
import type { SessionList } from '@/lib/session-policy';

type Identity = { id: string; sessionId: string };

export async function listOwnSessions(
  identity: Identity,
): Promise<SessionList> {
  const now = Math.floor(Date.now() / 1000);
  const rows =
    await env.DB.prepare(`SELECT id,created_at AS createdAt,expires_at AS expiresAt FROM sessions
    WHERE user_id=? AND expires_at>? AND EXISTS
      (SELECT 1 FROM sessions WHERE id=? AND user_id=? AND expires_at>?)
    ORDER BY (id=?) DESC,created_at DESC,id DESC LIMIT 101`)
      .bind(
        identity.id,
        now,
        identity.sessionId,
        identity.id,
        now,
        identity.sessionId,
      )
      .all<{ id: string; createdAt: number; expiresAt: number }>();
  if (!rows.success) throw new Error('Session list unavailable');
  if (!rows.results.length)
    throw new RequestFailure('Сессия завершена. Войдите снова.', 401);
  return {
    sessions: rows.results.slice(0, 100).map((row) => ({
      id: row.id,
      createdAt: row.createdAt * 1000,
      expiresAt: row.expiresAt * 1000,
      current: row.id === identity.sessionId,
    })),
    truncated: rows.results.length > 100,
  };
}

export async function revokeOwnSessions(
  identity: Identity,
  target: string,
  password: string,
) {
  if (target === identity.sessionId)
    throw new RequestFailure(
      'Для текущей сессии используйте выход из аккаунта',
    );
  const user = await env.DB.prepare(
    'SELECT password_hash AS hash FROM users WHERE id=?',
  )
    .bind(identity.id)
    .first<{ hash: string | null }>();
  if (!user?.hash || !(await verifyPassword(password, user.hash)))
    throw new RequestFailure('Текущий пароль неверен', 403);
  const now = Math.floor(Date.now() / 1000);
  // The password and caller session are checked again IN the transaction:
  // revocation/password rotation racing this request cannot authorize a write.
  const guard = `SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.id=? AND s.user_id=? AND s.expires_at>? AND u.password_hash=?`;
  const params = [identity.sessionId, identity.id, now, user.hash];
  const results = await env.DB.batch([
    env.DB.prepare(guard).bind(...params),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=? AND id<>? AND expires_at>?
      AND (?='others' OR id=?) AND EXISTS (${guard})`).bind(
      identity.id,
      identity.sessionId,
      now,
      target,
      target,
      ...params,
    ),
  ]);
  if (!results.every((r) => r.success))
    throw new Error('Session revocation unavailable');
  if (!results[0].results.length)
    throw new RequestFailure('Доступ изменился. Войдите снова.', 401);
  return { revoked: results[1].meta.changes };
}
