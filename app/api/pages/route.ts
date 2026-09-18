import { getRequestUser } from '@/lib/auth';
import { canManagePages } from '@/lib/access-policy';
import { changePage, listPages, requirePageAccess } from '@/lib/page-service';
import {
  failureResponse,
  limitRequest,
  readJson,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    return Response.json(
      { pages: await listPages(user) },
      {
        headers: {
          'cache-control': canManagePages(user, 'read')
            ? 'no-store'
            : 'public, max-age=60',
        },
      },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = requirePageAccess(await getRequestUser(request), 'write');
    await limitRequest(request, 'pages-write', 30, 60, user.id);
    const page = await changePage(
      user,
      'rest',
      'create',
      undefined,
      await readJson(request, 60000),
    );
    return Response.json(
      { page },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
