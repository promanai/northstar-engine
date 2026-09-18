import assert from 'node:assert/strict';
export async function bookingTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
  bobCookie,
}) {
  let product,
    resource,
    slotA,
    slotB,
    slotC,
    slotD,
    winner,
    winnerCookie,
    loserCookie,
    bookingB;
  const start = Math.floor(Date.now() / 1000) + 3 * 86400;
  const iso = (seconds) => new Date(seconds * 1000).toISOString();
  const slots = (body, cookie = adminCookie) =>
    call('/api/booking-slots', body, cookie);
  const addSlot = (at, resourceId = resource.id) =>
    slots({
      action: 'create_slot',
      resourceId,
      productId: product.id,
      startsAt: iso(at),
      endsAt: iso(at + 1800),
    });
  const reserve = (slot, cookie, key = crypto.randomUUID(), extra = {}) =>
    call(
      '/api/bookings',
      { slotId: slot.id, customerNote: 'PRIVATE-BOOKING-NOTE', ...extra },
      cookie,
      { 'idempotency-key': key },
    );
  const change = (booking, cookie, body) =>
    call(
      `/api/bookings/${booking.id}`,
      { revision: booking.revision, ...body },
      cookie,
      {},
      'PATCH',
    );
  const detail = async (booking, cookie) =>
    (await call(`/api/bookings/${booking.id}`, undefined, cookie)).json();
  await check(
    'booking availability is public but customer records and schedule administration are protected',
    async () => {
      assert.equal((await call('/api/bookings')).status, 401);
      assert.equal((await call('/api/booking-slots?managed=1')).status, 403);
      assert.equal(
        (await call('/api/booking-slots?managed=1', undefined, aliceCookie))
          .status,
        403,
      );
      assert.equal(
        (
          await slots(
            { action: 'create_resource', name: 'fake', timeZone: 'UTC' },
            aliceCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (await slots({ action: 'create_resource' }, '')).status,
        401,
      );
      const publicResponse = await call('/api/booking-slots');
      assert.equal(publicResponse.status, 200);
      assert.equal(publicResponse.headers.get('cache-control'), 'no-store');
    },
  );
  await check(
    'booking resource and service setup validates timezone and future slot intervals',
    async () => {
      const r = await call(
        '/api/products',
        {
          title: 'Booking service',
          slug: 'booking-service',
          kind: 'service',
          shortDescription: 'Appointment',
          price: 12500,
          currency: 'RUB',
          aiInstructions: 'PRIVATE-SERVICE-INSTRUCTIONS',
          active: true,
        },
        adminCookie,
      );
      assert.equal(r.status, 201);
      product = (await r.json()).product;
      assert.equal(
        (
          await slots({
            action: 'create_resource',
            name: 'Desk',
            timeZone: 'Mars/Invalid',
          })
        ).status,
        400,
      );
      resource = await (
        await slots({
          action: 'create_resource',
          name: 'Expert',
          timeZone: 'Europe/Moscow',
        })
      ).json();
      for (const [a, b] of [
        [iso(start - 10 * 86400), iso(start - 10 * 86400 + 1800)],
        ['2026-09-10T12:00', iso(start)],
        [iso(start), iso(start - 1)],
      ])
        assert.equal(
          (
            await slots({
              action: 'create_slot',
              resourceId: resource.id,
              productId: product.id,
              startsAt: a,
              endsAt: b,
            })
          ).status,
          400,
        );
      slotA = await (await addSlot(start)).json();
      slotB = await (await addSlot(start + 3600)).json();
      slotC = await (await addSlot(start + 7200)).json();
      slotD = await (await addSlot(start + 10800)).json();
      assert.ok(slotA.id && slotB.id && slotC.id && slotD.id);
    },
  );
  await check(
    'resource interval collision is atomic; adjacent intervals and independent resources are allowed',
    async () => {
      const results = await Promise.all([
        addSlot(start + 14400),
        addSlot(start + 15000),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      assert.equal((await addSlot(start + 600)).status, 409);
      assert.equal((await addSlot(start + 1800)).status, 200);
      const other = await (
        await slots({
          action: 'create_resource',
          name: 'Second',
          timeZone: 'UTC',
        })
      ).json();
      assert.equal((await addSlot(start, other.id)).status, 200);
    },
  );
  await check(
    'slot discovery exposes whitelisted service/time/price, not customer data or private instructions',
    async () => {
      const response = await call(`/api/booking-slots?productId=${product.id}`);
      const data = await response.json();
      assert.ok(data.slots.some((s) => s.id === slotA.id));
      assert.equal(
        data.slots.find((s) => s.id === slotA.id).timeZone,
        'Europe/Moscow',
      );
      assert.equal(JSON.stringify(data).includes('PRIVATE'), false);
      assert.equal(JSON.stringify(data).includes('customerId'), false);
      assert.equal(
        (await call('/api/booking-slots?from=not-a-date')).status,
        400,
      );
    },
  );
  await check(
    'booking writes require same origin, auth and idempotency; reject forged fields and foreign customer',
    async () => {
      assert.equal((await reserve(slotA, '')).status, 401);
      assert.equal(
        (await call('/api/bookings', { slotId: slotA.id }, aliceCookie)).status,
        400,
      );
      assert.equal(
        (await reserve(slotA, aliceCookie, crypto.randomUUID(), { price: 1 }))
          .status,
        400,
      );
      const bob = (
        await (await call('/api/auth/me', undefined, bobCookie)).json()
      ).user;
      assert.equal(
        (
          await reserve(slotA, aliceCookie, crypto.randomUUID(), {
            customerId: bob.id,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call('/api/bookings', { slotId: slotA.id }, aliceCookie, {
            origin: 'https://attacker.invalid',
            'idempotency-key': crypto.randomUUID(),
          })
        ).status,
        403,
      );
    },
  );
  await check(
    'two customers racing for one slot produce exactly one confirmed booking',
    async () => {
      const result = await Promise.all([
        reserve(slotA, aliceCookie),
        reserve(slotA, bobCookie),
      ]);
      assert.deepEqual(
        result.map((r) => r.status).sort((a, b) => a - b),
        [201, 409],
      );
      const index = result.findIndex((r) => r.status === 201);
      winnerCookie = [aliceCookie, bobCookie][index];
      loserCookie = [bobCookie, aliceCookie][index];
      winner = (await result[index].json()).booking;
      assert.equal(winner.price, 12500);
      assert.equal(winner.status, 'confirmed');
      assert.equal(
        (
          await sql(
            `SELECT count(*) AS count FROM bookings WHERE slot_id='${slotA.id}' AND status='confirmed'`,
          )
        )[0].count,
        1,
      );
      const publicSlots = await (await call('/api/booking-slots')).json();
      assert.equal(
        publicSlots.slots.some((s) => s.id === slotA.id),
        false,
      );
    },
  );
  await check(
    'concurrent booking retries return the same record and exactly one history event',
    async () => {
      const key = crypto.randomUUID();
      const results = await Promise.all([
        reserve(slotB, loserCookie, key),
        reserve(slotB, loserCookie, key),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 201],
      );
      const a = await results[0].json(),
        b = await results[1].json();
      assert.equal(a.booking.id, b.booking.id);
      assert.equal(a.events.length, 1);
      assert.equal(b.events.length, 1);
      bookingB = a.booking;
      assert.equal((await reserve(slotC, loserCookie, key)).status, 409);
    },
  );
  await check(
    'booking list/detail/history and mutations reject another customer',
    async () => {
      assert.equal(
        (await call(`/api/bookings/${winner.id}`, undefined, loserCookie))
          .status,
        404,
      );
      assert.equal(
        (await change(winner, loserCookie, { action: 'cancel' })).status,
        404,
      );
      const mine = await (
        await call('/api/bookings', undefined, loserCookie)
      ).json();
      assert.equal(
        mine.bookings.some((b) => b.id === winner.id),
        false,
      );
      assert.equal(
        (await change(winner, winnerCookie, { action: 'complete' })).status,
        403,
      );
      assert.equal(
        (await change(winner, adminCookie, { action: 'complete' })).status,
        409,
      );
    },
  );
  await check(
    'failed move retains original slot; successful move preserves price snapshot and increments revision',
    async () => {
      assert.equal(
        (
          await change(winner, winnerCookie, {
            action: 'reschedule',
            slotId: slotB.id,
          })
        ).status,
        409,
      );
      assert.equal(
        (await detail(winner, winnerCookie)).booking.slotId,
        slotA.id,
      );
      await call(
        `/api/products/${product.id}`,
        { price: 99900, title: 'Changed title' },
        adminCookie,
        {},
        'PATCH',
      );
      const moved = await change(winner, winnerCookie, {
        action: 'reschedule',
        slotId: slotC.id,
      });
      assert.equal(moved.status, 200);
      const data = await moved.json();
      winner = data.booking;
      assert.equal(winner.slotId, slotC.id);
      assert.equal(winner.revision, 1);
      assert.equal(winner.price, 12500);
      assert.equal(winner.service, 'Booking service');
      assert.equal(data.events.length, 2);
      assert.equal(
        (await change(winner, winnerCookie, { action: 'cancel', revision: 0 }))
          .status,
        409,
      );
    },
  );
  await check(
    'competing moves to the same slot admit one winner without losing the other reservation',
    async () => {
      const results = await Promise.all([
        change(winner, winnerCookie, {
          action: 'reschedule',
          slotId: slotD.id,
        }),
        change(bookingB, loserCookie, {
          action: 'reschedule',
          slotId: slotD.id,
        }),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      winner = (await detail(winner, winnerCookie)).booking;
      bookingB = (await detail(bookingB, loserCookie)).booking;
      assert.equal(
        [winner.slotId, bookingB.slotId].filter((id) => id === slotD.id).length,
        1,
      );
      assert.equal(winner.status, 'confirmed');
      assert.equal(bookingB.status, 'confirmed');
    },
  );
  await check(
    'closing resource blocks new reservations but keeps existing bookings readable',
    async () => {
      assert.equal(
        (
          await slots({
            action: 'set_resource',
            id: resource.id,
            active: false,
            revision: 0,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await slots({
            action: 'set_resource',
            id: resource.id,
            active: true,
            revision: 0,
          })
        ).status,
        409,
      );
      assert.equal((await reserve(slotA, winnerCookie)).status, 409);
      assert.equal(
        (await detail(winner, winnerCookie)).booking.status,
        'confirmed',
      );
      assert.equal(
        (
          await slots({
            action: 'set_resource',
            id: resource.id,
            active: true,
            revision: 1,
          })
        ).status,
        200,
      );
    },
  );
  await check(
    'cancel releases a slot, cannot be resurrected, and closed slots retain interval exclusivity',
    async () => {
      const releasedSlot = winner.slotId;
      const response = await change(winner, winnerCookie, { action: 'cancel' });
      assert.equal(response.status, 200);
      winner = (await response.json()).booking;
      assert.equal(
        (
          await change(winner, winnerCookie, {
            action: 'reschedule',
            slotId: slotA.id,
          })
        ).status,
        409,
      );
      const replacement = await reserve({ id: releasedSlot }, loserCookie);
      assert.equal(replacement.status, 201);
      assert.equal(
        (
          await slots({
            action: 'set_slot',
            id: slotA.id,
            available: false,
            revision: 0,
          })
        ).status,
        200,
      );
      assert.equal((await reserve(slotA, winnerCookie)).status, 409);
      assert.equal((await addSlot(start)).status, 409);
      assert.equal(
        (
          await slots({
            action: 'set_slot',
            id: slotA.id,
            available: true,
            revision: 1,
          })
        ).status,
        200,
      );
    },
  );
  await check(
    'past booking cannot be changed by a customer and only owner can complete it',
    async () => {
      const now = Math.floor(Date.now() / 1000);
      await sql(
        `UPDATE bookings SET starts_at=${now - 3600}, ends_at=${now - 1800}, payment_status='paid', hold_expires_at=NULL WHERE id='${bookingB.id}'`,
      );
      assert.equal(
        (await change(bookingB, loserCookie, { action: 'cancel' })).status,
        409,
      );
      assert.equal(
        (await change(bookingB, loserCookie, { action: 'complete' })).status,
        403,
      );
      const result = await change(bookingB, adminCookie, {
        action: 'complete',
      });
      assert.equal(result.status, 200);
      assert.equal((await result.json()).booking.status, 'completed');
    },
  );
  await check(
    'booking and event are rolled back together if history storage fails',
    async () => {
      const before = (await sql('SELECT count(*) AS count FROM bookings'))[0]
        .count;
      await sql(
        "CREATE TRIGGER test_booking_event_failure BEFORE INSERT ON booking_events BEGIN SELECT RAISE(ABORT, 'test failure'); END",
      );
      const failed = await reserve(slotA, winnerCookie);
      assert.equal(failed.status, 503);
      assert.equal(
        (await sql('SELECT count(*) AS count FROM bookings'))[0].count,
        before,
      );
      await sql('DROP TRIGGER test_booking_event_failure');
    },
  );
  await check(
    'client MCP can discover, reserve, read and cancel own bookings but not change schedules',
    async () => {
      const mint = async (scopes) =>
        (
          await (
            await call(
              '/api/tokens',
              { name: 'booking-agent', scopes },
              winnerCookie,
            )
          ).json()
        ).token;
      const token = await mint(['bookings:read', 'bookings:write']),
        reader = await mint(['bookings:read']);
      const rpc = async (name, args = {}, bearer = token) =>
        (
          await call(
            '/api/mcp',
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name, arguments: args },
            },
            '',
            { authorization: `Bearer ${bearer}` },
          )
        ).json();
      const headers = { authorization: `Bearer ${token}` };
      const listed = await (
        await call(
          '/api/mcp',
          { jsonrpc: '2.0', id: 1, method: 'tools/list' },
          '',
          headers,
        )
      ).json();
      assert.ok(listed.result.tools.some((t) => t.name === 'create_booking'));
      assert.ok(listed.result.tools.some((t) => t.name === 'checkout_booking'));
      assert.equal(
        listed.result.tools.some((t) => t.name === 'manage_booking_schedule'),
        false,
      );
      assert.equal(
        Object.hasOwn(
          listed.result.tools.find((t) => t.name === 'create_booking')
            .inputSchema.properties,
          'customerId',
        ),
        false,
      );
      assert.ok(
        (
          await rpc('manage_booking_schedule', {
            action: 'create_resource',
            name: 'x',
            timeZone: 'UTC',
          })
        ).error,
      );
      assert.ok(
        (
          await rpc(
            'create_booking',
            { slotId: slotA.id, idempotencyKey: crypto.randomUUID() },
            reader,
          )
        ).error,
      );
      const available = await rpc('list_booking_slots', {
        productId: product.id,
      });
      assert.ok(
        available.result.structuredContent.slots.some((s) => s.id === slotA.id),
      );
      const created = await rpc('create_booking', {
        slotId: slotA.id,
        idempotencyKey: crypto.randomUUID(),
      });
      assert.equal(created.result.isError, undefined);
      const b = created.result.structuredContent.booking;
      assert.equal(
        (await rpc('get_booking', { id: b.id })).result.structuredContent
          .booking.id,
        b.id,
      );
      assert.equal(
        (
          await rpc('update_booking', {
            id: b.id,
            revision: b.revision,
            action: 'complete',
          })
        ).result.isError,
        true,
      );
      assert.equal(
        (
          await rpc('update_booking', {
            id: b.id,
            revision: b.revision,
            action: 'cancel',
          })
        ).result.structuredContent.booking.status,
        'cancelled',
      );
      assert.equal(
        (await call('/api/booking-slots?managed=1', undefined, '', headers))
          .status,
        403,
      );
    },
  );
  await check(
    'booking OpenAPI documents idempotency, revisions, units and authenticated boundaries',
    async () => {
      const spec = await (await call('/api/openapi')).json();
      assert.ok(
        spec.paths['/bookings'].post.parameters.some(
          (p) => p.name === 'Idempotency-Key',
        ),
      );
      assert.ok(spec.paths['/bookings/{id}'].patch.responses['409']);
      assert.ok(spec.paths['/bookings/{id}/checkout'].post);
      assert.ok(spec.paths['/bookings/{id}/refund'].post);
      assert.deepEqual(spec.paths['/booking-slots'].get.security, []);
    },
  );
  await check(
    'owner MCP reads managed resources and uses the same guarded schedule operations',
    async () => {
      const rpc = async (name, args) =>
        (
          await call(
            '/api/mcp',
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name, arguments: args },
            },
            adminCookie,
          )
        ).json();
      const data = await rpc('list_booking_schedule', {});
      assert.ok(
        data.result.structuredContent.resources.some(
          (r) => r.id === resource.id,
        ),
      );
      assert.ok(
        data.result.structuredContent.slots.some((s) => s.id === slotA.id),
      );
      const denied = await rpc('manage_booking_schedule', {
        action: 'create_slot',
        resourceId: resource.id,
        productId: product.id,
        startsAt: iso(start),
        endsAt: iso(start + 1800),
      });
      assert.equal(denied.result.isError, true);
      const created = await rpc('manage_booking_schedule', {
        action: 'create_resource',
        name: 'MCP resource',
        timeZone: 'UTC',
      });
      assert.ok(created.result.structuredContent.id);
    },
  );
  await check(
    'legacy booking stays readable and cannot bypass slot rules; scheduled services cannot be deleted',
    async () => {
      const now = Math.floor(Date.now() / 1000),
        legacyId = crypto.randomUUID();
      const user = (
        await (await call('/api/auth/me', undefined, winnerCookie)).json()
      ).user;
      await sql(
        `INSERT INTO bookings (id, customer_id, service, status, created_at, updated_at) VALUES ('${legacyId}', '${user.id}', 'Legacy appointment', 'pending', ${now}, ${now})`,
      );
      const data = await detail({ id: legacyId }, winnerCookie);
      assert.equal(data.booking.slotId, null);
      assert.equal(data.booking.service, 'Legacy appointment');
      assert.equal(
        (await change(data.booking, adminCookie, { action: 'cancel' })).status,
        409,
      );
      assert.equal(
        (
          await call(
            `/api/products/${product.id}`,
            undefined,
            adminCookie,
            {},
            'DELETE',
          )
        ).status,
        409,
      );
    },
  );
  await check(
    'paid bookings expose a hold, accept an idempotent payment webhook, and release expired holds',
    async () => {
      const paymentSlot = await (
        await addSlot(start + 20000)
      ).json();
      const reserved = await reserve(paymentSlot, aliceCookie);
      assert.equal(reserved.status, 201);
      const pending = (await reserved.json()).booking;
      assert.equal(pending.status, 'confirmed');
      assert.equal(pending.paymentStatus, 'pending');
      assert.ok(pending.holdExpiresAt > Math.floor(Date.now() / 1000));
      assert.equal(
        (
          await call(
            `/api/bookings/${pending.id}/checkout`,
            {},
            aliceCookie,
          )
        ).status,
        409,
      );
      const intentId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await sql(
        `INSERT INTO booking_payment_intents (id, booking_id, amount, currency, status, expires_at, created_at, updated_at) VALUES ('${intentId}', '${pending.id}', ${pending.price}, '${pending.currency}', 'pending', ${pending.holdExpiresAt}, ${now}, ${now})`,
      );
      const payload = {
        eventId: 'booking-payment-event-1',
        intentId,
        bookingId: pending.id,
        status: 'paid',
        amount: pending.price,
        currency: pending.currency,
      };
      assert.equal(
        (
          await call('/api/webhooks/booking-payment', payload, '', {
            'x-payment-secret': 'test-only-payment-secret-not-for-production',
          })
        ).status,
        200,
      );
      const paid = await detail(pending, aliceCookie);
      assert.equal(paid.booking.paymentStatus, 'paid');
      assert.equal(paid.booking.holdExpiresAt, null);
      assert.equal(paid.events.at(-1).action, 'payment_paid');
      const replay = await call('/api/webhooks/booking-payment', payload, '', {
        'x-payment-secret': 'test-only-payment-secret-not-for-production',
      });
      assert.equal(replay.status, 200);
      assert.equal((await replay.json()).replayed, true);
      const refunded = await call('/api/webhooks/booking-payment', {
        ...payload,
        eventId: 'booking-payment-refund-1',
        status: 'refunded',
        providerPaymentId: 'pi_fixture_payment_intent',
      }, '', {
        'x-payment-secret': 'test-only-payment-secret-not-for-production',
      });
      assert.equal(refunded.status, 200);
      assert.equal((await detail(pending, aliceCookie)).booking.paymentStatus, 'refunded');

      const expiredSlot = await (
        await addSlot(start + 22000)
      ).json();
      const expiredResponse = await reserve(expiredSlot, aliceCookie);
      assert.equal(expiredResponse.status, 201);
      const expired = (await expiredResponse.json()).booking;
      await sql(
        `UPDATE bookings SET hold_expires_at=${now - 1} WHERE id='${expired.id}'`,
      );
      const available = await (
        await call(`/api/booking-slots?productId=${product.id}`)
      ).json();
      assert.ok(available.slots.some((slot) => slot.id === expiredSlot.id));
      const expiredDetail = await detail(expired, aliceCookie);
      assert.equal(expiredDetail.booking.status, 'cancelled');
      assert.equal(expiredDetail.booking.paymentStatus, 'expired');
      assert.equal(expiredDetail.events.at(-1).action, 'payment_expired');
    },
  );
}
