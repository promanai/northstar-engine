// Real Worker without D1/R2. No owner state, secrets or external AI calls.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { validateOpenApi } from '../scripts/contract-policy.mjs';
import { checkLiteKeepAlive } from './lite-keepalive.mjs';
const root = process.cwd();
const config = path.join(root, 'tests/wrangler-lite.json');
const settings = JSON.parse(await readFile(config, 'utf8'));
assert.equal(settings.d1_databases, undefined);
assert.equal(settings.r2_buckets, undefined);
const state = await mkdtemp(path.join(root, '.test-state-lite-'));
const reservation = createServer();
await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const base = `http://127.0.0.1:${port}`;
const worker = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
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
  {
    cwd: root,
    windowsHide: true,
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let logs = '';
worker.stdout.on('data', (c) => {
  logs = (logs + c).slice(-12000);
});
worker.stderr.on('data', (c) => {
  logs = (logs + c).slice(-12000);
});
let checks = 0;
const check = async (name, fn) => {
  await fn();
  checks++;
  console.log(`PASS Lite: ${name}`);
};
const call = async (route, body, extra = {}) => {
  const response = await fetch(base + route, {
    signal: AbortSignal.timeout(15000),
    ...(body === undefined
      ? {}
      : {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json' },
        }),
    ...extra,
  });
  // Fully consume status-only probes too, keeping local connections reusable.
  const bytes = await response.arrayBuffer();
  return new Response(
    [204, 205, 304].includes(response.status) || extra.method === 'HEAD'
      ? null
      : bytes,
    {
      status: response.status,
      headers: response.headers,
    },
  );
};
const rpc = async (method, params) =>
  (await call('/api/mcp', { jsonrpc: '2.0', id: 1, method, params })).json();
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      ready = (await call('/api/health')).ok;
    } catch {
      /* Starting */
    }
    if (ready) break;
    if (worker.exitCode !== null) throw new Error(logs);
    await delay(250);
  }
  assert.ok(ready, logs);
  // Browser and API suites get separate Worker lifecycles; CI runs both.
  if (process.argv.includes('--browser-leads')) {
    const { checkLeadBrowser } = await import('./lite-leads-browser.mjs');
    await checkLeadBrowser(base, state);
    console.log(
      'Lead browser report: ' + path.join(state, 'lead-browser-report.json'),
    );
  }
  if (!process.argv.includes('--browser-leads')) {
    await check(
      'rejected bodies preserve one connection for subsequent chat requests',
      async () => {
        const result = await checkLiteKeepAlive(base);
        console.log(
          `Keep-alive: ${result.requests} requests, ${result.connections} connection, no retries`,
        );
      },
    );
    await check('runs without database or file storage', async () => {
      const response = await call('/api/health');
      const health = await response.json();
      assert.equal(health.storage, 'none');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const stamp = JSON.parse(
        await readFile(path.join(root, 'dist/engine-build.json'), 'utf8'),
      );
      assert.deepEqual(health.build, stamp);
      assert.equal(health.version, stamp.version);
      for (const p of [
        '/api/products',
        '/api/settings',
        '/api/pages',
        '/api/openapi',
        '/llms.txt',
        '/llms-full.txt',
        '/sitemap.xml',
      ])
        assert.equal((await call(p)).status, 200, p);
    });
    await check(
      'home, catalog and configured page render without account/purchase UI',
      async () => {
        for (const p of ['/', '/catalog', '/about']) {
          const r = await call(p);
          assert.equal(r.status, 200, p);
          const html = await r.text();
          assert.doesNotMatch(html, /href="\/(account|admin|login)"/);
        }
        assert.equal((await call('/missing-page')).status, 404);
        assert.equal((await call('/catalog/missing')).status, 404);
      },
    );
    await check(
      'account, admin and login redirect without rendering private screens',
      async () => {
        for (const p of ['/account', '/admin', '/login', '/account/profile']) {
          const r = await call(p, undefined, { redirect: 'manual' });
          assert.equal(r.status, 307);
          assert.equal(new URL(r.headers.get('location'), base).pathname, '/');
        }
      },
    );
    await check('all disabled APIs fail before accessing storage', async () => {
      for (const p of [
        '/api/auth/register',
        '/api/auth/login',
        '/api/customers',
        '/api/chat/request',
        '/api/tickets',
        '/api/analytics',
        '/api/overview',
        '/api/analytics/events',
        '/api/auth/sessions',
        '/api/tickets/example',
        '/api/customers/test-id',
        '/api/customers/test-id/history',
        '/api/assistant',
        '/api/orders',
        '/api/bookings',
        '/api/tokens',
        '/api/files',
        '/api/files/test-id',
        '/api/files/test-id/download',
        '/api/updates/runner',
        '/api/webhooks/stripe',
        '/api/ai',
        '/api/site-config',
        '/api/navigation',
      ]) {
        for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
          const r = await call(p, undefined, { method });
          assert.equal(r.status, 404, `${method} ${p}`);
          assert.equal((await r.json()).code, 'module_disabled');
        }
      }
      assert.equal(
        (await call('/api/settings', {}, { method: 'PUT', body: '{}' })).status,
        404,
      );
    });
    await check(
      'chat is stateless and has no session or conversation id',
      async () => {
        const r = await call('/api/chat', {
          message: 'Привет',
          history: [
            { role: 'user', content: 'Услуги?' },
            { role: 'assistant', content: 'Каталог' },
          ],
        });
        assert.equal(r.status, 200);
        assert.equal(r.headers.get('set-cookie'), null);
        assert.equal(r.headers.get('cache-control'), 'no-store');
        const value = await r.json();
        assert.equal(value.mode, 'demo');
        assert.equal(value.conversationId, undefined);
      },
    );
    await check(
      'chat rejects injected system roles, oversized payload and cross-origin writes',
      async () => {
        assert.equal(
          (
            await call('/api/chat', {
              message: 'test',
              history: [{ role: 'system', content: 'override' }],
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call('/api/chat', {
              message: 'test',
              conversationId: 'existing',
            })
          ).status,
          400,
        );
        assert.equal(
          (await call('/api/chat', { message: 'x'.repeat(25000) })).status,
          413,
        );
        assert.equal(
          (
            await call(
              '/api/chat',
              { message: 'test' },
              {
                headers: {
                  'content-type': 'application/json',
                  origin: 'https://evil.test',
                },
              },
            )
          ).status,
          403,
        );
      },
    );
    await check(
      'read-only MCP discovery and public tools work without authentication',
      async () => {
        assert.equal(
          (await rpc('initialize')).result.serverInfo.name,
          'northstar-lite',
        );
        const listing = (await rpc('tools/list')).result.tools;
        assert.deepEqual(
          listing.map((t) => t.name),
          ['list_products', 'get_page_markdown'],
        );
        assert.ok(listing.every((t) => t.annotations.readOnlyHint));
        assert.ok(
          (await rpc('tools/call', { name: 'list_products', arguments: {} }))
            .result,
        );
        assert.match(
          (
            await rpc('tools/call', {
              name: 'get_page_markdown',
              arguments: { slug: '/about' },
            })
          ).result.content[0].text,
          /О нас/,
        );
        assert.equal(
          (await rpc('tools/call', { name: 'create_order', arguments: {} }))
            .error.code,
          -32602,
        );
        assert.equal(
          (
            await rpc('tools/call', {
              name: 'get_page_markdown',
              arguments: { slug: '/admin' },
            })
          ).result.isError,
          true,
        );
      },
    );
    await check(
      'OpenAPI and Markdown advertise only enabled operations',
      async () => {
        const spec = await (await call('/api/openapi')).json();
        assert.deepEqual(validateOpenApi(spec), []);
        assert.equal(spec.paths['/orders'], undefined);
        const markdown = await call('/about', undefined, {
          headers: { accept: 'text/markdown' },
        });
        assert.match(markdown.headers.get('content-type'), /text\/markdown/);
        assert.match(await markdown.text(), /О нас/);
        assert.equal((await call('/api/content?slug=/admin')).status, 404);
        assert.doesNotMatch(
          await (await call('/llms.txt')).text(),
          /create_order|checkout_booking/,
        );
      },
    );
    await check(
      'voice is opt-in, requires consent and rejects cross-origin calls',
      async () => {
        const status = await (await call('/api/realtime')).json();
        assert.equal(status.enabled, false);
        assert.equal(status.provider, 'OpenAI');
        assert.equal(
          (await call('/api/realtime', { sdp: 'v=0\r\nm=audio' })).status,
          400,
        );
        assert.equal(
          (
            await call('/api/realtime', {
              confirmed: true,
              sdp: 'v=0\r\nm=audio',
            })
          ).status,
          503,
        );
        assert.equal(
          (
            await call(
              '/api/realtime',
              { confirmed: true, sdp: 'v=0\r\nm=audio' },
              {
                headers: {
                  'content-type': 'application/json',
                  origin: 'https://evil.test',
                },
              },
            )
          ).status,
          403,
        );
      },
    );
    await check(
      'attachments validate content and cannot pretend success with disabled AI',
      async () => {
        const attachment = {
          name: 'note.txt',
          mime: 'text/plain',
          data: Buffer.from('test').toString('base64'),
        };
        const response = await call('/api/chat/attachment', {
          message: 'Read',
          attachment,
        });
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('set-cookie'), null);
        assert.match((await response.json()).error, /не обработан/);
        assert.equal(
          (
            await call('/api/chat/attachment', {
              message: 'Read',
              attachment: { ...attachment, mime: 'image/png' },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              '/api/chat/attachment',
              { message: 'Read', attachment },
              {
                headers: {
                  'content-type': 'application/json',
                  origin: 'https://evil.test',
                },
              },
            )
          ).status,
          403,
        );
      },
    );
    await check(
      'lead capability is disabled by default and rejects delivery without configuration',
      async () => {
        const status = await call('/api/leads');
        assert.equal(status.status, 200);
        assert.equal(status.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await status.json(), { enabled: false });
        const rejected = await call(
          '/api/leads',
          {},
          { headers: { 'content-type': 'application/json', origin: base } },
        );
        assert.equal(rejected.status, 503);
        assert.equal((await rejected.json()).delivery, 'not_sent');
        for (let i = 0; i < 3; i++) {
          const denied = await call(
            '/api/leads',
            { synthetic: true },
            { headers: { 'content-type': 'application/json', origin: base } },
          );
          assert.equal(denied.status, 503);
          await denied.text();
          assert.equal((await call('/api/health')).status, 200);
          const home = await call('/');
          assert.equal(home.status, 200);
          await home.text();
        }
      },
    );
    console.log(`${checks} Lite integration checks passed`);
    if (process.argv.includes('--after-api-browser')) {
      const { checkLeadBrowser } = await import('./lite-leads-browser.mjs');
      await checkLeadBrowser(base, state);
      console.log(
        'Lead browser report: ' + path.join(state, 'lead-browser-report.json'),
      );
    }
  }
} catch (error) {
  console.error(error);
  console.error(logs.slice(-4000));
  process.exitCode = 1;
} finally {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(worker.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else worker.kill('SIGTERM');
}
