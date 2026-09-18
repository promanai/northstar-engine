import { getRequestUser } from '@/lib/auth';
import { checkoutOrder } from '@/lib/orders';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await readJson(request, 1024);
    const user = await getRequestUser(request);
    if (!user) throw new RequestFailure('Требуется авторизация', 401);
    await limitRequest(request, 'checkout', 10, 60, user.id);
    return Response.json(await checkoutOrder((await context.params).id, user), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
