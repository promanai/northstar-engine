import { getSessionUser } from '@/lib/auth';
import { isAdministrator } from '@/lib/access-policy';
import { documentStore } from '@/lib/document-store';
import { defaultBilling, validateBilling } from '@/lib/billing-policy';
import { readAiBudget } from '@/lib/ai-budget';
import {
  readJson,
  limitRequest,
  failureResponse,
  RequestFailure,
} from '@/lib/request-security';

async function administrator(request: Request) {
  // Financial administration is deliberately not delegated through site:* tokens.
  if (request.headers.has('authorization'))
    throw new RequestFailure('Требуется сессия администратора', 403);
  const user = await getSessionUser(request);
  if (!user || !isAdministrator(user.role))
    throw new RequestFailure('Требуется сессия администратора', 403);
  return user;
}
const store = () => documentStore('billing-operations', defaultBilling);
const response = (value: unknown) =>
  Response.json(value, { headers: { 'cache-control': 'private, no-store' } });
export async function GET(request: Request) {
  try {
    await administrator(request);
    const documents = store();
    const [state, history, aiBudget] = await Promise.all([
      documents.read(),
      documents.history(),
      readAiBudget().catch(() => null),
    ]);
    return response({
      ...state,
      history: history.map(({ revision, createdAt }) => ({
        revision,
        createdAt,
      })),
      aiBudget,
      source: 'manual',
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await administrator(request);
    const body = await readJson(request, 65536);
    await limitRequest(request, 'billing-write', 30, 60, user.id);
    if (
      Object.keys(body).some((k) => !['revision', 'value'].includes(k)) ||
      !Number.isSafeInteger(body.revision) ||
      Number(body.revision) < 0
    )
      throw new RequestFailure('Укажите текущую revision');
    let value;
    try {
      value = validateBilling(body.value);
    } catch (error) {
      throw new RequestFailure(
        error instanceof Error ? error.message : 'Некорректные данные',
      );
    }
    const documents = store(),
      current = await documents.read();
    if (
      current.revision !== body.revision ||
      !(await documents.save(current, value, user.id, null, 'rest', null))
    )
      throw new RequestFailure(
        'Данные изменены в другой вкладке. Обновите список перед сохранением.',
        409,
      );
    // Return this exact committed revision, never a later concurrent writer's value.
    return response({ revision: current.revision + 1, value });
  } catch (error) {
    return failureResponse(error);
  }
}
