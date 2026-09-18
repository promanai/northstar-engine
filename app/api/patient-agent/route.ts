import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { apiTokens } from '@/db/schema';
import { createApiToken, getSessionUser } from '@/lib/auth';
import { patientAgentInput } from '@/lib/patient-agent-policy';
import {
  readJson,
  RequestFailure,
  failureResponse,
  limitRequest,
} from '@/lib/request-security';
import { discardBody, mutationProblem } from '@/lib/security-policy';

async function patient(request: Request) {
  if (request.headers.has('authorization'))
    throw new RequestFailure('Use your browser session.', 401);
  const user = await getSessionUser(request);
  if (!user || !['customer', 'admin', 'owner'].includes(user.role))
    throw new RequestFailure('Sign in to your account.', 401);
  return user;
}
const response = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'cache-control': 'private, no-store' },
  });
export async function GET(request: Request) {
  try {
    const user = await patient(request);
    const rows = await getDb()
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        scopes: apiTokens.scopes,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
      })
      .from(apiTokens)
      .where(
        and(eq(apiTokens.userId, user.id), eq(apiTokens.audience, 'patient')),
      )
      .orderBy(desc(apiTokens.createdAt))
      .limit(101);
    return response({
      tokens: rows.slice(0, 100),
      truncated: rows.length > 100,
    });
  } catch (e) {
    return failureResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096),
      user = await patient(request);
    await limitRequest(request, 'tokens-create', 10, 3600, user.id);
    let input;
    try {
      input = patientAgentInput(body);
    } catch (e) {
      throw new RequestFailure((e as Error).message);
    }
    const created = await createApiToken(
      user.id,
      input.name,
      input.days,
      input.scopes,
      'patient',
    );
    return response(
      { ...created, audience: 'patient', scopes: input.scopes },
      201,
    );
  } catch (e) {
    return failureResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    await discardBody(request, 4096);
    if (mutationProblem(request))
      throw new RequestFailure('Invalid request origin or content type.', 403);
    const user = await patient(request),
      id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 128) throw new RequestFailure('Provide a token ID.');
    await limitRequest(request, 'patient-tokens-revoke', 30, 60, user.id);
    const rows = await getDb()
      .delete(apiTokens)
      .where(
        and(
          eq(apiTokens.id, id),
          eq(apiTokens.userId, user.id),
          eq(apiTokens.audience, 'patient'),
        ),
      )
      .returning({ id: apiTokens.id });
    if (!rows.length) throw new RequestFailure('Token not found.', 404);
    return response({ ok: true });
  } catch (e) {
    return failureResponse(e);
  }
}
