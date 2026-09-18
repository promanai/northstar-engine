import { getRequestUser } from '@/lib/auth';
import { bookingDetail, changeBooking } from '@/lib/bookings';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    return Response.json(await bookingDetail(user, (await context.params).id), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e) {
    return failureResponse(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const body = await readJson(request, 4096),
      user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    await limitRequest(request, 'bookings-change', 20, 60, user.id);
    return Response.json(
      await changeBooking(user, (await context.params).id, body),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    return failureResponse(e);
  }
}
