import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ticketInput,
  ticketAccess,
  ticketCursor,
} from '../lib/ticket-policy.ts';
import {
  toolAllowed,
  bearerRouteAllowed,
  validScopes,
} from '../lib/agent-policy.ts';
void test('tickets require known roles and explicit independent read/write scopes', () => {
  for (const role of ['customer', 'admin', 'owner'])
    assert.equal(ticketAccess({ id: 'u', role }), true);
  assert.equal(ticketAccess(null), false);
  assert.equal(ticketAccess({ id: 'u', role: 'editor' }), false);
  const reader = {
    id: 'u',
    role: 'admin',
    tokenId: 't',
    scopes: ['tickets:read'],
  };
  assert.equal(ticketAccess(reader), true);
  assert.equal(ticketAccess(reader, true), false);
  assert.equal(
    toolAllowed('customer', ['tickets:write'], 'create_ticket'),
    true,
  );
  assert.equal(toolAllowed('customer', ['tickets:write'], 'get_ticket'), false);
  assert.equal(
    bearerRouteAllowed('/api/tickets/id', 'PATCH', ['tickets:read']),
    false,
  );
  assert.deepEqual(validScopes(['tickets:read', 'tickets:write'], 'customer'), [
    'tickets:read',
    'tickets:write',
  ]);
});
void test('ticket inputs bound text, prevent impersonation and require revision/confirmation', () => {
  const create = {
    subject: ' Тема ',
    body: ' Текст ',
    confirm: true,
    idempotencyKey: crypto.randomUUID(),
  };
  assert.equal(ticketInput(create, true).subject, 'Тема');
  for (const invalid of [
    { customerId: 'other' },
    { author: 'support' },
    { confirm: false },
    { body: '' },
    { body: 'x'.repeat(8001) },
    { subject: 'x'.repeat(161) },
    { body: '\u0000' },
    { idempotencyKey: 'short' },
  ])
    assert.throws(() => ticketInput({ ...create, ...invalid }, true));
  const change = {
    action: 'close',
    revision: 1,
    confirm: true,
    idempotencyKey: crypto.randomUUID(),
  };
  assert.equal(ticketInput(change, false).body, null);
  for (const invalid of [
    { revision: 0 },
    { revision: '1' },
    { action: 'delete' },
    { body: 'hidden note' },
  ])
    assert.throws(() => ticketInput({ ...change, ...invalid }, false));
  assert.throws(() => ticketInput({ ...change, action: 'message' }, false));
  assert.throws(() => ticketInput({ ...change, action: ['close'] }, false));
});
void test('ticket cursors validate deterministic bounded pagination', () => {
  const id = crypto.randomUUID();
  assert.deepEqual(ticketCursor(`123_${id}`), { time: 123, id });
  assert.equal(ticketCursor(undefined), null);
  for (const input of ['', null, {}, '-1_x', '9'.repeat(999)])
    assert.throws(() => ticketCursor(input));
});
