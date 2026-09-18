// Local release drill: actual built Worker, real migrations and backup/restore CLI.
// No owner state, cloud credentials, paid providers or external HTTP destinations.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  readdir,
  writeFile,
  access,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { sha256 } from '../scripts/operations-policy.mjs';
import { runStandardSmoke } from '../scripts/standard-smoke-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = await mkdtemp(path.join(root, '.test-state-acceptance-'));
const source = path.join(sandbox, 'source');
const restored = path.join(sandbox, 'restored');
const config = path.join(sandbox, 'wrangler.json');
const backup = path.join(sandbox, 'backup.sql');
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const ops = path.join(root, 'scripts/d1-ops.mjs');
const databaseId = '00000000-0000-4000-8000-000000000001';
const report = {
  kind: 'standard-local-acceptance',
  startedAt: new Date().toISOString(),
  passed: false,
  checks: [],
  boundaries: [
    'local only',
    'demo AI; outbound blocked',
    'D1 only; no R2 file backup',
    'not browser or cloud acceptance',
  ],
};
let runtime;
let outboundAttempts = 0;

async function run(script, args, expected = 0) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: sandbox,
    windowsHide: true,
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      output = (output + chunk).slice(-24000);
    });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  if (expected === 0) assert.equal(code, 0, output);
  else assert.ok(code !== 0, 'Unsafe command unexpectedly succeeded');
  return output;
}

async function check(name, action) {
  const started = Date.now();
  try {
    await action();
    report.checks.push({
      name,
      passed: true,
      durationMs: Date.now() - started,
    });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({
      name,
      passed: false,
      durationMs: Date.now() - started,
    });
    throw error;
  }
}

async function start(state, mode = 'standard') {
  const moduleRoot = path.join(root, 'dist/server');
  const names = [
    'index.js',
    ...(await readdir(moduleRoot, { recursive: true })).filter(
      (name) => /\.(m?js)$/.test(name) && name !== 'index.js',
    ),
  ];
  runtime = new Miniflare({
    modulesRoot: moduleRoot,
    modules: names.map((name) => ({
      type: 'ESModule',
      path: path.join(moduleRoot, name),
    })),
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: mode === 'standard' ? { DB: databaseId } : {},
    d1Persist: path.join(state, 'v3/d1'),
    r2Buckets: mode === 'standard' ? ['FILES'] : [],
    bindings: {
      ENGINE_MODE: mode,
      INITIAL_ADMIN_TOKEN: 'acceptance-only-bootstrap-12345678901234567890',
      OPENAI_API_KEY: '',
      XAI_API_KEY: '',
      AI_PAID_REQUESTS_ENABLED: 'false',
    },
    outboundService: () => {
      outboundAttempts++;
      throw new Error('Acceptance forbids outbound requests');
    },
  });
  await runtime.ready;
}

async function stop() {
  if (runtime) {
    await runtime.dispose();
    runtime = undefined;
  }
}

