import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validScopes,
  toolAllowed,
  bearerRouteAllowed,
  validateToolArguments,
} from '../lib/agent-policy.ts';
void test('customer permissions cannot escalate and owner wildcard needs explicit consent', () => {
  assert.deepEqual(validScopes(['orders:read', 'orders:read'], 'customer'), [
    'orders:read',
  ]);
  for (const value of [['*'], ['customers:read'], ['unknown'], [], null])
    assert.equal(validScopes(value, 'customer', true), null);
  assert.equal(validScopes(['*'], 'owner'), null);
  assert.deepEqual(validScopes(['*'], 'owner', true), ['*']);
  assert.equal(validScopes(['*'], 'unexpected-role', true), null);
});
void test('MCP requires both role and every declared tool permission', () => {
  assert.equal(toolAllowed('customer', ['orders:read'], 'get_order'), true);
  assert.equal(toolAllowed('customer', ['orders:read'], 'create_order'), false);
  assert.equal(toolAllowed('customer', ['*'], 'list_customers'), false);
  assert.equal(toolAllowed('owner', ['site:read'], 'site_get'), false);
  assert.equal(toolAllowed('owner', ['*'], 'site_get'), true);
  assert.equal(toolAllowed('owner', ['*'], 'toString'), false);
});
void test('REST permission gate separates checkout from writes and forbids token delegation', () => {
  assert.equal(
    bearerRouteAllowed('/api/orders/id', 'GET', ['orders:read']),
    true,
  );
  assert.equal(
    bearerRouteAllowed('/api/orders', 'POST', ['orders:read']),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/orders/id/checkout', 'POST', ['orders:write']),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/orders/id/checkout', 'POST', ['checkout:write']),
    true,
  );
  assert.equal(bearerRouteAllowed('/api/tokens', 'POST', ['*']), false);
  assert.equal(bearerRouteAllowed('/api/updates', 'POST', ['*']), false);
  assert.equal(
    bearerRouteAllowed('/api/unmapped', 'POST', ['orders:write']),
    false,
  );
});
void test('MCP shallow schema guard rejects unexpected fields, types and bounds', () => {
  const schema = {
    required: ['quantity'],
    properties: { quantity: { type: 'integer', minimum: 1, maximum: 99 } },
  };
  assert.equal(validateToolArguments(schema, { quantity: 1 }), null);
  for (const args of [
    [],
    null,
    {},
    { quantity: '2' },
    { quantity: 0 },
    { quantity: 100 },
    { quantity: 1, admin: true },
  ])
    assert.ok(validateToolArguments(schema, args));
});
