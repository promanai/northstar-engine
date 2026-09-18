import { clearSessionCookie, deleteSession } from '@/lib/auth';
import { discardBody } from '@/lib/security-policy';
import { failureResponse } from '@/lib/request-security';

export async function POST(request: Request) {
  try {
    await discardBody(request);
    await deleteSession(request);
    return Response.json(
      { ok: true },
      {
        headers: {
          'set-cookie': clearSessionCookie(),
          'cache-control': 'no-store',
        },
      },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
