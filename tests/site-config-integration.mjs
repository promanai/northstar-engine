import assert from 'node:assert/strict';
export async function siteConfigTests({
  call,
  check,
  adminCookie,
  aliceCookie,
  sql,
}) {
  const read = async () =>
    (await call('/api/site-config?view=admin', undefined, adminCookie)).json();
  const history = async () =>
    (
      await (
        await call('/api/site-config?view=history', undefined, adminCookie)
      ).json()
    ).versions;
  const write = (body, cookie = adminCookie, headers = {}) =>
    call('/api/site-config', body, cookie, headers, 'PUT');
  let state, baseline;
  await check(
    'site config imports legacy values without exposing private fields or history',
    async () => {
      await sql(
        `INSERT INTO site_settings (key, value, created_at, updated_at) VALUES ('public.siteName', '{"text":"Legacy Company"}', 1, 1), ('public.apiKey', '{"text":"never-public"}', 1, 1), ('public.backgroundImage', '{"url":"javascript:bad"}', 1, 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      );
      state = await read();
      baseline = state.value;
      assert.equal(state.revision, 0);
      assert.equal(baseline.name, 'Legacy Company');
      assert.equal(state.warnings.length, 1);
      const publicResponse = await call('/api/site-config');
      assert.equal(publicResponse.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await publicResponse.json(), baseline);
      const legacy = await (await call('/api/settings')).json();
      assert.ok(!JSON.stringify(legacy).includes('never-public'));
      assert.equal((await call('/api/site-config?view=admin')).status, 403);
      assert.equal(
        (await call('/api/site-config?view=history', undefined, aliceCookie))
          .status,
        403,
      );
    },
  );
  await check(
    'site config validates confirmation, ownership, origin, payload and legacy bypasses',
    async () => {
      const body = { revision: 0, value: baseline, confirm: true };
      assert.equal((await write({ ...body, confirm: false })).status, 400);
      assert.equal((await write(body, aliceCookie)).status, 403);
      assert.equal(
        (await write(body, adminCookie, { origin: 'https://foreign.test' }))
          .status,
        403,
      );
      assert.equal(
        (
          await write({
            ...body,
            value: { ...baseline, backgroundImage: '//foreign.test' },
          })
        ).status,
        400,
      );
      assert.equal(
        (await write({ ...body, value: { ...baseline, privateKey: 'bad' } }))
          .status,
        400,
      );
      assert.equal(
        (
          await write({
            ...body,
            value: { ...baseline, name: 'a'.repeat(9000) },
          })
        ).status,
        413,
      );
      assert.equal(
        (
          await call(
            '/api/settings',
            { key: 'public.siteName', value: { text: 'bypass' } },
            adminCookie,
            {},
            'PUT',
          )
        ).status,
        400,
      );
      assert.equal((await read()).revision, 0);
    },
  );
  await check(
    'site config competing writes commit once and keep imported baseline in atomic history',
    async () => {
      const responses = await Promise.all(
        ['Brand A', 'Brand B'].map((name) =>
          write({
            revision: 0,
            value: {
              ...baseline,
              name,
              theme: 'ocean',
              description: 'New public description',
            },
            confirm: true,
          }),
        ),
      );
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      state = await read();
      assert.equal(state.revision, 1);
      assert.deepEqual(state.warnings, []);
      const versions = await history();
      assert.deepEqual(
        versions.map((v) => v.revision),
        [1, 0],
      );
      assert.equal(versions[0].source, 'rest');
      assert.ok(versions[0].actorId);
      const html = await (await call('/')).text();
      assert.ok(html.includes('<title>' + state.value.name + '</title>'));
      assert.ok(html.includes('New public description'));
      assert.ok(html.includes('data-site-theme="ocean"'));
      const legacy = await (await call('/api/settings')).json();
      assert.equal(
        legacy.settings.find((r) => r.key === 'public.siteName').value.text,
        state.value.name,
      );
    },
  );
  await check(
    'site config MCP scopes, legacy bypass denial, shared history and restoration',
    async () => {
      const token = async (scopes) =>
        (
          await (
            await call(
              '/api/tokens',
              { name: 'site-config-tests', scopes, expiresInDays: 1 },
              adminCookie,
            )
          ).json()
        ).token;
      const reader = await token(['site:read']),
        writer = await token(['site:write']),
        both = await token(['site:read', 'site:write']);
      const invoke = async (secret, name, args = {}) =>
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
            { authorization: 'Bearer ' + secret },
          )
        ).json();
      const fail = (r) =>
        assert.ok(r.error || r.result?.isError, JSON.stringify(r));
      fail(
        await invoke(reader, 'site_config_update', {
          revision: state.revision,
          value: state.value,
          confirm: true,
        }),
      );
      fail(
        await invoke(writer, 'site_config_restore', {
          revision: state.revision,
          targetRevision: 0,
          confirm: true,
        }),
      );
      fail(
        await invoke(writer, 'site_update_settings', {
          key: 'theme.template',
          value: { id: 'editorial' },
        }),
      );
      assert.equal(
        (await invoke(reader, 'site_config_get')).result.structuredContent
          .revision,
        1,
      );
      const result = await invoke(both, 'site_config_update', {
        revision: state.revision,
        value: { ...state.value, name: 'Agent Brand' },
        confirm: true,
      });
      assert.ok(
        !result.error && !result.result?.isError,
        JSON.stringify(result),
      );
      state = result.result.structuredContent;
      assert.equal((await history())[0].source, 'mcp');
      assert.ok((await history())[0].tokenId);
      const restored = await invoke(both, 'site_config_restore', {
        revision: state.revision,
        targetRevision: 0,
        confirm: true,
      });
      assert.ok(
        !restored.error && !restored.result?.isError,
        JSON.stringify(restored),
      );
      state = restored.result.structuredContent;
      assert.equal(state.revision, 3);
      assert.deepEqual(state.value, baseline);
      assert.equal((await history())[0].restoredFrom, 0);
      assert.equal(
        (await write({ revision: 0, value: baseline, confirm: true })).status,
        409,
      );
      assert.equal(
        (await write({ revision: 3, targetRevision: 999, confirm: true }))
          .status,
        404,
      );
      assert.equal(
        (
          await write({ revision: 3, value: baseline, confirm: true }, '', {
            authorization: 'Bearer ' + reader,
          })
        ).status,
        403,
      );
      assert.deepEqual(
        (
          await (
            await call(
              '/api/site-config?view=history&before=2',
              undefined,
              adminCookie,
            )
          ).json()
        ).versions.map((v) => v.revision),
        [1, 0],
      );
    },
  );
  await check(
    'site config rolls back on journal failure and exposes explicit OpenAPI contract',
    async () => {
      await sql(
        `CREATE TRIGGER test_site_audit BEFORE INSERT ON site_document_revisions WHEN NEW.document_key = 'site-config' AND NEW.revision > 0 BEGIN SELECT RAISE(ABORT, 'test site audit failure'); END`,
      );
      const versions = await history();
      try {
        assert.equal(
          (
            await write({
              revision: state.revision,
              value: { ...state.value, name: 'must not save' },
              confirm: true,
            })
          ).status,
          503,
        );
        assert.deepEqual(await read(), state);
        assert.deepEqual(await history(), versions);
      } finally {
        await sql('DROP TRIGGER test_site_audit');
      }
      const api = await (await call('/api/openapi')).json();
      assert.ok(api.paths['/site-config'].put.responses['409']);
      assert.equal(
        api.paths['/site-config'].put.requestBody.content['application/json']
          .schema.oneOf[0].properties.value.additionalProperties,
        false,
      );
    },
  );
}
