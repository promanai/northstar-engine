import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { apiTokens } from '@/db/schema';
import { createApiToken, getSessionUser } from '@/lib/auth';
import {
  customerScopes,
  isAgentOwner,
  scopeLabels,
  validScopes,
} from '@/lib/agent-policy';
import {
  failureResponse,
  limitRequest,
  readJson,
  RequestFailure,
} from '@/lib/request-security';
import { discardBody, mutationProblem } from '@/lib/security-policy';

async function session(request: Request) {
  const user = request.headers.has('authorization')
    ? null
    : await getSessionUser(request);
  if (!user) throw new RequestFailure('Войдите в кабинет через браузер', 401);
  if (!isAgentOwner(user.role) && user.role !== 'customer')
    throw new RequestFailure('Недостаточно прав', 403);
  return user;
}
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
export async function GET(request: Request) {
  try {
    const user = await session(request);
    const tokens = await getDb()
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        scopes: apiTokens.scopes,
        lastUsedAt: apiTokens.lastUsedAt,
        expiresAt: apiTokens.expiresAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, user.id))
      .orderBy(desc(apiTokens.createdAt));
    return response({
      tokens,
      allowedScopes: isAgentOwner(user.role)
        ? Object.keys(scopeLabels)
        : customerScopes,
      owner: isAgentOwner(user.role),
    });
  } catch (error) {
    return failureResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const user = await session(request);
    await limitRequest(request, 'tokens-create', 10, 3600, user.id);
    if (
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 80
    )
      throw new RequestFailure('Название: 1–80 символов');
    const days = body.expiresInDays ?? 30;
    if (
      typeof days !== 'number' ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 365
    )
      throw new RequestFailure('Срок действия: 1–365 дней');
    const scopes = validScopes(
      body.scopes ?? ['catalog:read', 'orders:read'],
      user.role,
      body.confirmFullAccess,
    );
    if (!scopes) throw new RequestFailure('Недопустимый набор прав', 403);
    const created = await createApiToken(user.id, body.name, days, scopes);
    return response(
      {
        ...created,
        scopes,
        warning: 'Сохраните токен сейчас: повторно он не показывается.',
      },
      201,
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    await discardBody(request, 4096);
    if (mutationProblem(request))
      throw new RequestFailure('Недопустимый источник или формат запроса', 403);
    const user = await session(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 128) throw new RequestFailure('Укажите id токена');
    const rows = await getDb()
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, user.id)))
      .returning({ id: apiTokens.id });
    if (!rows.length) throw new RequestFailure('Токен не найден', 404);
    return response({ ok: true });
  } catch (error) {
    return failureResponse(error);
  }
}
