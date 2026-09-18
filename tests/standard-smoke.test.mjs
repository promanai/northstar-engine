import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  runStandardSmoke,
  smokeCredentials,
  smokeTarget,
} from '../scripts/standard-smoke-policy.mjs';
import { smokeArgs } from '../scripts/standard-smoke.mjs';
import { requiredPaths } from '../scripts/contract-policy.mjs';

const origin = 'https://smoke.example';
const cookie = 'northstar_session=' + 'S'.repeat(43);
const stamp = { format: 1, id: 'a'.repeat(64), version: '0.4.0', commit: null };
const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
function fixture(url, init) {
  const route = new URL(url).pathname;
  const auth = init.headers.cookie === cookie;
  if (route === '/api/health')
    return json(
      { status: 'ok', service: 'northstar-engine', build: stamp },
      200,
      { 'cache-control': 'no-store' },
    );
  if (route === '/api/openapi')
    return json({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1' },
      components: { securitySchemes: { bearerAuth: {}, cookieAuth: {} } },
      paths: Object.fromEntries(
        Object.entries({
          ...requiredPaths,
          '/overview': ['get'],
          '/tickets': ['get'],
          '/analytics': ['get'],
        }).map(([route, methods]) => [
          route,
          Object.fromEntries(
            methods.map((method) => [
              method,
              { summary: 'Test', operationId: method + route, responses: {} },
            ]),
          ),
        ]),
      ),
    });
  if (route === '/')
    return new Response('<html><title>Site</title></html>', {
      headers: { 'content-type': 'text/html' },
    });
  if (route === '/api/products') return json({ products: [] });
  if (route === '/api/content')
    return new Response('# Site', {
      headers: { 'content-type': 'text/markdown' },
    });
  if (route === '/llms.txt')
    return new Response('/api/openapi /api/mcp /api/content', {
      headers: { 'content-type': 'text/plain' },
    });
  if (!auth || init.headers.origin || init.headers.authorization)
    return json({ error: 'denied' }, 403);
  if (route === '/api/auth/me')
    return json(
      { user: { role: 'admin', email: 'private@example.test' } },
      200,
      { 'cache-control': 'no-store' },
    );
  return json(
    {
      period: '24h',
      from: 0,
      to: 86400000,
      summary: Object.fromEntries(
        [
          'customers',
          'conversations',
          'orders',
          'bookings',
          'tickets',
          'pendingOrders',
          'openTickets',
          'upcomingBookings',
        ].map((k) => [k, 0]),
      ),
      recentTickets: [{ subject: 'Private ticket' }],
    },
    200,
    { 'cache-control': 'private, no-store' },
  );
}

void test('smoke requires exact HTTPS origin, strict arguments and explicitly bound session', () => {
  assert.equal(smokeTarget(origin + '/'), origin);
  assert.equal(
    smokeTarget('http://127.0.0.1:8787', true),
    'http://127.0.0.1:8787',
  );
  for (const bad of [
    'http://site.example',
    'https://a:b@site.example',
    origin + '/admin',
    origin + '?token=x',
    origin + '#x',
    'file:///tmp/test',
    'http://127.0.0.1:8787',
  ])
    assert.throws(() => smokeTarget(bad));
  assert.throws(() => smokeTarget('http://remote.example', true));
  assert.equal(smokeCredentials(origin, undefined, ''), '');
  for (const [adminOrigin, secret] of [
    [undefined, cookie],
    ['https://other.example', cookie],
    [origin, ''],
    [origin, cookie + '; extra=bad'],
    [origin, cookie + '\r\nX: y'],
  ])
    assert.throws(() => smokeCredentials(origin, adminOrigin, secret));
  for (const args of [
    [],
    ['--url', origin],
    ['--url', origin, '--url', origin, '--report', 'a'],
    ['--unknown'],
    ['--report', '--url'],
  ])
    assert.throws(() => smokeArgs(args));
  assert.equal(smokeArgs(['--url', origin, '--report', 'a'])['--url'], origin);
});

