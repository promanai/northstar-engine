import assert from 'node:assert/strict';
export async function agentTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
  bobCookie,
}) {
  const mint = async (session, body) =>
    call(
      '/api/tokens',
      { name: 'test-agent', expiresInDays: 30, ...body },
      session,
    );
  const headers = (token) => ({ authorization: `Bearer ${token}` });
  const rpc = async (token, method, params = {}, extra = {}) =>
    call('/api/mcp', { jsonrpc: '2.0', id: 1, method, params }, '', {
      ...headers(token),
      ...extra,
    });
  const invoke = async (token, name, args = {}) =>
    (await rpc(token, 'tools/call', { name, arguments: args })).json();
  const failed = (data) =>
    assert.ok(data.error || data.result?.isError, JSON.stringify(data));
  let token, reader, ownerToken, tokenId, bobId, product, order;
  await check(
    'agent token issuance validates role, scope and lifetime',
    async () => {
      assert.equal((await mint('', {})).status, 401);
      assert.equal(
        (await mint(aliceCookie, { scopes: ['*'], confirmFullAccess: true }))
          .status,
        403,
      );
      assert.equal(
        (await mint(aliceCookie, { scopes: ['site:write'] })).status,
        403,
      );
      assert.equal((await mint(aliceCookie, { expiresInDays: 0 })).status, 400);
      assert.equal((await mint(adminCookie, { scopes: ['*'] })).status, 403);
      const response = await mint(aliceCookie, {
        scopes: [
          'catalog:read',
          'orders:read',
          'orders:write',
          'checkout:write',
        ],
      });
      assert.equal(response.status, 201);
      const data = await response.json();
      token = data.token;
      assert.ok(Date.parse(data.expiresAt) > Date.now());
      reader = (
        await (
          await mint(aliceCookie, { name: 'reader', scopes: ['orders:read'] })
        ).json()
      ).token;
      ownerToken = (
        await (
          await mint(adminCookie, {
            name: 'owner-read',
            scopes: ['catalog:read'],
          })
        ).json()
      ).token;
    },
  );
  await check(
    'tokens are hashed and only the owner sees their metadata',
    async () => {
      const response = await call('/api/tokens', undefined, aliceCookie);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      tokenId = data.tokens.find((t) => t.name === 'test-agent').id;
      assert.equal(JSON.stringify(data).includes(token), false);
      assert.equal(data.tokens.length, 2);
      const rows = await sql(
        `SELECT token_hash FROM api_tokens WHERE id='${tokenId}'`,
      );
      assert.match(rows[0].token_hash, /^[a-f0-9]{64}$/);
      const bobToken = (await (await mint(bobCookie, {})).json()).token;
      assert.ok(bobToken);
      bobId = (await (await call('/api/tokens', undefined, bobCookie)).json())
        .tokens[0].id;
      assert.equal(
        data.tokens.some((t) => t.id === bobId),
        false,
      );
    },
  );
  await check(
    'bearer tokens cannot mint tokens or fall back to a privileged cookie',
    async () => {
      assert.equal(
        (
          await call(
            '/api/tokens',
            { name: 'escalation' },
            adminCookie,
            headers(ownerToken),
          )
        ).status,
        401,
      );
      assert.equal(
        (await call('/api/orders', undefined, adminCookie, headers('invalid')))
          .status,
        401,
      );
      assert.equal(
        (await call('/api/tokens', undefined, '', headers(token))).status,
        401,
      );
    },
  );
  await check(
    'MCP handshake is authenticated and rejects cross-origin requests',
    async () => {
      assert.equal((await rpc('', 'initialize')).status, 401);
      assert.equal(
        (await rpc(token, 'initialize', {}, { origin: 'https://evil.test' }))
          .status,
        403,
      );
      const response = await rpc(token, 'initialize');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(
        (await response.json()).result.protocolVersion,
        '2025-03-26',
      );
    },
  );
  await check(
    'MCP discovery exposes only permitted tools without admin input fields',
    async () => {
      const data = await (await rpc(token, 'tools/list')).json();
      assert.equal(data.result.tools.length, 6);
      assert.equal(
        data.result.tools.some((t) => t.name === 'list_customers'),
        false,
      );
      assert.equal(
        data.result.tools.find((t) => t.name === 'create_order').inputSchema
          .properties.customerId,
        undefined,
      );
      assert.deepEqual(
        (await (await rpc(reader, 'tools/list')).json()).result.tools
          .map((t) => t.name)
          .sort((a, b) => a.localeCompare(b)),
        ['get_order', 'list_orders'],
      );
      failed(
        await invoke(token, 'site_update_settings', {
          key: 'public.x',
          value: {},
        }),
      );
      failed(
        await invoke(reader, 'create_order', {
          productId: 'anything',
          idempotencyKey: crypto.randomUUID(),
        }),
      );
    },
  );
  await check(
    'owner read-only token cannot mutate via MCP or direct REST',
    async () => {
      failed(await invoke(ownerToken, 'delete_product', { id: 'anything' }));
      assert.equal(
        (
          await call(
            '/api/products',
            { title: 'forged' },
            adminCookie,
            headers(ownerToken),
          )
        ).status,
        403,
      );
      assert.equal(
        (await call('/api/orders', {}, '', headers(reader))).status,
        401,
      );
      assert.equal(
        (await call('/api/orders/anything/checkout', {}, '', headers(reader)))
          .status,
        401,
      );
    },
  );
  await check(
    'client agent catalog never exposes internal instructions or inactive entries',
    async () => {
      const response = await call(
        '/api/products',
        {
          title: 'Agent service',
          slug: 'agent-service',
          shortDescription: 'Service',
          description: 'Description',
          price: 1500,
          currency: 'RUB',
          active: true,
          aiInstructions: 'PRIVATE_AGENT_SENTINEL',
        },
        adminCookie,
      );
      assert.equal(response.status, 201);
      product = (await response.json()).product;
      const result = await invoke(token, 'list_products');
      assert.ok(
        result.result.structuredContent.some((p) => p.id === product.id),
      );
      assert.equal(
        JSON.stringify(result).includes('PRIVATE_AGENT_SENTINEL'),
        false,
      );
      failed(await invoke(token, 'list_products', { includeInactive: true }));
    },
  );
  await check(
    'client agent order creation is replay-safe and visible in its REST account',
    async () => {
      const args = {
        productId: product.id,
        quantity: 2,
        idempotencyKey: crypto.randomUUID(),
      };
      const result = await invoke(token, 'create_order', args);
      assert.ok(!result.result?.isError, JSON.stringify(result));
      order = result.result.structuredContent.order;
      assert.equal(order.amount, 3000);
      assert.equal(
        (await invoke(token, 'create_order', args)).result.structuredContent
          .order.id,
        order.id,
      );
      const rows = (
        await (await call('/api/orders', undefined, aliceCookie)).json()
      ).orders;
      assert.ok(rows.some((o) => o.id === order.id));
      failed(await invoke(token, 'create_order', { ...args, quantity: '2' }));
      failed(await invoke(token, 'create_order', { ...args, amount: 1 }));
    },
  );
  await check(
    'client agent cannot create, read, cancel or checkout another client order',
    async () => {
      const bob = (
        await (await call('/api/auth/me', undefined, bobCookie)).json()
      ).user;
      failed(
        await invoke(token, 'create_order', {
          productId: product.id,
          customerId: bob.id,
          idempotencyKey: crypto.randomUUID(),
        }),
      );
      const other = (
        await (
          await call('/api/orders', { productId: product.id }, bobCookie, {
            'idempotency-key': crypto.randomUUID(),
          })
        ).json()
      ).order;
      for (const [name, args] of [
        ['get_order', { id: other.id }],
        ['update_order', { id: other.id, status: 'cancelled', revision: 0 }],
        ['checkout_order', { id: other.id }],
      ])
        failed(await invoke(token, name, args));
      assert.equal(
        (await call(`/api/orders/${other.id}`, undefined, '', headers(token)))
          .status,
        404,
      );
    },
  );
  await check(
    'agent may cancel its pending manual order but cannot mark payment received',
    async () => {
      failed(
        await invoke(token, 'update_order', {
          id: order.id,
          status: 'paid',
          revision: 0,
        }),
      );
      const result = await invoke(token, 'update_order', {
        id: order.id,
        status: 'cancelled',
        revision: 0,
      });
      assert.equal(result.result.structuredContent.order.status, 'cancelled');
    },
  );
  await check(
    'unconfigured checkout is explicit and does not pretend to charge money',
    async () => {
      const result = await invoke(token, 'create_order', {
        productId: product.id,
        idempotencyKey: crypto.randomUUID(),
      });
      const current = result.result.structuredContent.order;
      const checkout = await invoke(token, 'checkout_order', {
        id: current.id,
      });
      failed(checkout);
      assert.match(
        checkout.result.content[0].text,
        /Онлайн-оплата не подключена/,
      );
      assert.equal(
        (await invoke(token, 'get_order', { id: current.id })).result
          .structuredContent.order.status,
        'pending',
      );
    },
  );
  await check(
    'token revocation is ownership-bound, CSRF-protected and effective immediately',
    async () => {
      assert.equal(
        (await call(`/api/tokens?id=${bobId}`, {}, aliceCookie, {}, 'DELETE'))
          .status,
        404,
      );
      assert.equal(
        (
          await call(
            `/api/tokens?id=${tokenId}`,
            {},
            aliceCookie,
            { origin: 'https://evil.test' },
            'DELETE',
          )
        ).status,
        403,
      );
      assert.equal(
        (await call(`/api/tokens?id=${tokenId}`, {}, aliceCookie, {}, 'DELETE'))
          .status,
        200,
      );
      assert.equal((await rpc(token, 'tools/list')).status, 401);
      assert.equal(
        (await call('/api/orders', undefined, '', headers(token))).status,
        401,
      );
    },
  );
  await check(
    'expired tokens fail closed even when a valid session cookie is attached',
    async () => {
      await sql("UPDATE api_tokens SET expires_at=1 WHERE name='reader'");
      assert.equal((await rpc(reader, 'tools/list')).status, 401);
      assert.equal(
        (await call('/api/orders', undefined, adminCookie, headers(reader)))
          .status,
        401,
      );
    },
  );
  await check(
    'customer-management scope cannot edit or delete administrator accounts',
    async () => {
      const customerManager = (
        await (
          await mint(adminCookie, {
            name: 'customer-manager',
            scopes: ['customers:write'],
          })
        ).json()
      ).token;
      const me = (
        await (await call('/api/auth/me', undefined, adminCookie)).json()
      ).user;
      failed(
        await invoke(customerManager, 'update_customer', {
          id: me.id,
          email: 'hijack@example.test',
        }),
      );
      failed(await invoke(customerManager, 'delete_customer', { id: me.id }));
      assert.equal(
        (await (await call('/api/auth/me', undefined, adminCookie)).json()).user
          .email,
        me.email,
      );
      assert.equal(
        (
          await call(
            '/api/updates',
            undefined,
            adminCookie,
            headers(customerManager),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/auth/me',
            undefined,
            adminCookie,
            headers(customerManager),
          )
        ).status,
        401,
      );
    },
  );
  await check(
    'OpenAPI documents session-only token lifecycle and scoped MCP',
    async () => {
      const spec = await (await call('/api/openapi')).json();
      assert.deepEqual(spec.paths['/tokens'].post.security, [
        { cookieAuth: [] },
      ]);
      assert.ok(
        spec.paths['/tokens'].post.requestBody.content['application/json']
          .schema.properties.scopes,
      );
      assert.ok(
        spec.paths['/tokens'].delete.parameters.some(
          (p) => p.name === 'id' && p.required,
        ),
      );
      assert.ok(spec.paths['/mcp'].post.description.includes('result.isError'));
    },
  );
}
