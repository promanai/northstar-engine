import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { orderEvents, orders } from '@/db/schema';
import { changeOrder } from '@/lib/orders';
import { digest, textValue } from '@/lib/security-policy';
import {
  failureResponse,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const secret = request.headers.get('x-payment-secret') ?? '';
    if (
      !env.PAYMENT_WEBHOOK_SECRET ||
      (await digest(secret)) !== (await digest(env.PAYMENT_WEBHOOK_SECRET))
    )
      throw new RequestFailure('Invalid webhook secret', 401);
    if (
      !textValue(body.eventId, 128, true) ||
      !textValue(body.orderId, 128, true) ||
      !['paid', 'cancelled', 'refunded'].includes(String(body.status)) ||
      !Number.isSafeInteger(body.amount) ||
      typeof body.currency !== 'string'
    )
      throw new RequestFailure(
        'eventId, orderId, status, amount and currency are required',
      );
    const db = getDb();
    const row = await db
      .select()
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .get();
    if (!row) throw new RequestFailure('Order not found', 404);
    if (
      row.paymentProvider !== 'external' ||
      row.amount !== body.amount ||
      row.currency !== body.currency
    )
      throw new RequestFailure('Payment does not match order', 409);
    const eventId = 'payment_' + (await digest(body.eventId));
    const previous = await db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.id, eventId))
      .get();
    if (previous) {
      if (previous.orderId !== row.id || previous.status !== body.status)
        throw new RequestFailure('Event ID conflict', 409);
      return Response.json({ ok: true, replayed: true });
    }
    await changeOrder(
      row.id,
      { id: 'payment-adapter', role: 'owner' },
      { status: body.status, revision: row.revision },
      true,
      eventId,
    );
    return Response.json(
      { ok: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
