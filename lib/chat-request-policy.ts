export const CHAT_LEASE_MS = 300_000;
export function chatRequestKey(value: string | null) {
  if (!value || !/^[A-Za-z0-9_-]{16,128}$/.test(value))
    throw new Error('Требуется Idempotency-Key: 16–128 букв, цифр, _ или -');
  return value;
}
export function chatFingerprintInput(
  message: string,
  conversationId: unknown,
  file: { id: string; provider: string } | undefined | null,
) {
  return JSON.stringify([
    message,
    conversationId ?? null,
    file?.id ?? null,
    file?.provider ?? null,
  ]);
}
