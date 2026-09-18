export const CHAT_RECOVERY_STORAGE = 'northstar.chat.pending.v1';
const MAX_AGE = 7 * 86400_000;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
// Device-local pointer only. No messages, filenames, cookies or provider credentials.
export function rememberChatRequest(
  storage: StoragePort,
  key: string,
  now = Date.now(),
) {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) return false;
  try {
    storage.setItem(
      CHAT_RECOVERY_STORAGE,
      JSON.stringify({ version: 1, key, createdAt: now }),
    );
    return true;
  } catch {
    return false;
  }
}
export function forgetChatRequest(storage: StoragePort) {
  try {
    storage.removeItem(CHAT_RECOVERY_STORAGE);
  } catch {
    /* Storage can be disabled. */
  }
}
export function recalledChatRequest(
  storage: StoragePort,
  now = Date.now(),
): string | undefined {
  try {
    const raw = storage.getItem(CHAT_RECOVERY_STORAGE);
    if (!raw) return undefined;
    if (raw.length > 300) throw new Error('Oversized pointer');
    const item = JSON.parse(raw);
    if (
      item.version !== 1 ||
      Object.keys(item).some(
        (k) => !['version', 'key', 'createdAt'].includes(k),
      ) ||
      typeof item.key !== 'string' ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(item.key) ||
      !Number.isSafeInteger(item.createdAt) ||
      item.createdAt > now + 60000 ||
      now - item.createdAt > MAX_AGE
    )
      throw new Error('Invalid pointer');
    return item.key;
  } catch {
    forgetChatRequest(storage);
    return undefined;
  }
}
