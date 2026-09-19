import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { getDb } from '@/db';
import { apiTokens, sessions, users } from '@/db/schema';
import { bearerRouteAllowed } from '@/lib/agent-policy';

const SESSION_COOKIE = 'northstar_session';
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromBase64Url(value: string) {
  const base64 =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$100000$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, iterations, saltValue, hashValue] = stored.split('$');
  if (!iterations || !saltValue || !hashValue) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64Url(saltValue),
      iterations: Number(iterations),
      hash: 'SHA-256',
    },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  const expected = fromBase64Url(hashValue);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1)
    difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function getToken(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  return (
    cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) ?? null
  );
}

function cookieHeader(token: string, expiresAt: Date, request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((expiresAt.getTime() - Date.now()) / 1000)}${secure}`;
}

export async function createSession(userId: string, request: Request) {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const db = getDb();
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    token: `sha256:${await sha256(token)}`,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return { token, header: cookieHeader(token, expiresAt, request), expiresAt };
}

export async function getBrowserSession(request: Request) {
  // An explicit Authorization header must never inherit browser privileges.
  if (request.headers.has('authorization')) return null;
  const token = getToken(request);
  if (!token) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await getDb()
    .select({
      sessionId: sessions.id,
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      revision: users.revision,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        or(
          eq(sessions.token, token),
          eq(sessions.token, `sha256:${await sha256(token)}`),
        ),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .get();
  return result ?? null;
}

export async function getSessionUser(request: Request) {
  const session = await getBrowserSession(request);
  if (!session) return null;
  const { sessionId: _sessionId, ...user } = session;
  return user;
}

export async function getBearerUser(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const token = authorization.slice(7).trim();
  if (!/^nsk_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const result = await getDb()
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      revision: users.revision,
      tokenId: apiTokens.id,
      scopes: apiTokens.scopes,
      audience: apiTokens.audience,
    })
    .from(apiTokens)
    .innerJoin(users, eq(apiTokens.userId, users.id))
    .where(
      and(
        eq(apiTokens.tokenHash, tokenHash),
        or(isNull(apiTokens.expiresAt), gt(apiTokens.expiresAt, new Date())),
      ),
    )
    .get();
  if (!result) return null;
  if (!['account', 'patient'].includes(result.audience)) return null;
  if (
    result.audience === 'patient' &&
    !['customer', 'admin', 'owner'].includes(result.role)
  )
    return null;
  if (
    !bearerRouteAllowed(
      new URL(request.url).pathname,
      request.method,
      result.scopes,
    )
  )
    return null;
  await getDb()
    .update(apiTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiTokens.id, result.tokenId));
  return {
    id: result.id,
    email: result.email,
    firstName: result.firstName,
    lastName: result.lastName,
    phone: result.phone,
    role: result.audience === 'patient' ? 'customer' : result.role,
    tokenId: result.tokenId,
    scopes: result.scopes,
  };
}

export async function getRequestUser(request: Request) {
  if (request.headers.has('authorization')) return getBearerUser(request);
  return getSessionUser(request);
}

export async function createApiToken(
  userId: string,
  name: string,
  expiresInDays?: number,
  scopes: string[] = ['catalog:read', 'orders:read'],
  audience: 'account' | 'patient' = 'account',
) {
  const raw = `nsk_${toBase64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
  const now = new Date();
  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
  await getDb()
    .insert(apiTokens)
    .values({
      id: crypto.randomUUID(),
      userId,
      tokenHash: await sha256(raw),
      name: name.trim() || 'AI agent',
      scopes,
      audience,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  return { token: raw, expiresAt };
}

export async function deleteSession(request: Request) {
  const token = getToken(request);
  if (token)
    await getDb()
      .delete(sessions)
      .where(
        or(
          eq(sessions.token, token),
          eq(sessions.token, `sha256:${await sha256(token)}`),
        ),
      );
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function publicUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  createdAt?: Date;
  revision?: number;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    revision: user.revision ?? 0,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}
