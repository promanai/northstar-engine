import { getRequestUser } from '@/lib/auth';
import { listFiles, requireFileAccess, uploadFile } from '@/lib/file-service';
import { readUpload } from '@/lib/file-request';
import { multipartLimit } from '@/lib/file-policy';
import {
  failureResponse,
  limitRequest,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

export async function GET(request: Request) {
  try {
    const user = requireFileAccess(await getRequestUser(request));
    const query = new URL(request.url).searchParams;
    if (
      [...query.keys()].some((key) => !['all', 'before'].includes(key)) ||
      ['all', 'before'].some((key) => query.getAll(key).length > 1) ||
      (query.has('all') && !['true', 'false'].includes(query.get('all')!))
    )
      throw new RequestFailure('Некорректные параметры списка');
    return Response.json(
      await listFiles(
        user,
        query.get('all') === 'true',
        query.get('before') ?? undefined,
      ),
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = requireFileAccess(await getRequestUser(request), true);
    await limitRequest(request, 'files-upload', 30, 60, user.id);
    const result = await uploadFile(
      user,
      request.headers.get('idempotency-key'),
      await readUpload(request),
    );
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    // Drain a bounded margin for ordinary oversized requests so their 413 can
    // reach keep-alive clients. Arbitrarily large/streamed bodies are cancelled.
    await discardBody(
      request,
      error instanceof RequestFailure && error.status === 413
        ? multipartLimit + 65536
        : 65536,
    );
    return failureResponse(error);
  }
}