void test('smoke uses 15 fixed GET probes and strips private data from successful report', async () => {
  const calls = [];
  const report = await runStandardSmoke({
    url: origin,
    adminOrigin: origin,
    cookie,
    transport: async (url, init) => {
      calls.push({ url, init });
      return fixture(url, init);
    },
  });
  assert.equal(report.passed, true, JSON.stringify(report));
  assert.equal(report.requests, 15);
  assert.ok(
    calls.every(
      (c) =>
        c.init.method === 'GET' &&
        c.init.redirect === 'manual' &&
        new URL(c.url).origin === origin,
    ),
  );
  assert.ok(calls.slice(0, 11).every((c) => !c.init.headers.cookie));
  assert.ok(calls.slice(11).every((c) => c.init.headers.cookie === cookie));
  for (const secret of [cookie, 'private@example.test', 'Private ticket'])
    assert.ok(!JSON.stringify(report).includes(secret));
});

void test('expected release must match before credentials are sent; omitted check is explicit', async () => {
  const success = await runStandardSmoke({
    url: origin,
    expectedBuild: stamp,
    transport: fixture,
  });
  assert.equal(success.passed, true);
  assert.equal(success.release.status, 'matched');
  assert.equal(
    (await runStandardSmoke({ url: origin, transport: fixture })).release
      .status,
    'not_requested',
  );
  for (const build of [
    { ...stamp, id: 'b'.repeat(64) },
    { ...stamp, version: '0.3.0' },
    { ...stamp, commit: 'c'.repeat(40) },
    undefined,
  ]) {
    const calls = [];
    const report = await runStandardSmoke({
      url: origin,
      expectedBuild: stamp,
      adminOrigin: origin,
      cookie,
      transport: (_url, init) => {
        calls.push(init);
        return json({ status: 'ok', service: 'northstar-engine', build }, 200, {
          'cache-control': 'no-store',
        });
      },
    });
    assert.equal(report.passed, false);
    assert.equal(report.release.status, 'mismatch');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers.cookie, undefined);
  }
  let called = false;
  await assert.rejects(
    runStandardSmoke({
      url: origin,
      expectedBuild: { secret: 'wrong-file' },
      transport: () => {
        called = true;
      },
    }),
  );
  assert.equal(called, false);
  const cached = await runStandardSmoke({
    url: origin,
    expectedBuild: stamp,
    adminOrigin: origin,
    cookie,
    transport: (_url, init) => {
      assert.equal(init.headers.cookie, undefined);
      return json({ status: 'ok', service: 'northstar-engine', build: stamp });
    },
  });
  assert.equal(cached.passed, false);
  assert.equal(cached.requests, 1);
  assert.equal(cached.checks[0].code, 'PRIVATE_CACHE_REQUIRED');
});

void test('smoke public-only run marks authenticated checks skipped, Lite fails before any session is sent', async () => {
  const publicReport = await runStandardSmoke({
    url: origin,
    transport: fixture,
  });
  assert.equal(publicReport.passed, true);
  assert.equal(publicReport.authenticated, false);
  assert.equal(publicReport.requests, 11);
  assert.equal(publicReport.checks.at(-1).status, 'skipped');
  let requests = 0;
  const lite = await runStandardSmoke({
    url: origin,
    adminOrigin: origin,
    cookie,
    transport: async (_, init) => {
      requests++;
      assert.equal(init.headers.cookie, undefined);
      return json({ status: 'ok', service: 'northstar-engine', mode: 'lite' });
    },
  });
  assert.equal(lite.passed, false);
  assert.equal(requests, 1);
});

void test('smoke rejects redirects, oversized/invalid bodies, wrong status and transport errors without leaking them', async () => {
  for (const response of [
    () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example/?secret=x' },
      }),
    () =>
      new Response('x'.repeat(1024 * 1024 + 1), {
        headers: { 'content-type': 'application/json' },
      }),
    () => json({ error: 'private-db-error' }, 503),
    () =>
      new Response('private-invalid-json', {
        headers: { 'content-type': 'application/json' },
      }),
    () => {
      throw new Error('S'.repeat(43));
    },
  ]) {
    const report = await runStandardSmoke({ url: origin, transport: response });
    assert.equal(report.passed, false);
    assert.equal(report.requests, 1);
    for (const secret of [
      'evil.example',
      'private-db-error',
      'private-invalid-json',
      'S'.repeat(43),
    ])
      assert.ok(!JSON.stringify(report).includes(secret));
  }
});

