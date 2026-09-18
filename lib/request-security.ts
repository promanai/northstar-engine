import { env } from 'cloudflare:workers';
import {
  digest,
  discardBody,
  mutationProblem,
  readCookie,
} from './security-policy';

export class RequestFailure extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function failureResponse(error: unknown) {
  const known = error instanceof RequestFailure;
  if (!known)
    console.error(
      'Request failed:',
      error instanceof Error ? error.name : 'Unknown failure',
    );
  return Response.json(
    {
      error: known
        ? error.message
        : 'Сервис временно недоступен. Попробуйте позже.',
    },
    {
      status: known ? error.status : 503,
      headers: {
        'cache-control': 'no-store',
        ...(known && error.retryAfter
          ? { 'retry-after': `${error.retryAfter}` }
          : {}),
      },
    },
  );
}
export async function readJson(
  request: Request,
  maxBytes = 65536,
): Promise<Record<string, unknown>> {
  const problem = mutationProblem(request);
  if (problem) {
    await discardBody(request);
    throw new RequestFailure(
      problem,
      (request.headers.has('origin') &&
        request.headers.get('origin') !== new URL(request.url).origin) ||
        request.headers.get('sec-fetch-site') === 'cross-site'
        ? 403
        : 415,
    );
  }
  if (Number(request.headers.get('content-length')) > maxBytes) {
    await discardBody(request);
    throw new RequestFailure('Запрос слишком большой', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure('Требуется JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestFailure('Запрос слишком большой', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new RequestFailure('Некорректный JSON');
  }
}

export async function limitRequest(
  request: Request,
  group: string,
  maximum: number,
  windowSeconds: number,
  identity?: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  // CF-Connecting-IP is set by Cloudflare. Do not trust X-Forwarded-For.
  const peer =
    identity ?? request.headers.get('cf-connecting-ip') ?? 'local-or-unknown';
  const key = `${group}:${await digest(peer)}:${bucket}`;
  const expires = (bucket + 1) * windowSeconds;
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(key, expires)
    .first<{ count: number }>();
  await env.DB.prepare(
    'DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at < ? LIMIT 100)',
  )
    .bind(now)
    .run();
  if (!row || row.count > maximum)
    throw new RequestFailure(
      'Слишком много запросов. Попробуйте позже.',
      429,
      Math.max(1, expires - now),
    );
}

export async function guestIdentity(request: Request) {
  const cookie = readCookie(request, 'northstar_guest');
  const valid = cookie && /^[a-f0-9]{64}$/.test(cookie);
  const token = valid
    ? cookie
    : Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
  return {
    hash: await digest(token),
    existingHash: valid ? await digest(token) : null,
    expiresAt: new Date(Date.now() + 7 * 86400_000),
    header: `northstar_guest=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  };
}
