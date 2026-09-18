import { getRequestUser } from '@/lib/auth';
import {
  changeKnowledge,
  knowledgeHistory,
  readKnowledge,
  runtimeKnowledge,
} from '@/lib/knowledge-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const mode = query.get('view');
    if (
      [...query.keys()].some((k) => !['view', 'before'].includes(k)) ||
      ['view', 'before'].some((k) => query.getAll(k).length > 1) ||
      (mode !== null && !['admin', 'history'].includes(mode)) ||
      (query.has('before') &&
        (mode !== 'history' || !/^\d+$/.test(query.get('before')!)))
    )
      throw new RequestFailure('Некорректные параметры');

    const user = await getRequestUser(request);

    if (mode === 'history') {
      return Response.json(
        {
          versions: await knowledgeHistory(
            user,
            query.has('before') ? Number(query.get('before')) : undefined,
          ),
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    if (mode === 'admin') {
      return Response.json(
        { knowledge: await readKnowledge(user) },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    // Public list returns only active items
    const value = await runtimeKnowledge();
    return Response.json(
      {
        items: value.items
          .filter((i) => i.active)
          .map(({ id, title, category, content, updatedAt }) => ({
            id,
            title,
            category,
            content,
            updatedAt,
          })),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getRequestUser(request);
    await limitRequest(request, 'knowledge-write', 30, 60, user?.id);
    const body = await readJson(request, 100000);
    return Response.json(
      { knowledge: await changeKnowledge(user, body, 'rest') },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
