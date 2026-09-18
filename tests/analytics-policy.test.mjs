import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsEvent,
  analyticsPath,
  analyticsHost,
  analyticsRange,
  analyticsSettings,
} from '../lib/analytics-policy.ts';
void test('analytics never accepts private paths, arbitrary form fields or forged chat events', () => {
  for (const path of [
    '/account/profile',
    '/admin',
    '/api/auth/login',
    '//evil.test',
    '/x/../secret',
    '/%61dmin',
    '/a b',
  ])
    assert.equal(analyticsPath(path), null);
  assert.equal(analyticsPath('/catalog?token=secret#email'), '/catalog');
  assert.equal(
    analyticsPath('/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8?token=secret'),
    '/услуги',
  );
  assert.equal(analyticsPath('/%61dmin/private'), null);
  assert.equal(analyticsPath('/%2Fexternal'), null);
  const event = {
    id: crypto.randomUUID(),
    kind: 'page_view',
    path: '/',
    device: 'desktop',
    referrer: 'https://example.org/search?password=hidden#secret',
  };
  assert.equal(analyticsEvent(event).referrer, 'example.org');
  assert.equal(analyticsHost('https://user:password@evil.test'), '');
  for (const fields of [
    { body: 'secret' },
    { kind: 'chat_turn' },
    { conversationId: 'forged' },
    { userId: 'other' },
    { createdAt: 1 },
    { value: 10 },
    { device: ['mobile'] },
  ])
    assert.throws(() => analyticsEvent({ ...event, ...fields }));
  assert.equal(
    analyticsEvent({ ...event, kind: 'scroll', value: 50 }).value,
    50,
  );
  assert.throws(() =>
    analyticsEvent({ ...event, kind: 'scroll', value: '50' }),
  );
});
void test('analytics periods are bounded UTC half-open ranges with valid calendar dates', () => {
  const now = Date.parse('2026-09-11T12:00:00Z');
  assert.equal(analyticsRange(new URLSearchParams(), now).from, now - 86400000);
  assert.equal(
    analyticsRange(new URLSearchParams('period=7d'), now).bucketMs,
    86400000,
  );
  for (const q of [
    'period=all',
    'period=24h&from=x',
    'period=custom&from=2026-02-31T00:00Z&to=2026-03-01T00:00Z',
    'period=custom&from=2026-01-01T00:00Z&to=2026-09-01T00:00Z',
    'period=custom&from=2027-01-01T00:00Z&to=2027-01-02T00:00Z',
  ])
    assert.throws(() => analyticsRange(new URLSearchParams(q), now));
  assert.equal(
    analyticsRange(
      new URLSearchParams(
        'period=custom&from=2026-09-01T00:00Z&to=2026-09-02T00:00Z',
      ),
      now,
    ).to,
    Date.parse('2026-09-02T00:00Z'),
  );
});
void test('analytics settings require explicit boolean and bounded retention', () => {
  assert.deepEqual(analyticsSettings({ enabled: true, retentionDays: 7 }), {
    enabled: true,
    retentionDays: 7,
  });
  for (const value of [
    { enabled: true, retentionDays: '30' },
    { enabled: 'true', retentionDays: 30 },
    { enabled: true, retentionDays: 365 },
    { enabled: true, retentionDays: 30, key: 'secret' },
  ])
    assert.throws(() => analyticsSettings(value));
});