void test('smoke fails if private endpoint is exposed or admin overview uses public cache', async () => {
  for (const failure of ['anonymous', 'cache']) {
    const report = await runStandardSmoke({
      url: origin,
      adminOrigin: origin,
      cookie,
      transport: (url, init) => {
        if (
          new URL(url).pathname === '/api/overview' &&
          !init.headers.origin &&
          !init.headers.authorization
        ) {
          if (failure === 'anonymous' && !init.headers.cookie)
            return json({ summary: 'leaked' });
          if (failure === 'cache' && init.headers.cookie) {
            const response = fixture(url, init);
            response.headers.set('cache-control', 'public');
            return response;
          }
        }
        return fixture(url, init);
      },
    });
    assert.equal(report.passed, false);
  }
});

void test('smoke CLI writes successful reports and never overwrites existing evidence or follows redirects', async () => {
  let requests = 0;
  let serveFixture = false;
  const server = createServer((req, res) => {
    requests++;
    if (serveFixture) {
      const response = fixture(origin + req.url, { headers: req.headers });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      void response.text().then((body) => res.end(body));
      return;
    }
    res.writeHead(302, { location: 'http://127.0.0.1:1/do-not-follow' });
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const directory = await mkdtemp(path.join(tmpdir(), 'northstar-smoke-'));
  const expectedPath = path.join(directory, 'expected.json');
  let output = path.join(directory, 'report.json');
  async function run(extra = []) {
    const child = spawn(
      process.execPath,
      [
        'scripts/standard-smoke.mjs',
        '--url',
        `http://127.0.0.1:${server.address().port}`,
        '--allow-local',
        '--report',
        output,
        ...extra,
      ],
      {
        windowsHide: true,
        env: { ...process.env, NORTHSTAR_SMOKE_COOKIE: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let log = '';
    child.stdout.on('data', (data) => {
      log += data;
    });
    child.stderr.on('data', (data) => {
      log += data;
    });
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    return { code, log };
  }
  try {
    assert.equal((await run()).code, 1);
    const report = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(report.checks[0].code, 'REDIRECT_REJECTED');
    assert.equal(requests, 1);
    await writeFile(output, 'KEEP EXISTING EVIDENCE');
    assert.equal((await run()).code, 1);
    assert.equal(await readFile(output, 'utf8'), 'KEEP EXISTING EVIDENCE');
    assert.equal(requests, 1);
    serveFixture = true;
    output = path.join(directory, 'success.json');
    assert.equal((await run()).code, 0);
    const success = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(success.passed, true);
    assert.equal(success.requests, 11);
    assert.equal(success.authenticated, false);
    assert.equal(success.release.status, 'not_requested');
    await writeFile(expectedPath, JSON.stringify(stamp));
    output = path.join(directory, 'matched.json');
    assert.equal((await run(['--expect-build', expectedPath])).code, 0);
    assert.equal(
      JSON.parse(await readFile(output, 'utf8')).release.status,
      'matched',
    );
    await writeFile(
      expectedPath,
      JSON.stringify({ ...stamp, id: 'b'.repeat(64) }),
    );
    output = path.join(directory, 'mismatch.json');
    assert.equal((await run(['--expect-build', expectedPath])).code, 1);
    const mismatch = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(mismatch.release.status, 'mismatch');
    assert.equal(mismatch.requests, 1);
    await writeFile(expectedPath, '{"cookie":"do-not-publish"}');
    output = path.join(directory, 'invalid.json');
    const before = requests;
    const invalid = await run(['--expect-build', expectedPath]);
    assert.equal(invalid.code, 1);
    assert.ok(!invalid.log.includes('do-not-publish'));
    assert.equal(requests, before);
    await assert.rejects(readFile(output));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
