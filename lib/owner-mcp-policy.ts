// Northstar Owner MCP Authentication & Security Policy
// Implements HMAC-SHA256 stateless capability tokens and scope authorization.

export interface OwnerTokenPayload {
  jti: string;
  siteId: string;
  ownerId: string;
  agentName: string;
  scopes: string[];
  iat: number;
  exp: number | null;
}

export interface OwnerPrincipal {
  id: string;
  ownerId: string;
  agentName: string;
  scopes: string[];
  siteId: string;
  role: 'owner';
  expiresAt: number | null;
}

export const OWNER_MCP_SCOPES = [
  '*',
  'site:read',
  'site:write',
  'content:read',
  'content:write',
  'publish:preview',
  'publish:prod',
] as const;

export type OwnerMcpScope = (typeof OWNER_MCP_SCOPES)[number];

export const OWNER_SCOPE_LABELS: Record<string, string> = {
  '*': 'Полный доступ владельца сайта',
  'site:read': 'Чтение статуса, возможностей и конфигурации сайта',
  'site:write': 'Изменение конфигурации и параметров сайта',
  'content:read': 'Чтение страниц, секций, блоков и локалей',
  'content:write': 'Создание и изменение текстов и секций (черновик)',
  'publish:preview': 'Сборка и развёртывание предпросмотра на Cloudflare',
  'publish:prod': 'Публикация изменений в production (слияние в main)',
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function fromBase64Url(value: string): Uint8Array {
  const base64 =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signOwnerTokenPayload(
  payload: OwnerTokenPayload,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(encoder.encode(payloadJson));
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadB64),
  );
  const sigB64 = toBase64Url(new Uint8Array(signatureBytes));
  return `nsk_owner_${payloadB64}.${sigB64}`;
}

export async function verifyOwnerToken(
  tokenString: string,
  secret: string,
  options?: { nowSec?: number; revokedJtis?: string[] },
): Promise<OwnerTokenPayload | null> {
  if (!tokenString || !tokenString.startsWith('nsk_owner_')) return null;
  const parts = tokenString.slice('nsk_owner_'.length).split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigB64) as unknown as BufferSource,
      encoder.encode(payloadB64),
    );
    if (!valid) return null;

    const payloadBytes = fromBase64Url(payloadB64);
    const payload = JSON.parse(decoder.decode(payloadBytes)) as OwnerTokenPayload;
    if (!payload || typeof payload !== 'object') return null;

    // Check revoked IDs
    if (options?.revokedJtis && options.revokedJtis.includes(payload.jti)) {
      return null;
    }

    const now = options?.nowSec ?? Math.floor(Date.now() / 1000);
    // Expiration check
    if (payload.exp !== null && typeof payload.exp === 'number' && payload.exp < now) {
      return null;
    }
    // Future issued check with 300s skew allowance
    if (typeof payload.iat === 'number' && payload.iat > now + 300) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createOwnerCapabilityToken({
  secret,
  siteId = 'aisites',
  ownerId = 'owner_default',
  agentName = 'AI Agent',
  scopes = ['site:read', 'content:read'],
  expiresInDays = 30,
}: {
  secret: string;
  siteId?: string;
  ownerId?: string;
  agentName?: string;
  scopes?: string[];
  expiresInDays?: number | null;
}): Promise<{ token: string; payload: OwnerTokenPayload }> {
  const now = Math.floor(Date.now() / 1000);
  const jti = `tkn_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const exp = expiresInDays ? now + expiresInDays * 86400 : null;
  const payload: OwnerTokenPayload = {
    jti,
    siteId,
    ownerId,
    agentName,
    scopes,
    iat: now,
    exp,
  };
  const token = await signOwnerTokenPayload(payload, secret);
  return { token, payload };
}

export function ownerHasScope(principalScopes: string[], requiredScope: string): boolean {
  if (principalScopes.includes('*')) return true;
  return principalScopes.includes(requiredScope);
}

export async function resolveOwnerPrincipal({
  authHeader,
  secret,
  adminSecrets = [],
  revokedJtis = [],
}: {
  authHeader: string | null;
  secret?: string;
  adminSecrets?: string[];
  revokedJtis?: string[];
}): Promise<OwnerPrincipal | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const rawToken = match[1].trim();

  // 1. Direct admin token match (root owner)
  const allSecrets = [secret, ...adminSecrets].filter(Boolean) as string[];
  for (const s of allSecrets) {
    if (rawToken === s) {
      return {
        id: 'owner_root',
        ownerId: 'owner_root',
        agentName: 'Root Admin',
        scopes: ['*'],
        siteId: '*',
        role: 'owner',
        expiresAt: null,
      };
    }
  }

  // 2. Cryptographic capability token verification
  for (const s of allSecrets) {
    const payload = await verifyOwnerToken(rawToken, s, { revokedJtis });
    if (payload) {
      return {
        id: payload.jti,
        ownerId: payload.ownerId,
        agentName: payload.agentName,
        scopes: payload.scopes,
        siteId: payload.siteId,
        role: 'owner',
        expiresAt: payload.exp,
      };
    }
  }

  return null;
}