const cookie = (r) => r.headers.get('set-cookie')?.split(';')[0] ?? '';
async function call(
  route,
  body,
  session = '',
  method = body === undefined ? 'GET' : 'POST',
  headers = {},
) {
  const r = await runtime.dispatchFetch('http://acceptance.test' + route, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(session ? { cookie: session } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return new Response(await r.arrayBuffer(), {
    status: r.status,
    headers: r.headers,
  });
}
async function json(route, body, session, method, headers, status = 200) {
  const r = await call(route, body, session, method, headers);
  assert.equal(r.status, status, `${route}: ${await r.clone().text()}`);
  return r.json();
}

async function snapshot() {
  const db = await runtime.getD1Database('DB');
  assert.deepEqual(
    (await db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  const objects = (
    await db
      .prepare(
        "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name",
      )
      .all()
  ).results;
  const tables = {};
  const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
  for (const { name, type } of objects) {
    if (type !== 'table') continue;
    const rows = (await db.prepare(`SELECT * FROM ${quote(name)}`).all())
      .results;
    const encoded = rows
      .map((row) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(row).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        ),
      )
      .sort();
    tables[name] = {
      count: rows.length,
      digest: sha256(JSON.stringify(encoded)),
      columns: (await db.prepare(`PRAGMA table_info(${quote(name)})`).all())
        .results,
      foreignKeys: (
        await db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all()
      ).results,
      indexes: (await db.prepare(`PRAGMA index_list(${quote(name)})`).all())
        .results,
    };
  }
  return { objects, tables };
}

try {
  await access(path.join(root, 'dist/server/index.js'));
  await writeFile(
    config,
    JSON.stringify({
      name: 'northstar-acceptance-only',
      compatibility_date: '2026-05-15',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'northstar-acceptance-only',
          database_id: databaseId,
          migrations_dir: path.join(root, 'drizzle'),
        },
      ],
    }),
  );
  const migrationArgs = (state) => [
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    state,
  ];
  const backupArgs = [
    'backup',
    '--config',
    config,
    '--target',
    'local',
    '--persist-to',
    source,
    '--output',
    backup,
  ];
  const restoreArgs = (file = backup) => [
    'restore',
    '--config',
    config,
    '--target',
    'local',
    '--persist-to',
    restored,
    '--file',
    file,
  ];
  await check(
    'clean Standard installation applies every migration',
    async () => {
      await run(cli, migrationArgs(source));
      await start(source);
      const health = await json('/api/health');
      assert.equal(health.status, 'ok');
      assert.notEqual(health.mode, 'lite');
      const stamp = JSON.parse(
        await readFile(path.join(root, 'dist/engine-build.json'), 'utf8'),
      );
      assert.deepEqual(health.build, stamp);
      assert.equal(health.version, stamp.version);
      assert.equal(health.mode, 'standard');
      assert.equal(health.storage, 'd1');
      const db = await runtime.getD1Database('DB');
      const applied = (
        await db.prepare('SELECT name FROM d1_migrations ORDER BY name').all()
      ).results.map((r) => r.name);
      const expected = (await readdir(path.join(root, 'drizzle')))
        .filter((n) => n.endsWith('.sql'))
        .sort();
      assert.deepEqual(applied, expected);
      report.migrations = applied;
    },
  );

  const password = 'Acceptance-only-password-123456';
  let admin, customer, stranger, browser, ticket, conversation, visitor;
  const key = crypto.randomUUID();
  const message = 'Нужна консультация по услуге — проверка восстановления';
  await check(
    'bootstrap, customer registration and real password login',
    async () => {
      assert.equal(
        (
          await call('/api/auth/register', {
            email: 'unauthorized@example.test',
            password,
          })
        ).status,
        403,
      );
      for (const [email, isAdmin] of [
        ['owner@example.test', true],
        ['client@example.test', false],
        ['stranger@example.test', false],
      ]) {
        const r = await call('/api/auth/register', {
          email,
          password,
          ...(isAdmin
            ? { setupToken: 'acceptance-only-bootstrap-12345678901234567890' }
            : {}),
        });
        assert.equal(r.status, 201, await r.clone().text());
        assert.equal(
          (await r.json()).user.role,
          isAdmin ? 'admin' : 'customer',
        );
      }
      const login = async (email) => {
        const r = await call('/api/auth/login', { email, password });
        assert.equal(r.status, 200);
        return cookie(r);
      };
      admin = await login('owner@example.test');
      customer = await login('client@example.test');
      stranger = await login('stranger@example.test');
    },
  );
  await check(
    'overview shows real zero business counts on a clean installation',
    async () => {
      const overview = await json('/api/overview', undefined, admin);
      assert.deepEqual(overview.summary, {
        customers: 2,
        conversations: 0,
        orders: 0,
        bookings: 0,
        tickets: 0,
        pendingOrders: 0,
        openTickets: 0,
        upcomingBookings: 0,
      });
      assert.deepEqual(overview.recentTickets, []);
    },
  );
  await check(
    'Standard HTTP smoke validates built Worker without business writes',
    async () => {
      const before = await snapshot();
      const smoke = await runStandardSmoke({
        expectedBuild: JSON.parse(
          await readFile(path.join(root, 'dist/engine-build.json'), 'utf8'),
        ),
        url: 'https://acceptance.test',
        adminOrigin: 'https://acceptance.test',
        cookie: admin,
        transport: (url, init) => runtime.dispatchFetch(url, init),
      });
      assert.equal(smoke.passed, true, JSON.stringify(smoke));
      assert.equal(smoke.release.status, 'matched');
      assert.equal(
        smoke.checks.filter((c) => c.status === 'skipped').length,
        0,
      );
      assert.equal(smoke.requests, 15);
      const after = await snapshot();
      // GET quota accounting is expected; no business records may change.
      delete before.tables.rate_limits;
      delete after.tables.rate_limits;
      assert.deepEqual(after, before);
      await writeFile(
        path.join(sandbox, 'standard-smoke-report.json'),
        JSON.stringify(smoke, null, 2),
      );
    },
  );
  await check(
    'consented visit and click are linked to a durable demo chat',
    async () => {
      const current = await json('/api/analytics', undefined, admin);
      await json(
        '/api/analytics',
        {
          revision: current.settings.revision,
          value: { enabled: true, retentionDays: 30 },
          confirm: true,
        },
        admin,
      );
      const event = {
        consent: true,
        event: {
          id: crypto.randomUUID(),
          kind: 'page_view',
          path: '/',
          referrer: 'https://search.example/?secret=discard',
          device: 'mobile',
        },
      };
      const first = await call('/api/analytics/events', event, customer);
      assert.equal(first.status, 428);
      browser = `${customer}; ${cookie(first)}`;
      await json('/api/analytics/events', event, browser);
      await json(
        '/api/analytics/events',
        {
          consent: true,
          event: {
            id: crypto.randomUUID(),
            kind: 'click',
            path: '/',
            target: '/catalog',
            device: 'mobile',
          },
        },
        browser,
      );
      const answer = await json('/api/chat', { message }, browser, 'POST', {
        'Idempotency-Key': key,
      });
      assert.equal(answer.mode, 'demo');
      conversation = answer.conversationId;
      assert.ok(conversation);
      const analytics = await json('/api/analytics', undefined, admin);
      assert.equal(analytics.summary.visits, 1);
      assert.equal(analytics.chatTotals.prompts, 1);
      visitor = analytics.visits[0].id;
      assert.equal(analytics.sources[0].label, 'search.example');
    },
  );
  await check('customer ticket receives an administrator reply', async () => {
    ticket = await json(
      '/api/tickets',
      {
        subject: 'Проверка восстановления',
        body: 'Нужна помощь с услугой',
        confirm: true,
        idempotencyKey: crypto.randomUUID(),
      },
      customer,
      'POST',
      {},
      201,
    );
    await json(
      `/api/tickets/${ticket.id}`,
      {
        revision: ticket.revision,
        action: 'message',
        body: 'Обращение принято',
        confirm: true,
        idempotencyKey: crypto.randomUUID(),
      },
      admin,
      'PATCH',
    );
    const detail = await json(`/api/tickets/${ticket.id}`, undefined, customer);
    assert.equal(detail.events.length, 2);
  });
  await check(
    'other customers and anonymous visitors cannot read private data',
    async () => {
      for (const session of ['', stranger]) {
        assert.equal(
          (await call('/api/analytics', undefined, session)).status,
          403,
        );
        assert.ok(
          [401, 404].includes(
            (await call(`/api/tickets/${ticket.id}`, undefined, session))
              .status,
          ),
        );
        assert.ok(
          [401, 404].includes(
            (
              await call('/api/chat/request', undefined, session, 'GET', {
                'Idempotency-Key': key,
              })
            ).status,
          ),
        );
      }
    },
  );
  const before = await snapshot();
  await stop();
  await check(
    'local backup requires explicit source and refuses a missing source',
    async () => {
      assert.match(
        await run(
          ops,
          [
            'backup',
            '--config',
            config,
            '--target',
            'local',
            '--output',
            backup,
          ],
          1,
        ),
        /persist-to/,
      );
      await run(
        ops,
        [
          'backup',
          '--config',
          config,
          '--target',
          'local',
          '--persist-to',
          path.join(sandbox, 'missing'),
          '--output',
          backup,
        ],
        1,
      );
      await assert.rejects(access(backup));
    },
  );
  await check(
    'backup exports the selected state with a verified manifest',
    async () => {
      await run(ops, backupArgs);
      const bytes = await readFile(backup);
      const manifest = JSON.parse(
        await readFile(`${backup}.manifest.json`, 'utf8'),
      );
      assert.equal(manifest.sha256, sha256(bytes));
      assert.equal(manifest.bytes, bytes.length);
      assert.match(bytes.toString(), /Нужна консультация/);
      report.backupBytes = bytes.length;
      await run(ops, backupArgs, 1); // No accidental overwrite.
    },
  );
  await check(
    'restore rejects missing confirmation and corrupt SQL before writing',
    async () => {
      assert.match(await run(ops, restoreArgs(), 1), /confirm-restore/);
      const corrupt = path.join(sandbox, 'corrupt.sql');
      await writeFile(
        corrupt,
        Buffer.concat([await readFile(backup), Buffer.from('\n-- tampered')]),
      );
      await writeFile(
        `${corrupt}.manifest.json`,
        await readFile(`${backup}.manifest.json`),
      );
      assert.match(
        await run(
          ops,
          [...restoreArgs(corrupt), '--confirm-restore', 'RESTORE-LOCAL-D1'],
          1,
        ),
        /SHA-256/,
      );
      await assert.rejects(access(restored));
    },
  );
  await check(
    'restore into a NEW state preserves all table rows, schema and migration journal',
    async () => {
      await run(ops, [
        ...restoreArgs(),
        '--confirm-restore',
        'RESTORE-LOCAL-D1',
      ]);
      await start(restored);
      const after = await snapshot();
      assert.deepEqual(after, before);
      report.tableCounts = Object.fromEntries(
        Object.entries(after.tables).map(([name, value]) => [
          name,
          value.count,
        ]),
      );
      await stop();
    },
  );
  await check(
    'reapplying migrations after restore makes no data or schema changes',
    async () => {
      await run(cli, migrationArgs(restored));
      await start(restored);
      assert.deepEqual(await snapshot(), before);
    },
  );
  await check(
    'restored logins, ticket history, chat replay and analytics work through HTTP',
    async () => {
      for (const [email, role] of [
        ['owner@example.test', 'admin'],
        ['client@example.test', 'customer'],
      ]) {
        const r = await call('/api/auth/login', { email, password });
        assert.equal(r.status, 200);
        assert.equal((await r.json()).user.role, role);
        if (role === 'admin') admin = cookie(r);
        else customer = cookie(r);
      }
      const recovered = await json(
        '/api/chat/request',
        undefined,
        customer,
        'GET',
        { 'Idempotency-Key': key },
      );
      assert.equal(recovered.state, 'completed');
      assert.equal(recovered.conversationId, conversation);
      assert.ok(recovered.messages.some((m) => m.content === message));
      await json('/api/chat', { message }, customer, 'POST', {
        'Idempotency-Key': key,
      });
      const detail = await json(
        `/api/tickets/${ticket.id}`,
        undefined,
        customer,
      );
      assert.deepEqual(
        detail.events.map((e) => e.body),
        ['Нужна помощь с услугой', 'Обращение принято'],
      );
      const thread = await json(
        `/api/analytics?conversation=${conversation}`,
        undefined,
        admin,
      );
      assert.ok(thread.messages.some((m) => m.content === message));
      const journey = await json(
        `/api/analytics?visitor=${visitor}`,
        undefined,
        admin,
      );
      assert.equal(
        journey.events.filter((e) => e.kind === 'chat_turn').length,
        1,
      );
      assert.equal(
        (await call('/api/analytics', undefined, stranger)).status,
        403,
      );
      assert.equal(
        (await call(`/api/tickets/${ticket.id}`, undefined, stranger)).status,
        404,
      );
      assert.equal(
        (await json('/api/analytics', undefined, admin)).chatTotals.prompts,
        1,
      );
      assert.equal(outboundAttempts, 0);
      const overview = await json('/api/overview', undefined, admin);
      assert.equal(overview.summary.customers, 2);
      assert.equal(overview.summary.conversations, 1);
      assert.equal(overview.summary.openTickets, 1);
      assert.equal(overview.recentTickets[0].id, ticket.id);
    },
  );
  await check(
    'scheduled cleanup runs without traffic, ignores other cron jobs and preserves business data',
    async () => {
      const db = await runtime.getD1Database('DB');
      await db
        .prepare("UPDATE site_documents SET value=? WHERE key='analytics'")
        .bind(JSON.stringify({ enabled: false, retentionDays: 30 }))
        .run();
      await db
        .prepare(
          'INSERT INTO analytics_events (id,visitor_id,kind,path,target,referrer,device,value,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          'expired-for-cron',
          'test-visitor',
          'page_view',
          '/',
          '',
          '',
          'mobile',
          0,
          Date.now() - 100 * 86400000,
        )
        .run();
      const snapshotBefore = await snapshot();
      const worker = await runtime.getWorker();
      assert.equal(
        (await worker.scheduled({ cron: '0 0 * * *' })).outcome,
        'ok',
      );
      assert.deepEqual(await snapshot(), snapshotBefore);
      assert.equal(
        (
          await worker.scheduled({
            cron: '17 * * * *',
            scheduledTime: new Date('2099-01-01'),
          })
        ).outcome,
        'ok',
      );
      const snapshotAfter = await snapshot();
      assert.equal(
        snapshotAfter.tables.analytics_events.count,
        snapshotBefore.tables.analytics_events.count - 1,
      );
      for (const [table, value] of Object.entries(snapshotBefore.tables))
        if (table !== 'analytics_events')
          assert.deepEqual(snapshotAfter.tables[table], value, table);
      assert.equal(
        (await worker.scheduled({ cron: '17 * * * *' })).outcome,
        'ok',
      );
      assert.deepEqual(await snapshot(), snapshotAfter);
    },
  );
  await check(
    'invalid retention reports a failed scheduled event without deleting data',
    async () => {
      const db = await runtime.getD1Database('DB');
      await db
        .prepare(
          "UPDATE site_documents SET value='invalid-json' WHERE key='analytics'",
        )
        .run();
      const beforeFailure = await snapshot();
      assert.equal(
        (await (await runtime.getWorker()).scheduled({ cron: '17 * * * *' }))
          .outcome,
        'exception',
      );
      assert.deepEqual(await snapshot(), beforeFailure);
    },
  );
  await check(
    'Lite safely ignores a scheduled event without D1 or R2',
    async () => {
      await stop();
      await start(path.join(sandbox, 'lite'), 'lite');
      assert.equal(
        (await (await runtime.getWorker()).scheduled({ cron: '17 * * * *' }))
          .outcome,
        'ok',
      );
      assert.equal((await json('/api/health')).mode, 'lite');
      assert.equal(outboundAttempts, 0);
    },
  );
  report.passed = true;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stop();
  report.finishedAt = new Date().toISOString();
  report.outboundAttempts = outboundAttempts;
  await writeFile(
    path.join(sandbox, 'acceptance-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `${report.checks.filter((c) => c.passed).length}/${report.checks.length} acceptance checks passed. Artifacts: ${sandbox}`,
  );
}
