import { env } from 'cloudflare:workers';
import { scheduleBookingNotifications } from './booking-notifications';
import { bookingDetail } from './bookings';
import { paymentLink } from './commerce-policy';
import { RequestFailure } from './request-security';
import { digest, textValue } from './security-policy';
import {
  createStripeBookingSession,
  createStripeRefund,
} from './stripe-adapter';

type User = { id: string; role: string };
type PaymentStatus = 'paid' | 'cancelled' | 'expired' | 'refunded';

function owner(user: User) {
  return user.role === 'owner' || user.role === 'admin';
}

export async function checkoutBooking(id: string, user: User) {
  const stripe = env.PAYMENT_PROVIDER === 'stripe';
  if (!stripe && !env.PAYMENT_PROVIDER_URL)
    throw new RequestFailure(
      'Онлайн-оплата не подключена. Свяжитесь с консультантом',
      409,
    );
  const detail = await bookingDetail(user, id);
  const booking = detail.booking;
  if (booking.status !== 'confirmed' || booking.paymentStatus !== 'pending')
    throw new RequestFailure(
      'Для этой записи оплата не требуется или она уже завершена',
      409,
    );
  const now = Math.floor(Date.now() / 1000);
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= now)
    throw new RequestFailure(
      'Время удержания слота истекло. Выберите новый слот',
      409,
    );
  const endpoint = stripe ? null : paymentLink(env.PAYMENT_PROVIDER_URL);
  if (!stripe && !endpoint)
    throw new RequestFailure('Платёжный адаптер настроен некорректно', 503);
  const db = env.DB;
  const intentId = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO booking_payment_intents (id, booking_id, amount, currency, status, expires_at, created_at, updated_at)
    SELECT ?, id, price, currency, 'pending', hold_expires_at, ?, ? FROM bookings
    WHERE id = ? AND status = 'confirmed' AND payment_status = 'pending' AND hold_expires_at > ?
    ON CONFLICT(booking_id) DO NOTHING`)
    .bind(intentId, now, now, booking.id, now)
    .run();
  const intent = await db
    .prepare(
      'SELECT id, booking_id AS bookingId, amount, currency, status, payment_url AS paymentUrl, provider_payment_id AS providerPaymentId, expires_at AS expiresAt FROM booking_payment_intents WHERE booking_id = ?',
    )
    .bind(booking.id)
    .first<{
      id: string;
      bookingId: string;
      amount: number;
      currency: string;
      status: string;
      paymentUrl: string | null;
      providerPaymentId: string | null;
      expiresAt: number;
    }>();
  if (!intent) throw new RequestFailure('Удержание оплаты не найдено', 409);
  if (intent.status !== 'pending')
    throw new RequestFailure('Статус оплаты уже изменился', 409);
  if (intent.paymentUrl && paymentLink(intent.paymentUrl))
    return { ...detail, payment: intent };
  let data: { paymentUrl?: string; providerPaymentId?: string };
  try {
    if (stripe) {
      data = await createStripeBookingSession({
        amount: intent.amount,
        currency: intent.currency,
        name: booking.service,
        intentId: intent.id,
        bookingId: booking.id,
      });
    } else {
      if (!endpoint)
        throw new RequestFailure('Платёжный адаптер настроен некорректно', 503);
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(12000),
        headers: {
          'content-type': 'application/json',
          'idempotency-key': intent.id,
          ...(env.PAYMENT_PROVIDER_TOKEN
            ? { authorization: `Bearer ${env.PAYMENT_PROVIDER_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          paymentType: 'booking',
          bookingId: booking.id,
          amount: intent.amount,
          currency: intent.currency,
          customerId: booking.customerId,
          expiresAt: intent.expiresAt,
        }),
      });
      if (!response.ok) throw new Error();
      data = (await response.json()) as typeof data;
      if (!paymentLink(data.paymentUrl)) throw new Error();
    }
  } catch {
    throw new RequestFailure(
      'Не удалось получить ссылку оплаты. Удержание сохранено, повторите позже',
      502,
    );
  }
  await db
    .prepare(
      "UPDATE booking_payment_intents SET payment_url = ?, provider_payment_id = ?, updated_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?",
    )
    .bind(
      data.paymentUrl,
      textValue(data.providerPaymentId, 128, true)
        ? data.providerPaymentId
        : null,
      now,
      intent.id,
      now,
    )
    .run();
  const current = await bookingDetail(user, booking.id);
  return {
    ...current,
    payment: {
      ...intent,
      paymentUrl: data.paymentUrl,
      providerPaymentId: data.providerPaymentId ?? null,
    },
  };
}

