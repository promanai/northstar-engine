import assert from 'node:assert/strict';
export async function analyticsTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  const event = (kind = 'page_view', extra = {}) => ({
    id: crypto.randomUUID(),
    kind,
    path: '/',
    device: 'desktop',
    ...extra,
  });
  const collect = (value, cookie = '', headers = {}) =>
    call(
      '/api/analytics/events',
      { consent: true, event: value },
      cookie,
      headers,
    );
  const report = async (query = '') => {
    const r = await call(`/api/analytics${query}`, undefined, adminCookie);
    assert.equal(r.status, 200);
    return r.json();
  };
  const settings = async (enabled, retentionDays = 30) => {
    const current = (await report()).settings;
    const r = await call(
      '/api/analytics',
      {
        revision: current.revision,
        value: { enabled, retentionDays },
        confirm: true,
      },
      adminCookie,
    );
    assert.equal(r.status, 200);
    return r.json();
  };
  let browser, visitor, conversation;
  await check(
    'analytics defaults off; reports require admin session and never bearer fallback',
    async () => {
      const state = await (await call('/api/analytics/events')).json();
      assert.deepEqual(state, { enabled: false, retentionDays: 30 });
      for (const cookie of ['', aliceCookie])
        assert.equal(
          (await call('/api/analytics', undefined, cookie)).status,
          403,
        );
      assert.equal(
        (
          await call('/api/analytics', undefined, adminCookie, {
            authorization: 'Bearer invalid',
          })
        ).status,
        403,
      );
      assert.equal((await (await collect(event())).json()).enabled, false);
      assert.equal((await report()).summary.events, 0);
      assert.equal(
        (await call('/api/analytics/events', { event: event() })).status,
        400,
      );
      assert.equal(
        (await collect(event(), '', { origin: 'https://foreign.invalid' }))
          .status,
        403,
      );
    },
  );
  await check(
    'analytics settings have confirmation, strict retention and revision protection',
    async () => {
      const saved = await settings(true);
      assert.equal(
        (
          await call(
            '/api/analytics',
            {
              revision: 0,
              value: { enabled: false, retentionDays: 30 },
              confirm: true,
            },
            adminCookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            '/api/analytics',
            {
              revision: saved.revision,
              value: { enabled: true, retentionDays: 365 },
              confirm: true,
            },
            adminCookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/analytics',
            {
              revision: saved.revision,
              value: { enabled: false, retentionDays: 30 },
              confirm: true,
            },
            aliceCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/analytics',
            {
              revision: saved.revision,
              value: { enabled: false, retentionDays: 30 },
            },
            adminCookie,
          )
        ).status,
        400,
      );
    },
  );
  await check(
    'consent handshake establishes HttpOnly session; events deduplicate and strip private URLs',
    async () => {
      const input = event('page_view', {
        path: '/?token=private-secret',
        referrer: 'https://search.example/search?email=private-secret#password',
      });
      const first = await collect(input, aliceCookie);
      assert.equal(first.status, 428);
      assert.match(first.headers.get('set-cookie'), /HttpOnly/);
      browser = `${aliceCookie}; ${first.headers.get('set-cookie').split(';')[0]}`;
      assert.equal((await collect(input, browser)).status, 200);
      assert.equal(
        (await (await collect(input, browser)).json()).duplicate,
        true,
      );
      const data = await report();
      assert.equal(data.summary.events, 1);
      visitor = data.visits[0].id;
      assert.equal(data.sources[0].label, 'search.example');
      const rows = await sql('SELECT * FROM analytics_events');
      assert.equal(rows.length, 1);
      assert.equal(rows[0].path, '/');
      assert.ok(!JSON.stringify(rows).includes('private-secret'));
      assert.ok(!JSON.stringify(rows).includes('password'));
      for (const extra of [
        { path: '/account/profile' },
        { body: 'secret' },
        { userId: 'another-user' },
        { kind: 'chat_turn', conversationId: 'another' },
      ])
        assert.equal(
          (await collect({ ...event(), ...extra }, browser)).status,
          400,
        );
    },
  );
  await check(
    'behavior report includes click paths, visible time, scroll and consent exclusions',
    async () => {
      assert.equal(
        (
          await collect(
            event('click', { target: '/catalog?token=private-secret' }),
            browser,
          )
        ).status,
        200,
      );
      assert.equal(
        (await collect(event('scroll', { value: 75 }), browser)).status,
        200,
      );
      assert.equal(
        (await collect(event('engagement', { value: 15 }), browser)).status,
        200,
      );
      assert.equal(
        (await (await collect(event(), browser, { dnt: '1' })).json()).enabled,
        false,
      );
      assert.equal(
        (await (await collect(event(), browser, { 'sec-gpc': '1' })).json())
          .enabled,
        false,
      );
      assert.equal(
        (await (await collect(event(), adminCookie)).json()).excluded,
        true,
      );
      const data = await report();
      assert.equal(data.summary.events, 4);
      assert.equal(data.summary.visits, 1);
      assert.equal(data.summary.activeSeconds, 15);
      assert.equal(data.targets[0].target, '/catalog');
      const path = await report(`?visitor=${visitor}`);
      assert.equal(path.events.length, 4);
      assert.equal(path.events[2].value, 75);
      const revoke = await call(
        '/api/analytics/events',
        { consent: false },
        browser,
      );
      assert.match(revoke.headers.get('set-cookie'), /Max-Age=0/);
      assert.equal((await report()).summary.events, 4); // Withdrawal is not a historical erasure request.
    },
  );
  await check(
    'saved chat joins consented visit once; private text comes from original messages',
    async () => {
      // Restore active demo consultant in the isolated fixture, never configure a paid provider.
      const assistant = (
        await (
          await call('/api/assistant?view=admin', undefined, adminCookie)
        ).json()
      ).assistant;
      if (assistant.status !== 'active')
        assert.equal(
          (
            await call(
              '/api/assistant',
              { revision: assistant.revision, status: 'active', confirm: true },
              adminCookie,
              {},
              'PUT',
            )
          ).status,
          200,
        );
      const key = crypto.randomUUID(),
        body = { message: 'analytics-chat-probe' };
      const r = await call('/api/chat', body, browser, {
        'Idempotency-Key': key,
      });
      assert.equal(r.status, 200);
      conversation = (await r.json()).conversationId;
      assert.equal(
        (await call('/api/chat', body, browser, { 'Idempotency-Key': key }))
          .status,
        200,
      );
      const path = await report(`?visitor=${visitor}`);
      assert.equal(path.events.filter((e) => e.kind === 'chat_turn').length, 1);
      assert.equal(path.events.at(-1).conversationId, conversation);
      const thread = await report(`?conversation=${conversation}`);
      assert.equal(thread.messages[0].content, body.message);
      assert.ok(thread.messages.some((m) => m.role === 'assistant'));
      const totalBeforeAdmin = (await report()).chatTotals.prompts;
      const adminChat = await call(
        '/api/chat',
        { message: 'admin-analytics-probe' },
        adminCookie,
      );
      assert.equal(adminChat.status, 200);
      const adminConversation = (await adminChat.json()).conversationId;
      const afterAdmin = await report();
      assert.equal(afterAdmin.chatTotals.prompts, totalBeforeAdmin);
      assert.ok(!afterAdmin.chats.some((c) => c.id === adminConversation));
      const storage = await sql('SELECT * FROM analytics_events');
      assert.ok(!JSON.stringify(storage).includes(body.message));
      assert.match(
        (
          await call(
            `/api/analytics?conversation=${conversation}`,
            undefined,
            adminCookie,
          )
        ).headers.get('cache-control'),
        /private, no-store/,
      );
      assert.equal(
        (
          await call(
            `/api/analytics?conversation=${conversation}`,
            undefined,
            aliceCookie,
          )
        ).status,
        403,
      );
    },
  );
  await check(
    'analytics write failure never breaks a successfully saved chat answer',
    async () => {
      await sql(
        "CREATE TRIGGER fail_analytics_chat BEFORE INSERT ON analytics_events WHEN NEW.kind='chat_turn' BEGIN SELECT RAISE(ABORT,'analytics failure'); END",
      );
      try {
        const r = await call(
          '/api/chat',
          { message: 'analytics-failure-probe' },
          browser,
        );
        assert.equal(r.status, 200);
        const id = (await r.json()).conversationId;
        assert.equal(
          (await report(`?conversation=${id}`)).messages[0].content,
          'analytics-failure-probe',
        );
      } finally {
        await sql('DROP TRIGGER fail_analytics_chat');
      }
    },
  );
  await check(
    'analytics date ranges are half-open and retention cleanup never deletes chat data',
    async () => {
      const start = Date.now() - 3600000;
      for (const [i, at] of [start - 1, start, start + 1000].entries())
        await sql(
          `INSERT INTO analytics_events (id,visitor_id,kind,path,target,referrer,device,value,created_at) VALUES ('boundary-${i}','${'b'.repeat(64)}','page_view','/','','','desktop',0,${at})`,
        );
      const q = `?period=custom&from=${new Date(start).toISOString()}&to=${new Date(start + 1000).toISOString()}`;
      assert.equal((await report(q)).summary.events, 1);
      for (const query of [
        '?period=unknown',
        '?period=24h&period=7d',
        '?visitor=invalid',
        '?chatsBefore=bad',
        '?period=custom&from=bad&to=bad',
      ])
        assert.equal(
          (await call(`/api/analytics${query}`, undefined, adminCookie)).status,
          400,
        );
      await settings(true, 7);
      await sql(
        `INSERT INTO analytics_events (id,visitor_id,kind,path,target,referrer,device,value,created_at) VALUES ('expired-analytics','${visitor}','page_view','/','','','desktop',0,${Date.now() - 8 * 86400000})`,
      );
      const cleanup = await call(
        '/api/analytics',
        { action: 'cleanup', confirm: true },
        adminCookie,
      );
      assert.equal(cleanup.status, 200);
      assert.equal((await cleanup.json()).deleted, 1);
      assert.equal(
        (await report(`?conversation=${conversation}`)).messages[0].content,
        'analytics-chat-probe',
      );
    },
  );
  await check(
    'analytics journeys and visit lists paginate without losing tied timestamps; indexes are used',
    async () => {
      const at = Date.now() - 1000;
      await sql(
        `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<110) INSERT INTO analytics_events (id,visitor_id,kind,path,target,referrer,device,value,created_at) SELECT printf('%064x',1000+x),'${visitor}','click','/','chat-send','','desktop',0,${at} FROM n`,
      );
      const first = await report(`?visitor=${visitor}`);
      assert.equal(first.events.length, 100);
      assert.ok(first.nextBefore);
      const second = await report(
        `?visitor=${visitor}&before=${first.nextBefore}`,
      );
      assert.equal(second.nextBefore, null);
      assert.equal(
        new Set([...first.events, ...second.events].map((e) => e.id)).size,
        115,
      );
      await sql(
        `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<51) INSERT INTO analytics_events (id,visitor_id,kind,path,target,referrer,device,value,created_at) SELECT printf('%064x',2000+x),printf('%064x',2000+x),'page_view','/','','','desktop',0,${at} FROM n`,
      );
      const visits = await report();
      assert.equal(visits.visits.length, 50);
      assert.ok(visits.visitsNext);
      const more = await report(`?visitsBefore=${visits.visitsNext}`);
      assert.equal(more.visitsNext, null);
      assert.equal(
        new Set([...visits.visits, ...more.visits].map((v) => v.id)).size,
        53,
      );
      await sql('PRAGMA optimize');
      for (const [statement, index] of [
        [
          `SELECT * FROM analytics_events WHERE created_at>${at} ORDER BY created_at,id`,
          'idx_analytics_created',
        ],
        [
          `SELECT * FROM analytics_events WHERE visitor_id='${visitor}' ORDER BY created_at,id`,
          'idx_analytics_visitor_created',
        ],
        [
          "SELECT id FROM messages WHERE role='user' AND created_at>1 ORDER BY created_at,id",
          'idx_messages_role_created',
        ],
      ])
        assert.match(
          JSON.stringify(await sql(`EXPLAIN QUERY PLAN ${statement}`)),
          new RegExp(index),
        );
    },
  );
  await check(
    'analytics resolves public Cyrillic paths but never collects drafts or unknown routes',
    async () => {
      const page = await call(
        '/api/pages',
        {
          title: 'Услуги',
          slug: '/услуги',
          status: 'published',
          blocks: ['Каталог услуг'],
        },
        adminCookie,
      );
      assert.equal(page.status, 201);
      assert.equal(
        (
          await collect(
            event('page_view', {
              path: '/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8',
            }),
            browser,
          )
        ).status,
        200,
      );
      assert.ok((await report()).pages.some((row) => row.label === '/услуги'));
      assert.equal(
        (
          await collect(
            event('page_view', { path: '/internal-notes' }),
            browser,
          )
        ).status,
        400,
      );
      assert.equal(
        (await collect(event('page_view', { path: '/unknown-route' }), browser))
          .status,
        400,
      );
    },
  );
  await check(
    'analytics daily collection cap fails closed and disabled mode preserves historical reports',
    async () => {
      await sql(
        "UPDATE rate_limits SET count=10000 WHERE key LIKE 'analytics-daily:%'",
      );
      const r = await collect(event(), browser);
      assert.equal(r.status, 429);
      assert.ok(r.headers.get('retry-after'));
      await settings(false, 7);
      assert.equal(
        (await (await collect(event(), browser)).json()).enabled,
        false,
      );
      assert.ok((await report()).summary.events > 0);
      const openapi = await (await call('/api/openapi')).json();
      assert.ok(openapi.paths['/analytics'].get);
      assert.deepEqual(openapi.paths['/analytics'].get.security, [
        { cookieAuth: [] },
      ]);
    },
  );
}
