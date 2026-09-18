export type Principal = { id: string; role: string } | null;
// Drain small rejected bodies so local Worker keep-alive connections remain usable.
// Never buffer them or drain an unbounded attacker-controlled stream.
export async function discardBody(
  request: Request,
  maximum = 65536,
  timeoutMs = 2000,
) {
  if (request.bodyUsed) return;
  const reader = request.body?.getReader();
  if (!reader) return;
  let size = 0;
  let complete = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('BODY_DRAIN_TIMEOUT')),
      timeoutMs,
    );
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) {
        complete = true;
        break;
      }
      size += value.byteLength;
      if (size > maximum) break;
    }
  } catch {
    // Best effort: a broken/slow upload must not replace the intended rejection.
  } finally {
    clearTimeout(timer);
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export type ConversationOwner = {
  customerId: string | null;
  guestTokenHash: string | null;
  guestExpiresAt: Date | null;
};

export function canAccessConversation(
  owner: ConversationOwner,
  user: Principal,
  guestHash: string | null,
  now = new Date(),
) {
  if (user && ['admin', 'owner'].includes(user.role)) return true;
  if (owner.customerId) return owner.customerId === user?.id;
  return (
    !!guestHash &&
    owner.guestTokenHash === guestHash &&
    !!owner.guestExpiresAt &&
    owner.guestExpiresAt > now
  );
}

export function mutationProblem(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return 'Недопустимый источник запроса';
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return 'Межсайтовый запрос запрещён';
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get('content-type') ?? '',
    )
  )
    return 'Требуется Content-Type: application/json';
  return null;
}

export function textValue(
  value: unknown,
  maximum: number,
  required = false,
): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maximum &&
    (!required || value.trim().length > 0)
  );
}

export function catalogPrice(minor: number, currency: string) {
  // The engine's current price contract is hundredths of the stated currency.
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export async function digest(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function readCookie(request: Request, name: string) {
  return (
    (request.headers.get('cookie') ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}
