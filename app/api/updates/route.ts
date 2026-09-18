import { getSessionUser } from '@/lib/auth';
import { isOwner } from '@/lib/commerce-policy';
import {
  cancelUpdate,
  checkUpdates,
  configureUpdates,
  queueUpdate,
  updatesView,
} from '@/lib/updates';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
export async function GET(request: Request) {
  try {
    if (!isOwner(await getSessionUser(request)))
      throw new RequestFailure('Требуется сессия администратора', 403);
    return Response.json(await updatesView(), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const user = await getSessionUser(request);
    if (!isOwner(user))
      throw new RequestFailure('Требуется сессия администратора', 403);
    await limitRequest(request, 'updates-admin', 12, 60, user!.id);
    if (body.action === 'configure') await configureUpdates(body);
    else if (body.action === 'check') await checkUpdates();
    else if (body.action === 'install') await queueUpdate(body);
    else if (body.action === 'cancel') await cancelUpdate(body);
    else throw new RequestFailure('Неизвестное действие');
    return Response.json(await updatesView(), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
