import test from 'node:test';
import assert from 'node:assert/strict';
import { StripeSignatureError, verifyStripeSignature } from '../lib/stripe-policy.ts';

async function signature(payload, secret, timestamp) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return `t=${timestamp},v1=${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

void test('Stripe webhook signature accepts exact raw body and rejects tampering', async () => {
  const payload = JSON.stringify({ id: 'evt_fixture', type: 'checkout.session.completed', data: { object: {} } });
  const timestamp = 1_800_000_000;
  const header = await signature(payload, 'whsec_fixture', timestamp);
  assert.deepEqual(await verifyStripeSignature(payload, header, 'whsec_fixture', timestamp), JSON.parse(payload));
  await assert.rejects(verifyStripeSignature(`${payload} `, header, 'whsec_fixture', timestamp), StripeSignatureError);
});

void test('Stripe webhook signature rejects stale timestamps and wrong secrets', async () => {
  const payload = JSON.stringify({ id: 'evt_fixture', type: 'ignored', data: { object: {} } });
  const header = await signature(payload, 'whsec_fixture', 1_800_000_000);
  await assert.rejects(verifyStripeSignature(payload, header, 'wrong', 1_800_000_000), StripeSignatureError);
  await assert.rejects(verifyStripeSignature(payload, header, 'whsec_fixture', 1_800_000_301), StripeSignatureError);
});

void test('Stripe webhook signature rejects malformed events', async () => {
  const payload = JSON.stringify({ id: 'evt_fixture' });
  const timestamp = 1_800_000_000;
  await assert.rejects(verifyStripeSignature(payload, await signature(payload, 'whsec_fixture', timestamp), 'whsec_fixture', timestamp), StripeSignatureError);
});
