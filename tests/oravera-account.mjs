// Real local D1/auth/booking APIs; synthetic accounts only, no R2 or external AI.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { localizationBrowserTests } from './localization-browser.mjs';
import {
  patientAgentTests,
  patientAgentBrowserTests,
} from './patient-agent-integration.mjs';
const root = process.cwd();
const state = await mkdtemp(path.join(root, '.test-state-oravera-account-'));
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const config = path.join(root, 'deployment/oravera.standard.local.json');
const args = ['--config', config, '--persist-to', state];
const options = {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
};
const migration = spawnSync(
  process.execPath,
  [cli, 'd1', 'migrations', 'apply', 'DB', '--local', ...args],
  { ...options, encoding: 'utf8' },
);
assert.equal(migration.status, 0, migration.stdout + migration.stderr);
const socket = createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const base = `http://127.0.0.1:${port}`;
let worker,
  logs = '';
const results = [];
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log('PASS patient account: ' + name);
};
async function call(route, body, cookie = '', method) {
  const response = await fetch(base + route, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      origin: base,
      ...(cookie ? { cookie } : {}),
      ...(body?.idempotencyKey
        ? { 'idempotency-key': body.idempotencyKey }
        : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    text,
    json: () => JSON.parse(text),
  };
}
async function start() {
  worker = spawn(
    process.execPath,
    [
      cli,
      'dev',
      '--local',
      ...args,
      '--port',
      String(port),
      '--inspector-port',
      '0',
      '--var',
      'INITIAL_ADMIN_TOKEN:synthetic-owner-setup-code-not-production',
      '--var',
      'LITE_HEALTH_DATA_ENABLED:true',
      '--var',
      'LITE_AI_ENABLED:true',
      '--var',
      'AI_PAID_REQUESTS_ENABLED:true',
    ],
    { ...options, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const stream of [worker.stdout, worker.stderr])
    stream.on('data', (data) => {
      logs = (logs + data).slice(-6000);
    });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call('/api/health')).status === 200) return;
    } catch {
      /* Starting. */
    }
    if (worker.exitCode !== null) throw new Error(logs);
    await delay(250);
  }
  throw new Error('Worker did not start: ' + logs);
}
async function stop() {
  if (!worker || worker.exitCode !== null) return;
  const ended = new Promise((r) => worker.once('exit', r));
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(worker.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else worker.kill('SIGTERM');
  await ended;
}
const password = 'Synthetic-local-password-123';
async function register(email, setupToken) {
  const result = await call('/api/auth/register', {
    email,
    password,
    firstName: email.split('@')[0],
    ...(setupToken ? { setupToken } : {}),
  });
  assert.equal(result.status, 201, result.text);
  return {
    ...result.json().user,
    cookie: result.headers.get('set-cookie').split(';')[0],
  };
}
let browser;
try {
  await start();
  await check(
    'Standard/D1, private page redirect, no clinical data routes even when flags are enabled',
    async () => {
      const health = (await call('/api/health')).json();
      assert.equal(health.mode, 'standard');
      assert.equal(health.storage, 'd1');
      const account = await call('/account');
      assert.equal(account.status, 307);
      assert.ok(
        account.headers.get('location').endsWith('/login?next=%2Faccount'),
      );
      assert.doesNotMatch(account.text, /My appointments/);
      assert.equal((await call('/api/bookings?mine=1')).status, 401);
      for (const route of [
        '/api/chat',
        '/api/chat/attachment',
        '/api/chat/requests',
        '/api/files',
        '/api/realtime/call',
      ])
        assert.equal(
          (await call(route, { message: 'synthetic', clinicalConsent: true }))
            .status,
          503,
          route,
        );
      const markup = await call('/');
      assert.match(markup.text, /Patient account/);
      assert.match(markup.text, /lang="en"/);
      for (const slug of [
        '/privacy',
        '/about',
        '/dental-exam',
        '/photo-guidance',
      ])
        assert.equal((await call(slug)).status, 200, slug);
      assert.match(
        (await call('/api/content?slug=/privacy')).text,
        /Before sharing information/,
      );
      assert.equal(
        (
          await call('/api/auth/register', {
            email: 'blocked@example.invalid',
            password,
          })
        ).status,
        403,
      );
    },
  );
  const owner = await register(
    'owner@example.invalid',
    'synthetic-owner-setup-code-not-production',
  );
  const alice = await register('alice@example.invalid');
  const bob = await register('bob@example.invalid');
  assert.equal(alice.role, 'customer');
  assert.equal(bob.role, 'customer');
  const productResponse = await call(
    '/api/products',
    {
      title: 'Synthetic examination',
      slug: 'synthetic-examination',
      kind: 'service',
      shortDescription: 'Synthetic test only',
      price: 0,
      currency: 'USD',
      active: true,
    },
    owner.cookie,
  );
  assert.equal(productResponse.status, 201, productResponse.text);
  const product = productResponse.json().product;
  const resource = (
    await call(
      '/api/booking-slots',
      {
        action: 'create_resource',
        name: 'Synthetic dentist',
        timeZone: 'America/New_York',
      },
      owner.cookie,
    )
  ).json();
  const at = Math.floor(Date.now() / 1000) + 3 * 86400;
  const create = async (customer, offset) => {
    const slot = (
      await call(
        '/api/booking-slots',
        {
          action: 'create_slot',
          resourceId: resource.id,
          productId: product.id,
          startsAt: new Date((at + offset) * 1000).toISOString(),
          endsAt: new Date((at + offset + 1800) * 1000).toISOString(),
        },
        owner.cookie,
      )
    ).json();
    const booking = await call(
      '/api/bookings',
      {
        slotId: slot.id,
        customerId: customer.id,
        idempotencyKey: crypto.randomUUID(),
      },
      owner.cookie,
    );
    assert.equal(booking.status, 201, booking.text);
    return booking.json().booking;
  };
  const appointment = await create(alice, 0),
    other = await create(bob, 3600),
    cancelled = await create(alice, 7200);
  const cancel = await call(
    `/api/bookings/${cancelled.id}`,
    { action: 'cancel', revision: cancelled.revision },
    owner.cookie,
    'PATCH',
  );
  assert.equal(cancel.status, 200, cancel.text);
  const pendingId = crypto.randomUUID();
  const seed = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'DB',
      '--local',
      ...args,
      '--command',
      `INSERT INTO bookings (id, customer_id, service, status, created_at, updated_at) VALUES ('${pendingId}', '${alice.id}', 'Synthetic pending request', 'pending', ${at}, ${at})`,
    ],
    { ...options, encoding: 'utf8' },
  );
  assert.equal(seed.status, 0, seed.stdout + seed.stderr);
  await check(
    'owner-created appointments are private to each patient, including detail endpoints',
    async () => {
      const mine = await call('/api/bookings?mine=1', undefined, alice.cookie);
      assert.equal(mine.headers.get('cache-control'), 'no-store');
      assert.equal(mine.json().bookings.length, 3);
      assert.ok(mine.json().bookings.every((b) => b.customerId === alice.id));
      assert.equal(
        (await call('/api/bookings', undefined, bob.cookie)).json().bookings
          .length,
        1,
      );
      assert.equal(
        (await call(`/api/bookings/${other.id}`, undefined, alice.cookie))
          .status,
        404,
      );
      assert.equal((await call('/admin', undefined, alice.cookie)).status, 403);
      const html = await call('/account', undefined, alice.cookie);
      assert.equal(html.status, 200);
      assert.match(html.headers.get('cache-control'), /no-store/);
      assert.match(html.headers.get('x-robots-tag'), /noindex/);
      assert.deepEqual(
        (await call('/api/bookings?mine=1', undefined, owner.cookie)).json()
          .bookings,
        [],
      );
    },
  );
  await patientAgentTests({
    base,
    call,
    check,
    owner,
    alice,
    bob,
    appointment,
    other,
    cancelled,
    sql: async (command) => {
      const result = spawnSync(
        process.execPath,
        [cli, 'd1', 'execute', 'DB', '--local', ...args, '--command', command],
        { ...options, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
    },
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [],
    outbound = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== base) {
      outbound.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await check(
    'real browser sign-in, future/pending/history records and mobile layout',
    async () => {
      await page.goto(base + '/login?next=https://example.invalid');
      await page
        .getByLabel('Email', { exact: true })
        .fill('alice@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(base + '/account');
      await page
        .getByText('Reference: ' + appointment.id, { exact: true })
        .waitFor();
      await page.getByText('Awaiting confirmation', { exact: true }).waitFor();
      assert.equal(
        await page.getByText('Reference: ' + other.id, { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByRole('link', { name: 'Clinic administration' }).count(),
        0,
      );
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          String(width),
        );
        await page.getByRole('tab', { name: /^History/ }).click();
        await page.getByText('Cancelled', { exact: true }).waitFor();
        await page.getByRole('tab', { name: /^Upcoming/ }).click();
        await page.getByRole('tab', { name: /^Upcoming/ }).hover();
        await page.waitForFunction(
          () => {
            const tab = document.querySelector(
              '[role="tab"][aria-selected="true"]',
            );
            if (!tab) return false;
            const style = getComputedStyle(tab);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            const luminance = (color) => {
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, 1, 1);
              const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((v) => {
                  v /= 255;
                  return v <= 0.04045
                    ? v / 12.92
                    : ((v + 0.055) / 1.055) ** 2.4;
                });
              return r * 0.2126 + g * 0.7152 + b * 0.0722;
            };
            const a = luminance(style.color),
              b = luminance(style.backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5;
          },
          null,
          { timeout: 3000 },
        );
      }
      await page.screenshot({
        path: path.join(state, 'account-desktop.png'),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join(state, 'account-mobile.png'),
        fullPage: true,
      });
      await page.addStyleTag({
        content: 'html { font-size: 200% !important; }',
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.reload();
      await page
        .getByText('Reference: ' + appointment.id, { exact: true })
        .waitFor();
    },
  );
  await localizationBrowserTests({ page, check, state, base });
  await patientAgentBrowserTests({ page, check, state });
  await check(
    'load failure is not an empty account; refresh recovers',
    async () => {
      await page.route(
        '**/api/bookings?mine=1',
        (route) =>
          route.fulfill({ status: 503, json: { error: 'synthetic failure' } }),
        { times: 1 },
      );
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.equal(
        await page
          .getByText('No upcoming appointments', { exact: true })
          .count(),
        0,
      );
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await page
        .getByText('Reference: ' + appointment.id, { exact: true })
        .waitFor();
    },
  );
  await check(
    'patient creates, reschedules and cancels with confirmation and private clinic activity',
    async () => {
      const freeSlot = async (offset) => {
        const response = await call(
          '/api/booking-slots',
          {
            action: 'create_slot',
            resourceId: resource.id,
            productId: product.id,
            startsAt: new Date((at + offset) * 1000).toISOString(),
            endsAt: new Date((at + offset + 1800) * 1000).toISOString(),
          },
          owner.cookie,
        );
        assert.equal(response.status, 200, response.text);
        return response.json().id;
      };
      const first = await freeSlot(10800),
        second = await freeSlot(14400);
      // Bind offer review in REST as well as MCP. Stale quote cannot reserve a slot.
      const stale = await call(
        '/api/bookings',
        {
          slotId: first,
          expectedPrice: 1,
          expectedCurrency: 'USD',
          expectedSlotRevision: 0,
          idempotencyKey: crypto.randomUUID(),
        },
        alice.cookie,
      );
      assert.equal(stale.status, 409, stale.text);
      const before = (
        await call('/api/bookings?mine=1', undefined, alice.cookie)
      ).json().bookings.length;
      await page
        .getByRole('button', { name: 'Book an appointment', exact: true })
        .click();
      const flow = page.getByRole('region', { name: 'Appointment booking' });
      const chooseTime = (offset) =>
        flow
          .getByRole('button', { name: /Synthetic examination/ })
          .filter({
            hasText: new Intl.DateTimeFormat('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'America/New_York',
            }).format((at + offset) * 1000),
          })
          .click();
      await chooseTime(10800);
      assert.equal(
        (await call('/api/bookings?mine=1', undefined, alice.cookie)).json()
          .bookings.length,
        before,
        'opening review is not consent',
      );
      const dialog = page.getByRole('alertdialog');
      await dialog
        .getByRole('button', { name: 'Go back', exact: true })
        .click();
      assert.equal(
        (await call('/api/bookings?mine=1', undefined, alice.cookie)).json()
          .bookings.length,
        before,
      );
      await chooseTime(10800);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const confirmButton = dialog.getByRole('button', {
        name: 'Confirm appointment',
        exact: true,
      });
      for (const hover of [false, true]) {
        if (hover) await confirmButton.hover();
        await page.waitForFunction(
          () => {
            const button = [
              ...document.querySelectorAll('[role="alertdialog"] button'),
            ].find((b) => b.textContent === 'Confirm appointment');
            if (!button) return false;
            const style = getComputedStyle(button),
              canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            const lum = (color) => {
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, 1, 1);
              const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((v) => {
                  v /= 255;
                  return v <= 0.04045
                    ? v / 12.92
                    : ((v + 0.055) / 1.055) ** 2.4;
                });
              return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const a = lum(style.color),
              b = lum(style.backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5;
          },
          null,
          { timeout: 3000 },
        );
      }
      await page.screenshot({
        path: path.join(state, 'booking-confirmation-mobile.png'),
        fullPage: true,
      });
      // Simulate an accepted write with a lost response. Retry must reuse its key.
      await page.route(
        '**/api/bookings',
        async (route) => {
          if (route.request().method() !== 'POST') return route.continue();
          await route.fetch();
          await route.abort('failed');
        },
        { times: 1 },
      );
      await dialog
        .getByRole('button', { name: 'Confirm appointment', exact: true })
        .click();
      await dialog.getByRole('alert').waitFor();
      await dialog
        .getByRole('button', { name: 'Confirm appointment', exact: true })
        .click();
      await page
        .getByRole('status')
        .filter({ hasText: /Appointment confirmed/ })
        .waitFor();
      const mine = (
        await call('/api/bookings?mine=1', undefined, alice.cookie)
      ).json().bookings;
      assert.equal(
        mine.length,
        before + 1,
        'uncertain retry did not duplicate',
      );
      const created = mine.find((b) => b.slotId === first);
      assert.ok(created);
      let card = page
        .getByRole('listitem')
        .filter({ hasText: `Reference: ${created.id}` });
      await card
        .getByRole('button', { name: 'Reschedule', exact: true })
        .click();
      await chooseTime(14400);
      await dialog
        .getByRole('button', { name: 'Confirm appointment', exact: true })
        .click();
      await page
        .getByRole('status')
        .filter({ hasText: /Appointment rescheduled/ })
        .waitFor();
      const moved = (
        await call(`/api/bookings/${created.id}`, undefined, alice.cookie)
      ).json().booking;
      assert.equal(moved.slotId, second);
      card = page
        .getByRole('listitem')
        .filter({ hasText: `Reference: ${created.id}` });
      await card
        .getByRole('button', { name: 'Cancel appointment', exact: true })
        .click();
      await dialog
        .getByRole('button', { name: 'Confirm cancellation', exact: true })
        .click();
      await page
        .getByRole('status')
        .filter({ hasText: /Appointment cancelled/ })
        .waitFor();
      const detail = (
        await call(`/api/bookings/${created.id}`, undefined, alice.cookie)
      ).json();
      assert.equal(detail.booking.status, 'cancelled');
      assert.deepEqual(
        detail.events.map((e) => e.action),
        ['created', 'reschedule', 'cancel'],
      );
      assert.equal(
        (await call('/api/booking-activity', undefined, alice.cookie)).status,
        403,
      );
      assert.equal((await call('/api/booking-activity')).status, 401);
      const feed = await call(
        '/api/booking-activity?period=24h',
        undefined,
        owner.cookie,
      );
      assert.match(feed.headers.get('cache-control'), /private.*no-store/);
      const events = feed
        .json()
        .events.filter((e) => e.bookingId === created.id);
      assert.equal(events.length, 3);
      assert.ok(
        events.every((e) => e.delivery === 'pending' && e.attempts === 0),
      );
      assert.equal(feed.json().telegram.configured, false);
      assert.equal(
        (
          await call(
            '/api/booking-activity',
            { action: 'process', confirm: true },
            alice.cookie,
          )
        ).status,
        403,
      );
      const processing = await call(
        '/api/booking-activity',
        { action: 'process', confirm: true },
        owner.cookie,
      );
      assert.equal(processing.status, 200, processing.text + '\n' + logs);
      assert.equal(processing.json().configured, false);
      assert.equal(
        (
          await call(
            '/api/booking-activity?period=forever',
            undefined,
            owner.cookie,
          )
        ).status,
        400,
      );
    },
  );
  await check(
    'MCP reserves a reviewed offer, REST checkout scopes match, paid holds are not displayed as confirmed',
    async () => {
      const tokenResponse = await call(
        '/api/tokens',
        {
          name: 'Synthetic booking agent',
          scopes: ['bookings:read', 'bookings:write'],
          expiresInDays: 1,
        },
        alice.cookie,
      );
      assert.equal(tokenResponse.status, 201, tokenResponse.text);
      const token = tokenResponse.json().token;
      assert.equal(typeof token, 'string');
      const slots = (await call('/api/booking-slots')).json().slots;
      const selected = slots[0];
      const args = {
        slotId: selected.id,
        expectedPrice: selected.price,
        expectedCurrency: selected.currency,
        expectedSlotRevision: selected.revision,
        idempotencyKey: crypto.randomUUID(),
      };
      const rpc = async (name, arguments_) => {
        const response = await fetch(base + '/api/mcp', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: base,
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name, arguments: arguments_ },
          }),
        });
        return response.json();
      };
      const result = await rpc('create_booking', args);
      assert.ok(
        !result.error && !result.result?.isError,
        JSON.stringify(result),
      );
      const saved = JSON.parse(result.result.content[0].text);
      assert.ok(saved.booking.id);
      const replay = JSON.parse(
        (await rpc('create_booking', args)).result.content[0].text,
      );
      assert.equal(replay.booking.id, saved.booking.id);
      assert.equal(replay.replayed, true);
      const denied = await rpc('list_booking_activity', {});
      assert.ok(denied.error || denied.result?.isError);
      const checkout = await fetch(
        `${base}/api/bookings/${saved.booking.id}/checkout`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: base,
            authorization: `Bearer ${token}`,
          },
          body: '{}',
        },
      );
      assert.equal(
        checkout.status,
        409,
        'unconfigured provider, not an incorrect 401',
      );
      const paidProduct = (
        await call(
          '/api/products',
          {
            title: 'Synthetic paid examination',
            slug: 'synthetic-paid-examination',
            kind: 'service',
            shortDescription: 'Test only',
            price: 9900,
            currency: 'USD',
            active: true,
          },
          owner.cookie,
        )
      ).json().product;
      const slot = (
        await call(
          '/api/booking-slots',
          {
            action: 'create_slot',
            resourceId: resource.id,
            productId: paidProduct.id,
            startsAt: new Date((at + 18000) * 1000).toISOString(),
            endsAt: new Date((at + 19800) * 1000).toISOString(),
          },
          owner.cookie,
        )
      ).json();
      const paid = (
        await call(
          '/api/bookings',
          { slotId: slot.id, idempotencyKey: crypto.randomUUID() },
          alice.cookie,
        )
      ).json().booking;
      assert.equal(paid.status, 'confirmed');
      assert.equal(paid.paymentStatus, 'pending');
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      const card = page
        .getByRole('listitem')
        .filter({ hasText: `Reference: ${paid.id}` });
      await card.getByText('Awaiting payment', { exact: true }).waitFor();
      assert.equal(
        await card.getByText('Confirmed', { exact: true }).count(),
        0,
      );
      await card.getByRole('button', { name: 'Get payment link' }).click();
      await card.getByRole('alert').waitFor();
      assert.equal(
        (await call(`/api/bookings/${paid.id}`, undefined, alice.cookie)).json()
          .booking.paymentStatus,
        'pending',
      );
    },
  );
  await check(
    'appointments and session survive Worker restart on the same D1 state',
    async () => {
      await stop();
      await start();
      const persisted = (
        await call('/api/bookings?mine=1', undefined, alice.cookie)
      ).json();
      assert.ok(persisted.bookings.some((b) => b.id === appointment.id));
      await page.reload();
      await page
        .getByText('Reference: ' + appointment.id, { exact: true })
        .waitFor();
    },
  );
  await check(
    'logout revokes the session and new patient registration shows an honest empty state',
    async () => {
      const oldCookies = await context.cookies();
      const cookie = oldCookies.map((c) => `${c.name}=${c.value}`).join('; ');
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.waitForURL(/\/login\?/);
      assert.equal(
        (await call('/api/bookings?mine=1', undefined, cookie)).status,
        401,
      );
      await page
        .getByRole('button', { name: 'Create a patient account', exact: true })
        .click();
      await page
        .getByLabel('Email', { exact: true })
        .fill('new-patient@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page
        .getByRole('button', { name: 'Create account', exact: true })
        .click();
      await page.waitForURL(base + '/account');
      await page
        .getByText('No upcoming appointments', { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByText('Reference: ' + appointment.id, { exact: true })
          .count(),
        0,
      );
    },
  );
  await check(
    'clinic activity screen shows private events and Telegram setup on desktop and mobile',
    async () => {
      const ownerContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const [name, value] = owner.cookie.split('=');
      await ownerContext.addCookies([{ name, value, url: base }]);
      await ownerContext.route('**/*', (route) =>
        new URL(route.request().url()).origin === base
          ? route.continue()
          : route.abort(),
      );
      const adminPage = await ownerContext.newPage();
      adminPage.on('pageerror', (e) => errors.push(e.message));
      await adminPage.goto(base + '/admin#bookings');
      const activity = adminPage.getByRole('region', {
        name: 'Уведомления о записях',
      });
      await activity.getByText('Telegram: выключен', { exact: true }).waitFor();
      assert.ok((await activity.getByRole('listitem').count()) > 0);
      assert.equal(
        await activity
          .getByRole('button', { name: 'Обработать очередь Telegram' })
          .isDisabled(),
        true,
      );
      await activity.getByRole('tab', { name: '24 часа' }).click();
      await activity
        .getByRole('button', { name: 'Обновить уведомления' })
        .waitFor({ state: 'visible' });
      await adminPage.screenshot({
        path: path.join(state, 'booking-activity-desktop.png'),
        fullPage: true,
      });
      await adminPage.setViewportSize({ width: 320, height: 844 });
      assert.ok(
        await adminPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await adminPage.screenshot({
        path: path.join(state, 'booking-activity-mobile.png'),
        fullPage: true,
      });
      await ownerContext.close();
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(outbound, []);
} finally {
  if (browser) await browser.close();
  await stop();
  await writeFile(
    path.join(state, 'account-report.json'),
    JSON.stringify(
      {
        checks: results,
        syntheticDataOnly: true,
        externalProviders: false,
        r2: false,
      },
      null,
      2,
    ),
  );
  console.log('Patient account report: ' + state);
}
