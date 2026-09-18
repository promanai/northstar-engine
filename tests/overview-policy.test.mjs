import test from 'node:test';
import assert from 'node:assert/strict';
import { overviewRange } from '../lib/overview-policy.ts';

void test('overview periods are rolling UTC windows and default to 30 days', () => {
  const now = Date.UTC(2026, 8, 11, 12);
  for (const [period, days] of [
    ['24h', 1],
    ['7d', 7],
    ['30d', 30],
  ]) {
    assert.deepEqual(overviewRange(new URLSearchParams({ period }), now), {
      period,
      from: now - days * 86400000,
      to: now,
    });
  }
  assert.equal(overviewRange(new URLSearchParams(), now).period, '30d');
});
void test('overview rejects duplicate, unknown and unsupported query parameters', () => {
  for (const query of [
    'period=',
    'period=custom',
    'period=90d',
    'period=24h&period=7d',
    'from=0',
    'role=admin',
  ])
    assert.throws(() => overviewRange(new URLSearchParams(query)));
});
