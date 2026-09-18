import assert from 'node:assert/strict';
import { defaultNavigation } from '../lib/navigation-policy.ts';
export async function navigationTests({
  call,
  check,
  adminCookie,
  aliceCookie,
  sql,
}) {
  const read = async () =>
    await (
      await call('/api/navigation?view=admin', undefined, adminCookie)
    ).json();
  const history = async () =>
    (
      await (
        await call('/api/navigation?view=history', undefined, adminCookie)
      ).json()
    ).versions;
  const write = (body, session = adminCookie, headers = {}) =>
    call('/api/navigation', body, session, headers, 'PUT');
  let state, page, draft;
  await check(
    'navigation defaults are public, administrative state and history are private',
    async () => {
      const response = await call('/api/navigation');
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.menu[0].href, '/#chat');
      assert.equal(data.revision, undefined);
      assert.equal(data.versions, undefined);
      assert.equal((await call('/api/navigation?view=admin')).status, 403);
      assert.equal(
        (await call('/api/navigation?view=history', undefined, aliceCookie))
          .status,
        403,
      );
      state = await read();
      assert.equal(state.revision, 0);
    },
  );
  await check(
    'navigation creation races commit once with an atomic baseline and journal',
    async () => {
      const responses = await Promise.all(
        ['Menu A', 'Menu B'].map((label) => {
          const value = structuredClone(defaultNavigation);
          value.menu[0].label = label;
          return write({ revision: 0, value, confirm: true });
        }),
      );
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      state = await read();
      assert.equal(state.revision, 1);
      assert.deepEqual(
        (await history()).map((v) => v.revision),
        [1, 0],
      );
    },
  );
  await check(
    'navigation requires confirmation, current revision and safe validated content',
    async () => {
      assert.equal(
        (await write({ revision: state.revision, value: state.value })).status,
        400,
      );
      assert.equal(
        (await write({ revision: 0, value: state.value, confirm: true }))
          .status,
        409,
      );
      assert.equal(
        (
          await write(
            { revision: state.revision, value: state.value, confirm: true },
            aliceCookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await write(
            { revision: state.revision, value: state.value, confirm: true },
            adminCookie,
            { origin: 'https://foreign.test' },
          )
        ).status,
        403,
      );
      const value = structuredClone(state.value);
      value.tabs = [];
      assert.equal(
        (await write({ revision: state.revision, value, confirm: true }))
          .status,
        400,
      );
      const unknown = structuredClone(state.value);
      unknown.menu.push({
        id: 'bad',
        label: 'Unknown',
        kind: 'page',
        target: 'not-found',
        visible: true,
        presentation: 'navigate',
      });
      assert.equal(
        (
          await write({
            revision: state.revision,
            value: unknown,
            confirm: true,
          })
        ).status,
        400,
      );
      assert.equal((await history()).length, 2);
    },
  );
  await check(
    'navigation uses published page IDs, supports modal/pages tabs and omits private references',
    async () => {
      const make = async (title, slug, status) => {
        const response = await call(
          '/api/pages',
          { title, slug, status, blocks: ['Visible page content'] },
          adminCookie,
        );
        assert.equal(response.status, 201);
        return (await response.json()).page;
      };
      page = await make('Navigation public', '/nav-public', 'published');
      draft = await make('Hidden navigation draft', '/nav-private', 'draft');
      const value = structuredClone(state.value);
      value.menu.push({
        id: 'public-page',
        label: 'Public menu label',
        kind: 'page',
        target: page.id,
        visible: true,
        presentation: 'modal',
      });
      value.menu.push({
        id: 'private-page',
        label: 'SECRET NAV LABEL',
        kind: 'page',
        target: draft.id,
        visible: true,
        presentation: 'navigate',
      });
      value.tabs.push({
        id: 'company',
        label: 'Company tab',
        kind: 'page',
        target: page.id,
        visible: true,
        presentation: 'navigate',
      });
      value.tabs.reverse();
      assert.equal(
        (await write({ revision: state.revision, value, confirm: true }))
          .status,
        200,
      );
      state = await read();
      const response = await call('/api/navigation');
      const text = await response.text();
      assert.doesNotMatch(text, /SECRET NAV LABEL|nav-private/);
      assert.equal(JSON.parse(text).menu.at(-1).presentation, 'modal');
      assert.equal(JSON.parse(text).tabs[0].id, 'company');
      const modal = await call(`/api/navigation/page?id=${page.id}`);
      assert.equal(modal.status, 200);
      assert.deepEqual(Object.keys(await modal.json()).sort(), [
        'blocks',
        'slug',
        'title',
      ]);
      assert.equal(
        (
          await call(
            `/api/navigation/page?id=${draft.id}`,
            undefined,
            adminCookie,
          )
        ).status,
        404,
      );
      const html = await (await call('/')).text();
      assert.match(html, /Public menu label/);
      assert.match(html, /Company tab/);
      assert.doesNotMatch(html, /SECRET NAV LABEL/);
    },
  );
  await check(
    'page slug changes and trash automatically update public navigation',
    async () => {
      const changed = await call(
        `/api/pages/${page.id}`,
        { revision: page.revision, slug: '/nav-new-address' },
        adminCookie,
        {},
        'PATCH',
      );
      assert.equal(changed.status, 200);
      page = (await changed.json()).page;
      let navigation = await (await call('/api/navigation')).json();
      assert.equal(navigation.menu.at(-1).href, '/nav-new-address');
      assert.equal(
        (
          await call(
            `/api/pages/${page.id}`,
            { revision: page.revision, confirm: true },
            adminCookie,
            {},
            'DELETE',
          )
        ).status,
        200,
      );
      navigation = await (await call('/api/navigation')).json();
      assert.ok(!navigation.menu.some((i) => i.target === page.id));
      assert.ok(!navigation.tabs.some((i) => i.target === page.id));
      assert.equal(
        (
          await call(
            `/api/navigation/page?id=${page.id}`,
            undefined,
            adminCookie,
          )
        ).status,
        404,
      );
    },
  );
  await check(
    'MCP navigation shares revisions, scopes and attributed journal with REST',
    async () => {
      const token = async (scopes) =>
        (
          await (
            await call(
              '/api/tokens',
              { name: 'navigation-tests', scopes, expiresInDays: 1 },
              adminCookie,
            )
          ).json()
        ).token;
      const reader = await token(['site:read']);
      const writer = await token(['site:read', 'site:write']);
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
            { authorization: `Bearer ${secret}` },
          )
        ).json();
      const denied = await invoke(reader, 'navigation_update', {
        revision: state.revision,
        value: state.value,
        confirm: true,
      });
      assert.ok(denied.error || denied.result?.isError);
      const current = await invoke(reader, 'navigation_get');
      assert.equal(current.result.structuredContent.revision, state.revision);
      const value = structuredClone(defaultNavigation);
      value.menu = [];
      const saved = await invoke(writer, 'navigation_update', {
        revision: state.revision,
        value,
        confirm: true,
      });
      assert.ok(!saved.error && !saved.result?.isError, JSON.stringify(saved));
      state = saved.result.structuredContent;
      const versions = await history();
      assert.equal(versions[0].source, 'mcp');
      assert.ok(versions[0].tokenId);
      const restored = await invoke(writer, 'navigation_restore', {
        revision: state.revision,
        targetRevision: 0,
        confirm: true,
      });
      assert.ok(
        !restored.error && !restored.result?.isError,
        JSON.stringify(restored),
      );
      state = restored.result.structuredContent;
      assert.deepEqual(state.value, defaultNavigation);
      assert.equal((await history())[0].restoredFrom, 0);
      assert.equal(
        (
          await write(
            { revision: state.revision, value: state.value, confirm: true },
            '',
            { authorization: `Bearer ${reader}` },
          )
        ).status,
        403,
      );
      const earlier = await call(
        '/api/navigation?view=history&before=2',
        undefined,
        adminCookie,
      );
      assert.deepEqual(
        (await earlier.json()).versions.map((v) => v.revision),
        [1, 0],
      );
      assert.equal(
        (
          await call(
            '/api/settings',
            { key: 'public.navigation', value },
            adminCookie,
            {},
            'PUT',
          )
        ).status,
        400,
      );
      const bypass = await invoke(writer, 'site_update_settings', {
        key: 'public.navigation',
        value,
      });
      assert.equal(bypass.result.isError, true);
    },
  );
  await check(
    'navigation journal failure rolls back configuration and revision',
    async () => {
      await sql(
        `CREATE TRIGGER test_nav_audit BEFORE INSERT ON site_document_revisions WHEN NEW.document_key = 'navigation' AND NEW.revision > 0 BEGIN SELECT RAISE(ABORT, 'test audit failure'); END`,
      );
      try {
        const value = structuredClone(state.value);
        value.menu = [];
        assert.equal(
          (await write({ revision: state.revision, value, confirm: true }))
            .status,
          503,
        );
        assert.deepEqual(await read(), state);
      } finally {
        await sql('DROP TRIGGER test_nav_audit');
      }
    },
  );
  await check(
    'OpenAPI describes navigation revision, confirmation and public page payload',
    async () => {
      const api = await (await call('/api/openapi')).json();
      assert.ok(api.paths['/navigation'].put.requestBody);
      assert.ok(api.paths['/navigation'].put.responses['409']);
      assert.deepEqual(api.paths['/navigation/page'].get.security, []);
    },
  );
}
