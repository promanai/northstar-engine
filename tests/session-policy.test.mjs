import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionRevocation } from '../lib/session-policy.ts';

void test('session revocation requires a bounded password, exact target and explicit confirmation', () => {
  const body = { target: 'others', currentPassword: 'password', confirm: true };
  assert.equal(sessionRevocation(body).target, 'others');
  assert.equal(
    sessionRevocation({ ...body, target: crypto.randomUUID() }).currentPassword,
    'password',
  );
  for (const change of [
    { target: '*' },
    { target: '' },
    { confirm: false },
    { confirm: 'true' },
    { currentPassword: '' },
    { currentPassword: 'x'.repeat(257) },
    { userId: 'someone' },
    { role: 'admin' },
  ])
    assert.throws(() => sessionRevocation({ ...body, ...change }));
  assert.throws(() => sessionRevocation({ target: 'others', confirm: true }));
});
