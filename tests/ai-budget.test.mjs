import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import {
  aiBudgetLimits,
  budgetWindows,
  budgetView,
  paidRequestsEnabled,
  runBudgeted,
} from '../lib/ai-budget-policy.ts';

const now = new Date('2026-09-11T12:00:00Z');
const policy = aiBudgetLimits({
  AI_DAILY_REQUEST_LIMIT: '3',
  AI_MONTHLY_REQUEST_LIMIT: '5',
});

void test('AI quota configuration has bounded defaults and rejects malformed values', () => {
  assert.deepEqual(aiBudgetLimits({}), {
    enabled: true,
    dailyRequests: 100,
    monthlyRequests: 1000,
    maxInputBytes: 131072,
    maxOutputTokens: 4096,
  });
  for (const value of ['', '-1', '1e3', '1.5', ' 20', 'NaN', '10000001'])
    assert.throws(() => aiBudgetLimits({ AI_DAILY_REQUEST_LIMIT: value }));
  for (const value of ['', 'yes', 'TRUE'])
    assert.throws(() => paidRequestsEnabled(value));
  assert.equal(paidRequestsEnabled('false'), false);
  assert.equal(paidRequestsEnabled(undefined), true);
  assert.equal(
    aiBudgetLimits({ AI_MONTHLY_REQUEST_LIMIT: '0' }).monthlyRequests,
    0,
  );
});

void test('AI quota periods are UTC calendar days/months including leap years', () => {
  const leap = budgetWindows(new Date('2028-02-29T23:59:59Z'));
  assert.equal(leap.dayReset, '2028-03-01T00:00:00.000Z');
  assert.equal(leap.monthReset, leap.dayReset);
  assert.equal(
    budgetWindows(new Date('2026-12-31T23:59:59Z')).monthReset,
    '2027-01-01T00:00:00.000Z',
  );
  assert.equal(
    budgetWindows(new Date('2026-09-11T23:00:00-04:00')).day,
    '2026-09-12',
  );
  const view = budgetView(
    policy,
    { day: '2026-09-10', month: '2026-09', day_requests: 3, month_requests: 4 },
    now,
  );
  assert.equal(view.daily.used, 0);
  assert.equal(view.monthly.remaining, 1);
});

void test('AI kill switch, zero quota and payload bounds block before storage or transport', async () => {
  const db = {
    prepare() {
      throw new Error('must not access DB');
    },
  };
  const run = () => {
    throw new Error('must not contact provider');
  };
  for (const [limits, bytes, tokens, status] of [
    [{ ...policy, enabled: false }, 1, 128, 503],
    [{ ...policy, dailyRequests: 0 }, 1, 128, 429],
    [{ ...policy, monthlyRequests: 0 }, 1, 128, 429],
    [policy, policy.maxInputBytes + 1, 128, 413],
    [policy, 1, policy.maxOutputTokens + 1, 400],
    [policy, NaN, 128, 413],
  ])
    await assert.rejects(runBudgeted(db, limits, bytes, tokens, run, now), {
      status,
    });
});

void test('all Standard paid entrypoints use quota adapter, Lite retains stateless controls', () => {
  for (const name of ['app/api/chat/route.ts', 'app/api/ai/route.ts']) {
    const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
    assert.ok(source.includes('await generateBudgetedResponse('));
    assert.equal(/\bgenerateResponse\(/.test(source), false);
  }
  for (const name of ['lib/lite-api.ts', 'lib/lite-realtime.ts']) {
    const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
    assert.ok(source.includes('assertPaidRequestsEnabled()'));
    assert.equal(source.includes('generateBudgetedResponse'), false);
  }
});

void test('atomic AI quota reservation against isolated Cloudflare D1', async (t) => {
  // Real local workerd/D1 binding, no credentials and no external AI requests.
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } }',
    compatibilityDate: '2026-05-15',
    d1Databases: ['DB'],
  });
  try {
    const db = await mf.getD1Database('DB');
    await db.exec(
      readFileSync(
        new URL('../drizzle/0014_overrated_warlock.sql', import.meta.url),
        'utf8',
      ).replaceAll('\n', ' '),
    );
    let calls = 0;
    const run = async () => ++calls;
    const row = () =>
      db.prepare("SELECT * FROM ai_request_budget WHERE id = 'site'").first();

    await t.test(
      'parallel calls cannot overspend last daily slot',
      async () => {
        const results = await Promise.allSettled(
          Array.from({ length: 20 }, () =>
            runBudgeted(db, policy, 100, 128, run, now),
          ),
        );
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 3);
        assert.equal(calls, 3);
        for (const result of results.filter((r) => r.status === 'rejected')) {
          assert.equal(result.reason.status, 429);
          assert.equal(result.reason.retryAfter, 43200);
        }
        assert.equal((await row()).month_requests, 3);
      },
    );
    await t.test(
      'new day resets only daily count; failures consume reserved attempts',
      async () => {
        const next = new Date('2026-09-12T12:00:00Z');
        await assert.rejects(
          runBudgeted(
            db,
            policy,
            100,
            128,
            async () => {
              calls++;
              throw new Error('uncertain timeout');
            },
            next,
          ),
          /uncertain timeout/,
        );
        await runBudgeted(db, policy, 100, 128, run, next);
        assert.equal((await row()).day_requests, 2);
        assert.equal((await row()).month_requests, 5);
        await assert.rejects(runBudgeted(db, policy, 100, 128, run, next), {
          status: 429,
          retryAfter: 1598400,
        });
        assert.equal(calls, 5);
      },
    );
    await t.test(
      'provider and task changes or lower ceilings do not reset counters',
      async () => {
        await assert.rejects(
          runBudgeted(
            db,
            { ...policy, dailyRequests: 1, monthlyRequests: 2 },
            100,
            128,
            run,
            now,
          ),
          { status: 429 },
        );
        assert.equal((await row()).month_requests, 5);
      },
    );
    await t.test(
      'new month resets both counters, stale in-flight day cannot reset them backwards',
      async () => {
        await runBudgeted(
          db,
          policy,
          100,
          128,
          run,
          new Date('2026-10-01T00:00:00Z'),
        );
        assert.equal((await row()).day_requests, 1);
        assert.equal((await row()).month_requests, 1);
        await assert.rejects(runBudgeted(db, policy, 100, 128, run, now), {
          status: 429,
        });
        assert.equal((await row()).month, '2026-10');
      },
    );
    await t.test(
      'quota storage failure never calls provider; one row uses primary key index',
      async () => {
        const plan = await db
          .prepare(
            "EXPLAIN QUERY PLAN SELECT * FROM ai_request_budget WHERE id = 'site'",
          )
          .all();
        assert.match(JSON.stringify(plan.results), /USING INDEX.*\(id=\?\)/);
        await db.exec('PRAGMA optimize');
        const before = calls;
        await db.exec('DROP TABLE ai_request_budget'); // Only this in-memory fixture.
        await assert.rejects(runBudgeted(db, policy, 100, 128, run, now));
        assert.equal(calls, before);
      },
    );
  } finally {
    await mf.dispose();
  }
});
