import { getRequestUser } from '@/lib/auth';
import {
  readTicket,
  changeTicket,
  requireTicketAccess,
} from '@/lib/ticket-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = requireTicketAccess(await getRequestUser(request));
    const q = new URL(request.url).searchParams;
    if (
      [...q.keys()].some((k) => k !== 'before' || q.getAll(k).length !== 1) ||
      (q.has('before') && !/^\d{1,10}$/.test(q.get('before')!))
    )
      throw new RequestFailure('Некорректные параметры');
    return Response.json(
      await readTicket(
        user,
        (await context.params).id,
        q.has('before') ? Number(q.get('before')) : undefined,
      ),
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = requireTicketAccess(await getRequestUser(request), true);
    await limitRequest(request, 'tickets-write', 30, 60, user.id);
    return Response.json(
      await changeTicket(
        user,
        (await context.params).id,
        await readJson(request, 40000),
        'rest',
      ),
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
