import { getRequestUser } from '@/lib/auth';
import { toggleSuspended } from '@/lib/customer-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const user = await getRequestUser(request);
    await limitRequest(request, 'customers-write', 30, 60, user?.id);
    const body = await readJson(request, 1024);
    if (typeof body.suspended !== 'boolean')
      throw new RequestFailure('Укажите suspended: true или false');
    const result = await toggleSuspended(
      user,
      (await context.params).id,
      body.suspended,
    );
    return Response.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
