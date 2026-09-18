import assert from 'node:assert/strict';

export async function pageTests({
  call,
  check,
  adminCookie,
  aliceCookie,
  sql,
}) {
  let page;
  await check(
    'published pages have a real public HTML and Markdown route',
    async () => {
      const created = await call(
        '/api/pages',
        {
          title: 'О компании',
          slug: '/about',
          status: 'published',
          blocks: ['Мы помогаем выбрать услугу и оформить следующий шаг.'],
          seo: {
            title: 'О компании | Northstar',
            description: 'Информация о компании.',
          },
        },
        adminCookie,
      );
      assert.equal(created.status, 201);
      page = (await created.json()).page;
      const html = await call('/about');
      assert.equal(html.status, 200);
      assert.match(await html.text(), /О компании/);
      const markdown = await call('/api/content?slug=%2Fabout', undefined, '', {
        accept: 'text/markdown',
      });
      assert.equal(markdown.status, 200);
      assert.equal(
        markdown.headers.get('content-type'),
        'text/markdown; charset=utf-8',
      );
      assert.match(await markdown.text(), /Мы помогаем/);
    },
  );
  await check(
    'draft pages stay private and reserved routes are rejected',
    async () => {
      const draft = await call(
        '/api/pages',
        { title: 'Черновик', slug: '/internal-notes', blocks: ['private'] },
        adminCookie,
      );
      assert.equal(draft.status, 201);
      assert.equal((await call('/internal-notes')).status, 404);
      assert.equal(
        (await call('/api/content?slug=%2Finternal-notes')).status,
        404,
      );
      assert.equal(
        (
          await call(
            '/api/pages',
            { title: 'Wrong', slug: '/admin' },
            adminCookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/pages',
            { title: 'Wrong', slug: '/bad<script>' },
            adminCookie,
          )
        ).status,
        400,
      );
      await call(
        `/api/pages/${(await draft.json()).page.id}`,
        { revision: 0, confirm: true },
        adminCookie,
        {},
        'DELETE',
      );
    },
  );
  await check(
    'sitemap contains public pages and no private dashboard URLs',
    async () => {
      const response = await call('/sitemap.xml');
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.match(body, /<loc>http:\/\/127\.0\.0\.1:[0-9]+\/about<\/loc>/);
      assert.doesNotMatch(
        body,
        /northstar\.local|\/login|\/account|\/admin|\/api\//,
      );
    },
  );
  await check('page editing is authenticated and validated', async () => {
    assert.equal(
      (await call('/api/pages', { title: 'No auth', slug: '/no-auth' })).status,
      403,
    );
    const updated = await call(
      `/api/pages/${page.id}`,
      {
        revision: page.revision,
        title: 'О компании обновлено',
        status: 'draft',
      },
      adminCookie,
      {},
      'PATCH',
    );
    assert.equal(updated.status, 200);
    assert.equal(
      (await (await call('/about')).text()).includes('О компании обновлено'),
      false,
    );
    page = (await updated.json()).page;
    const removed = await call(
      `/api/pages/${page.id}`,
      { revision: page.revision, confirm: true },
      adminCookie,
      {},
      'DELETE',
    );
    assert.equal(removed.status, 200);
    page = (await removed.json()).page;
    assert.equal((await call('/about')).status, 404);
  });
  const history = async () =>
    (
      await (
        await call(`/api/pages/${page.id}/history`, undefined, adminCookie)
      ).json()
    ).versions;
  await check(
    'trash retains history and restores only as a new draft',
    async () => {
      assert.equal((await call(`/api/pages/${page.id}`)).status, 404);
      assert.equal((await call(`/api/pages/${page.id}/history`)).status, 403);
      assert.equal(
        (await call(`/api/pages/${page.id}/history`, undefined, aliceCookie))
          .status,
        403,
      );
      assert.deepEqual(
        (await history()).map((v) => v.action),
        ['delete', 'update', 'create'],
      );
      const response = await call(
        `/api/pages/${page.id}/restore`,
        { revision: page.revision, targetRevision: 0, confirm: true },
        adminCookie,
      );
      assert.equal(response.status, 200);
      page = (await response.json()).page;
      assert.equal(page.status, 'draft');
      assert.equal(page.title, 'О компании');
      assert.equal(page.revision, 3);
      assert.equal((await call('/about')).status, 404);
    },
  );
  await check(
    'stale or missing revisions and missing deletion confirmation are rejected',
    async () => {
      assert.equal(
        (
          await call(
            `/api/pages/${page.id}`,
            { title: 'unsafe' },
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
            `/api/pages/${page.id}`,
            { revision: 0, title: 'stale' },
            adminCookie,
            {},
            'PATCH',
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            `/api/pages/${page.id}`,
            { revision: page.revision },
            adminCookie,
            {},
            'DELETE',
          )
        ).status,
        400,
      );
      assert.equal((await history()).length, 4);
    },
  );
  await check(
    'concurrent page writers commit once and emit exactly one revision',
    async () => {
      const results = await Promise.all(
        ['Writer A', 'Writer B'].map((title) =>
          call(
            `/api/pages/${page.id}`,
            { revision: page.revision, title },
            adminCookie,
            {},
            'PATCH',
          ),
        ),
      );
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      page = (await results.find((r) => r.status === 200).json()).page;
      assert.equal((await history()).length, 5);
      const duplicate = await call(
        '/api/pages',
        { title: 'Duplicate', slug: '/about' },
        adminCookie,
      );
      assert.equal(duplicate.status, 409);
    },
  );
  await check(
    'REST and MCP share page versions, authorization and audit metadata',
    async () => {
      const token = async (scopes) =>
        (
          await (
            await call(
              '/api/tokens',
              { name: 'page-tests', scopes, expiresInDays: 1 },
              adminCookie,
            )
          ).json()
        ).token;
      const writer = await token(['pages:read', 'pages:write']);
      const reader = await token(['pages:read']);
      const invoke = async (secret, name, args) =>
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
            { authorization: `Bearer ${secret}` },
          )
        ).json();
      const denied = await invoke(reader, 'upsert_page', {
        id: page.id,
        revision: page.revision,
        title: 'denied',
      });
      assert.ok(denied.error || denied.result?.isError);
      const changed = await invoke(writer, 'upsert_page', {
        id: page.id,
        revision: page.revision,
        title: 'MCP update',
      });
      assert.ok(
        !changed.error && !changed.result?.isError,
        JSON.stringify(changed),
      );
      page = changed.result.structuredContent;
      const stale = await invoke(writer, 'delete_page', {
        id: page.id,
        revision: 0,
        confirm: true,
      });
      assert.equal(stale.result.isError, true);
      const events = await history();
      assert.equal(events[0].source, 'mcp');
      assert.ok(events[0].tokenId);
      assert.ok(events[0].actorId);
      const restored = await invoke(writer, 'restore_page', {
        id: page.id,
        revision: page.revision,
        targetRevision: 0,
        confirm: true,
      });
      assert.ok(!restored.result?.isError, JSON.stringify(restored));
      page = restored.result.structuredContent;
      const limitedHistory = await call(
        `/api/pages/${page.id}/history`,
        undefined,
        '',
        { authorization: `Bearer ${reader}` },
      );
      assert.equal(limitedHistory.status, 200);
      const before = await call(
        `/api/pages/${page.id}/history?before=2`,
        undefined,
        adminCookie,
      );
      assert.deepEqual(
        (await before.json()).versions.map((v) => v.revision),
        [1, 0],
      );
    },
  );
  await check(
    'unknown roles cannot manage pages, settings, assistants or clients',
    async () => {
      const alice = (
        await (await call('/api/auth/me', undefined, aliceCookie)).json()
      ).user;
      await sql(`UPDATE users SET role = 'editor' WHERE id = '${alice.id}'`);
      try {
        assert.equal(
          (
            await call(
              '/api/pages',
              { title: 'Forbidden', slug: '/forbidden' },
              aliceCookie,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              '/api/settings',
              { key: 'public.test', value: {} },
              aliceCookie,
              {},
              'PUT',
            )
          ).status,
          403,
        );
        assert.equal(
          (await call('/api/assistant', {}, aliceCookie, {}, 'PUT')).status,
          403,
        );
        assert.equal(
          (await call('/api/customers', undefined, aliceCookie)).status,
          403,
        );
        assert.equal(
          (await call(`/api/pages/${page.id}/history`, undefined, aliceCookie))
            .status,
          403,
        );
      } finally {
        await sql(
          `UPDATE users SET role = 'customer' WHERE id = '${alice.id}'`,
        );
      }
    },
  );
  await check(
    'legacy pages retain their baseline and journal failure rolls back the write',
    async () => {
      const id = 'legacy-page-test';
      await sql(
        `INSERT INTO pages (id, slug, title, status, blocks, seo, created_at, updated_at) VALUES ('${id}', '/legacy-test', 'Legacy', 'draft', '[]', '{}', 1, 1)`,
      );
      const updated = await call(
        `/api/pages/${id}`,
        { revision: 0, title: 'After upgrade' },
        adminCookie,
        {},
        'PATCH',
      );
      assert.equal(updated.status, 200);
      const events = await call(
        `/api/pages/${id}/history`,
        undefined,
        adminCookie,
      );
      assert.deepEqual(
        (await events.json()).versions.map((v) => v.action),
        ['update', 'baseline'],
      );
      await sql(
        `CREATE TRIGGER test_reject_page_event BEFORE INSERT ON page_revisions WHEN NEW.page_id = '${id}' AND NEW.revision = 2 BEGIN SELECT RAISE(ABORT, 'test audit unavailable'); END`,
      );
      try {
        assert.equal(
          (
            await call(
              `/api/pages/${id}`,
              { revision: 1, title: 'Must roll back' },
              adminCookie,
              {},
              'PATCH',
            )
          ).status,
          503,
        );
        const current = (
          await (await call(`/api/pages/${id}`, undefined, adminCookie)).json()
        ).page;
        assert.equal(current.revision, 1);
        assert.equal(current.title, 'After upgrade');
      } finally {
        await sql('DROP TRIGGER test_reject_page_event');
      }
    },
  );
}
