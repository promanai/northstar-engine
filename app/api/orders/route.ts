import { getRequestUser } from '@/lib/auth';
import { createOrder, listOrders } from '@/lib/orders';
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
      {
        orders: await listOrders(
          user,
          new URL(request.url).searchParams.get('mine') === '1',
        ),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 8192);
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    await limitRequest(request, 'orders-create', 30, 60, user.id);
    const result = await createOrder(
      user,
      body,
      request.headers.get('idempotency-key'),
    );
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
