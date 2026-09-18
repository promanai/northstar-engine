import { executePasswordReset } from '@/lib/password-reset';
import { failureResponse, readJson } from '@/lib/request-security';

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const result = await executePasswordReset(body.token, body.password, request);
    return Response.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
