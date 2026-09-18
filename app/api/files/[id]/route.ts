import { getRequestUser } from '@/lib/auth';
import { deleteFile, getFile, requireFileAccess } from '@/lib/file-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    return Response.json(
      {
        file: await getFile(
          await getRequestUser(request),
          (await context.params).id,
        ),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = requireFileAccess(await getRequestUser(request), true);
    await limitRequest(request, 'files-delete', 30, 60, user.id);
    const body = await readJson(request, 1024);
    if (Object.keys(body).some((key) => key !== 'confirm'))
      throw new RequestFailure('Неизвестные поля запроса');
    return Response.json(
      await deleteFile(user, (await context.params).id, body.confirm),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
