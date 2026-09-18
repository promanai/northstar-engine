// Real built Worker + isolated D1. Telegram is intercepted in-process; no network or owner data.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { setTimeout as delay } from 'node:timers/promises';
const root = process.cwd(),
  state = await mkdtemp(path.join(root, '.test-state-booking-notifications-'));
const databaseId = '00000000-0000-4000-8000-000000000019';
const configPath = path.join(state, 'wrangler.json');
await writeFile(
  configPath,
  JSON.stringify({
    name: 'synthetic-booking-notifications',
    compatibility_date: '2026-05-15',
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'synthetic',
        database_id: databaseId,
        migrations_dir: path.join(root, 'drizzle'),
      },
    ],
  }),
);
const migration = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    configPath,
    '--persist-to',
    state,
  ],
  {
    cwd: root,
    windowsHide: true,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  },
);
assert.equal(migration.status, 0, migration.stdout + migration.stderr);
const moduleRoot = path.join(root, 'dist/server');
const names = [
  'index.js',
  ...(await readdir(moduleRoot, { recursive: true })).filter(
    (n) => /\.(m?js)$/.test(n) && n !== 'index.js',
  ),
];
let runtime,
  db,
  mode = 'ok',
  outboundCount = 0;
const requests = [],
  checks = [],
  transportErrors = [];
