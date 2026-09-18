// Runs ONLY against its own Worker, D1 and R2. Never uses the owner's port/state.
import assert from 'node:assert/strict';
import { commerceTests } from './commerce-integration.mjs';
import { updateTests } from './updates-integration.mjs';
import { agentTests } from './agents-integration.mjs';
import { aiTests } from './ai-integration.mjs';
import { aiBudgetTests } from './ai-budget-integration.mjs';
import { chatFileTests } from './chat-files-integration.mjs';
import { bookingTests } from './bookings-integration.mjs';
import { pageTests } from './pages-integration.mjs';
import { navigationTests } from './navigation-integration.mjs';
import { siteConfigTests } from './site-config-integration.mjs';
import { fileTests } from './files-integration.mjs';
import { adminTests } from './admin-integration.mjs';
import { ticketTests } from './tickets-integration.mjs';
import { analyticsTests } from './analytics-integration.mjs';
import { overviewTests } from './overview-integration.mjs';
import { sessionTests } from './sessions-integration.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const state = await mkdtemp(path.join(root, '.test-state-'));
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const config = path.join(root, 'tests/wrangler.json');
const options = {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
};
const migration = spawnSync(
  process.execPath,
  [
    cli,
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    state,
  ],
  { ...options, encoding: 'utf8' },
);
assert.equal(migration.status, 0, migration.stderr + migration.stdout);
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const base = `http://127.0.0.1:${port}`;
const worker = spawn(
  process.execPath,
  [
    cli,
    'dev',
    '--config',
    config,
    '--port',
    String(port),
    '--inspector-port',
    '0',
    '--persist-to',
    state,
  ],
  { ...options, stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '';
worker.stdout.on('data', (chunk) => {
  logs = (logs + chunk).slice(-20000);
});
worker.stderr.on('data', (chunk) => {
  logs = (logs + chunk).slice(-20000);
});
let checks = 0;
async function sql(command) {
  const commandProcess = spawn(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      config,
      '--persist-to',
      state,
      '--command',
      command,
      '--json',
    ],
    { ...options, encoding: 'utf8' },
  );
  let stdout = '',
    stderr = '';
  commandProcess.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  commandProcess.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise((resolve, reject) => {
    commandProcess.on('error', reject);
    commandProcess.on('close', resolve);
  });
  assert.equal(code, 0, stderr);
  return JSON.parse(stdout)[0].results;
}
async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
const cookie = (response) =>
  response.headers.get('set-cookie')?.split(';')[0] ?? '';
async function call(
  route,
  body,
  session = '',
  headers = {},
  method = body === undefined ? 'GET' : 'POST',
) {
  if (
    route === '/api/chat' &&
    method === 'POST' &&
    !('Idempotency-Key' in headers)
  )
    headers = { ...headers, 'Idempotency-Key': crypto.randomUUID() };
  const response = await fetch(base + route, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(session ? { cookie: session } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (
    response.status === 428 &&
    response.headers.get('x-chat-request-state') === 'unclaimed'
  )
    return call(route, body, cookie(response), headers, method);
  if (response.status >= 500)
    console.error(route, response.status, await response.clone().text());
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: response.headers,
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      ready = (await fetch(base + '/api/health')).ok;
    } catch {
      /* Starting. */
    }
    if (ready) break;
    if (worker.exitCode !== null) throw new Error(logs);
    await delay(200);
  }
  assert.ok(ready, logs);
  const password = 'Test-only-password-8421';
  const setupToken = 'test-only-initial-admin-token-0000000000';
  await check(
    'first admin cannot register without installation secret',
    async () => {
      assert.equal(
        (
          await call('/api/auth/register', {
            email: 'outsider@example.test',
            password,
          })
        ).status,
        403,
      );
    },
  );
  let adminCookie;
  await check(
    'concurrent bootstrap creates exactly one administrator',
    async () => {
      const responses = await Promise.all(
        ['owner1', 'owner2'].map((name) =>
          call('/api/auth/register', {
            email: `${name}@example.test`,
            password,
            setupToken,
          }),
        ),
      );
      const results = await Promise.all(
        responses.map(async (response) => ({
          response,
          body: await response.json(),
        })),
      );
      assert.ok(
        responses.every((response) => [201, 409].includes(response.status)),
      );
      const owners = results.filter(
        (result) => result.body.user?.role === 'admin',
      );
      assert.equal(owners.length, 1);
      adminCookie = cookie(owners[0].response);
      assert.ok(
        results
          .filter((result) => result !== owners[0])
          .every(
            (result) =>
              result.response.status === 409 ||
              result.body.user?.role === 'customer',
          ),
      );
    },
  );
  let aliceCookie, bobCookie;
  await check(
    'later registrations are customers even with setup token',
    async () => {
      const alice = await call('/api/auth/register', {
        email: 'alice@example.test',
        password,
        setupToken,
      });
      assert.equal(alice.status, 201);
      aliceCookie = cookie(alice);
      assert.equal((await alice.json()).user.role, 'customer');
      const bob = await call('/api/auth/register', {
        email: 'bob@example.test',
        password,
      });
      assert.equal(bob.status, 201);
      bobCookie = cookie(bob);
    },
  );
  await check(
    'authenticated session reads and private cache headers',
    async () => {
      const response = await call('/api/auth/me', undefined, aliceCookie);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    },
  );
  await check(
    'cross-origin writes rejected, including existing settings API',
    async () => {
      assert.equal(
        (
          await call('/api/chat', { message: 'test' }, '', {
            origin: 'https://evil.example',
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/settings',
            { key: 'public.siteName', value: { text: 'must not save' } },
            adminCookie,
            { origin: 'https://evil.example' },
            'PUT',
          )
        ).status,
        403,
      );
    },
  );
  await check(
    'malformed, non-JSON and oversized messages rejected',
    async () => {
      const malformed = await call('/api/chat', { message: {} });
      assert.equal(malformed.status, 400);
      assert.equal(
        (await call('/api/chat', { message: 'x'.repeat(8001) })).status,
        400,
      );
      assert.equal(
        (await call('/api/chat', { message: 'x'.repeat(21000) })).status,
        413,
      );
      assert.equal(
        (
          await call('/api/chat', { message: 'test' }, '', {
            'content-type': 'text/plain',
          })
        ).status,
        415,
      );
    },
  );
  let guestCookie, guestId;
  await check('guest conversation creates HttpOnly owner cookie', async () => {
    const response = await call('/api/chat', { message: 'hello' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    guestCookie = cookie(response);
    guestId = (await response.json()).conversationId;
  });
  await check(
    'guest ID alone and another customer cannot access guest history',
    async () => {
      assert.equal(
        (await call('/api/chat', { message: 'no', conversationId: guestId }))
          .status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/chat',
            { message: 'no', conversationId: guestId },
            bobCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/chat',
            { message: 'yes', conversationId: guestId },
            guestCookie,
          )
        ).status,
        200,
      );
    },
  );
  let privateId;
  await check(
    'authenticated conversation isolated from guests and other customers',
    async () => {
      const response = await call(
        '/api/chat',
        { message: 'private' },
        aliceCookie,
      );
      assert.equal(response.status, 200);
      privateId = (await response.json()).conversationId;
      assert.equal(
        (await call('/api/chat', { message: 'no', conversationId: privateId }))
          .status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/chat',
            { message: 'no', conversationId: privateId },
            guestCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/chat',
            { message: 'no', conversationId: privateId },
            bobCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/chat',
            { message: 'yes', conversationId: privateId },
            aliceCookie,
          )
        ).status,
        200,
      );
    },
  );
  await check('stored history contains only successful turns', async () => {
    const data = await (
      await call('/api/conversations', undefined, aliceCookie)
    ).json();
    assert.equal(data.conversations.length, 1);
    assert.equal(data.conversations[0].messages.length, 4);
    assert.deepEqual(
      data.conversations[0].messages.map((m) => m.role),
      ['user', 'assistant', 'user', 'assistant'],
    );
  });
  await check(
    'catalog private instructions hidden and demo prices correct',
    async () => {
      const created = await call(
        '/api/products',
        {
          title: 'Consultation',
          shortDescription: 'Test',
          price: 490000,
          currency: 'RUB',
          aiInstructions: 'PRIVATE-TEST-NOTE',
        },
        adminCookie,
      );
      assert.equal(created.status, 201);
      const catalog = await (await call('/api/products')).json();
      assert.equal('aiInstructions' in catalog.products[0], false);
      const answer = await (
        await call('/api/chat', { message: 'price' }, aliceCookie)
      ).json();
      assert.equal(answer.mode, 'demo');
      assert.match(answer.message, /4900\.00 RUB/);
      assert.ok(!answer.message.includes('PRIVATE-TEST-NOTE'));
    },
  );
  await check('customers API returns creation date used by UI', async () => {
    const data = await (
      await call('/api/customers', undefined, adminCookie)
    ).json();
    assert.ok(
      data.customers.every((customer) =>
        Number.isFinite(Date.parse(customer.createdAt)),
      ),
    );
    assert.ok(
      data.customers.some(
        (customer) => customer.email === 'alice@example.test',
      ),
    );
    assert.ok(
      data.customers.some((customer) => customer.email === 'bob@example.test'),
    );
  });
  await commerceTests({
    call,
    check,
    sql,
    adminCookie,
    aliceCookie,
    bobCookie,
  });
  await updateTests({ call, check, sql, adminCookie, aliceCookie });
  await agentTests({ call, check, sql, adminCookie, aliceCookie, bobCookie });
  await aiTests({ call, check, sql, adminCookie, aliceCookie });
  await aiBudgetTests({ call, check, sql, adminCookie, aliceCookie });
  await bookingTests({ call, check, sql, adminCookie, aliceCookie, bobCookie });
  await pageTests({ call, check, adminCookie, aliceCookie, sql });
  await navigationTests({ call, check, adminCookie, aliceCookie, sql });
  await siteConfigTests({ call, check, adminCookie, aliceCookie, sql });
  await fileTests({
    call,
    check,
    adminCookie,
    aliceCookie,
    bobCookie,
    sql,
    base,
  });
  await adminTests({ call, check, sql, adminCookie, aliceCookie });
  await ticketTests({ call, check, sql, adminCookie, aliceCookie, bobCookie });
  await analyticsTests({ call, check, sql, adminCookie, aliceCookie });
  await overviewTests({ call, check, sql, adminCookie, aliceCookie });
  await sessionTests({ call, check, sql, adminCookie, aliceCookie });
  await check('password rotation revokes other browser sessions', async () => {
    const second = await call('/api/auth/login', {
      email: 'alice@example.test',
      password,
    });
    assert.equal(second.status, 200);
    const secondCookie = cookie(second);
    const changed = await call(
      '/api/auth/me',
      {
        currentPassword: password,
        newPassword: 'New-test-password-5678',
        revision: (
          await (await call('/api/auth/me', undefined, aliceCookie)).json()
        ).user.revision,
      },
      aliceCookie,
      {},
      'PATCH',
    );
    assert.equal(changed.status, 200);
    const rotated = cookie(changed);
    assert.equal((await changed.json()).user.email, 'alice@example.test');
    assert.equal(
      (await call('/api/auth/me', undefined, secondCookie)).status,
      401,
    );
    assert.equal(
      (await call('/api/auth/me', undefined, aliceCookie)).status,
      401,
    );
    assert.equal((await call('/api/auth/me', undefined, rotated)).status, 200);
    aliceCookie = rotated;
  });
  await check('logout invalidates hashed session', async () => {
    assert.equal((await call('/api/auth/logout', {}, bobCookie)).status, 200);
    assert.equal(
      (await call('/api/auth/me', undefined, bobCookie)).status,
      401,
    );
  });
  await check(
    'login brute-force limit returns 429 and Retry-After',
    async () => {
      let limited;
      for (let i = 0; i < 12; i++) {
        const response = await call('/api/auth/login', {
          email: 'none@example.test',
          password,
        });
        if (response.status === 429) {
          limited = response;
          break;
        }
      }
      assert.ok(limited);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
    },
  );
  await check('concurrent chat requests are bounded atomically', async () => {
    const responses = await Promise.all(
      Array.from({ length: 32 }, () =>
        call('/api/chat', { message: 'limit' }, aliceCookie),
      ),
    );
    assert.ok(responses.some((response) => response.status === 429));
    assert.ok(
      responses.every((response) => [200, 429].includes(response.status)),
    );
  });
  await check(
    'new sessions store hashes rather than bearer secrets',
    async () => {
      assert.equal(
        (
          await sql(
            "SELECT count(*) AS invalid FROM sessions WHERE token NOT LIKE 'sha256:%'",
          )
        )[0].invalid,
        0,
      );
      assert.ok(
        (await sql('SELECT count(*) AS total FROM sessions'))[0].total > 0,
      );
    },
  );
  await check(
    'D1 write failure rolls back the entire conversation and returns an error',
    async () => {
      const before = (
        await sql(
          'SELECT (SELECT count(*) FROM conversations) AS conversations, (SELECT count(*) FROM messages) AS messages',
        )
      )[0];
      await sql(
        "CREATE TRIGGER test_reject_assistant BEFORE INSERT ON messages WHEN NEW.role = 'assistant' BEGIN SELECT RAISE(ABORT, 'test-only-write-failure'); END",
      );
      const response = await call(
        '/api/chat',
        { message: 'test rollback' },
        adminCookie,
      );
      assert.equal(response.status, 503);
      const data = await response.json();
      assert.ok(data.error);
      assert.equal(data.conversationId, undefined);
      const after = (
        await sql(
          'SELECT (SELECT count(*) FROM conversations) AS conversations, (SELECT count(*) FROM messages) AS messages',
        )
      )[0];
      assert.deepEqual(after, before);
    },
  );
  checks += await chatFileTests();
  console.log(`${checks} integration checks passed. Isolated state: ${state}`);
} catch (error) {
  console.error(error);
  await delay(200);
  console.error(logs.slice(-2400));
  process.exitCode = 1;
} finally {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(worker.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else worker.kill('SIGTERM');
  // Keep only disposable test state for diagnosis; ignored by source control.
}
