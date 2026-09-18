import assert from 'node:assert/strict';
export async function commerceTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
  bobCookie,
}) {
  await check(
    'commerce: OpenAPI describes request key, revision, checkout and payment events',
    async () => {
      const spec = await (await call('/api/openapi')).json();
      assert.ok(
        spec.paths['/orders'].post.parameters.some(
          (p) => p.name === 'Idempotency-Key' && p.required,
        ),
      );
      assert.ok(
        spec.paths['/orders/{id}'].patch.requestBody.content[
          'application/json'
        ].schema.required.includes('revision'),
      );
      assert.ok(spec.paths['/orders/{id}/checkout'].post.responses['502']);
      assert.ok(
        spec.paths['/webhooks/payment'].post.requestBody.content[
          'application/json'
        ].schema.required.includes('amount'),
      );
    },
  );
  const create = (body, cookie = aliceCookie, key = crypto.randomUUID()) =>
    call('/api/orders', body, cookie, { 'idempotency-key': key });
  const patch = (id, body, cookie = adminCookie) =>
    call(`/api/orders/${id}`, body, cookie, {}, 'PATCH');
  const me = await (await call('/api/auth/me', undefined, aliceCookie)).json();
  let product, order;
  await check(
    'commerce: owner can create a priced public service',
    async () => {
      const response = await call(
        '/api/products',
        {
          title: 'Test commerce service',
          slug: 'test-commerce',
          shortDescription: 'Public offer',
          description: 'Public service details',
          price: 125050,
          currency: 'RUB',
          aiInstructions: 'COMMERCE-PRIVATE-MARKER',
        },
        adminCookie,
      );
      assert.equal(response.status, 201);
      product = (await response.json()).product;
    },
  );
  await check(
    'commerce: product page is SSR with no private AI instructions',
    async () => {
      const response = await call('/catalog/test-commerce');
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes('Test commerce service'));
      assert.ok(html.includes('Public service details'));
      assert.ok(!html.includes('COMMERCE-PRIVATE-MARKER'));
      assert.match(html, /<title[^>]*>Test commerce service/);
    },
  );
  await check(
    'commerce: price validation and product mass-assignment protection',
    async () => {
      for (const body of [
        { price: -1 },
        { price: 1.2 },
        { price: '1' },
        { id: 'replace-id' },
        { slug: '../login' },
        { currency: 'bad' },
      ])
        assert.equal(
          (
            await call(
              `/api/products/${product.id}`,
              body,
              adminCookie,
              {},
              'PATCH',
            )
          ).status,
          400,
        );
      assert.equal(
        (
          await call(
            '/api/products',
            { title: 'Blocked', shortDescription: 'Blocked' },
            aliceCookie,
          )
        ).status,
        403,
      );
    },
  );
  await check(
    'commerce: order requires authentication and stable request key',
    async () => {
      assert.equal((await create({ productId: product.id }, '')).status, 401);
      assert.equal(
        (await call('/api/orders', { productId: product.id }, aliceCookie))
          .status,
        400,
      );
    },
  );
  await check(
    'commerce: reject forged totals, statuses and customer ownership',
    async () => {
      for (const body of [
        { quantity: 0 },
        { quantity: 1.5 },
        { quantity: '2' },
        { quantity: 100 },
        { amount: 1 },
        { status: 'paid' },
        { paymentUrl: 'javascript:alert(1)' },
      ])
        assert.equal(
          (await create({ productId: product.id, ...body })).status,
          400,
        );
      assert.equal(
        (await create({ productId: product.id, customerId: 'other-customer' }))
          .status,
        403,
      );
    },
  );
  const key = crypto.randomUUID();
  const payload = () => ({
    productId: product.id,
    quantity: 2,
    customerNote: 'Customer request',
  });
  await check(
    'commerce: concurrent retries create exactly one order and event',
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => create(payload(), aliceCookie, key)),
      );
      assert.equal(responses.filter((r) => r.status === 201).length, 1);
      assert.ok(responses.every((r) => [200, 201].includes(r.status)));
      const data = await Promise.all(responses.map((r) => r.json()));
      assert.equal(new Set(data.map((d) => d.order.id)).size, 1);
      order = data[0].order;
      assert.equal(order.amount, 250100);
      assert.equal(order.status, 'pending');
      assert.equal(order.customerId, me.user.id);
      assert.equal(order.paymentUrl, null);
      const detail = await (
        await call(`/api/orders/${order.id}`, undefined, aliceCookie)
      ).json();
      assert.equal(detail.events.length, 1);
    },
  );
  await check(
    'commerce: same key with different payload conflicts',
    async () => {
      assert.equal(
        (await create({ ...payload(), quantity: 3 }, aliceCookie, key)).status,
        409,
      );
    },
  );
  await check(
    'commerce: private order, list and audit trail reject another customer',
    async () => {
      assert.equal(
        (await call(`/api/orders/${order.id}`, undefined, bobCookie)).status,
        404,
      );
      assert.equal(
        (await patch(order.id, { status: 'cancelled', revision: 0 }, bobCookie))
          .status,
        404,
      );
      assert.equal(
        (await call(`/api/orders/${order.id}/checkout`, {}, bobCookie)).status,
        404,
      );
      const bob = await (
        await call('/api/orders', undefined, bobCookie)
      ).json();
      assert.equal(bob.orders.length, 0);
      const own = await call('/api/orders?mine=1', undefined, aliceCookie);
      assert.equal(own.headers.get('cache-control'), 'no-store');
      assert.equal((await own.json()).orders.length, 1);
      assert.equal('requestKey' in order, false);
      assert.equal('requestHash' in order, false);
    },
  );
  await check(
    'commerce: catalog edits do not alter existing order snapshot',
    async () => {
      assert.equal(
        (
          await call(
            `/api/products/${product.id}`,
            { title: 'Updated title', price: 200000 },
            adminCookie,
            {},
            'PATCH',
          )
        ).status,
        200,
      );
      const saved = (
        await (
          await call(`/api/orders/${order.id}`, undefined, aliceCookie)
        ).json()
      ).order;
      assert.equal(saved.productTitle, 'Test commerce service');
      assert.equal(saved.amount, 250100);
      assert.equal(saved.unitPrice, 125050);
      assert.equal((await create(payload(), aliceCookie, key)).status, 200);
    },
  );
  await check(
    'commerce: hiding blocks new orders but not historical access',
    async () => {
      assert.equal(
        (
          await call(
            `/api/products/${product.id}`,
            { active: false },
            adminCookie,
            {},
            'PATCH',
          )
        ).status,
        200,
      );
      assert.equal((await call('/catalog/test-commerce')).status, 404);
      assert.equal((await create({ productId: product.id })).status, 404);
      assert.equal(
        (await call(`/api/orders/${order.id}`, undefined, aliceCookie)).status,
        200,
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
      await call(
        `/api/products/${product.id}`,
        { active: true },
        adminCookie,
        {},
        'PATCH',
      );
    },
  );
  await check(
    'commerce: manual checkout cannot fake a payment URL or paid status',
    async () => {
      assert.equal(
        (await call(`/api/orders/${order.id}/checkout`, {}, aliceCookie))
          .status,
        409,
      );
      assert.equal(
        (await patch(order.id, { status: 'paid', revision: 0 }, aliceCookie))
          .status,
        403,
      );
      assert.equal(
        (
          await patch(order.id, {
            status: 'paid',
            revision: 0,
            paymentUrl: 'javascript:alert(1)',
          })
        ).status,
        400,
      );
      assert.equal(
        (await patch(order.id, { status: 'refunded', revision: 0 })).status,
        409,
      );
    },
  );
  await check(
    'commerce: owner confirms received manual payment with audit event',
    async () => {
      const r = await patch(order.id, { status: 'paid', revision: 0 });
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.equal(data.order.status, 'paid');
      assert.equal(data.order.revision, 1);
      assert.equal(data.events.length, 2);
      assert.ok(data.events.some((e) => e.note.includes('вручную')));
      assert.equal(
        (
          await patch(
            order.id,
            { status: 'cancelled', revision: 0 },
            aliceCookie,
          )
        ).status,
        409,
      );
    },
  );
  await check(
    'commerce: conflicting status updates do not create duplicate events',
    async () => {
      const replies = await Promise.all([
        patch(order.id, { status: 'refunded', revision: 1 }),
        patch(order.id, { status: 'refunded', revision: 1 }),
      ]);
      assert.deepEqual(
        replies.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      const result = await (
        await call(`/api/orders/${order.id}`, undefined, aliceCookie)
      ).json();
      assert.equal(result.events.length, 3);
      assert.equal(result.order.status, 'refunded');
      assert.equal(
        (await patch(order.id, { status: 'pending', revision: 2 })).status,
        409,
      );
    },
  );
  await check(
    'commerce: customer can cancel own pending manual order',
    async () => {
      const created = await create({ productId: product.id }, bobCookie);
      assert.equal(created.status, 201);
      const id = (await created.json()).order.id;
      assert.equal(
        (await patch(id, { status: 'cancelled', revision: 0 }, bobCookie))
          .status,
        200,
      );
    },
  );
  await check(
    'commerce: owner MCP uses same idempotency and status rules',
    async () => {
      const args = {
        productId: product.id,
        customerId: me.user.id,
        idempotencyKey: crypto.randomUUID(),
      };
      const invoke = (name, args) =>
        call(
          '/api/mcp',
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name, arguments: args },
          },
          adminCookie,
        );
      const first = await (await invoke('create_order', args)).json();
      assert.ok(!first.error, JSON.stringify(first.error));
      const id = first.result.structuredContent.order.id;
      const second = await (await invoke('create_order', args)).json();
      assert.equal(second.result.structuredContent.order.id, id);
      const bad = await (
        await invoke('update_order', { id, status: 'refunded', revision: 0 })
      ).json();
      assert.ok(bad.result.isError);
      assert.equal(
        (await (await invoke('get_order', { id })).json()).result
          .structuredContent.events.length,
        1,
      );
    },
  );
  let external;
  await check(
    'commerce: payment webhook rejects wrong secret and mismatched amount',
    async () => {
      external = (
        await (await create({ productId: product.id }, adminCookie)).json()
      ).order;
      await sql(
        `UPDATE orders SET payment_provider = 'external' WHERE id = '${external.id}'`,
      );
      const body = {
        eventId: 'test-payment-event',
        orderId: external.id,
        status: 'paid',
        amount: external.amount,
        currency: external.currency,
      };
      assert.equal((await call('/api/webhooks/payment', body)).status, 401);
      assert.equal(
        (
          await call('/api/webhooks/payment', { ...body, amount: 1 }, '', {
            'x-payment-secret': 'test-only-payment-secret-not-for-production',
          })
        ).status,
        409,
      );
      assert.equal(
        (await patch(external.id, { status: 'paid', revision: 0 })).status,
        409,
      );
    },
  );
  await check(
    'commerce: matching payment event is replay-safe and cannot regress status',
    async () => {
      const headers = {
        'x-payment-secret': 'test-only-payment-secret-not-for-production',
      };
      const body = {
        eventId: 'test-payment-event',
        orderId: external.id,
        status: 'paid',
        amount: external.amount,
        currency: external.currency,
      };
      assert.equal(
        (await call('/api/webhooks/payment', body, '', headers)).status,
        200,
      );
      const replay = await call('/api/webhooks/payment', body, '', headers);
      assert.equal(replay.status, 200);
      assert.equal((await replay.json()).replayed, true);
      assert.equal(
        (
          await call(
            '/api/webhooks/payment',
            { ...body, eventId: 'late-cancel', status: 'cancelled' },
            '',
            headers,
          )
        ).status,
        409,
      );
      const d = await (
        await call(`/api/orders/${external.id}`, undefined, adminCookie)
      ).json();
      assert.equal(d.order.status, 'paid');
      assert.equal(d.events.length, 2);
    },
  );
  await check(
    'commerce: order and creation event rollback together on storage failure',
    async () => {
      await sql(
        "CREATE TRIGGER test_order_event_failure BEFORE INSERT ON order_events BEGIN SELECT RAISE(ABORT,'test order event failure'); END",
      );
      const before = (await sql('SELECT count(*) AS n FROM orders'))[0].n;
      assert.equal(
        (await create({ productId: product.id }, adminCookie)).status,
        503,
      );
      assert.equal(
        (await sql('SELECT count(*) AS n FROM orders'))[0].n,
        before,
      );
      await sql('DROP TRIGGER test_order_event_failure');
    },
  );
}
