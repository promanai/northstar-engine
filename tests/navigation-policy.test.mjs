import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultNavigation,
  validateNavigation,
  resolveNavigation,
} from '../lib/navigation-policy.ts';
import { bearerRouteAllowed, toolAllowed } from '../lib/agent-policy.ts';
const config = () => structuredClone(defaultNavigation);
void test('navigation rejects unsafe input, extra keys and duplicate destinations', () => {
  assert.deepEqual(validateNavigation(config()), config());
  for (const change of [
    (c) => (c.menu[0].target = 'javascript:alert(1)'),
    (c) => (c.menu[0].label = ''),
    (c) => (c.menu[0].visible = 'false'),
    (c) => c.menu.push(c.menu[0]),
    (c) => (c.secret = 'no'),
    (c) => (c.menu[0].href = '//evil.test'),
    (c) => (c.tabs[0].presentation = 'modal'),
    (c) => (c.menu[0].kind = ['section']),
  ]) {
    const c = config();
    change(c);
    assert.throws(() => validateNavigation(c));
  }
});
void test('chat remains reachable and menu cannot point to disabled built-in tabs', () => {
  const c = config();
  c.tabs[0].visible = false;
  assert.throws(() => validateNavigation(c));
  c.tabs[0].visible = true;
  c.tabs[2].visible = false;
  assert.throws(() => validateNavigation(c));
  c.menu[1].visible = false;
  assert.doesNotThrow(() => validateNavigation(c));
});
void test('public navigation resolves stable page IDs without leaking hidden references', () => {
  const c = config();
  c.menu.push({
    id: 'about',
    label: 'About',
    kind: 'page',
    target: 'p1',
    visible: true,
    presentation: 'modal',
  });
  assert.equal(resolveNavigation(c, []).menu.length, 3);
  assert.equal(
    resolveNavigation(c, [{ id: 'p1', slug: '/new-address' }]).menu.at(-1).href,
    '/new-address',
  );
  c.menu.at(-1).visible = false;
  assert.equal(
    resolveNavigation(c, [{ id: 'p1', slug: '/new-address' }]).menu.length,
    3,
  );
});
void test('navigation scopes never grant customers site administration', () => {
  assert.equal(
    bearerRouteAllowed('/api/navigation', 'PUT', ['site:read']),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/navigation', 'GET', ['site:read']),
    true,
  );
  assert.equal(
    toolAllowed('owner', ['site:write'], 'navigation_restore'),
    false,
  );
  assert.equal(
    toolAllowed('owner', ['site:read', 'site:write'], 'navigation_restore'),
    true,
  );
  assert.equal(toolAllowed('customer', ['*'], 'navigation_update'), false);
});
