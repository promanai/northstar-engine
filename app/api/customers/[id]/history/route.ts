import { getRequestUser } from '@/lib/auth';
import { customerHistory } from '@/lib/customer-service';
import { failureResponse, RequestFailure } from '@/lib/request-security';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const query = new URL(request.url).searchParams;
    if (
      [...query.keys()].some((k) => k !== 'before') ||
      query.getAll('before').length > 1 ||
      (query.has('before') && !/^\d+$/.test(query.get('before')!))
    )
      throw new RequestFailure('Некорректный курсор');
    return Response.json(
      {
        versions: await customerHistory(
          await getRequestUser(request),
          (await context.params).id,
          query.has('before') ? Number(query.get('before')) : undefined,
        ),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
