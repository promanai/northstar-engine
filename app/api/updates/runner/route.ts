import { runnerAction, runnerAuth } from '@/lib/updates';
import { failureResponse, readJson } from '@/lib/request-security';
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    await runnerAuth(request);
    return Response.json(await runnerAction(body), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
