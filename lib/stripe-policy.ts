export class StripeSignatureError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index++) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

export async function verifyStripeSignature(rawBody: string, signature: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  const values = signature.split(',').map((part) => part.split('='))
    .filter(([key, value]) => key && value)
    .reduce<Record<string, string[]>>((all, [key, value]) => ({ ...all, [key]: [...(all[key] ?? []), value] }), {});
  const timestamp = Number(values.t?.[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300)
    throw new StripeSignatureError('Stripe webhook устарел');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!values.v1?.some((value) => equal(value, expected)))
    throw new StripeSignatureError('Неверная подпись Stripe webhook');
  try {
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    if (typeof event.id !== 'string' || typeof event.type !== 'string' || !event.data || typeof event.data !== 'object') throw new Error();
    return event;
  } catch {
    throw new StripeSignatureError('Некорректное событие Stripe');
  }
}
