import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdministrator, canManagePages } from '../lib/access-policy.ts';
import { bearerRouteAllowed, toolAllowed } from '../lib/agent-policy.ts';

void test('unknown roles never inherit page administration', () => {
  for (const role of [
    'customer',
    'editor',
    '',
    'superadmin',
    null,
    undefined,
  ]) {
    assert.equal(isAdministrator(role), false);
    assert.equal(canManagePages({ id: 'u', role }, 'write'), false);
  }
  assert.equal(canManagePages(null, 'read'), false);
  assert.equal(canManagePages({ id: 'u', role: 'owner' }, 'write'), true);
});
void test('page history and restore require explicit agent permissions', () => {
  const actor = {
    id: 'u',
    role: 'admin',
    tokenId: 't',
    scopes: ['pages:read'],
  };
  assert.equal(canManagePages(actor, 'read'), true);
  assert.equal(canManagePages(actor, 'write'), false);
  assert.equal(
    bearerRouteAllowed('/api/pages/p/history', 'GET', actor.scopes),
    true,
  );
  assert.equal(
    bearerRouteAllowed('/api/pages/p/restore', 'POST', actor.scopes),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/pages/p/restore', 'POST', ['pages:write']),
    false,
  );
  assert.equal(toolAllowed('admin', ['pages:write'], 'restore_page'), false);
  assert.equal(
    toolAllowed('admin', ['pages:read', 'pages:write'], 'restore_page'),
    true,
  );
  assert.equal(toolAllowed('customer', ['*'], 'page_history'), false);
});
