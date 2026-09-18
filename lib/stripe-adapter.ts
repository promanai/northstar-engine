import { env } from 'cloudflare:workers';
import { RequestFailure } from './request-security';
import { paymentLink } from './commerce-policy';
import { textValue } from './security-policy';
import { StripeSignatureError, verifyStripeSignature } from './stripe-policy';

const stripeApi = 'https://api.stripe.com/v1';

type StripeRecord = Record<string, unknown>;
export type StripeBookingPayment = {
  eventId: string;
  intentId: string;
  bookingId: string;
  status: 'paid' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  providerPaymentId?: string;
};

function secret() {
  if (!textValue(env.STRIPE_SECRET_KEY, 256, true))
    throw new RequestFailure(
      'Stripe не настроен: добавьте STRIPE_SECRET_KEY в Worker secrets',
      503,
    );
  return env.STRIPE_SECRET_KEY as string;
}

function origin() {
  if (!textValue(env.PUBLIC_SITE_URL, 2048, true))
    throw new RequestFailure(
      'Stripe не настроен: добавьте PUBLIC_SITE_URL в Worker vars',
      503,
    );
  try {
    const url = new URL(env.PUBLIC_SITE_URL as string);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.href.replace(/\/$/, '');
  } catch {
    throw new RequestFailure(
      'PUBLIC_SITE_URL должен быть HTTPS-адресом без пути, query и credentials',
      503,
    );
  }
}

function form(fields: Record<string, string | number>) {
  return Object.entries(fields)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
}

async function stripeRequest(
  path: string,
  body: Record<string, string | number>,
  idempotencyKey?: string,
) {
  let response: Response;
  try {
    response = await fetch(`${stripeApi}${path}`, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        authorization: `Basic ${btoa(`${secret()}:`)}`,
        'content-type': 'application/x-www-form-urlencoded',
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      body: form(body),
    });
  } catch {
    throw new RequestFailure('Stripe недоступен. Повторите позже', 502);
  }
  const raw = await response.text();
  let data: StripeRecord;
  try {
    data = JSON.parse(raw) as StripeRecord;
  } catch {
    throw new RequestFailure('Stripe вернул некорректный ответ', 502);
  }
  if (!response.ok)
    throw new RequestFailure(
      'Stripe отклонил платёжную операцию',
      response.status >= 500 ? 502 : 409,
    );
  return data;
}

function paymentFields(input: {
  amount: number;
  currency: string;
  name: string;
  intentId: string;
  bookingId: string;
}) {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !/^[A-Z]{3}$/.test(input.currency)
  )
    throw new RequestFailure(
      'Сумма или валюта бронирования настроены некорректно',
      409,
    );
  const site = origin();
  return {
    mode: 'payment',
    'line_items[0][price_data][currency]': input.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': input.amount,
    'line_items[0][price_data][product_data][name]': input.name.slice(0, 250),
    'line_items[0][quantity]': 1,
    success_url: `${site}/account?booking=${encodeURIComponent(input.bookingId)}#bookings`,
    cancel_url: `${site}/account?booking=${encodeURIComponent(input.bookingId)}#bookings`,
    client_reference_id: input.intentId,
    'metadata[booking_id]': input.bookingId,
    'metadata[booking_payment_intent_id]': input.intentId,
    'payment_intent_data[metadata][booking_id]': input.bookingId,
    'payment_intent_data[metadata][booking_payment_intent_id]': input.intentId,
  };
}

export async function createStripeBookingSession(input: {
  amount: number;
  currency: string;
  name: string;
  intentId: string;
  bookingId: string;
}) {
  const data = await stripeRequest(
    '/checkout/sessions',
    paymentFields(input),
    input.intentId,
  );
  const url = paymentLink(data.url);
  if (!textValue(data.id, 128, true) || !url)
    throw new RequestFailure(
      'Stripe не вернул безопасную Checkout-ссылку',
      502,
    );
  return { paymentUrl: url, providerPaymentId: String(data.id) };
}

export async function createStripeRefund(input: {
  paymentIntentId: string;
  amount: number;
  idempotencyKey: string;
}) {
  if (!/^pi_[A-Za-z0-9]+$/.test(input.paymentIntentId))
    throw new RequestFailure(
      'Stripe PaymentIntent для возврата не найден',
      409,
    );
  const data = await stripeRequest(
    '/refunds',
    {
      payment_intent: input.paymentIntentId,
      amount: input.amount,
    },
    input.idempotencyKey,
  );
  if (
    !textValue(data.id, 128, true) ||
    !['succeeded', 'pending'].includes(String(data.status))
  )
    throw new RequestFailure('Stripe не подтвердил возврат', 502);
  return { id: String(data.id), status: String(data.status) };
}

export async function verifyStripeEvent(rawBody: string, signature: string) {
  if (
    !textValue(env.STRIPE_WEBHOOK_SECRET, 256, true) ||
    !textValue(signature, 4096, true)
  )
    throw new RequestFailure('Stripe webhook не настроен', 503);
  try {
    return await verifyStripeSignature(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (error) {
    if (error instanceof StripeSignatureError)
      throw new RequestFailure(error.message, error.status);
    throw new RequestFailure('Некорректное событие Stripe', 400);
  }
}

export function stripeBookingEvent(
  event: StripeRecord,
): StripeBookingPayment | null {
  const object = (event.data as StripeRecord).object as StripeRecord;
  if (!object || typeof object !== 'object') return null;
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  const values = metadata as StripeRecord;
  if (
    !textValue(values.booking_id, 128, true) ||
    !textValue(values.booking_payment_intent_id, 128, true)
  )
    return null;
  const type = String(event.type);
  let status: StripeBookingPayment['status'];
  if (type === 'checkout.session.completed') {
    if (object.payment_status !== 'paid') return null;
    status = 'paid';
  } else if (type === 'checkout.session.async_payment_succeeded')
    status = 'paid';
  else if (type === 'checkout.session.expired') status = 'expired';
  else if (type === 'checkout.session.async_payment_failed')
    status = 'cancelled';
  else return null;
  const amount = Number(object.amount_total);
  const currency =
    typeof object.currency === 'string' ? object.currency.toUpperCase() : '';
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !/^[A-Z]{3}$/.test(currency)
  )
    return null;
  return {
    eventId: String(event.id),
    intentId: String(values.booking_payment_intent_id),
    bookingId: String(values.booking_id),
    status,
    amount,
    currency,
    ...(textValue(object.payment_intent, 128, true)
      ? { providerPaymentId: String(object.payment_intent) }
      : {}),
  };
}
