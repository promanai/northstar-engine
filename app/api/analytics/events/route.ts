import {
  ingestAnalytics,
  readAnalyticsSettings,
} from '@/lib/analytics-service';
import { failureResponse, readJson } from '@/lib/request-security';
export async function GET() {
  try {
    return Response.json((await readAnalyticsSettings()).value, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    return await ingestAnalytics(request, await readJson(request, 8192));
  } catch (error) {
    return failureResponse(error);
  }
}