export async function refundBooking(id: string, user: User) {
  if (!owner(user))
    throw new RequestFailure(
      'Возврат может выполнить только администратор',
      403,
    );
  if (env.PAYMENT_PROVIDER !== 'stripe')
    throw new RequestFailure(
      'Для возврата бронирования включите встроенный Stripe-адаптер',
      409,
    );
  const detail = await bookingDetail(user, id);
  if (detail.booking.paymentStatus !== 'paid')
    throw new RequestFailure(
      'Возврат доступен только для оплаченной записи',
      409,
    );
  const intent = await env.DB.prepare(
    'SELECT id, amount, provider_payment_id AS providerPaymentId, status FROM booking_payment_intents WHERE booking_id = ?',
  )
    .bind(id)
    .first<{
      id: string;
      amount: number;
      providerPaymentId: string | null;
      status: string;
    }>();
  if (!intent || intent.status !== 'paid' || !intent.providerPaymentId)
    throw new RequestFailure(
      'Stripe PaymentIntent для возврата не найден',
      409,
    );
  const refund = await createStripeRefund({
    paymentIntentId: intent.providerPaymentId,
    amount: intent.amount,
    idempotencyKey: `booking-refund-${intent.id}`,
  });
  const result = await bookingPaymentWebhook(
    {
      eventId: `stripe-refund-${refund.id}`,
      intentId: intent.id,
      bookingId: id,
      status: 'refunded',
      amount: intent.amount,
      currency: detail.booking.currency,
      providerPaymentId: intent.providerPaymentId,
    },
    user,
    true,
  );
  return { ...result, refund };
}

