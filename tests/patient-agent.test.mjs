import test from 'node:test';
import assert from 'node:assert/strict';
import { patientAgentInput } from '../lib/patient-agent-policy.ts';
import { toolAllowed, bearerRouteAllowed } from '../lib/agent-policy.ts';
import { blocksToMarkdown } from '../lib/markdown.ts';

test('patient presets are explicit, bounded and cannot request elevated privileges', () => {
  const base = {
    name: ' My agent ',
    access: 'read',
    expiresInDays: 7,
    confirm: true,
  };
  assert.deepEqual(patientAgentInput(base), {
    name: 'My agent',
    days: 7,
    scopes: ['content:read', 'catalog:read', 'bookings:read'],
  });
  assert.deepEqual(patientAgentInput({ ...base, access: 'book' }).scopes, [
    'content:read',
    'catalog:read',
    'bookings:read',
    'bookings:write',
  ]);
  for (const change of [
    { confirm: false },
    { scopes: ['*'] },
    { role: 'owner' },
    { audience: 'account' },
    { access: 'admin' },
    { expiresInDays: 0 },
    { expiresInDays: 31 },
    { expiresInDays: 1.5 },
    { expiresInDays: '7' },
    { name: '' },
  ])
    assert.throws(() => patientAgentInput({ ...base, ...change }));
});
test('public content scope and patient booking scope never grant administration or token minting', () => {
  const scopes = patientAgentInput({
    name: 'Agent',
    access: 'book',
    expiresInDays: 1,
    confirm: true,
  }).scopes;
  for (const tool of [
    'get_page_markdown',
    'list_bookings',
    'create_booking',
    'update_booking',
    'checkout_booking',
  ])
    assert.equal(toolAllowed('customer', scopes, tool), true, tool);
  for (const tool of [
    'list_customers',
    'list_pages',
    'upsert_page',
    'site_config_update',
    'create_booking_slot',
    'list_files',
  ])
    assert.equal(toolAllowed('customer', scopes, tool), false, tool);
  assert.equal(toolAllowed('owner', ['pages:read'], 'get_page_markdown'), true);
  assert.equal(
    toolAllowed('customer', ['pages:read'], 'get_page_markdown'),
    false,
  );
  for (const route of ['/api/tokens', '/api/patient-agent'])
    assert.equal(bearerRouteAllowed(route, 'POST', ['*']), false);
});
test('Markdown serializes visible PageBlocks fields only', () => {
  const text = blocksToMarkdown([
    'Plain',
    { type: 'heading', text: 'Heading', secret: 'SECRET' },
    { type: 'list', content: 'List', metadata: { private: 'SECRET' } },
    { type: 'cta', text: 'Open', href: '/about' },
    { type: 'paragraph', private: 'SECRET' },
    null,
    ['SECRET'],
  ]);
  assert.match(text, /## Heading/);
  assert.match(text, /- List/);
  assert.match(text, /\[Open\]\(\/about\)/);
  assert.doesNotMatch(text, /SECRET|metadata|private/);
});
