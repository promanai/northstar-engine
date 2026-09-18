import { getRequestUser } from '@/lib/auth';
import { pageHistory } from '@/lib/page-service';
import { failureResponse } from '@/lib/request-security';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const value = new URL(request.url).searchParams.get('before');
    const versions = await pageHistory(
      await getRequestUser(request),
      (await context.params).id,
      value === null ? undefined : Number(value),
    );
    return Response.json(
      {
        versions,
        nextBefore: versions.length === 50 ? versions.at(-1)!.revision : null,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
