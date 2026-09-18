import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoPlans,
  defaultBilling,
  validateBilling,
  monthlyFees,
  billingAlerts,
} from '../lib/billing-policy.ts';
const entry = (patch = {}) => ({ ...defaultBilling.entries[0], ...patch });
test('billing has six explicit demo plans; unknown costs and status are not invented', () => {
  assert.equal(demoPlans.length, 6);
  assert.deepEqual(validateBilling(defaultBilling), defaultBilling);
  assert.equal(entry().fee, null);
  assert.equal(entry().plan, '');
  assert.deepEqual(monthlyFees(defaultBilling.entries), {});
});
test('billing schema rejects invalid money, dates, unknown fields and duplicate IDs', () => {
  for (const patch of [
    { fee: -1 },
    { fee: 1.5 },
    { fee: '12' },
    { renewal: '2026-02-30' },
    { renewal: '2026-13-01' },
    { period: '2026-00' },
    { spent: 5 },
    { plan: 'official-pro' },
    { status: '__proto__' },
    { apiKey: 'secret' },
  ])
    assert.throws(() => validateBilling({ entries: [entry(patch)] }));
  assert.throws(() => validateBilling({ entries: [entry(), entry()] }));
  assert.throws(() =>
    validateBilling({
      entries: Array.from({ length: 31 }, (_, i) => entry({ id: String(i) })),
    }),
  );
});
test('billing monthly estimates keep currencies separate and exclude cancelled/one-off/unknown fees', () => {
  assert.deepEqual(
    monthlyFees([
      entry({ status: 'active', fee: 12000, cycle: 'yearly' }),
      entry({ status: 'active', fee: 100, currency: 'EUR' }),
      entry({ status: 'cancelled', fee: 9999 }),
      entry({ status: 'active', fee: 500, cycle: 'once' }),
      entry({ status: 'active', fee: null }),
    ]),
    { USD: 1000, EUR: 100 },
  );
});
test('billing alerts include renewal today/expired, zero budget and quotas, but never stale consumption', () => {
  assert.ok(
    billingAlerts(entry({ renewal: '2026-09-11' }), '2026-09-11').includes(
      'Продление сегодня',
    ),
  );
  assert.ok(
    billingAlerts(entry({ renewal: '2026-09-10' }), '2026-09-11')[0].includes(
      'прошла',
    ),
  );
  const alert = billingAlerts(
    entry({
      period: '2026-09',
      spent: 0,
      budget: 0,
      requests: 10,
      requestLimit: 10,
    }),
    '2026-09-11',
  );
  assert.ok(alert.includes('Достигнут бюджет расходов'));
  assert.ok(alert.includes('Достигнут лимит запросов'));
  assert.ok(
    !billingAlerts(
      entry({ period: '2026-08', spent: 100, budget: 10 }),
      '2026-09-11',
    ).includes('Достигнут бюджет расходов'),
  );
  assert.deepEqual(
    billingAlerts(entry({ status: 'cancelled' }), '2026-09-11'),
    [],
  );
});
