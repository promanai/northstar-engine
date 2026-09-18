import { bookingPaymentWebhook } from '@/lib/booking-payments';
import { failureResponse, RequestFailure } from '@/lib/request-security';
import { stripeBookingEvent, verifyStripeEvent } from '@/lib/stripe-adapter';

async function rawBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 131072)
    throw new RequestFailure('Stripe webhook слишком большой', 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 131072)
    throw new RequestFailure('Stripe webhook слишком большой', 413);
  return raw;
}

export async function POST(request: Request) {
  try {
    const event = await verifyStripeEvent(
      await rawBody(request),
      request.headers.get('stripe-signature') ?? '',
    );
    const payment = stripeBookingEvent(event);
    if (!payment)
      return Response.json({ ok: true, ignored: true }, { headers: { 'cache-control': 'no-store' } });
    return Response.json(
      await bookingPaymentWebhook(payment, { id: 'stripe-adapter', role: 'owner' }, true),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

export async function GET() {
  return new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
}
