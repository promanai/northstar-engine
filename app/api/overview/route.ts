import { getSessionUser } from '@/lib/auth';
import { isAdministrator } from '@/lib/access-policy';
import { isLite } from '@/lib/engine-mode';
import { overviewRange } from '@/lib/overview-policy';
import { readOverview } from '@/lib/overview-service';
import {
  failureResponse,
  limitRequest,
  RequestFailure,
} from '@/lib/request-security';

export async function GET(request: Request) {
  try {
    if (isLite())
      throw new RequestFailure('Обзор доступен только в Standard', 404);
    if (
      (request.headers.has('origin') &&
        request.headers.get('origin') !== new URL(request.url).origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new RequestFailure('Межсайтовый запрос запрещён', 403);
    const user = await getSessionUser(request);
    if (!user || !isAdministrator(user.role))
      throw new RequestFailure('Нужна сессия администратора', 403);
    const query = new URL(request.url).searchParams;
    try {
      overviewRange(query);
    } catch {
      throw new RequestFailure('Допустим period: 24h, 7d или 30d');
    }
    await limitRequest(request, 'overview-read', 10, 60, user.id);
    return Response.json(await readOverview(query), {
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
