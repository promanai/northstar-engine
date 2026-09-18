import { getBrowserSession } from '@/lib/auth';
import { isLite } from '@/lib/engine-mode';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { sessionRevocation } from '@/lib/session-policy';
import { listOwnSessions, revokeOwnSessions } from '@/lib/session-service';
import { discardBody } from '@/lib/security-policy';

async function identity(request: Request) {
  if (isLite())
    throw new RequestFailure('Сессии доступны только в Standard', 404);
  if (
    (request.headers.has('origin') &&
      request.headers.get('origin') !== new URL(request.url).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new RequestFailure('Межсайтовый запрос запрещён', 403);
  if (new URL(request.url).search)
    throw new RequestFailure('Параметры URL не поддерживаются');
  const session = await getBrowserSession(request);
  if (!session) throw new RequestFailure('Требуется авторизация', 401);
  if (!['customer', 'admin', 'owner'].includes(session.role))
    throw new RequestFailure('Доступ запрещён', 403);
  return session;
}

export async function GET(request: Request) {
  try {
    const session = await identity(request);
    await limitRequest(request, 'sessions-read', 30, 60, session.id);
    return Response.json(await listOwnSessions(session), {
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await identity(request);
    const body = await readJson(request, 2048);
    let change;
    try {
      change = sessionRevocation(body);
    } catch {
      throw new RequestFailure('Нужны target, текущий пароль и подтверждение');
    }
    await limitRequest(request, 'sessions-revoke', 10, 900, session.id);
    return Response.json(
      await revokeOwnSessions(session, change.target, change.currentPassword),
      {
        headers: { 'cache-control': 'private, no-store' },
      },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
