import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instant,
  slotRange,
  validTimeZone,
  wallTimeToIso,
} from '../lib/booking-policy.ts';
import {
  validScopes,
  toolAllowed,
  bearerRouteAllowed,
} from '../lib/agent-policy.ts';
void test('booking dates require explicit offsets and bounded future duration', () => {
  assert.equal(
    instant('2026-09-10T12:00:00+03:00'),
    instant('2026-09-10T09:00:00Z'),
  );
  for (const invalid of [
    '2026-09-10T12:00',
    '2026-02-30T12:00:00Z',
    'yesterday',
    1,
    null,
  ])
    assert.throws(() => instant(invalid));
  const now = instant('2026-09-09T00:00:00Z');
  assert.deepEqual(
    slotRange('2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z', now),
    { start: now + 86400 + 9 * 3600, end: now + 86400 + 9.5 * 3600 },
  );
  for (const [start, end] of [
    ['2026-09-08T09:00:00Z', '2026-09-08T09:30:00Z'],
    ['2026-09-10T09:00:00Z', '2026-09-10T09:01:00Z'],
    ['2026-09-10T09:00:00Z', '2026-09-11T09:00:00Z'],
    ['2028-09-10T09:00:00Z', '2028-09-10T09:30:00Z'],
  ])
    assert.throws(() => slotRange(start, end, now));
});
void test('IANA conversion handles ordinary times and fractional offsets', () => {
  assert.equal(validTimeZone('Europe/Moscow'), true);
  assert.equal(validTimeZone('Mars/Olympus'), false);
  assert.equal(
    wallTimeToIso('2026-09-10T12:00', 'Europe/Moscow'),
    '2026-09-10T09:00:00.000Z',
  );
  assert.equal(
    wallTimeToIso('2026-09-10T12:00', 'Asia/Kathmandu'),
    '2026-09-10T06:15:00.000Z',
  );
  assert.equal(
    wallTimeToIso('2026-09-10T00:00', 'UTC'),
    '2026-09-10T00:00:00.000Z',
  );
});
void test('DST gaps and folds never silently shift appointment times', () => {
  assert.throws(() => wallTimeToIso('2026-03-08T02:30', 'America/New_York'));
  assert.throws(() => wallTimeToIso('2026-11-01T01:30', 'America/New_York'));
  assert.equal(
    wallTimeToIso('2026-11-01T03:30', 'America/New_York'),
    '2026-11-01T08:30:00.000Z',
  );
  assert.throws(() => wallTimeToIso('2026-02-30T10:00', 'UTC'));
});
void test('booking scopes allow own appointments, never resource administration', () => {
  assert.deepEqual(
    validScopes(['bookings:read', 'bookings:write'], 'customer'),
    ['bookings:read', 'bookings:write'],
  );
  assert.equal(
    toolAllowed('customer', ['bookings:read'], 'list_booking_slots'),
    true,
  );
  assert.equal(
    toolAllowed('customer', ['bookings:read'], 'create_booking'),
    false,
  );
  assert.equal(
    toolAllowed('customer', ['bookings:write'], 'create_booking'),
    true,
  );
  assert.equal(
    toolAllowed('customer', ['bookings:write'], 'manage_booking_schedule'),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/bookings/id', 'PATCH', ['bookings:read']),
    false,
  );
  assert.equal(
    bearerRouteAllowed('/api/booking-slots', 'GET', ['bookings:read']),
    true,
  );
});
