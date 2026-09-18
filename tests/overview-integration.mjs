import assert from 'node:assert/strict';

export async function overviewTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  const read = async (period = '30d') => {
    const r = await call(
      `/api/overview?period=${period}`,
      undefined,
      adminCookie,
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'private, no-store');
    return r.json();
  };
  await check(
    'overview requires admin browser session and rejects foreign origin and invalid periods',
    async () => {
      for (const cookie of ['', aliceCookie])
        assert.equal(
          (await call('/api/overview', undefined, cookie)).status,
          403,
        );
      for (const headers of [
        { authorization: 'Bearer invalid' },
        { origin: 'https://foreign.invalid' },
        { 'sec-fetch-site': 'cross-site' },
      ])
        assert.equal(
          (await call('/api/overview', undefined, adminCookie, headers)).status,
          403,
        );
      for (const query of [
        'period=custom',
        'period=90d',
        'period=24h&period=7d',
        'userId=someone',
      ])
        assert.equal(
          (await call(`/api/overview?${query}`, undefined, adminCookie)).status,
          400,
        );
    },
  );
  await check(
    'overview counts actual period records and returns only allowed ticket fields',
    async () => {
      for (const period of ['24h', '7d', '30d']) {
        const value = await read(period),
          from = Math.ceil(value.from / 1000),
          to = Math.ceil(value.to / 1000);
        const expected = (
          await sql(`SELECT
        (SELECT COUNT(*) FROM users WHERE role='customer' AND created_at>=${from} AND created_at<${to}) AS customers,
        (SELECT COUNT(*) FROM orders WHERE created_at>=${from} AND created_at<${to}) AS orders,
        (SELECT COUNT(*) FROM bookings WHERE created_at>=${from} AND created_at<${to}) AS bookings,
        (SELECT COUNT(*) FROM support_tickets WHERE created_at>=${value.from} AND created_at<${value.to}) AS tickets`)
        )[0];
        for (const [key, count] of Object.entries(expected))
          assert.equal(value.summary[key], count, key);
        assert.ok(value.summary.conversations > 0);
        assert.equal(value.period, period);
        assert.ok(value.recentTickets.length <= 5);
        for (const ticket of value.recentTickets)
          assert.deepEqual(Object.keys(ticket).sort(), [
            'createdAt',
            'id',
            'status',
            'subject',
          ]);
        assert.ok(!JSON.stringify(value).includes('password'));
      }
    },
  );
  await check(
    'overview excludes expired payment holds, past and cancelled bookings from upcoming tasks',
    async () => {
      const baseline = await read(),
        now = Math.floor(Date.now() / 1000);
      const values = [
        ['confirmed', 'not_required', 'NULL', now + 3600],
        ['confirmed', 'pending', now - 100, now + 3600],
        ['pending_payment', 'pending', now + 600, now + 3600],
        ['pending_payment', 'pending', now - 100, now + 3600],
        ['cancelled', 'not_required', 'NULL', now + 3600],
        ['confirmed', 'not_required', 'NULL', now - 100],
        ['confirmed', 'not_required', 'NULL', now + 9 * 86400],
      ];
      await sql(
        `INSERT INTO bookings (id,service,status,payment_status,hold_expires_at,starts_at,created_at,updated_at) VALUES ${values.map(([status, payment, hold, starts], index) => `('overview-${index}','Overview fixture','${status}','${payment}',${hold},${starts},${now},${now})`).join(',')}`,
      );
      const after = await read();
      assert.equal(
        after.summary.upcomingBookings,
        baseline.summary.upcomingBookings + 2,
      );
      assert.equal(after.summary.bookings, baseline.summary.bookings + 7);
      await sql("DELETE FROM bookings WHERE id LIKE 'overview-%'");
    },
  );
  await check(
    'overview fails on database errors rather than returning fake zeroes',
    async () => {
      await sql(
        'ALTER TABLE support_tickets RENAME TO overview_unavailable_tickets',
      );
      try {
        const r = await call('/api/overview', undefined, adminCookie);
        assert.equal(r.status, 503);
        const body = await r.json();
        assert.ok(body.error);
        assert.equal(body.summary, undefined);
      } finally {
        await sql(
          'ALTER TABLE overview_unavailable_tickets RENAME TO support_tickets',
        );
      }
    },
  );
  await check(
    'overview read quota and OpenAPI private contract are explicit',
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 21 }, () =>
          call('/api/overview', undefined, adminCookie),
        ),
      );
      assert.ok(responses.some((r) => r.status === 429));
      assert.ok(responses.every((r) => [200, 429].includes(r.status)));
      const spec = await (await call('/api/openapi')).json();
      assert.deepEqual(spec.paths['/overview'].get.security, [
        { cookieAuth: [] },
      ]);
    },
  );
}
