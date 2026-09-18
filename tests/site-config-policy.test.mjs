import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSiteConfig,
  validateSiteConfig,
  importLegacySiteConfig,
  legacySiteSettings,
} from '../lib/site-config-policy.ts';
import { toolAllowed } from '../lib/agent-policy.ts';
void test('site configuration has strict fields, lengths and theme/locale enums', () => {
  assert.deepEqual(validateSiteConfig(defaultSiteConfig), defaultSiteConfig);
  assert.equal(
    validateSiteConfig({ ...defaultSiteConfig, name: ' Example ' }).name,
    'Example',
  );
  for (const patch of [
    { name: '' },
    { name: 'a'.repeat(101) },
    { name: 'a\nb' },
    { description: 'a'.repeat(321) },
    { locale: 'xx' },
    { theme: ['ocean'] },
    { secret: 'private' },
    { description: null },
  ])
    assert.throws(() => validateSiteConfig({ ...defaultSiteConfig, ...patch }));
});
void test('background accepts only local paths or HTTPS without credentials and control characters', () => {
  for (const backgroundImage of [
    '',
    '/images/a.jpg',
    'https://example.com/a.jpg?size=2',
  ])
    assert.equal(
      validateSiteConfig({ ...defaultSiteConfig, backgroundImage })
        .backgroundImage,
      backgroundImage,
    );
  for (const backgroundImage of [
    '//evil.test/a',
    '/\\evil.test/a',
    'javascript:alert(1)',
    'data:image/png,x',
    'http://example.com/a',
    'https://user:pass@example.com/a',
    'https://example.com/\na',
    'relative.png',
    'https://',
  ])
    assert.throws(() =>
      validateSiteConfig({ ...defaultSiteConfig, backgroundImage }),
    );
});
void test('legacy import preserves known settings, warns about invalid fields, never exposes extensions', () => {
  const value = {
    ...defaultSiteConfig,
    name: 'Legacy',
    theme: 'ocean',
    locale: 'en',
  };
  assert.deepEqual(importLegacySiteConfig(legacySiteSettings(value)), {
    value,
    warnings: [],
  });
  const imported = importLegacySiteConfig([
    { key: 'public.siteName', value: { text: 'Owner' } },
    { key: 'public.backgroundImage', value: { url: 'javascript:bad' } },
    { key: 'public.apiKey', value: { text: 'secret' } },
  ]);
  assert.equal(imported.value.name, 'Owner');
  assert.equal(imported.warnings.length, 1);
  assert.ok(!JSON.stringify(imported).includes('secret'));
});
void test('site configuration MCP scopes separate reads, writes and restoration', () => {
  assert.equal(toolAllowed('owner', ['site:read'], 'site_config_get'), true);
  assert.equal(
    toolAllowed('owner', ['site:read'], 'site_config_update'),
    false,
  );
  assert.equal(
    toolAllowed('owner', ['site:write'], 'site_config_restore'),
    false,
  );
  assert.equal(
    toolAllowed('owner', ['site:read', 'site:write'], 'site_config_restore'),
    true,
  );
  assert.equal(toolAllowed('customer', ['*'], 'site_config_update'), false);
});
