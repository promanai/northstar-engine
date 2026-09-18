import test from 'node:test';
import assert from 'node:assert/strict';
import {
  telegramConfiguration,
  sendBookingTelegram,
} from '../lib/booking-telegram-policy.ts';
import { bookingExpectation } from '../lib/booking-policy.ts';
import { bearerRouteAllowed, toolAllowed } from '../lib/agent-policy.ts';
const vars = {
  BOOKING_TELEGRAM_ENABLED: 'true',
  TELEGRAM_BOT_TOKEN: '123456:synthetic_not_a_real_secret_123456',
  TELEGRAM_CHAT_ID: '-1234567',
  PUBLIC_SITE_URL: 'https://clinic.example',
};
const config = telegramConfiguration(vars);
test('Telegram is opt-in, numeric destination and trusted HTTPS origin only', () => {
  assert.ok(config);
  for (const bad of [
    { BOOKING_TELEGRAM_ENABLED: 'false' },
    { TELEGRAM_CHAT_ID: '@public-channel' },
    { TELEGRAM_BOT_TOKEN: 'x' },
    { PUBLIC_SITE_URL: 'http://clinic.example' },
    { PUBLIC_SITE_URL: 'https://user:pass@clinic.example' },
    { PUBLIC_SITE_URL: 'https://example.com' },
    { PUBLIC_SITE_URL: 'https://clinic.example/?secret=x' },
  ])
    assert.equal(telegramConfiguration({ ...vars, ...bad }), null);
});
test('Telegram payload excludes patient data, uses fixed host and disables paid broadcasting', async () => {
  const result = await sendBookingTelegram(
    config,
    {
      id: 'event-1',
      bookingId: 'booking-1',
      action: 'created',
      revision: 0,
      patient: 'PRIVATE-PATIENT',
      customerNote: 'PRIVATE-NOTE',
    },
    async (url, init) => {
      assert.equal(
        url,
        `https://api.telegram.org/bot${vars.TELEGRAM_BOT_TOKEN}/sendMessage`,
      );
      const body = JSON.parse(init.body);
      assert.equal(init.redirect, 'manual');
      assert.equal(body.allow_paid_broadcast, false);
      assert.equal(body.protect_content, true);
      assert.equal(body.link_preview_options.is_disabled, true);
      assert.doesNotMatch(init.body, /PRIVATE|synthetic_not|parse_mode/);
      assert.match(body.text, /https:\/\/clinic.example\/admin#bookings/);
      return Response.json({ ok: true, result: { message_id: 25 } });
    },
  );
  assert.deepEqual(result, { status: 'sent', messageId: 25 });
});
test('Telegram confirmed rate limit retries, rejected and uncertain sends do not automatically resend', async () => {
  const event = { id: 'e', bookingId: 'b', action: 'cancel', revision: 1 };
  assert.equal(
    (
      await sendBookingTelegram(config, event, async () =>
        Response.json(
          { ok: false, parameters: { retry_after: 120 } },
          { status: 429 },
        ),
      )
    ).retryAfter,
    120,
  );
  assert.equal(
    (
      await sendBookingTelegram(config, event, async () =>
        Response.json({ ok: false }, { status: 403 }),
      )
    ).status,
    'failed',
  );
  for (const transport of [
    async () => {
      throw new Error('token secret');
    },
    async () => new Response('bad', { status: 502 }),
    async () => Response.json({ ok: true }),
  ]) {
    const outcome = await sendBookingTelegram(config, event, transport);
    assert.deepEqual(outcome, {
      status: 'uncertain',
      error: 'telegram_unconfirmed',
    });
  }
});
test('reviewed booking expectations require all fields; old clients stay compatible', () => {
  assert.equal(bookingExpectation({}), null);
  assert.deepEqual(
    bookingExpectation({
      expectedPrice: 0,
      expectedCurrency: 'USD',
      expectedSlotRevision: 2,
    }),
    { price: 0, currency: 'USD', revision: 2 },
  );
  for (const bad of [
    { expectedPrice: 1 },
    { expectedPrice: -1, expectedCurrency: 'USD', expectedSlotRevision: 0 },
    { expectedPrice: 1, expectedCurrency: 'usd', expectedSlotRevision: 0 },
    { expectedPrice: 1, expectedCurrency: 'USD', expectedSlotRevision: 0.1 },
  ])
    assert.throws(() => bookingExpectation(bad));
});
test('booking checkout REST/MCP scopes agree; clinic activity is not a patient tool', () => {
  assert.equal(
    bearerRouteAllowed('/api/bookings/b/checkout', 'POST', ['bookings:write']),
    true,
  );
  assert.equal(
    bearerRouteAllowed('/api/bookings/b/checkout', 'GET', ['bookings:write']),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/bookings/b/checkout', 'POST', ['bookings:read']),
    false,
  );
  assert.equal(
    toolAllowed('customer', ['bookings:read'], 'list_booking_activity'),
    false,
  );
  assert.equal(
    toolAllowed('admin', ['bookings:read'], 'list_booking_activity'),
    true,
  );
});
