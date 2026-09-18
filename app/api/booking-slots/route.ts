import { getRequestUser } from '@/lib/auth';
import { bookingAdmin, listSlots, resources, schedule } from '@/lib/bookings';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request),
      query = new URL(request.url).searchParams;
    if (request.headers.has('authorization') && !user)
      throw new RequestFailure('Токен не принят', 401);
    const managed = query.get('managed') === '1';
    if (managed && !bookingAdmin(user))
      throw new RequestFailure('Требуется администратор', 403);
    const input = Object.fromEntries(
      ['from', 'to', 'productId']
        .filter((key) => query.has(key))
        .map((key) => [key, query.get(key)]),
    );
    return Response.json(
      {
        ...(await listSlots(input, managed)),
        ...(managed && user ? { resources: await resources(user) } : {}),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    return failureResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096),
      user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    await limitRequest(request, 'booking-schedule', 40, 60, user.id);
    return Response.json(await schedule(user, body), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e) {
    return failureResponse(e);
  }
}
