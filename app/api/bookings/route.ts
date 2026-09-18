import { getRequestUser } from '@/lib/auth';
import { createBooking, listBookings } from '@/lib/bookings';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    return Response.json(
      await listBookings(
        user,
        new URL(request.url).searchParams.get('mine') === '1',
      ),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    return failureResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192),
      user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    await limitRequest(request, 'bookings-create', 20, 60, user.id);
    const result = await createBooking(
      user,
      body,
      request.headers.get('idempotency-key'),
    );
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e) {
    return failureResponse(e);
  }
}
