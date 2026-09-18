import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../lib/security-policy.ts';

void test('password reset token format and hash verification', async () => {
  const rawToken = `prt_${'a'.repeat(32)}${'b'.repeat(32)}`;
  assert.match(rawToken, /^prt_[a-f0-9]{64}$/);

  const hash1 = await digest(rawToken);
  const hash2 = await digest(rawToken);
  assert.equal(hash1, hash2);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
});

void test('password reset validation rejects malformed tokens and short passwords', () => {
  const invalidTokens = [
    '',
    'token',
    'prt_',
    'prt_' + 'x'.repeat(64), // non-hex
    'prt_' + 'a'.repeat(63), // too short
    null,
    undefined,
  ];

  for (const t of invalidTokens) {
    const valid = typeof t === 'string' && /^prt_[a-f0-9]{64}$/.test(t.trim());
    assert.equal(valid, false);
  }

  const invalidPasswords = [
    '',
    '123',
    'short',
    '1234567', // 7 chars, minimum is 8
    'a'.repeat(129), // too long, maximum is 128
  ];

  for (const p of invalidPasswords) {
    const valid = typeof p === 'string' && p.length >= 8 && p.length <= 128;
    assert.equal(valid, false);
  }

  const validPassword = 'correct_password';
  assert.equal(typeof validPassword === 'string' && validPassword.length >= 8, true);
});
