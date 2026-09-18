import { env, waitUntil } from 'cloudflare:workers';
import { RequestFailure } from './request-security';
import {
  telegramConfiguration,
  sendBookingTelegram,
} from './booking-telegram-policy';

export async function drainBookingNotifications(limit = 3) {
  const config = telegramConfiguration(env);
  if (!config) return { configured: false, processed: 0 };
  const now = Math.floor(Date.now() / 1000),
    db = env.DB;
  // A crashed worker may already have sent its message. Require manual reconciliation.
  await db
    .prepare(
      "UPDATE booking_notifications SET status='uncertain', last_error='worker_interrupted', lease_id=NULL, lease_until=NULL WHERE status='sending' AND lease_until < ?",
    )
    .bind(now)
    .run();
  let processed = 0;
  for (let i = 0; i < Math.min(3, limit); i++) {
    const lease = crypto.randomUUID();
    const row = await db
      .prepare(`UPDATE booking_notifications SET status='sending', attempts=attempts+1, lease_id=?, lease_until=?
      WHERE event_id=(SELECT event_id FROM booking_notifications WHERE status='pending' AND next_attempt_at<=? AND attempts<5 ORDER BY next_attempt_at,event_id LIMIT 1)
      AND status='pending' RETURNING event_id AS eventId, attempts`)
      .bind(lease, now + 60, now)
      .first<{ eventId: string; attempts: number }>();
    if (!row) break;
    const event = await db
      .prepare(
        'SELECT id, booking_id AS bookingId, action, revision FROM booking_events WHERE id=?',
      )
      .bind(row.eventId)
      .first<{
        id: string;
        bookingId: string;
        action: string;
        revision: number;
      }>();
    if (!event) throw new Error('Booking notification event missing');
    const outcome = await sendBookingTelegram(config, event);
    const status =
      outcome.status === 'pending' && row.attempts >= 5
        ? 'failed'
        : outcome.status;
    await db
      .prepare(
        "UPDATE booking_notifications SET status=?, next_attempt_at=?, sent_at=?, message_id=?, last_error=?, lease_id=NULL, lease_until=NULL WHERE event_id=? AND status='sending' AND lease_id=?",
      )
      .bind(
        status,
        now + (outcome.retryAfter || 60),
        status === 'sent' ? Math.floor(Date.now() / 1000) : null,
        outcome.messageId ?? null,
        outcome.error ?? null,
        row.eventId,
        lease,
      )
      .run();
    processed++;
    if (status !== 'sent') break;
  }
  return { configured: true, processed };
}
export function scheduleBookingNotifications() {
  if (!telegramConfiguration(env)) return;
  waitUntil(
    drainBookingNotifications().catch(() => {
      console.error(
        'Booking notification processing failed; inspect the private queue.',
      );
    }),
  );
}
export async function listBookingActivity(
  user: { role: string },
  input: Record<string, unknown> = {},
) {
  if (!['owner', 'admin'].includes(user.role))
    throw new RequestFailure('Требуется администратор', 403);
  if (Object.keys(input).some((k) => !['period', 'before'].includes(k)))
    throw new RequestFailure('Неизвестное поле');
  const period = typeof input.period === 'string' ? input.period : (input.period === undefined ? '7d' : '');
  if (!['24h', '7d', '30d'].includes(period))
    throw new RequestFailure('Допустимы 24h, 7d, 30d');
  let before = Number.MAX_SAFE_INTEGER,
    beforeId = '';
  if (input.before !== undefined) {
    if (
      typeof input.before !== 'string' ||
      !/^\d{1,16}:[A-Za-z0-9_:-]{1,160}$/.test(input.before)
    )
      throw new RequestFailure('Некорректный курсор');
    const split = input.before.indexOf(':');
    before = Number(input.before.slice(0, split));
    beforeId = input.before.slice(split + 1);
    if (!Number.isSafeInteger(before))
      throw new RequestFailure('Некорректный курсор');
  }
  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
  const rows =
    await env.DB.prepare(`SELECT e.id, e.booking_id AS bookingId, e.action, e.revision, e.created_at AS createdAt,
    COALESCE(n.status,'not_queued') AS delivery, COALESCE(n.attempts,0) AS attempts, n.sent_at AS sentAt, n.last_error AS lastError
    FROM booking_events e LEFT JOIN booking_notifications n ON n.event_id=e.id
    WHERE e.created_at>=? AND (e.created_at<? OR (e.created_at=? AND e.id<?)) ORDER BY e.created_at DESC,e.id DESC LIMIT 51`)
      .bind(
        Math.floor(Date.now() / 1000) - days * 86400,
        before,
        before,
        beforeId,
      )
      .all<{ id: string; createdAt: number }>();
  const events = rows.results.slice(0, 50),
    last = events.at(-1);
  return {
    events,
    next:
      rows.results.length > 50 && last ? `${last.createdAt}:${last.id}` : null,
    telegram: {
      configured: !!telegramConfiguration(env),
      enabled: env.BOOKING_TELEGRAM_ENABLED === 'true',
    },
    checkedAt: new Date().toISOString(),
  };
}
