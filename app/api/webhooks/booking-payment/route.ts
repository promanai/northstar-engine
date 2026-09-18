import { env } from 'cloudflare:workers';
import { bookingPaymentWebhook } from '@/lib/booking-payments';
import { failureResponse, readJson, RequestFailure } from '@/lib/request-security';
import { digest } from '@/lib/security-policy';

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const secret = request.headers.get('x-payment-secret') ?? '';
    const expected = env.BOOKING_PAYMENT_WEBHOOK_SECRET || env.PAYMENT_WEBHOOK_SECRET;
    if (!expected) throw new RequestFailure('Платёжный webhook не настроен', 503);
    if (!secret || (await digest(secret)) !== (await digest(expected)))
      throw new RequestFailure('Invalid webhook secret', 401);
    return Response.json(await bookingPaymentWebhook(body, { id: 'payment-adapter', role: 'owner' }), { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return failureResponse(error); }
}