export async function bookingPaymentWebhook(
  body: Record<string, unknown>,
  user: User,
  verified = false,
) {
  const secret =
    env.BOOKING_PAYMENT_WEBHOOK_SECRET || env.PAYMENT_WEBHOOK_SECRET;
  if (
    (!verified && !secret) ||
    !textValue(body.eventId, 128, true) ||
    !textValue(body.intentId, 128, true) ||
    !textValue(body.bookingId, 128, true) ||
    (body.providerPaymentId !== undefined &&
      !textValue(body.providerPaymentId, 128, true)) ||
    !['paid', 'cancelled', 'expired', 'refunded'].includes(
      String(body.status),
    ) ||
    !Number.isSafeInteger(body.amount) ||
    typeof body.currency !== 'string' ||
    body.currency.length > 12
  )
    throw new RequestFailure(
      'eventId, intentId, bookingId, status, amount and currency are required',
      400,
    );
  const eventId = `booking_payment_${await digest(body.eventId)}`;
  const db = env.DB;
  const intent = await db
    .prepare(`SELECT pi.id, pi.booking_id AS bookingId, pi.amount, pi.currency, pi.status AS paymentStatus, pi.event_id AS eventId, b.status AS bookingStatus, b.revision, b.hold_expires_at AS holdExpiresAt
    FROM booking_payment_intents pi JOIN bookings b ON b.id = pi.booking_id WHERE pi.id = ?`)
    .bind(body.intentId)
    .first<{
      id: string;
      bookingId: string;
      amount: number;
      currency: string;
      paymentStatus: string;
      eventId: string | null;
      bookingStatus: string;
      revision: number;
      holdExpiresAt: number | null;
    }>();
  if (!intent || intent.bookingId !== body.bookingId)
    throw new RequestFailure('Платёжная запись не найдена', 404);
  const previousEvent = await db
    .prepare(
      'SELECT intent_id AS intentId, status, amount, currency FROM booking_payment_events WHERE id = ?',
    )
    .bind(eventId)
    .first<{
      intentId: string;
      status: string;
      amount: number;
      currency: string;
    }>();
  if (previousEvent) {
    if (
      previousEvent.intentId !== intent.id ||
      previousEvent.status !== body.status ||
      previousEvent.amount !== body.amount ||
      previousEvent.currency !== body.currency
    )
      throw new RequestFailure(
        'Событие оплаты уже связано с другой операцией',
        409,
      );
    return { ok: true, replayed: true };
  }
  if (intent.amount !== body.amount || intent.currency !== body.currency)
    throw new RequestFailure(
      'Платёж не совпадает с суммой или валютой записи',
      409,
    );
  const status = String(body.status) as PaymentStatus;
  const now = Math.floor(Date.now() / 1000);
  if (
    status === 'paid' &&
    (intent.paymentStatus !== 'pending' ||
      intent.bookingStatus !== 'confirmed' ||
      !intent.holdExpiresAt ||
      intent.holdExpiresAt <= now)
  )
    throw new RequestFailure('Удержание записи истекло или уже изменено', 409);
  if (
    status === 'refunded' &&
    (intent.paymentStatus !== 'paid' ||
      !['confirmed', 'completed'].includes(intent.bookingStatus))
  )
    throw new RequestFailure('Возврат невозможен для текущего статуса', 409);
  if (
    ['cancelled', 'expired'].includes(status) &&
    (intent.paymentStatus !== 'pending' || intent.bookingStatus !== 'confirmed')
  )
    throw new RequestFailure(
      'Отмена оплаты невозможна для текущего статуса',
      409,
    );
  const actor = owner(user) ? user.id : 'payment-adapter';
  const bookingStatus =
    status === 'paid'
      ? 'confirmed'
      : status === 'refunded'
        ? intent.bookingStatus
        : 'cancelled';
  const paymentStatus = status === 'paid' ? 'paid' : status;
  const mutation = `payment:${eventId}`;
  const bookingChange =
    status === 'refunded'
      ? db
          .prepare(
            `UPDATE bookings SET payment_status = ?, revision = revision + 1, mutation_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
          )
          .bind(paymentStatus, mutation, now, intent.bookingId, intent.revision)
      : db
          .prepare(
            `UPDATE bookings SET status = ?, payment_status = ?, hold_expires_at = NULL, revision = revision + 1, mutation_id = ?, updated_at = ? WHERE id = ? AND revision = ? AND status = ?`,
          )
          .bind(
            bookingStatus,
            paymentStatus,
            mutation,
            now,
            intent.bookingId,
            intent.revision,
            intent.bookingStatus,
          );
  const result = await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO booking_payment_events (id, intent_id, status, amount, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(eventId, intent.id, status, body.amount, body.currency, now),
    db
      .prepare(
        'UPDATE booking_payment_intents SET status = ?, event_id = ?, provider_payment_id = COALESCE(?, provider_payment_id), updated_at = ? WHERE id = ?',
      )
      .bind(status, eventId, body.providerPaymentId ?? null, now, intent.id),
    bookingChange,
    db
      .prepare(
        `INSERT INTO booking_events (id, booking_id, actor_id, action, revision, slot_id, starts_at, created_at) SELECT ?, id, ?, ?, revision, slot_id, starts_at, ? FROM bookings WHERE id = ? AND mutation_id = ?`,
      )
      .bind(
        eventId,
        actor,
        `payment_${status}`,
        now,
        intent.bookingId,
        mutation,
      ),
  ]);
  if (!result[0].meta.changes) return { ok: true, replayed: true };
  if (!result[1].meta.changes || !result[2].meta.changes)
    throw new RequestFailure(
      'Запись или платёж уже изменены. Повторите чтение',
      409,
    );
  scheduleBookingNotifications();
  return { ok: true, bookingId: intent.bookingId, status };
}
