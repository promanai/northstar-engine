import { getRequestUser } from '@/lib/auth';
import {
  assistantHistory,
  changeAssistant,
  readAssistant,
  requireAdminResource,
  runtimeAssistant,
} from '@/lib/assistant-service';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody } from '@/lib/security-policy';
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams,
      mode = query.get('view');
    if (
      [...query.keys()].some((k) => !['view', 'before'].includes(k)) ||
      ['view', 'before'].some((k) => query.getAll(k).length > 1) ||
      (mode !== null && !['admin', 'history'].includes(mode)) ||
      (query.has('before') &&
        (mode !== 'history' || !/^\d+$/.test(query.get('before')!)))
    )
      throw new RequestFailure('Некорректные параметры');
    const user = await getRequestUser(request);
    if (mode === 'history')
      return Response.json(
        {
          versions: await assistantHistory(
            user,
            query.has('before') ? Number(query.get('before')) : undefined,
          ),
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    if (mode === 'admin')
      return Response.json(
        { assistant: await readAssistant(user) },
        { headers: { 'cache-control': 'no-store' } },
      );
    // Public output is an allow-list, never a private profile minus one field.
    const value = await runtimeAssistant();
    return Response.json(
      {
        assistant: {
          name: value.name,
          defaultLocale: value.defaultLocale,
          status: value.status,
        },
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = requireAdminResource(
      await getRequestUser(request),
      'assistant',
      true,
    );
    await limitRequest(request, 'assistant-write', 20, 60, user.id);
    const assistant = await changeAssistant(
      user,
      await readJson(request, 60000),
      'rest',
    );
    return Response.json(
      { assistant },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    await discardBody(request);
    return failureResponse(error);
  }
}