async function start(enabled, paymentProvider = '') {
  runtime = new Miniflare({
    modulesRoot: moduleRoot,
    modules: names.map((name) => ({
      type: 'ESModule',
      path: path.join(moduleRoot, name),
    })),
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: { DB: databaseId },
    d1Persist: path.join(state, 'v3/d1'),
    bindings: {
      ENGINE_MODE: 'standard',
      SITE_PRESET: 'oravera',
      INITIAL_ADMIN_TOKEN: 'synthetic-notification-owner-code',
      AI_PAID_REQUESTS_ENABLED: 'false',
      BOOKING_TELEGRAM_ENABLED: String(enabled),
      TELEGRAM_BOT_TOKEN: '123456:synthetic_only_not_a_real_secret_123',
      TELEGRAM_CHAT_ID: '-123456789',
      PUBLIC_SITE_URL: 'https://clinic.example',
      PAYMENT_PROVIDER: paymentProvider,
      PAYMENT_PROVIDER_URL:
        paymentProvider === 'custom' ? 'https://payments.example/checkout' : '',
      STRIPE_SECRET_KEY:
        paymentProvider === 'stripe' ? 'sk_test_synthetic_not_real' : '',
    },
    outboundService: async (request) => {
      outboundCount++;
      try {
        if (
          ['https://api.stripe.com', 'https://payments.example'].includes(
            new URL(request.url).origin,
          )
        ) {
          assert.ok(request.headers.get('idempotency-key'));
          if (mode === 'redirect')
            return new Response(null, {
              status: 302,
              headers: { location: 'https://unexpected.example/' },
            });
          return Response.json(
            new URL(request.url).origin === 'https://api.stripe.com'
              ? {
                  id: 'cs_synthetic',
                  url: 'https://checkout.stripe.com/c/pay/synthetic',
                }
              : {
                  paymentUrl: 'https://payments.example/pay/synthetic',
                  providerPaymentId: 'synthetic',
                },
          );
        }
        assert.equal(new URL(request.url).origin, 'https://api.telegram.org');
        assert.ok(new URL(request.url).pathname.endsWith('/sendMessage'));
        const body = await request.json();
        assert.doesNotMatch(
          JSON.stringify(body),
          /synthetic-owner|example.invalid|PRIVATE|synthetic_only_not/,
        );
        assert.equal(body.allow_paid_broadcast, false);
        requests.push(body);
        if (mode === 'rate')
          return Response.json(
            { ok: false, error_code: 429, parameters: { retry_after: 120 } },
            { status: 429 },
          );
        if (mode === 'fail')
          return Response.json({ ok: false, error_code: 403 }, { status: 403 });
        if (mode === 'uncertain')
          return Response.json({ ok: false }, { status: 502 });
        return Response.json({
          ok: true,
          result: { message_id: requests.length },
        });
      } catch (error) {
        transportErrors.push(error.name + ': ' + error.message);
        throw error;
      }
    },
  });
  await runtime.ready;
  db = await runtime.getD1Database('DB');
}
async function stop() {
  await runtime?.dispose();
  runtime = undefined;
}
async function call(route, body, cookie = '', extra = {}) {
  const r = await runtime.dispatchFetch('http://notifications.test' + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      origin: 'http://notifications.test',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  return {
    status: r.status,
    headers: r.headers,
    text,
    json: () => JSON.parse(text),
  };
}
async function check(name, action) {
  await db.prepare('DELETE FROM rate_limits').run();
  await action();
  checks.push(name);
  console.log('PASS notifications: ' + name);
}
let ownerCookie, bookingId;
const processQueue = () =>
  call(
    '/api/booking-activity',
    { action: 'process', confirm: true },
    ownerCookie,
  );
const row = (id) =>
  db
    .prepare('SELECT * FROM booking_notifications WHERE event_id=?')
    .bind(id)
    .first();
let revision = 0;
async function event(id) {
  await db
    .prepare(
      "INSERT INTO booking_events (id,booking_id,actor_id,action,revision,created_at) VALUES (?,?,?,'reschedule',?,?)",
    )
    .bind(id, bookingId, 'synthetic', ++revision, Math.floor(Date.now() / 1000))
    .run();
}
try {
  await start(false);
  const register = await call('/api/auth/register', {
    email: 'synthetic-owner@example.invalid',
    password: 'Synthetic-test-password-123',
    setupToken: 'synthetic-notification-owner-code',
  });
  assert.equal(register.status, 201, register.text);
  ownerCookie = register.headers.get('set-cookie').split(';')[0];
  const product = (
    await call(
      '/api/products',
      {
        title: 'PRIVATE SERVICE',
        slug: 'synthetic',
        kind: 'service',
        shortDescription: 'Test only',
        price: 0,
        currency: 'USD',
        active: true,
      },
      ownerCookie,
    )
  ).json().product;
  const resource = (
    await call(
      '/api/booking-slots',
      {
        action: 'create_resource',
        name: 'PRIVATE RESOURCE',
        timeZone: 'America/New_York',
      },
      ownerCookie,
    )
  ).json();
  const at = Date.now() + 86400000;
  const slot = (
    await call(
      '/api/booking-slots',
      {
        action: 'create_slot',
        resourceId: resource.id,
        productId: product.id,
        startsAt: new Date(at).toISOString(),
        endsAt: new Date(at + 1800000).toISOString(),
      },
      ownerCookie,
    )
  ).json();
  const booking = await call(
    '/api/bookings',
    { slotId: slot.id, customerNote: 'PRIVATE NOTE' },
    ownerCookie,
    { 'idempotency-key': crypto.randomUUID() },
  );
  assert.equal(booking.status, 201, booking.text);
  bookingId = booking.json().booking.id;
  const eventId = (
    await db
      .prepare('SELECT id FROM booking_events WHERE booking_id=?')
      .bind(bookingId)
      .first()
  ).id;
  await check(
    'event and outbox persist atomically; disabled Telegram never sends',
    async () => {
      assert.equal((await row(eventId)).status, 'pending');
      assert.equal((await processQueue()).json().configured, false);
      assert.equal(requests.length, 0);
      await assert.rejects(
        db.batch([
          db
            .prepare(
              "INSERT INTO booking_events (id,booking_id,actor_id,action,revision,created_at) VALUES ('rollback',?,'synthetic','cancel',99,1)",
            )
            .bind(bookingId),
          db.prepare('INSERT INTO table_that_does_not_exist VALUES (1)'),
        ]),
      );
      assert.equal(await row('rollback'), null);
    },
  );
  await stop();
  await start(true);
  await check(
    'restart retains queue; parallel processing claims each event once',
    async () => {
      const responses = await Promise.all([processQueue(), processQueue()]);
      assert.ok(
        responses.every(
          (r) => r.status === 200 && r.json().configured === true,
        ),
        responses.map((r) => r.text).join('\n'),
      );
      assert.equal(
        requests.length,
        1,
        JSON.stringify({
          outboundCount,
          transportErrors,
          responses: responses.map((r) => r.json()),
          row: await row(eventId),
        }),
      );
      assert.equal((await row(eventId)).status, 'sent');
      assert.equal((await row(eventId)).attempts, 1);
      await processQueue();
      assert.equal(requests.length, 1);
    },
  );
  await check(
    'confirmed rate limit respects retry time and bounded attempts',
    async () => {
      await event('rate-event');
      mode = 'rate';
      await processQueue();
      const pending = await row('rate-event');
      assert.equal(pending.status, 'pending');
      assert.ok(pending.next_attempt_at >= Math.floor(Date.now() / 1000) + 100);
      const count = requests.length;
      await processQueue();
      assert.equal(requests.length, count);
      await db
        .prepare(
          "UPDATE booking_notifications SET next_attempt_at=0 WHERE event_id='rate-event'",
        )
        .run();
      mode = 'ok';
      await processQueue();
      assert.equal((await row('rate-event')).status, 'sent');
    },
  );
  await check('a committed booking automatically dispatches its event in the background', async () => {
    mode = 'ok';
    const nextSlot = (await call('/api/booking-slots', { action: 'create_slot', resourceId: resource.id, productId: product.id, startsAt: new Date(at + 10800000).toISOString(), endsAt: new Date(at + 12600000).toISOString() }, ownerCookie)).json();
    const created = await call('/api/bookings', { slotId: nextSlot.id }, ownerCookie, { 'idempotency-key': crypto.randomUUID() });
    assert.equal(created.status, 201, created.text);
    const id = (await db.prepare('SELECT id FROM booking_events WHERE booking_id=?').bind(created.json().booking.id).first()).id;
    for (let i = 0; i < 60 && (await row(id)).status !== 'sent'; i++) await delay(50);
    assert.equal((await row(id)).status, 'sent');
    assert.equal((await row(id)).attempts, 1);
  });
  await check(
    'ambiguous delivery stays uncertain until explicit duplicate-risk confirmation',
    async () => {
      await event('uncertain-event');
      mode = 'uncertain';
      await processQueue();
      assert.equal((await row('uncertain-event')).status, 'uncertain');
      const count = requests.length;
      await processQueue();
      assert.equal(requests.length, count);
      assert.equal(
        (
          await call(
            '/api/booking-activity',
            { action: 'retry', eventId: 'uncertain-event', confirm: true },
            ownerCookie,
          )
        ).status,
        400,
      );
      mode = 'ok';
      const retry = await call(
        '/api/booking-activity',
        {
          action: 'retry',
          eventId: 'uncertain-event',
          confirm: true,
          confirmDuplicateRisk: true,
        },
        ownerCookie,
      );
      assert.equal(retry.status, 200, retry.text);
      assert.equal((await row('uncertain-event')).status, 'sent');
    },
  );
  await check(
    'worker interruption is not silently retried; permanent rejection stays failed',
    async () => {
      await event('interrupted-event');
      await db
        .prepare(
          "UPDATE booking_notifications SET status='sending', lease_id='old', lease_until=1 WHERE event_id='interrupted-event'",
        )
        .run();
      const count = requests.length;
      await processQueue();
      assert.equal(requests.length, count);
      assert.equal((await row('interrupted-event')).status, 'uncertain');
      await event('rejected-event');
      mode = 'fail';
      await processQueue();
      assert.equal((await row('rejected-event')).status, 'failed');
    },
  );
  await check(
    'activity is paginated, same-origin protected, and never exposes secrets or patient details',
    async () => {
      for (let i = 0; i < 55; i++) await event(`pagination-${i}`);
      const first = await call(
        '/api/booking-activity?period=24h',
        undefined,
        ownerCookie,
      );
      assert.equal(first.json().events.length, 50);
      assert.ok(first.json().next);
      const second = (
        await call(
          '/api/booking-activity?period=24h&before=' +
            encodeURIComponent(first.json().next),
          undefined,
          ownerCookie,
        )
      ).json();
      assert.ok(second.events.length > 0);
      assert.ok(
        second.events.every(
          (e) => !first.json().events.some((p) => p.id === e.id),
        ),
      );
      assert.doesNotMatch(
        first.text + JSON.stringify(second),
        /PRIVATE|synthetic_only_not|TELEGRAM_BOT_TOKEN|example.invalid/,
      );
      assert.equal(
        (
          await call(
            '/api/booking-activity',
            { action: 'process', confirm: true },
            ownerCookie,
            { origin: 'https://foreign.example' },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/booking-activity',
            { action: 'process', confirm: true },
            ownerCookie,
            { authorization: 'Bearer synthetic' },
          )
        ).status,
        403,
      );
    },
  );
  for (const provider of ['stripe', 'custom']) {
    await stop();
    await start(false, provider);
    mode = 'ok';
    await check(
      `${provider} booking checkout works on Workers and refuses redirects without marking payment paid`,
      async () => {
        const paidProduct = (
          await call(
            '/api/products',
            {
              title: 'Synthetic paid service',
              slug: 'paid-' + provider,
              kind: 'service',
              shortDescription: 'Test',
              price: 1000,
              currency: 'USD',
              active: true,
            },
            ownerCookie,
          )
        ).json().product;
        const offset = provider === 'stripe' ? 3600000 : 7200000;
        const paidSlot = (
          await call(
            '/api/booking-slots',
            {
              action: 'create_slot',
              resourceId: resource.id,
              productId: paidProduct.id,
              startsAt: new Date(at + offset).toISOString(),
              endsAt: new Date(at + offset + 1800000).toISOString(),
            },
            ownerCookie,
          )
        ).json();
        const reserved = (
          await call('/api/bookings', { slotId: paidSlot.id }, ownerCookie, {
            'idempotency-key': crypto.randomUUID(),
          })
        ).json().booking;
        const checkout = await call(
          `/api/bookings/${reserved.id}/checkout`,
          {},
          ownerCookie,
        );
        assert.equal(checkout.status, 200, checkout.text);
        assert.match(checkout.json().payment.paymentUrl, /^https:/);
        assert.equal(checkout.json().booking.paymentStatus, 'pending');
        const calls = outboundCount;
        await call(`/api/bookings/${reserved.id}/checkout`, {}, ownerCookie);
        assert.equal(
          outboundCount,
          calls,
          'cached intent should not request a second link',
        );
        await db
          .prepare(
            'UPDATE booking_payment_intents SET payment_url=NULL WHERE booking_id=?',
          )
          .bind(reserved.id)
          .run();
        mode = 'redirect';
        const rejected = await call(
          `/api/bookings/${reserved.id}/checkout`,
          {},
          ownerCookie,
        );
        assert.ok([409, 502].includes(rejected.status), rejected.text);
        assert.equal(outboundCount, calls + 1, 'redirect must not be followed');
      },
    );
  }
} finally {
  await stop();
  await writeFile(
    path.join(state, 'notifications-report.json'),
    JSON.stringify(
      {
        checks,
        interceptedTelegramCalls: requests.length,
        realExternalRequests: 0,
      },
      null,
      2,
    ),
  );
  console.log('Notification report: ' + state);
}
