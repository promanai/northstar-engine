import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedTransition,
  isOwner,
  paymentLink,
} from '../lib/commerce-policy.ts';

void test('order lifecycle permits only forward transitions', () => {
  assert.ok(allowedTransition('pending', 'paid'));
  assert.ok(allowedTransition('pending', 'cancelled'));
  assert.ok(allowedTransition('paid', 'refunded'));
  for (const pair of [
    ['pending', 'refunded'],
    ['paid', 'pending'],
    ['paid', 'cancelled'],
    ['refunded', 'paid'],
    ['cancelled', 'pending'],
    ['paid', 'paid'],
  ])
    assert.equal(allowedTransition(...pair), false);
});
void test('payment links require HTTPS and no URL credentials', () => {
  assert.equal(paymentLink('javascript:alert(1)'), null);
  assert.equal(paymentLink('http://payments.example.test'), null);
  assert.equal(
    paymentLink('https://user:password@payments.example.test'),
    null,
  );
  assert.equal(paymentLink('//payments.example.test'), null);
  assert.equal(
    paymentLink('https://payments.example.test/checkout?id=123'),
    'https://payments.example.test/checkout?id=123',
  );
});
void test('commerce admin role is explicit, not any non-customer value', () => {
  assert.equal(isOwner(null), false);
  assert.equal(isOwner({ role: 'customer' }), false);
  assert.equal(isOwner({ role: 'unexpected' }), false);
  assert.equal(isOwner({ role: 'admin' }), true);
  assert.equal(isOwner({ role: 'owner' }), true);
});
import {
  canAccessConversation,
  catalogPrice,
  digest,
  mutationProblem,
  readCookie,
  textValue,
} from '../lib/security-policy.ts';

const now = new Date('2026-09-08T12:00:00Z');
const registered = {
  customerId: 'alice',
  guestTokenHash: null,
  guestExpiresAt: null,
};
const guest = {
  customerId: null,
  guestTokenHash: 'hash',
  guestExpiresAt: new Date(now.getTime() + 1000),
};
void test('private conversation: only its owner or an explicit admin role', () => {
  assert.equal(canAccessConversation(registered, null, null, now), false);
  assert.equal(
    canAccessConversation(
      registered,
      { id: 'bob', role: 'customer' },
      null,
      now,
    ),
    false,
  );
  assert.equal(
    canAccessConversation(
      registered,
      { id: 'alice', role: 'customer' },
      null,
      now,
    ),
    true,
  );
  assert.equal(
    canAccessConversation(
      registered,
      { id: 'admin', role: 'admin' },
      null,
      now,
    ),
    true,
  );
  assert.equal(
    canAccessConversation(registered, { id: 'x', role: 'unknown' }, null, now),
    false,
  );
});
void test('guest conversation requires matching unexpired secret, not a conversation id', () => {
  assert.equal(canAccessConversation(guest, null, null, now), false);
  assert.equal(canAccessConversation(guest, null, 'wrong', now), false);
  assert.equal(canAccessConversation(guest, null, 'hash', now), true);
  assert.equal(
    canAccessConversation(guest, null, 'hash', guest.guestExpiresAt),
    false,
  );
  assert.equal(
    canAccessConversation(
      { ...guest, guestTokenHash: null },
      null,
      'hash',
      now,
    ),
    false,
  );
  assert.equal(
    canAccessConversation(
      { ...guest, guestExpiresAt: null },
      null,
      'hash',
      now,
    ),
    false,
  );
});
void test('same-origin JSON allowed, foreign and null origins rejected', () => {
  const request = (headers) =>
    new Request('https://shop.test/api/chat', { method: 'POST', headers });
  assert.equal(
    mutationProblem(
      request({
        origin: 'https://shop.test',
        'content-type': 'application/json',
      }),
    ),
    null,
  );
  assert.equal(
    mutationProblem(
      request({ 'content-type': 'application/json; charset=utf-8' }),
    ),
    null,
  );
  assert.ok(
    mutationProblem(
      request({
        origin: 'https://evil.test',
        'content-type': 'application/json',
      }),
    ),
  );
  assert.ok(
    mutationProblem(
      request({ origin: 'null', 'content-type': 'application/json' }),
    ),
  );
  assert.ok(
    mutationProblem(
      request({
        'sec-fetch-site': 'cross-site',
        'content-type': 'application/json',
      }),
    ),
  );
  assert.ok(mutationProblem(request({ 'content-type': 'text/plain' })));
});
void test('input types and bounds reject malformed values', () => {
  for (const value of [
    null,
    12,
    {},
    [],
    undefined,
    ' '.repeat(3),
    'a'.repeat(8001),
  ])
    assert.equal(textValue(value, 8000, true), false);
  assert.equal(textValue('a'.repeat(8000), 8000, true), true);
});
void test('minor currency units are converted exactly once', () => {
  assert.equal(catalogPrice(490000, 'RUB'), '4900.00 RUB');
  assert.equal(catalogPrice(199, 'USD'), '1.99 USD');
  assert.equal(catalogPrice(0, 'EUR'), '0.00 EUR');
});
void test('cookie parsing is exact and hashes are stable', async () => {
  assert.equal(
    readCookie(
      new Request('https://shop.test', {
        headers: { cookie: 'other_northstar_guest=no; northstar_guest=yes' },
      }),
      'northstar_guest',
    ),
    'yes',
  );
  assert.equal((await digest('secret')).length, 64);
  assert.equal(await digest('secret'), await digest('secret'));
  assert.notEqual(await digest('secret'), await digest('different'));
});
