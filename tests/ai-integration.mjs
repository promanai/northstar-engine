import assert from 'node:assert/strict';

export async function aiTests({ call, check, sql, adminCookie, aliceCookie }) {
  const api = '/api/ai';
  const view = async () => (await call(api, undefined, adminCookie)).json();
  const save = (config, revision) =>
    call(api, { action: 'save', config, revision }, adminCookie);
  let original;
  await check(
    'AI settings require owner/admin session and do not accept bearer fallback',
    async () => {
      assert.equal((await call(api)).status, 403);
      assert.equal((await call(api, undefined, aliceCookie)).status, 403);
      assert.equal(
        (await call(api, { action: 'models', provider: 'openai' }, aliceCookie))
          .status,
        403,
      );
      assert.equal(
        (
          await call(api, undefined, adminCookie, {
            authorization: 'Bearer invalid',
          })
        ).status,
        403,
      );
      const response = await call(api, undefined, adminCookie);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      original = await response.json();
      assert.deepEqual(original.credentials, { openai: false, xai: false });
      assert.equal(original.config.chat.enabled, false);
      assert.equal(original.source, 'environment');
    },
  );
  await check(
    'AI rejects cross-origin mutation and unconfirmed paid requests',
    async () => {
      assert.equal(
        (
          await call(
            api,
            { action: 'save', config: original.config, revision: 0 },
            adminCookie,
            { origin: 'https://attacker.invalid' },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            api,
            { action: 'test', profile: original.config.chat },
            adminCookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            api,
            { action: 'generate', task: 'text', prompt: 'hello' },
            adminCookie,
          )
        ).status,
        400,
      );
      assert.equal((await view()).revision, 0);
    },
  );
  await check(
    'AI settings persist atomically with stale revision protection',
    async () => {
      const config = structuredClone(original.config);
      config.chat = {
        ...config.chat,
        provider: 'xai',
        model: 'grok-4.6',
        reasoning: 'low',
        maxOutputTokens: 8192,
      };
      const results = await Promise.all([save(config, 0), save(config, 0)]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      let current = await view();
      assert.equal(current.source, 'saved');
      assert.deepEqual(current.config, config);
      assert.equal(current.revision, 1);
      config.text.model = 'gpt-6-astra';
      config.text.reasoning = 'high';
      assert.equal((await save(config, 1)).status, 200);
      assert.equal((await save(original.config, 1)).status, 409);
      current = await view();
      assert.equal(current.revision, 2);
      assert.equal(current.config.text.model, 'gpt-6-astra');
    },
  );
  await check(
    'AI rejects incompatible settings, plaintext credentials and activation without keys',
    async () => {
      const current = await view();
      for (const patch of [
        { enabled: true },
        { temperature: 0.4 },
        { reasoning: 'none' },
        { apiKey: 'do-not-store-this-key' },
      ]) {
        const config = structuredClone(current.config);
        config.chat = { ...config.chat, ...patch };
        assert.equal((await save(config, current.revision)).status, 400);
      }
      assert.equal((await view()).revision, current.revision);
    },
  );
  await check(
    'AI model discovery and generation fail clearly when keys/tasks are absent',
    async () => {
      for (const provider of ['openai', 'xai']) {
        const response = await call(
          api,
          { action: 'models', provider },
          adminCookie,
        );
        assert.equal(response.status, 502);
        assert.equal((await response.json()).code, 'not_configured');
      }
      const test = await call(
        api,
        { action: 'test', profile: original.config.chat, confirmPaid: true },
        adminCookie,
      );
      assert.equal(test.status, 502);
      assert.equal((await test.json()).code, 'not_configured');
      assert.equal(
        (
          await call(
            api,
            {
              action: 'generate',
              task: 'text',
              prompt: 'hello',
              confirmPaid: true,
            },
            adminCookie,
          )
        ).status,
        400,
      );
    },
  );
  await check(
    'enabled provider losing its secret fails closed, without demo or persisted messages',
    async () => {
      const config = structuredClone((await view()).config);
      config.chat.enabled = true;
      await sql(
        `UPDATE ai_settings SET config = '${JSON.stringify(config)}' WHERE id = 'main'`,
      );
      const failed = await call(
        '/api/chat',
        { message: 'AI-FAILED-WITHOUT-KEY' },
        aliceCookie,
      );
      assert.equal(failed.status, 502);
      assert.equal((await failed.json()).mode, undefined);
      const conversations = await call(
        '/api/conversations',
        undefined,
        aliceCookie,
      );
      assert.equal(
        JSON.stringify(await conversations.json()).includes(
          'AI-FAILED-WITHOUT-KEY',
        ),
        false,
      );
      // Restore only this isolated test fixture, never the owner database.
      await sql(
        `UPDATE ai_settings SET config = '${JSON.stringify(original.config)}' WHERE id = 'main'`,
      );
    },
  );
  await check(
    'AI routing is absent from public settings and documented as session-only API',
    async () => {
      const publicResponse = await call('/api/settings');
      const publicData = JSON.stringify(await publicResponse.json());
      assert.equal(publicData.includes('credentials'), false);
      assert.equal(publicData.includes('maxOutputTokens'), false);
      const spec = await (await call('/api/openapi')).json();
      assert.deepEqual(spec.paths['/ai'].post.security, [{ cookieAuth: [] }]);
      assert.ok(spec.paths['/ai'].post.responses['409']);
    },
  );
}
