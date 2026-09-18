import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import {
  cleanupAnalyticsBatch,
  cleanupAnalyticsScheduled,
} from '../lib/analytics-policy.ts';

void test('bounded analytics retention against isolated D1', async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {}',
    d1Databases: ['DB'],
  });
  const now = Date.UTC(2026, 8, 11),
    day = 86400000;
  try {
    const db = await mf.getD1Database('DB');
    for (const statement of [
      'CREATE TABLE site_documents (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      'CREATE TABLE analytics_events (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)',
      'CREATE INDEX analytics_events_created_idx ON analytics_events(created_at,id)',
      'CREATE TABLE messages (id TEXT PRIMARY KEY, content TEXT)',
      "INSERT INTO messages VALUES ('keep','Never delete original conversations')",
    ])
      await db.prepare(statement).run();
    const count = async () =>
      (await db.prepare('SELECT COUNT(*) AS n FROM analytics_events').first())
        .n;
    const settings = (retentionDays) =>
      db
        .prepare(
          "INSERT INTO site_documents VALUES ('analytics',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .bind(JSON.stringify({ enabled: false, retentionDays }))
        .run();
    const seed = async (n) => {
      await db.prepare('DELETE FROM analytics_events').run();
      await db
        .prepare(
          'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<?) INSERT INTO analytics_events SELECT CAST(x AS TEXT),? FROM n',
        )
        .bind(n, now - 100 * day)
        .run();
    };
    await t.test(
      'default retention is strict at boundary and preserves current and future events',
      async () => {
        for (const [id, age] of [
          ['old', 30 * day + 1],
          ['boundary', 30 * day],
          ['current', 0],
          ['future', -day],
        ])
          await db
            .prepare('INSERT INTO analytics_events VALUES (?,?)')
            .bind(id, now - age)
            .run();
        assert.equal((await cleanupAnalyticsBatch(db, now)).deleted, 1);
        assert.equal(await count(), 3);
        assert.equal((await cleanupAnalyticsBatch(db, now)).deleted, 0);
      },
    );
    await t.test(
      'scheduled job is capped at 10000 and resumes next run, even with collection disabled',
      async () => {
        await settings(7);
        await seed(10001);
        assert.deepEqual(await cleanupAnalyticsScheduled(db, now), {
          deleted: 10000,
          batches: 5,
          limitReached: true,
        });
        assert.equal(await count(), 1);
        assert.deepEqual(await cleanupAnalyticsScheduled(db, now), {
          deleted: 1,
          batches: 1,
          limitReached: false,
        });
        assert.equal(
          (await db.prepare('SELECT COUNT(*) AS n FROM messages').first()).n,
          1,
        );
      },
    );
    await t.test(
      'malformed retention fails closed before deletion',
      async () => {
        await seed(1);
        for (const value of [
          'invalid-json',
          'null',
          '{"enabled":false,"retentionDays":0}',
          '{"enabled":false,"retentionDays":365}',
        ]) {
          await db
            .prepare("UPDATE site_documents SET value=? WHERE key='analytics'")
            .bind(value)
            .run();
          await assert.rejects(cleanupAnalyticsBatch(db, now));
          assert.equal(await count(), 1);
        }
        await settings(30);
        await assert.rejects(cleanupAnalyticsBatch(db, NaN));
        assert.equal(await count(), 1);
      },
    );
    await t.test(
      'retention increase between read and delete prevents stale deletion',
      async () => {
        await settings(7);
        await db
          .prepare('UPDATE analytics_events SET created_at=?')
          .bind(now - 10 * day)
          .run();
        const racing = {
          prepare(query) {
            const statement = db.prepare(query);
            if (!query.startsWith('DELETE')) return statement;
            return {
              bind(...values) {
                return {
                  async run() {
                    await settings(90);
                    return statement.bind(...values).run();
                  },
                };
              },
            };
          },
        };
        assert.equal((await cleanupAnalyticsBatch(racing, now)).deleted, 0);
        assert.equal((await cleanupAnalyticsBatch(db, now)).deleted, 0);
        assert.equal(await count(), 1);
      },
    );
    await t.test(
      'overlapping cleanup batches remain atomic and bounded',
      async () => {
        await seed(4001);
        const results = await Promise.all([
          cleanupAnalyticsBatch(db, now),
          cleanupAnalyticsBatch(db, now),
        ]);
        assert.deepEqual(
          results.map((r) => r.deleted),
          [2000, 2000],
        );
        assert.equal(await count(), 1);
      },
    );
    await t.test('expiry scan uses the existing time index', async () => {
      const result = await db
        .prepare(
          'EXPLAIN QUERY PLAN SELECT id FROM analytics_events WHERE created_at<? ORDER BY created_at,id LIMIT 2000',
        )
        .bind(now)
        .all();
      assert.match(
        JSON.stringify(result.results),
        /USING COVERING INDEX analytics_events_created_idx/,
      );
      await db.prepare('PRAGMA optimize').run();
    });
  } finally {
    await mf.dispose();
  }
});
