import { getRequestUser } from '@/lib/auth';
import { changeCustomer, customerStats, listCustomers } from '@/lib/customer-service';
import { requireAdminResource } from '@/lib/assistant-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
export async function GET(request: Request) {
  try {
    const user = requireAdminResource(
      await getRequestUser(request),
      'customers',
    );
    const query = new URL(request.url).searchParams;
    if (
      [...query.keys()].some((k) => k !== 'before' && k !== 'query') ||
      query.getAll('before').length > 1 ||
      query.getAll('query').length > 1
    )
      throw new RequestFailure('Некорректные параметры');
    const searchQuery = query.get('query') ?? undefined;
    if (searchQuery !== undefined && searchQuery.length > 200)
      throw new RequestFailure('Слишком длинный поисковый запрос');
    const result = await listCustomers(
      user,
      query.get('before') ?? undefined,
      searchQuery,
    );
    const ids = result.customers.map((c: { id: string }) => c.id);
    const stats = await customerStats(user, ids);
    return Response.json(
      { ...result, stats },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
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
        'create',
        undefined,
        await readJson(request, 8192),
        'rest',
      ),
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
