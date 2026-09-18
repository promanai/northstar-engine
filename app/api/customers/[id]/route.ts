import { getRequestUser } from '@/lib/auth';
import { changeCustomer, readCustomer } from '@/lib/customer-service';
import { requireAdminResource } from '@/lib/assistant-service';
import {
  failureResponse,
  limitRequest,
  readJson,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    return Response.json(
      {
        customer: await readCustomer(
          await getRequestUser(request),
          (await context.params).id,
        ),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
async function mutate(
  request: Request,
  context: Context,
  action: 'update' | 'delete',
) {
  try {
    const user = requireAdminResource(
      await getRequestUser(request),
      'customers',
      true,
    );
    await limitRequest(request, 'customers-write', 30, 60, user.id);
    return Response.json(
      await changeCustomer(
        user,
        action,
        (await context.params).id,
        await readJson(request, 8192),
        'rest',
      ),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
export const PATCH = (request: Request, context: Context) =>
  mutate(request, context, 'update');
export const DELETE = (request: Request, context: Context) =>
  mutate(request, context, 'delete');
