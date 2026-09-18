import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chatRequestKey,
  chatFingerprintInput,
  CHAT_LEASE_MS,
} from '../lib/chat-request-policy.ts';
void test('chat idempotency key rejects missing, oversized and ambiguous identifiers', () => {
  for (const key of [
    null,
    '',
    'short',
    'x'.repeat(129),
    'a'.repeat(16) + ' ',
    'a/b'.repeat(10),
  ])
    assert.throws(() => chatRequestKey(key));
  assert.equal(chatRequestKey('safe_key-12345678'), 'safe_key-12345678');
  assert.ok(CHAT_LEASE_MS > 120000);
});
void test('chat fingerprint binds message, conversation, file and consented provider', () => {
  const base = chatFingerprintInput('hello', undefined, null);
  assert.equal(base, chatFingerprintInput('hello', null, undefined));
  for (const changed of [
    chatFingerprintInput('other', null, null),
    chatFingerprintInput('hello', 'conversation', null),
    chatFingerprintInput('hello', null, { id: 'f1', provider: 'openai' }),
  ])
    assert.notEqual(changed, base);
  assert.notEqual(
    chatFingerprintInput('hello', null, { id: 'f1', provider: 'openai' }),
    chatFingerprintInput('hello', null, { id: 'f1', provider: 'xai' }),
  );
});
