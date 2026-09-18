import assert from 'node:assert/strict';
export async function adminTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  const assistant = async () =>
    (
      await (
        await call('/api/assistant?view=admin', undefined, adminCookie)
      ).json()
    ).assistant;
  const history = async () =>
    (
      await (
        await call('/api/assistant?view=history', undefined, adminCookie)
      ).json()
    ).versions;
  const write = (body, cookie = adminCookie, headers = {}) =>
    call('/api/assistant', body, cookie, headers, 'PUT');
  const mint = async (scopes) => {
    const r = await call(
      '/api/tokens',
      { name: 'admin-service-test', scopes, expiresInDays: 1 },
      adminCookie,
    );
    assert.equal(r.status, 201);
    return (await r.json()).token;
  };
  const bearer = (token) => ({ authorization: `Bearer ${token}` });
  const rpc = async (token, name, args = {}) =>
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
        bearer(token),
      )
    ).json();
  const failed = (value) =>
    assert.ok(value.error || value.result?.isError, JSON.stringify(value));
  const get = async (id) =>
    (await (await call(`/api/customers/${id}`, undefined, adminCookie)).json())
      .customer;
  const change = (
    id,
    body,
    method = 'PATCH',
    cookie = adminCookie,
    headers = {},
  ) => call(`/api/customers/${id}`, body, cookie, headers, method);
  const create = (body) =>
    call('/api/customers', { confirm: true, ...body }, adminCookie);
  let a, reader, writer, contact, profileCookie;
  await check(
    'assistant public projection hides prompt, versions and model routing',
    async () => {
      await sql(
        "INSERT INTO assistant_profiles (id,name,system_prompt,default_locale,active_model,status,created_at,updated_at) VALUES ('test-managed-legacy','Legacy','private legacy prompt','ru','demo','active',1,1)",
      );
      a = await assistant();
      assert.equal(a.revision, 0);
      assert.equal(a.systemPrompt, 'private legacy prompt');
      const r = await call('/api/assistant', undefined, adminCookie);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.deepEqual(Object.keys((await r.json()).assistant).sort(), [
        'defaultLocale',
        'name',
        'status',
      ]);
      assert.equal((await call('/api/assistant?view=admin')).status, 403);
      assert.equal(
        (await call('/api/assistant?view=history', undefined, aliceCookie))
          .status,
        403,
      );
    },
  );
  await check(
    'assistant rejects stale/missing versions, unknown fields and invalid payloads',
    async () => {
      for (const body of [
        { name: 'x' },
        { revision: 0, name: 'x' },
        { revision: 0, confirm: true, name: [] },
        { revision: 0, confirm: true, activeModel: 'paid-model' },
        { revision: 0, confirm: true, status: 'unknown' },
        { revision: 0, confirm: true, name: 'x'.repeat(121) },
      ])
        assert.equal((await write(body)).status, 400);
      assert.equal(
        (
          await write({ revision: 0, confirm: true, name: 'x' }, adminCookie, {
            origin: 'https://foreign.test',
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await write({
            revision: 0,
            confirm: true,
            systemPrompt: 'a'.repeat(65000),
          })
        ).status,
        413,
      );
      assert.equal(
        (await write({ revision: 0, confirm: true, name: 'x' }, aliceCookie))
          .status,
        403,
      );
      assert.equal((await history()).length, 0);
    },
  );
  await check(
    'assistant concurrent writes commit one change and one version with baseline',
    async () => {
      const result = await Promise.all(
        ['one', 'two'].map((name) =>
          write({
            revision: 0,
            confirm: true,
            name,
            systemPrompt: 'private updated prompt',
          }),
        ),
      );
      assert.deepEqual(
        result.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      a = await assistant();
      assert.equal(a.revision, 1);
      const events = await history();
      assert.deepEqual(
        events.map((e) => e.revision),
        [1, 0],
      );
      assert.equal(events[0].source, 'rest');
      assert.equal(
        (
          await sql(
            "SELECT system_prompt FROM assistant_profiles WHERE id='test-managed-legacy'",
          )
        )[0].system_prompt,
        'private legacy prompt',
      );
    },
  );
  await check(
    'assistant REST/MCP share scoped history, restoration and runtime enablement',
    async () => {
      // Isolated fixture: earlier suites already exercised token issuance limits.
      // Start this module with a fresh issuance window; production limits are unchanged.
      await sql("DELETE FROM rate_limits WHERE key LIKE 'tokens-create:%'");
      reader = await mint(['assistant:read', 'customers:read']);
      writer = await mint(['assistant:write', 'customers:write']);
      assert.equal(
        (await rpc(reader, 'get_assistant')).result.structuredContent.assistant
          .revision,
        1,
      );
      failed(
        await rpc(reader, 'update_assistant', {
          revision: 1,
          confirm: true,
          name: 'no',
        }),
      );
      failed(
        await rpc(writer, 'restore_assistant', {
          revision: 1,
          targetRevision: 0,
          confirm: true,
        }),
      );
      const disabled = await rpc(writer, 'update_assistant', {
        revision: 1,
        confirm: true,
        status: 'disabled',
      });
      assert.equal(disabled.result.structuredContent.assistant.revision, 2);
      assert.equal(
        disabled.result.structuredContent.assistant.systemPrompt,
        undefined,
      );
      assert.equal(
        (await call('/api/chat', { message: 'disabled check' }, aliceCookie))
          .status,
        503,
      );
      assert.equal(
        (await write({ revision: 2, targetRevision: 0, confirm: true })).status,
        200,
      );
      a = await assistant();
      assert.equal(a.status, 'active');
      assert.equal(a.systemPrompt, 'private legacy prompt');
      assert.equal((await history())[0].action, 'restore');
      assert.equal(
        (
          await call(
            '/api/assistant?view=admin',
            undefined,
            adminCookie,
            bearer(writer),
          )
        ).status,
        403,
      );
    },
  );
  await check(
    'assistant history storage failure rolls back profile and revision',
    async () => {
      const before = await assistant();
      await sql(
        "CREATE TRIGGER admin_fail_assistant BEFORE INSERT ON site_document_revisions WHEN NEW.document_key='assistant-profile' AND NEW.revision>0 BEGIN SELECT RAISE(ABORT,'test-assistant-journal'); END",
      );
      assert.equal(
        (
          await write({
            revision: before.revision,
            confirm: true,
            name: 'must rollback',
          })
        ).status,
        503,
      );
      await sql('DROP TRIGGER admin_fail_assistant');
      assert.deepEqual(await assistant(), before);
    },
  );
  await check(
    'customer create validates fields, requires confirmation and never leaks password',
    async () => {
      assert.equal(
        (await call('/api/customers', { email: 'a@example.test' }, adminCookie))
          .status,
        400,
      );
      for (const body of [
        { email: 42 },
        { email: 'a@example.test', role: 'admin' },
        { email: 'a@example.test', firstName: {} },
        { email: 'a@example.test', password: 'short' },
      ])
        assert.equal((await create(body)).status, 400);
      const r = await create({
        email: ' Managed@Example.Test ',
        firstName: 'Managed',
        password: 'Managed-test-password-31',
      });
      assert.equal(r.status, 201);
      contact = (await r.json()).customer;
      assert.equal(contact.email, 'managed@example.test');
      assert.equal(contact.revision, 0);
      assert.equal(contact.passwordHash, undefined);
      assert.equal(contact.mutationId, undefined);
      assert.equal(
        (await create({ email: 'managed@example.test' })).status,
        409,
      );
      assert.equal(
        (await call('/api/customers', undefined, aliceCookie)).status,
        403,
      );
      const h = await call(
        `/api/customers/${contact.id}/history`,
        undefined,
        adminCookie,
      );
      assert.equal(h.headers.get('cache-control'), 'no-store');
      assert.ok(!(await h.text()).includes('password'));
    },
  );
  await check(
    'customer role protection and read/write scopes apply to both transports',
    async () => {
      const me = (
        await (await call('/api/auth/me', undefined, adminCookie)).json()
      ).user;
      assert.equal(
        (
          await change(me.id, {
            confirm: true,
            revision: 0,
            firstName: 'attack',
          })
        ).status,
        404,
      );
      assert.equal(
        (await change(me.id, { confirm: true, revision: 0 }, 'DELETE')).status,
        404,
      );
      assert.equal(
        (
          await change(contact.id, {
            confirm: true,
            revision: 0,
            role: 'admin',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await change(
            contact.id,
            { confirm: true, revision: 0, firstName: 'attack' },
            'PATCH',
            '',
            bearer(reader),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/api/customers/${contact.id}/history`,
            undefined,
            '',
            bearer(reader),
          )
        ).status,
        200,
      );
      failed(await rpc(writer, 'get_customer', { id: contact.id }));
      const current = (await rpc(reader, 'get_customer', { id: contact.id }))
        .result.structuredContent.customer;
      assert.equal(current.id, contact.id);
      failed(
        await rpc(writer, 'update_customer', {
          id: me.id,
          confirm: true,
          revision: 0,
          email: 'attack@example.test',
        }),
      );
    },
  );
  await check(
    'customer concurrent changes use one revision and preserve immutable identity',
    async () => {
      const responses = await Promise.all(
        ['one', 'two'].map((firstName) =>
          change(contact.id, { revision: 0, confirm: true, firstName }),
        ),
      );
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      contact = await get(contact.id);
      assert.equal(contact.revision, 1);
      assert.equal(contact.role, 'customer');
      const result = await rpc(writer, 'update_customer', {
        id: contact.id,
        revision: 1,
        confirm: true,
        phone: '+1 202 555 0100',
      });
      assert.equal(result.result.structuredContent.customer.email, undefined);
      contact = await get(result.result.structuredContent.customer.id);
      assert.equal(contact.revision, 2);
      const events = (
        await (
          await call(
            `/api/customers/${contact.id}/history`,
            undefined,
            adminCookie,
          )
        ).json()
      ).versions;
      assert.deepEqual(
        events.map((e) => e.revision),
        [2, 1, 0],
      );
      assert.equal(events[0].source, 'mcp');
      assert.ok(events[0].tokenId);
    },
  );
  await check(
    'customer history failure rolls back changes and duplicate email is a conflict',
    async () => {
      await sql(
        "CREATE TRIGGER admin_fail_customer BEFORE INSERT ON customer_revisions WHEN NEW.action='update' BEGIN SELECT RAISE(ABORT,'test-customer-journal'); END",
      );
      assert.equal(
        (
          await change(contact.id, {
            revision: 2,
            confirm: true,
            firstName: 'rollback',
          })
        ).status,
        503,
      );
      await sql('DROP TRIGGER admin_fail_customer');
      assert.equal((await get(contact.id)).revision, 2);
      assert.equal(
        (
          await change(contact.id, {
            revision: 2,
            confirm: true,
            email: 'alice@example.test',
          })
        ).status,
        409,
      );
    },
  );
  await check(
    'self-service profile and admin edits share revision without lost updates',
    async () => {
      const login = await call('/api/auth/login', {
        email: contact.email,
        password: 'Managed-test-password-31',
      });
      assert.equal(login.status, 200);
      profileCookie = login.headers.get('set-cookie').split(';')[0];
      assert.equal(
        (
          await call(
            '/api/auth/me',
            { firstName: 'missing' },
            profileCookie,
            {},
            'PATCH',
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/auth/me',
            { revision: 2, firstName: 'Self' },
            profileCookie,
            {},
            'PATCH',
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await change(contact.id, {
            revision: 2,
            confirm: true,
            firstName: 'stale',
          })
        ).status,
        409,
      );
      const races = await Promise.all([
        call(
          '/api/auth/me',
          { revision: 3, firstName: 'Self race' },
          profileCookie,
          {},
          'PATCH',
        ),
        change(contact.id, {
          revision: 3,
          confirm: true,
          firstName: 'Admin race',
        }),
      ]);
      assert.deepEqual(
        races.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      contact = await get(contact.id);
      assert.equal(contact.revision, 4);
      const h = (
        await (
          await call(
            `/api/customers/${contact.id}/history`,
            undefined,
            adminCookie,
          )
        ).json()
      ).versions;
      assert.ok(h.some((e) => e.source === 'profile'));
    },
  );
  await check(
    'email change revokes customer sessions and tokens atomically',
    async () => {
      const token = (
        await (
          await call(
            '/api/tokens',
            {
              name: 'contact-token',
              scopes: ['catalog:read'],
              expiresInDays: 1,
            },
            profileCookie,
          )
        ).json()
      ).token;
      assert.ok(token);
      const r = await change(contact.id, {
        revision: 4,
        confirm: true,
        email: 'managed-new@example.test',
      });
      assert.equal(r.status, 200);
      contact = (await r.json()).customer;
      assert.equal(
        (await call('/api/auth/me', undefined, profileCookie)).status,
        401,
      );
      assert.equal(
        (
          await call(
            '/api/mcp',
            { jsonrpc: '2.0', id: 1, method: 'initialize' },
            '',
            bearer(token),
          )
        ).status,
        401,
      );
    },
  );
  await check(
    'linked customer deletion rolls back revocation and audit; unused deletion is explicit',
    async () => {
      const alice = (
        await (await call('/api/auth/me', undefined, aliceCookie)).json()
      ).user;
      const response = await change(
        alice.id,
        { revision: alice.revision, confirm: true },
        'DELETE',
      );
      assert.equal(response.status, 409);
      assert.equal(
        (await call('/api/auth/me', undefined, aliceCookie)).status,
        200,
      );
      assert.equal((await get(alice.id)).revision, alice.revision);
      assert.equal(
        (await change(contact.id, { revision: contact.revision }, 'DELETE'))
          .status,
        400,
      );
      const removed = await rpc(writer, 'delete_customer', {
        id: contact.id,
        revision: contact.revision,
        confirm: true,
      });
      assert.equal(removed.result.structuredContent.ok, true);
      assert.equal(
        (await call(`/api/customers/${contact.id}`, undefined, adminCookie))
          .status,
        404,
      );
      const events = (await rpc(reader, 'customer_history', { id: contact.id }))
        .result.structuredContent.versions;
      assert.equal(events[0].action, 'delete');
      assert.ok(!JSON.stringify(events).includes('password'));
    },
  );
  await check(
    'admin OpenAPI describes revisions and Lite-independent operation contracts',
    async () => {
      const doc = await (await call('/api/openapi')).json();
      assert.ok(doc.paths['/customers/{id}'].patch.requestBody);
      assert.ok(doc.paths['/customers/{id}/history'].get);
      assert.ok(doc.paths['/assistant'].put.requestBody);
      assert.equal(
        (await call('/api/customers?before=%20', undefined, adminCookie))
          .status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/assistant?view=history&before=NaN',
            undefined,
            adminCookie,
          )
        ).status,
        400,
      );
    },
  );
}
