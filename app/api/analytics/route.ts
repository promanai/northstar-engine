import {
  analyticsAdmin,
  analyticsReport,
  cleanupAnalytics,
  saveAnalyticsSettings,
} from '@/lib/analytics-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
export async function GET(request: Request) {
  try {
    const user = await analyticsAdmin(request);
    await limitRequest(request, 'analytics-read', 60, 60, user.id);
    const q = new URL(request.url).searchParams;
    if (
      [...q.keys()].some(
        (k) =>
          ![
            'period',
            'from',
            'to',
            'visitor',
            'conversation',
            'before',
            'visitsBefore',
            'chatsBefore',
          ].includes(k) || q.getAll(k).length !== 1,
      )
    )
      throw new RequestFailure('Некорректные параметры');
    return Response.json(await analyticsReport(q), {
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await analyticsAdmin(request);
    await limitRequest(request, 'analytics-settings', 20, 60, user.id);
    const body = await readJson(request, 4096);
    if (
      body.action === 'cleanup' &&
      body.confirm === true &&
      Object.keys(body).length === 2
    )
      return Response.json(await cleanupAnalytics(), {
        headers: { 'cache-control': 'no-store' },
      });
    return Response.json(await saveAnalyticsSettings(request, body), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
