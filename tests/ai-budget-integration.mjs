import assert from 'node:assert/strict';

export async function aiBudgetTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  await check(
    'AI quota is private, UTC based, and missing credentials do not spend attempts',
    async () => {
      const response = await call('/api/ai', undefined, adminCookie);
      assert.equal(response.status, 200);
      const { budget } = await response.json();
      assert.equal(budget.scope, 'site');
      assert.equal(budget.accounting, 'reserved_attempts');
      assert.equal(budget.dailyRequests, 100);
      assert.equal(budget.monthlyRequests, 1000);
      assert.equal(budget.daily.used, 0);
      assert.equal(budget.monthly.used, 0);
      assert.equal((await call('/api/ai', undefined, aliceCookie)).status, 403);
    },
  );
  await check(
    'AI quota reads persisted counters and demo chat does not consume them',
    async () => {
      const now = new Date().toISOString();
      await sql(
        `INSERT INTO ai_request_budget (id, day, month, day_requests, month_requests) VALUES ('site', '${now.slice(0, 10)}', '${now.slice(0, 7)}', 99, 999)`,
      );
      const view = async () =>
        (await (await call('/api/ai', undefined, adminCookie)).json()).budget;
      const before = await view();
      assert.equal(before.daily.remaining, 1);
      assert.equal(before.monthly.remaining, 1);
      const demo = await call(
        '/api/chat',
        { message: 'BUDGET-DEMO-NO-SPEND' },
        aliceCookie,
      );
      assert.equal(demo.status, 200);
      assert.equal((await demo.json()).mode, 'demo');
      assert.deepEqual(await view(), before);
      await sql("DELETE FROM ai_request_budget WHERE id = 'site'"); // Isolated fixture only.
    },
  );
}
