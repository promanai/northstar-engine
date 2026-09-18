import assert from 'node:assert/strict';
export async function ticketTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
  bobCookie,
}) {
  const payload = () => ({
    subject: 'Вопрос о переносе',
    body: 'Нужна помощь с записью',
    confirm: true,
    idempotencyKey: crypto.randomUUID(),
  });
  const create = (body, cookie = aliceCookie, headers = {}) =>
    call('/api/tickets', body, cookie, headers);
  const change = (id, body, cookie = aliceCookie, headers = {}) =>
    call(`/api/tickets/${id}`, body, cookie, headers, 'PATCH');
  const get = async (id, cookie = aliceCookie) =>
    (await call(`/api/tickets/${id}`, undefined, cookie)).json();
  const update = (revision, action = 'message') => ({
    revision,
    action,
    ...(action === 'message' ? { body: 'Ответ' } : {}),
    confirm: true,
    idempotencyKey: crypto.randomUUID(),
  });
  const mint = async (scopes, cookie = aliceCookie) => {
    const r = await call(
      '/api/tokens',
      { name: 'tickets-test', scopes, expiresInDays: 1 },
      cookie,
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
  let ticket, reader, writer;
  await check(
    'tickets create own durable thread, no simulated content or private credentials',
    async () => {
      assert.equal((await call('/api/tickets')).status, 401);
      const r = await create(payload());
      assert.equal(r.status, 201);
      ticket = await r.json();
      assert.equal(ticket.revision, 1);
      assert.equal(ticket.status, 'open');
      const detail = await get(ticket.id);
      assert.equal(detail.events.length, 1);
      assert.equal(detail.events[0].body, 'Нужна помощь с записью');
      assert.equal(detail.events[0].author, 'customer');
      const listResponse = await call('/api/tickets', undefined, aliceCookie);
      assert.match(listResponse.headers.get('cache-control'), /no-store/);
      const list = await listResponse.json();
      assert.equal(list.tickets.length, 1);
      assert.ok(!JSON.stringify(list).includes('Нужна помощь'));
      assert.ok(!JSON.stringify(detail).includes('fingerprint'));
      assert.ok(!JSON.stringify(detail).includes('password'));
    },
  );
  await check(
    'tickets enforce ownership, all-list administration and no bearer fallback',
    async () => {
      assert.equal(
        (await call(`/api/tickets/${ticket.id}`, undefined, bobCookie)).status,
        404,
      );
      assert.equal((await change(ticket.id, update(1), bobCookie)).status, 404);
      assert.equal(
        (await call('/api/tickets?all=true', undefined, aliceCookie)).status,
        403,
      );
      assert.equal(
        (await (await call('/api/tickets', undefined, bobCookie)).json())
          .tickets.length,
        0,
      );
      assert.equal(
        (await call(`/api/tickets/${ticket.id}`, undefined, adminCookie))
          .status,
        200,
      );
      assert.ok(
        (
          await (
            await call('/api/tickets?all=true', undefined, adminCookie)
          ).json()
        ).tickets.some((t) => t.id === ticket.id),
      );
      assert.equal(
        (await (await call('/api/tickets', undefined, adminCookie)).json())
          .tickets.length,
        0,
      );
      assert.equal(
        (await call('/api/tickets', undefined, adminCookie, bearer('bad')))
          .status,
        401,
      );
      assert.equal(
        (await create({ ...payload(), customerId: 'other' })).status,
        400,
      );
      assert.equal(
        (
          await create(payload(), aliceCookie, {
            origin: 'https://foreign.invalid',
          })
        ).status,
        403,
      );
      for (const q of ['all=yes', 'all=true&all=false', 'before=bad'])
        assert.equal(
          (await call(`/api/tickets?${q}`, undefined, adminCookie)).status,
          400,
        );
    },
  );
  await check(
    'ticket creation is idempotent under concurrent requests; no orphan tickets',
    async () => {
      const body = payload();
      const results = await Promise.all([create(body), create(body)]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 201],
      );
      const [one, two] = await Promise.all(results.map((r) => r.json()));
      assert.equal(one.id, two.id);
      assert.equal((await get(one.id)).events.length, 1);
      assert.equal((await create({ ...body, body: 'Другое' })).status, 409);
      assert.equal(
        (
          await sql(
            `SELECT COUNT(*) AS n FROM support_tickets WHERE mutation_id NOT IN (SELECT id FROM ticket_events)`,
          )
        )[0].n,
        0,
      );
    },
  );
  await check(
    'ticket replies serialize by revision and replay without new messages',
    async () => {
      const one = update(1),
        two = update(1);
      const responses = await Promise.all([
        change(ticket.id, one),
        change(ticket.id, two, adminCookie),
      ]);
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      const winner = responses[0].ok ? one : two,
        cookie = responses[0].ok ? aliceCookie : adminCookie;
      const replay = await change(ticket.id, winner, cookie);
      assert.equal(replay.status, 200);
      assert.equal((await replay.json()).replayed, true);
      const detail = await get(ticket.id);
      assert.equal(detail.ticket.revision, 2);
      assert.equal(detail.events.length, 2);
      const adminReply = await change(ticket.id, update(2), adminCookie);
      assert.equal(adminReply.status, 200);
      assert.equal((await get(ticket.id)).events.at(-1).author, 'support');
    },
  );
  await check(
    'tickets close/reopen preserve history and reject messages to a closed thread',
    async () => {
      const close = update(3, 'close');
      assert.equal((await change(ticket.id, close, adminCookie)).status, 200);
      assert.equal((await change(ticket.id, update(4))).status, 409);
      assert.equal((await change(ticket.id, update(4, 'reopen'))).status, 200);
      assert.equal((await change(ticket.id, close, adminCookie)).status, 200);
      const detail = await get(ticket.id);
      assert.equal(detail.ticket.status, 'open');
      assert.equal(detail.ticket.revision, 5);
      assert.deepEqual(
        detail.events.slice(-2).map((e) => e.action),
        ['close', 'reopen'],
      );
    },
  );
  await check(
    'ticket MCP tools share REST scopes, identity and idempotency',
    async () => {
      reader = await mint(['tickets:read']);
      writer = await mint(['tickets:write']);
      const body = payload();
      const created = await rpc(writer, 'create_ticket', body);
      assert.ok(created.result.structuredContent.id);
      const replay = await create(body, '', bearer(writer));
      assert.equal(replay.status, 200);
      assert.equal(
        (await replay.json()).id,
        created.result.structuredContent.id,
      );
      assert.equal(
        (await call('/api/tickets', undefined, '', bearer(writer))).status,
        401,
      );
      assert.ok((await rpc(writer, 'get_ticket', { id: ticket.id })).error);
      assert.equal((await create(payload(), '', bearer(reader))).status, 401);
      assert.ok(
        (await rpc(reader, 'update_ticket', { id: ticket.id, ...update(5) }))
          .error,
      );
      assert.equal(
        (await rpc(reader, 'get_ticket', { id: ticket.id })).result
          .structuredContent.ticket.id,
        ticket.id,
      );
      assert.ok(
        (await rpc(reader, 'list_tickets', { all: true })).result.isError,
      );
      const sent = await rpc(writer, 'update_ticket', {
        id: ticket.id,
        ...update(5),
      });
      assert.equal(sent.result.structuredContent.revision, 6);
      assert.deepEqual(
        Object.keys(sent.result.structuredContent).sort(),
        ['eventId', 'id', 'replayed', 'revision', 'status'].sort(),
      );
    },
  );
  await check(
    'ticket failure rolls back the message and revision together',
    async () => {
      await sql(
        `CREATE TRIGGER reject_ticket_event BEFORE INSERT ON ticket_events WHEN NEW.body='rollback-probe' BEGIN SELECT RAISE(ABORT,'injected ticket event failure'); END`,
      );
      try {
        const body = { ...update(6), body: 'rollback-probe' };
        assert.equal((await change(ticket.id, body)).status, 503);
        assert.equal((await get(ticket.id)).ticket.revision, 6);
        assert.equal((await get(ticket.id)).events.length, 6);
        const start = { ...payload(), body: 'rollback-probe' };
        const count = (
          await sql('SELECT COUNT(*) AS n FROM support_tickets')
        )[0].n;
        assert.equal((await create(start)).status, 503);
        assert.equal(
          (await sql('SELECT COUNT(*) AS n FROM support_tickets'))[0].n,
          count,
        );
      } finally {
        await sql('DROP TRIGGER reject_ticket_event');
      }
    },
  );
  await check(
    'ticket-only customer cannot be deleted; contact and session survive rollback',
    async () => {
      const response = await call(
        '/api/customers',
        {
          email: 'ticket-only@example.test',
          password: 'ticket-test-password',
          confirm: true,
        },
        adminCookie,
      );
      assert.equal(response.status, 201);
      const customer = (await response.json()).customer;
      const login = await call('/api/auth/login', {
        email: customer.email,
        password: 'ticket-test-password',
      });
      assert.equal(login.status, 200);
      const session = login.headers.get('set-cookie').split(';')[0];
      const created = await create(payload(), session);
      assert.equal(created.status, 201);
      const id = (await created.json()).id;
      assert.equal(
        (
          await call(
            `/api/customers/${customer.id}`,
            { revision: customer.revision, confirm: true },
            adminCookie,
            {},
            'DELETE',
          )
        ).status,
        409,
      );
      assert.equal(
        (await call('/api/auth/me', undefined, session)).status,
        200,
      );
      assert.equal((await get(id, session)).events.length, 1);
      const retained = await (
        await call(`/api/customers/${customer.id}`, undefined, adminCookie)
      ).json();
      assert.equal(retained.customer.revision, customer.revision);
    },
  );
  await check(
    'ticket pagination is bounded and indexes match real query patterns',
    async () => {
      // Isolated fixtures bypass the write rate limit to exercise pagination without 55 HTTP writes.
      const userId = (await get(ticket.id)).ticket.customerId;
      await sql(
        `WITH RECURSIVE n(x) AS (SELECT 7 UNION ALL SELECT x+1 FROM n WHERE x<60) INSERT INTO ticket_events (id,ticket_id,actor_id,author,action,body,revision,status,fingerprint,source,created_at) SELECT 'fixture-event-'||x,'${ticket.id}','${userId}','customer','message','fixture',x,'open','fixture','test',1 FROM n`,
      );
      await sql(
        `UPDATE support_tickets SET revision=60 WHERE id='${ticket.id}'`,
      );
      const first = await get(ticket.id);
      assert.equal(first.events.length, 50);
      assert.equal(first.nextBefore, 11);
      const second = await (
        await call(
          `/api/tickets/${ticket.id}?before=11`,
          undefined,
          aliceCookie,
        )
      ).json();
      assert.equal(second.events.length, 10);
      assert.equal(second.nextBefore, null);
      assert.equal(
        new Set([...first.events, ...second.events].map((e) => e.id)).size,
        60,
      );
      await sql(
        `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<51) INSERT INTO support_tickets (id,customer_id,subject,status,revision,mutation_id,created_at,updated_at) SELECT printf('00000000-0000-0000-0000-%012d',x),'${userId}','fixture','open',1,'fixture',1,1 FROM n`,
      );
      const list1 = await (
        await call('/api/tickets', undefined, aliceCookie)
      ).json();
      assert.equal(list1.tickets.length, 50);
      assert.ok(list1.nextBefore);
      const list2 = await (
        await call(
          `/api/tickets?before=${list1.nextBefore}`,
          undefined,
          aliceCookie,
        )
      ).json();
      assert.equal(list2.nextBefore, null);
      assert.equal(
        new Set([...list1.tickets, ...list2.tickets].map((t) => t.id)).size,
        54,
      );
      await sql('PRAGMA optimize');
      const plan = await sql(
        `EXPLAIN QUERY PLAN SELECT id FROM support_tickets WHERE customer_id='${userId}' ORDER BY created_at DESC,id DESC LIMIT 51`,
      );
      assert.match(
        JSON.stringify(plan),
        /idx_support_tickets_customer_created/,
      );
      const events = await sql(
        `EXPLAIN QUERY PLAN SELECT id FROM ticket_events WHERE ticket_id='${ticket.id}' AND revision<60 ORDER BY revision DESC LIMIT 51`,
      );
      assert.match(JSON.stringify(events), /idx_ticket_events_ticket_revision/);
    },
  );
  await check(
    'ticket history is bounded and write throttles are shared across REST/MCP',
    async () => {
      await sql(
        `UPDATE support_tickets SET revision=2000 WHERE id='${ticket.id}'`,
      );
      assert.equal((await change(ticket.id, update(2000))).status, 409);
      await sql(
        "UPDATE rate_limits SET count=30 WHERE key LIKE 'tickets-write:%'",
      );
      const limited = await change(ticket.id, update(2000));
      assert.equal(limited.status, 429);
      assert.ok(limited.headers.get('retry-after'));
      assert.ok((await rpc(writer, 'create_ticket', payload())).result.isError);
      await sql("DELETE FROM rate_limits WHERE key LIKE 'tickets-write:%'");
    },
  );
  await check(
    'ticket OpenAPI describes private bounded operations and append-only history',
    async () => {
      const doc = await (await call('/api/openapi')).json();
      assert.ok(
        doc.paths['/tickets'].post.requestBody.content[
          'application/json'
        ].schema.required.includes('idempotencyKey'),
      );
      assert.ok(doc.paths['/tickets/{id}'].patch);
      assert.equal(doc.paths['/tickets/{id}'].delete, undefined);
    },
  );
}
