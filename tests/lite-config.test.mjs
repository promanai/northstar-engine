import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLiteConfig } from '../scripts/lite-config.mjs';
const site = JSON.parse(
  readFileSync(new URL('../site.config.json', import.meta.url)),
);
void test('Lite config rejects credentials, executable background and reserved pages', () => {
  assert.equal(validateLiteConfig(site), site);
  assert.throws(() => validateLiteConfig({ ...site, apiKey: 'never-public' }));
  assert.throws(() =>
    validateLiteConfig({ ...site, backgroundImage: 'javascript:alert(1)' }),
  );
  assert.throws(() =>
    validateLiteConfig({
      ...site,
      pages: [{ ...site.pages[0], slug: '/api/chat' }],
    }),
  );
});
void test('Lite catalog validates price and rejects internal fields or duplicate slugs', () => {
  const product = {
    id: 'sample',
    slug: 'sample',
    title: 'Sample',
    kind: 'service',
    shortDescription: '',
    description: '',
    price: 1000,
    currency: 'USD',
  };
  assert.equal(
    validateLiteConfig({ ...site, products: [product] }).products.length,
    1,
  );
  assert.throws(() =>
    validateLiteConfig({ ...site, products: [{ ...product, price: -1 }] }),
  );
  assert.throws(() =>
    validateLiteConfig({
      ...site,
      products: [{ ...product, aiInstructions: 'private' }],
    }),
  );
  assert.throws(() =>
    validateLiteConfig({ ...site, products: [product, product] }),
  );
});
