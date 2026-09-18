import { getRequestUser } from '@/lib/auth';
import { changePage, requirePageAccess } from '@/lib/page-service';
import {
  failureResponse,
  limitRequest,
  readJson,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = requirePageAccess(await getRequestUser(request), 'write');
    await limitRequest(request, 'pages-write', 30, 60, user.id);
    const page = await changePage(
      user,
      'rest',
      'restore',
      (await context.params).id,
      await readJson(request, 1000),
    );
    return Response.json(
      { page },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
