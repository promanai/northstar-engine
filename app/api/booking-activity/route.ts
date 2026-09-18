import { getRequestUser, getSessionUser } from '@/lib/auth';
import {
  listBookingActivity,
  drainBookingNotifications,
} from '@/lib/booking-notifications';
import { env } from 'cloudflare:workers';
import {
  failureResponse,
  readJson,
  RequestFailure,
  limitRequest,
} from '@/lib/request-security';
const response = (value: unknown) =>
  Response.json(value, { headers: { 'cache-control': 'private, no-store' } });
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    return response(
      await listBookingActivity(
        user,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  } catch (e) {
    return failureResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 2048);
    if (request.headers.has('authorization'))
      throw new RequestFailure('Требуется сессия администратора', 403);
    const user = await getSessionUser(request);
    if (!user || !['admin', 'owner'].includes(user.role))
      throw new RequestFailure('Требуется администратор', 403);
    await limitRequest(request, 'booking-notifications-send', 5, 60, user.id);
    if (body.confirm !== true) throw new RequestFailure('Подтвердите действие');
    if (body.action === 'retry') {
      if (
        body.confirmDuplicateRisk !== true ||
        typeof body.eventId !== 'string' ||
        !/^[A-Za-z0-9_:-]{1,160}$/.test(body.eventId) ||
        Object.keys(body).some(
          (k) =>
            !['action', 'confirm', 'eventId', 'confirmDuplicateRisk'].includes(
              k,
            ),
        )
      )
        throw new RequestFailure('Подтвердите риск повторного сообщения');
      const result = await env.DB.prepare(
        "UPDATE booking_notifications SET status='pending', attempts=0, next_attempt_at=?, last_error='manual_retry', lease_id=NULL, lease_until=NULL WHERE event_id=? AND status IN ('failed','uncertain')",
      )
        .bind(Math.floor(Date.now() / 1000), body.eventId)
        .run();
      if (!result.meta.changes)
        throw new RequestFailure(
          'Событие уже изменено или повтор не требуется',
          409,
        );
    } else if (
      body.action !== 'process' ||
      Object.keys(body).some((k) => !['action', 'confirm'].includes(k))
    )
      throw new RequestFailure('Неизвестное действие');
    return response(await drainBookingNotifications());
  } catch (e) {
    return failureResponse(e);
  }
}
