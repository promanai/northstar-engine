import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberChatRequest,
  recalledChatRequest,
  forgetChatRequest,
  CHAT_RECOVERY_STORAGE,
} from '../lib/chat-recovery-policy.ts';
const storage = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};
void test('recovery pointer survives reload and stores no message, file or credentials', () => {
  const s = storage(),
    key = 'attempt_123456789',
    now = 100000;
  assert.equal(rememberChatRequest(s, key, now), true);
  assert.equal(recalledChatRequest(s, now + 1000), key);
  assert.deepEqual(JSON.parse(s.getItem(CHAT_RECOVERY_STORAGE)), {
    version: 1,
    key,
    createdAt: now,
  });
  s.setItem('other-feature', 'keep');
  forgetChatRequest(s);
  assert.equal(recalledChatRequest(s, now), undefined);
  assert.equal(s.getItem('other-feature'), 'keep');
});
void test('invalid, old, future and oversized recovery pointers are discarded', () => {
  const s = storage(),
    key = 'attempt_123456789',
    now = 8 * 86400_000;
  for (const value of [
    'invalid',
    'null',
    'x'.repeat(301),
    JSON.stringify({ version: 2, key, createdAt: now }),
    JSON.stringify({ version: 1, key, createdAt: 0 }),
    JSON.stringify({ version: 1, key, createdAt: now + 61000 }),
    JSON.stringify({ version: 1, key: 'short', createdAt: now }),
    JSON.stringify({ version: 1, key, createdAt: now, message: 'PRIVATE' }),
  ]) {
    s.setItem(CHAT_RECOVERY_STORAGE, value);
    assert.equal(recalledChatRequest(s, now), undefined);
    assert.equal(s.getItem(CHAT_RECOVERY_STORAGE), null);
  }
  assert.equal(rememberChatRequest(s, 'invalid'), false);
});
void test('disabled browser storage does not crash chat recovery', () => {
  const fail = () => {
      throw new Error('storage blocked');
    },
    s = { getItem: fail, setItem: fail, removeItem: fail };
  assert.equal(rememberChatRequest(s, 'attempt_123456789'), false);
  assert.equal(recalledChatRequest(s), undefined);
  assert.doesNotThrow(() => forgetChatRequest(s));
});
