import { getRequestUser } from '@/lib/auth';
import {
  changeSiteConfig,
  siteConfigHistory,
  publicSiteConfig,
  readSiteConfig,
  requireSiteConfigAccess,
} from '@/lib/site-config-service';
import { discardBody } from '@/lib/security-policy';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (
      query.has('view') &&
      !['public', 'admin', 'history'].includes(query.get('view')!)
    )
      throw new RequestFailure('Неизвестный view');
    if (query.get('view') === 'admin')
      return Response.json(
        await readSiteConfig(await getRequestUser(request)),
        { headers: { 'cache-control': 'no-store' } },
      );
    if (query.get('view') === 'history') {
      const before = query.get('before');
      const versions = await siteConfigHistory(
        await getRequestUser(request),
        before === null ? undefined : Number(before),
      );
      return Response.json(
        {
          versions,
          nextBefore: versions.length === 50 ? versions.at(-1)!.revision : null,
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    return Response.json(await publicSiteConfig(), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = requireSiteConfigAccess(await getRequestUser(request), true);
    await limitRequest(request, 'site-config-write', 20, 60, user.id);
    const result = await changeSiteConfig(
      user,
      await readJson(request, 8000),
      'rest',
    );
    return Response.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
