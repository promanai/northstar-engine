import { getRequestUser } from '@/lib/auth';
import {
  listTickets,
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

export async function GET(request: Request) {
  try {
    const user = requireTicketAccess(await getRequestUser(request));
    const q = new URL(request.url).searchParams;
    if (
      [...q.keys()].some(
        (k) => !['before', 'all'].includes(k) || q.getAll(k).length !== 1,
      ) ||
      (q.has('all') && !['true', 'false'].includes(q.get('all')!))
    )
      throw new RequestFailure('Некорректные параметры');
    return Response.json(
      await listTickets(user, {
        before: q.get('before') ?? undefined,
        all: q.get('all') === 'true',
      }),
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = requireTicketAccess(await getRequestUser(request), true);
    await limitRequest(request, 'tickets-write', 30, 60, user.id);
    const result = await changeTicket(
      user,
      undefined,
      await readJson(request, 40000),
      'rest',
    );
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
