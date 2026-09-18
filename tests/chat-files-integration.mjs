// Built Worker + isolated D1/R2 + intercepted outbound transport. Never contacts a real AI provider.
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  void chatFileTests()
    .then((count) => console.log(`${count} chat file checks passed`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

export async function chatFileTests() {
  const payloads = [];
  let providerStatus = 200;
  let providerBlock;
  let checks = 0;
  const moduleRoot = path.resolve('dist/server');
  const modules = [
    'index.js',
    ...(await readdir(moduleRoot, { recursive: true })).filter(
      (name) => /\.(m?js)$/.test(name) && name !== 'index.js',
    ),
  ];
  const mf = new Miniflare({
    modulesRoot: moduleRoot,
    modules: modules.map((name) => ({
      type: 'ESModule',
      path: path.join(moduleRoot, name),
    })),
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['FILES'],
    outboundService: async (request) => {
      assert.ok(
        [
          'https://api.openai.com/v1/responses',
          'https://api.x.ai/v1/responses',
        ].includes(request.url),
        'Unexpected outbound request blocked',
      );
      payloads.push(await request.json());
      const block = providerBlock;
      if (block) {
        block.entered();
        await block.gate;
      }
      return Response.json(
        {
          status: 'completed',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [
                { type: 'output_text', text: 'Тестовый результат анализа' },
              ],
            },
          ],
        },
        {
          status: providerStatus,
          ...(providerStatus === 302
            ? { headers: { location: 'https://blocked.example.test/collect' } }
            : {}),
        },
      );
    },
    bindings: {
      ENGINE_MODE: 'standard',
      INITIAL_ADMIN_TOKEN: 'test-only-initial-admin-token-0000000000',
      OPENAI_API_KEY: 'test-only-no-network',
      XAI_API_KEY: 'test-only-no-network',
    },
  });
  try {
    console.log('Chat file fixture: starting isolated Worker');
    const db = await mf.getD1Database('DB');
    console.log('Chat file fixture: applying migrations');
    const bucket = await mf.getR2Bucket('FILES');
    for (const name of (await readdir('drizzle'))
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      const sql = await readFile(path.join('drizzle', name), 'utf8');
      for (const statement of sql
        .split('--> statement-breakpoint')
        .filter((s) => s.trim()))
        await db.prepare(statement).run();
    }
    console.log('Chat file fixture: migrations ready');
    const check = async (name, run) => {
      await run();
      checks++;
      console.log(`PASS chat files: ${name}`);
    };
    const call = async (
      route,
      body,
      cookie = '',
      method = body === undefined ? 'GET' : 'POST',
      extraHeaders = {},
    ) => {
      const response = await mf.dispatchFetch('http://engine.test' + route, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(cookie ? { cookie } : {}),
          ...(route === '/api/chat' && method === 'POST'
            ? { 'Idempotency-Key': crypto.randomUUID() }
            : {}),
          ...extraHeaders,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const bytes = await response.arrayBuffer();
      return new Response(bytes, {
        status: response.status,
        headers: response.headers,
      });
    };
    const register = async (email, setupToken) => {
      const r = await call('/api/auth/register', {
        email,
        password: 'test-only-password-12345',
        ...(setupToken ? { setupToken } : {}),
      });
      assert.equal(r.status, 201, await r.clone().text());
      return {
        cookie: r.headers.get('set-cookie').split(';')[0],
        user: (await r.json()).user,
      };
    };
    const admin = await register(
      'admin@example.test',
      'test-only-initial-admin-token-0000000000',
    );
    const alice = await register('alice@example.test');
    const bob = await register('bob@example.test');
    const upload = async (name, bytes, type = 'text/plain') => {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type }), name);
      const encoded = new Request('http://engine.test/api/files', {
        method: 'POST',
        headers: {
          cookie: alice.cookie,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: form,
      });
      const r = await mf.dispatchFetch(encoded.url, {
        method: 'POST',
        headers: Object.fromEntries(encoded.headers),
        body: await encoded.arrayBuffer(),
      });
      assert.equal(r.status, 201, await r.clone().text());
      return (await r.json()).file;
    };
    const file = await upload('private.txt', 'PRIVATE-FILE-TEXT');
    const input = {
      message: 'Разбери файл',
      fileId: file.id,
      confirmFile: true,
      fileProvider: 'openai',
    };
    let conversationId;
    const count = async () =>
      (await db.prepare('SELECT count(*) AS n FROM messages').first()).n;
    const quota = async () =>
      (
        await db
          .prepare(
            "SELECT day_requests AS n FROM ai_request_budget WHERE id = 'site'",
          )
          .first()
      )?.n ?? 0;

    await check(
      'session, consent and ownership block before paid transport',
      async () => {
        assert.equal((await call('/api/chat')).status, 401);
        assert.equal((await call('/api/chat', input)).status, 401);
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, confirmFile: false },
              alice.cookie,
            )
          ).status,
          400,
        );
        assert.equal((await call('/api/chat', input, bob.cookie)).status, 404);
        assert.equal(
          (await call('/api/chat', input, admin.cookie)).status,
          403,
        );
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, fileProvider: 'xai' },
              alice.cookie,
            )
          ).status,
          409,
        );
        assert.equal(payloads.length, 0);
        assert.equal(await quota(), 0);
      },
    );
    await check(
      'owned TXT reaches mock provider and file reference commits with message pair',
      async () => {
        const response = await call('/api/chat', input, alice.cookie);
        assert.equal(response.status, 200, await response.clone().text());
        const data = await response.json();
        conversationId = data.conversationId;
        assert.equal(data.mode, 'live');
        assert.equal(payloads.length, 1);
        assert.ok(
          JSON.stringify(payloads[0].input.at(-1)).includes(
            'PRIVATE-FILE-TEXT',
          ),
        );
        assert.equal(payloads[0].store, false);
        assert.equal(
          (
            await db
              .prepare("SELECT file_id FROM messages WHERE role = 'user'")
              .first()
          ).file_id,
          file.id,
        );
        assert.equal(await count(), 2);
        assert.equal(await quota(), 1);
      },
    );
    await check(
      'history returns private attachment metadata; next turn does not re-send bytes',
      async () => {
        const history = await call(
          '/api/conversations',
          undefined,
          alice.cookie,
        );
        assert.match(history.headers.get('cache-control'), /no-store/);
        const data = await history.json();
        assert.equal(
          data.conversations[0].messages[0].attachment.filename,
          'private.txt',
        );
        assert.equal(JSON.stringify(data).includes('PRIVATE-FILE-TEXT'), false);
        const response = await call(
          '/api/chat',
          { message: 'Следующий вопрос', conversationId },
          alice.cookie,
        );
        assert.equal(response.status, 200);
        assert.equal(
          JSON.stringify(payloads.at(-1)).includes('PRIVATE-FILE-TEXT'),
          false,
        );
        assert.match(JSON.stringify(payloads.at(-1)), /не передано/);
        const adminMine = await (
          await call('/api/conversations?scope=mine', undefined, admin.cookie)
        ).json();
        assert.equal(adminMine.conversations.length, 0);
        const bobHistory = await (
          await call('/api/conversations', undefined, bob.cookie)
        ).json();
        assert.equal(bobHistory.conversations.length, 0);
      },
    );
    await check(
      'binary and PDF become inline parts; no public object URLs',
      async () => {
        for (const [name, mime, bytes, part] of [
          [
            'a.png',
            'image/png',
            new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
            'input_image',
          ],
          ['a.pdf', 'application/pdf', '%PDF-1.7\n', 'input_file'],
        ]) {
          const stored = await upload(name, bytes, mime);
          const response = await call(
            '/api/chat',
            { ...input, fileId: stored.id },
            alice.cookie,
          );
          assert.equal(response.status, 200, await response.clone().text());
          const content = payloads.at(-1).input.at(-1).content;
          assert.equal(content[1].type, part);
          assert.match(content[1].image_url ?? content[1].file_data, /^data:/);
        }
      },
    );
    await check(
      'oversized AI payload is rejected without consuming attempt',
      async () => {
        const bytes = new Uint8Array(110000);
        bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
        const large = await upload('large.png', bytes, 'image/png');
        const before = payloads.length,
          used = await quota();
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, fileId: large.id },
              alice.cookie,
            )
          ).status,
          413,
        );
        assert.equal(payloads.length, before);
        assert.equal(await quota(), used);
      },
    );
    await check(
      'provider failures consume quota, never persist fake successful turn',
      async () => {
        const before = await count(),
          used = await quota();
        providerStatus = 500;
        assert.equal(
          (await call('/api/chat', input, alice.cookie)).status,
          502,
        );
        providerStatus = 200;
        assert.equal(await count(), before);
        assert.equal(await quota(), used + 1);
      },
    );
    await check(
      'D1 failure rolls back attachment and both messages after paid response',
      async () => {
        const before = await count(),
          used = await quota();
        await db
          .prepare(
            "CREATE TRIGGER test_file_failure BEFORE INSERT ON messages WHEN NEW.role = 'assistant' BEGIN SELECT RAISE(ABORT, 'fixture'); END",
          )
          .run();
        assert.equal(
          (await call('/api/chat', input, alice.cookie)).status,
          503,
        );
        assert.equal(await count(), before);
        assert.equal(await quota(), used + 1);
        await db.prepare('DROP TRIGGER test_file_failure').run();
      },
    );
    await check(
      'redirects are rejected without following to another host',
      async () => {
        const before = payloads.length,
          messages = await count();
        providerStatus = 302;
        assert.equal(
          (await call('/api/chat', input, alice.cookie)).status,
          502,
        );
        providerStatus = 200;
        assert.equal(payloads.length, before + 1);
        assert.equal(await count(), messages);
      },
    );
    await check(
      'xAI analyzes text but rejects binary; disabled AI never fakes analysis',
      async () => {
        const initial = (
          await (await call('/api/ai', undefined, admin.cookie)).json()
        ).config;
        const config = structuredClone(initial);
        config.chat.provider = 'xai';
        config.chat.model = 'grok-4.6';
        const save = (value) =>
          db
            .prepare(
              "INSERT INTO ai_settings (id, revision, config) VALUES ('main', 1, ?) ON CONFLICT(id) DO UPDATE SET config = excluded.config",
            )
            .bind(JSON.stringify(value))
            .run();
        await save(config);
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, fileProvider: 'xai' },
              alice.cookie,
            )
          ).status,
          200,
        );
        const png = await upload(
          'xai.png',
          new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
          'image/png',
        );
        const before = payloads.length;
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, fileProvider: 'xai', fileId: png.id },
              alice.cookie,
            )
          ).status,
          422,
        );
        config.chat.enabled = false;
        await save(config);
        assert.equal(
          (
            await call(
              '/api/chat',
              { ...input, fileProvider: 'xai' },
              alice.cookie,
            )
          ).status,
          503,
        );
        assert.equal(payloads.length, before);
        await save(initial);
      },
    );
    await check(
      'site quota blocks file analysis without outgoing request or saved messages',
      async () => {
        const before = payloads.length,
          messages = await count();
        await db
          .prepare(
            "UPDATE ai_request_budget SET day_requests = 100 WHERE id = 'site'",
          )
          .run();
        const retryKey = crypto.randomUUID();
        const response = await call('/api/chat', input, alice.cookie, 'POST', {
          'Idempotency-Key': retryKey,
        });
        assert.equal(response.status, 429);
        assert.ok(Number(response.headers.get('retry-after')) > 0);
        const replay = await call('/api/chat', input, alice.cookie, 'POST', {
          'Idempotency-Key': retryKey,
        });
        assert.equal(replay.status, 429);
        assert.ok(Number(replay.headers.get('retry-after')) > 0);
        assert.equal(payloads.length, before);
        assert.equal(await count(), messages);
      },
    );
    await check(
      'tampered R2 bytes and deleted files never reach provider',
      async () => {
        const row = await db
          .prepare('SELECT object_key FROM files WHERE id = ?')
          .bind(file.id)
          .first();
        await bucket.put(row.object_key, 'TAMPERED-CONTENTS!');
        const before = payloads.length;
        assert.equal(
          (await call('/api/chat', input, alice.cookie)).status,
          409,
        );
        assert.equal(payloads.length, before);
        assert.equal(
          (
            await call(
              `/api/files/${file.id}`,
              { confirm: true },
              alice.cookie,
              'DELETE',
            )
          ).status,
          200,
        );
        assert.equal(
          (await call('/api/chat', input, alice.cookie)).status,
          409,
        );
        const history = await (
          await call('/api/conversations', undefined, alice.cookie)
        ).json();
        const attachment = history.conversations.find(
          (c) => c.id === conversationId,
        ).messages[0].attachment;
        assert.equal(attachment.available, false);
        assert.equal(attachment.downloadUrl, null);
        assert.equal(payloads.length, before);
      },
    );
    // Request replay/concurrency checks share the real Worker/provider boundary above.
    const resetLimits = async () => {
      await db.prepare('DELETE FROM rate_limits').run();
      await db
        .prepare(
          'UPDATE ai_request_budget SET day_requests = 0, month_requests = 0',
        )
        .run();
    };
    const keyed = (body, key, cookie = alice.cookie) =>
      call('/api/chat', body, cookie, 'POST', { 'Idempotency-Key': key });
    const holdProvider = () => {
      let release, entered;
      const gate = new Promise((r) => {
        release = r;
      });
      const started = new Promise((r) => {
        entered = r;
      });
      providerBlock = { gate, entered };
      return {
        started,
        release: () => {
          providerBlock = undefined;
          release();
        },
      };
    };
    await resetLimits();
    await check(
      'required key and guest handshake precede paid work',
      async () => {
        const before = payloads.length;
        assert.equal((await keyed({ message: 'key missing' }, '')).status, 400);
        const key = crypto.randomUUID(),
          body = { message: 'guest first turn' };
        const init = await keyed(body, key, '');
        assert.equal(init.status, 428);
        assert.equal(payloads.length, before);
        assert.equal(init.headers.get('x-chat-request-state'), 'unclaimed');
        const cookie = init.headers.get('set-cookie').split(';')[0];
        const first = await keyed(body, key, cookie);
        assert.equal(first.status, 200);
        const answer = await first.json();
        const replay = await keyed(body, key, cookie);
        assert.equal(replay.status, 200);
        assert.deepEqual(await replay.json(), answer);
        assert.equal(payloads.length, before + 1);
        assert.equal(
          (
            await keyed(
              { ...body, conversationId: answer.conversationId },
              crypto.randomUUID(),
              bob.cookie,
            )
          ).status,
          403,
        );
      },
    );
    await check(
      'completed file request replays after deletion without another provider call',
      async () => {
        const own = await upload('replay.txt', 'FILE-REPLAY-TEST');
        const body = { ...input, fileId: own.id },
          key = crypto.randomUUID(),
          before = payloads.length,
          spent = await quota();
        const first = await keyed(body, key);
        assert.equal(first.status, 200);
        const answer = await first.json();
        const size = await count();
        assert.equal(
          (
            await call(
              `/api/files/${own.id}`,
              { confirm: true },
              alice.cookie,
              'DELETE',
            )
          ).status,
          200,
        );
        const replay = await keyed(body, key);
        assert.equal(replay.status, 200);
        assert.deepEqual(await replay.json(), answer);
        assert.equal(payloads.length, before + 1);
        assert.equal(await quota(), spent + 1);
        assert.equal(await count(), size);
        assert.equal(
          (await keyed({ ...body, message: 'changed' }, key)).status,
          409,
        );
        assert.equal(payloads.length, before + 1);
      },
    );
    await check(
      'concurrent first-turn duplicate runs exactly one provider attempt',
      async () => {
        const block = holdProvider(),
          key = crypto.randomUUID(),
          body = { message: 'simultaneous first turn' },
          before = payloads.length;
        const pending = keyed(body, key);
        try {
          await block.started;
          const duplicate = await keyed(body, key);
          assert.equal(duplicate.status, 409);
          assert.equal(
            duplicate.headers.get('x-chat-request-state'),
            'pending',
          );
          assert.ok(Number(duplicate.headers.get('retry-after')) > 0);
          assert.equal(
            (await keyed({ message: 'different payload' }, key)).status,
            409,
          );
        } finally {
          block.release();
        }
        const first = await pending;
        assert.equal(first.status, 200);
        const replay = await keyed(body, key);
        assert.equal(replay.status, 200);
        assert.deepEqual(await replay.json(), await first.json());
        assert.equal(payloads.length, before + 1);
      },
    );
    await resetLimits();
    await check(
      'different turns cannot concurrently read stale conversation context',
      async () => {
        const block = holdProvider(),
          body = { message: 'serialized first', conversationId },
          before = payloads.length;
        const pending = keyed(body, crypto.randomUUID());
        const nextKey = crypto.randomUUID(),
          next = { message: 'serialized second', conversationId };
        try {
          await block.started;
          const busy = await keyed(next, nextKey);
          assert.equal(busy.status, 409);
          assert.equal(busy.headers.get('x-chat-request-state'), 'busy');
          assert.equal(payloads.length, before + 1);
        } finally {
          block.release();
        }
        assert.equal((await pending).status, 200);
        assert.equal((await keyed(next, nextKey)).status, 200);
        assert.ok(
          payloads.at(-1).input.some((m) => m.content === 'serialized first'),
        );
      },
    );
    await check(
      'expired in-flight attempt is fenced and never re-executed with same key',
      async () => {
        const block = holdProvider(),
          key = crypto.randomUUID(),
          body = { message: 'expired old answer', conversationId },
          before = payloads.length,
          size = await count();
        const pending = keyed(body, key);
        try {
          await block.started;
          await db
            .prepare(
              "UPDATE chat_requests SET lease_until = 0 WHERE conversation_id = ? AND state = 'pending'",
            )
            .bind(conversationId)
            .run();
          const unknown = await keyed(body, key);
          assert.equal(unknown.status, 409);
          assert.equal(unknown.headers.get('x-chat-request-state'), 'unknown');
          // Release only future provider calls, leave the old one parked on its captured gate.
          providerBlock = undefined;
          assert.equal(
            (
              await keyed(
                { message: 'fresh next turn', conversationId },
                crypto.randomUUID(),
              )
            ).status,
            200,
          );
        } finally {
          block.release();
        }
        const old = await pending;
        assert.equal(old.status, 503);
        assert.equal(old.headers.get('x-chat-request-state'), 'unknown');
        assert.equal(await count(), size + 2);
        const retry = await keyed(body, key);
        assert.equal(retry.status, 409);
        assert.equal(payloads.length, before + 2);
      },
    );
    await check(
      'failed provider attempt is cached, consumes quota only once',
      async () => {
        const key = crypto.randomUUID(),
          body = { message: 'provider failure' },
          before = payloads.length,
          spent = await quota();
        providerStatus = 500;
        const failed = await keyed(body, key);
        assert.equal(failed.status, 502);
        assert.equal(failed.headers.get('x-chat-request-state'), 'failed');
        providerStatus = 200;
        const replay = await keyed(body, key);
        assert.equal(replay.status, 502);
        assert.deepEqual(await replay.json(), await failed.json());
        assert.equal(payloads.length, before + 1);
        assert.equal(await quota(), spent + 1);
      },
    );
    await resetLimits();
    await check(
      'request result and message pair commit atomically; failure replay is safe',
      async () => {
        const key = crypto.randomUUID(),
          body = { message: 'completion rollback' },
          before = payloads.length,
          size = await count();
        await db
          .prepare(
            "CREATE TRIGGER reject_chat_completion BEFORE UPDATE OF state ON chat_requests WHEN NEW.state = 'completed' BEGIN SELECT RAISE(ABORT, 'injected'); END",
          )
          .run();
        try {
          assert.equal((await keyed(body, key)).status, 503);
        } finally {
          await db.prepare('DROP TRIGGER reject_chat_completion').run();
        }
        assert.equal(await count(), size);
        assert.equal((await keyed(body, key)).status, 503);
        assert.equal(payloads.length, before + 1);
      },
    );
    await check(
      'request journal failure blocks provider and identity scopes isolate keys',
      async () => {
        const before = payloads.length;
        await db
          .prepare(
            "CREATE TRIGGER reject_chat_claim BEFORE INSERT ON chat_requests BEGIN SELECT RAISE(ABORT, 'injected'); END",
          )
          .run();
        try {
          assert.equal(
            (await keyed({ message: 'no journal' }, crypto.randomUUID()))
              .status,
            503,
          );
        } finally {
          await db.prepare('DROP TRIGGER reject_chat_claim').run();
        }
        assert.equal(payloads.length, before);
        const key = crypto.randomUUID(),
          body = { message: 'scoped same key' };
        const a = await (await keyed(body, key)).json(),
          b = await (await keyed(body, key, bob.cookie)).json();
        assert.ok(a.conversationId);
        assert.ok(b.conversationId);
        assert.notEqual(a.conversationId, b.conversationId);
      },
    );
    await resetLimits();
    const statusOf = (key, cookie = alice.cookie, headers = {}) =>
      call('/api/chat/request', undefined, cookie, 'GET', {
        'Idempotency-Key': key,
        ...headers,
      });
    let recoveryKey, recoveryConversation;
    await check(
      'GET recovery restores completed turn/history without provider, quota or journal writes',
      async () => {
        recoveryKey = crypto.randomUUID();
        const response = await keyed(
          { message: 'Recover after browser reload' },
          recoveryKey,
        );
        assert.equal(response.status, 200);
        recoveryConversation = (await response.json()).conversationId;
        const before = payloads.length,
          spent = await quota(),
          size = await count();
        const journal = JSON.stringify(
          (await db.prepare('SELECT * FROM chat_requests ORDER BY id').all())
            .results,
        );
        for (let i = 0; i < 2; i++) {
          const r = await statusOf(recoveryKey);
          assert.equal(r.status, 200);
          assert.equal(r.headers.get('set-cookie'), null);
          assert.equal(r.headers.get('cache-control'), 'private, no-store');
          const body = await r.json();
          assert.equal(body.state, 'completed');
          assert.equal(body.conversationId, recoveryConversation);
          assert.deepEqual(
            body.messages.map((m) => m.role),
            ['user', 'assistant'],
          );
          assert.equal(
            body.messages[0].content,
            'Recover after browser reload',
          );
          assert.equal(body.result.message, 'Тестовый результат анализа');
          assert.doesNotMatch(
            JSON.stringify(body),
            /fingerprint|guestTokenHash|object_key|leaseUntil|passwordHash/,
          );
        }
        assert.equal(payloads.length, before);
        assert.equal(await quota(), spent);
        assert.equal(await count(), size);
        assert.equal(
          JSON.stringify(
            (await db.prepare('SELECT * FROM chat_requests ORDER BY id').all())
              .results,
          ),
          journal,
        );
        const spec = await (await call('/api/openapi')).json();
        assert.ok(
          spec.paths['/chat/request'].get.parameters.some(
            (p) => p.name === 'Idempotency-Key' && p.required,
          ),
        );
      },
    );
    await check(
      'recovery denies another identity, bearer fallback, foreign origins and invalid keys',
      async () => {
        const before = payloads.length;
        assert.equal((await statusOf(recoveryKey, bob.cookie)).status, 404);
        assert.equal((await statusOf(recoveryKey, admin.cookie)).status, 404);
        assert.equal((await statusOf(recoveryKey, '')).status, 401);
        assert.equal(
          (
            await statusOf(recoveryKey, alice.cookie, {
              authorization: 'Bearer not-a-session',
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await statusOf(recoveryKey, alice.cookie, {
              origin: 'https://foreign.test',
            })
          ).status,
          403,
        );
        assert.equal((await statusOf('bad')).status, 400);
        assert.equal((await statusOf(crypto.randomUUID())).status, 404);
        assert.equal(payloads.length, before);
      },
    );
    await check(
      'pending/expired recovery is read-only and never restarts the provider',
      async () => {
        const block = holdProvider(),
          key = crypto.randomUUID();
        const running = keyed({ message: 'Read-only status in flight' }, key);
        try {
          await block.started;
          const before = payloads.length;
          const pending = await statusOf(key);
          assert.equal(pending.status, 200);
          assert.equal((await pending.json()).state, 'pending');
          assert.equal(pending.headers.get('retry-after'), '3');
          await db
            .prepare(
              "UPDATE chat_requests SET lease_until = 0 WHERE state = 'pending'",
            )
            .run();
          const expired = await statusOf(key);
          assert.equal((await expired.json()).state, 'unknown');
          assert.equal(
            (
              await db
                .prepare(
                  "SELECT count(*) AS n FROM chat_requests WHERE state='pending'",
                )
                .first()
            ).n,
            1,
          );
          assert.equal(payloads.length, before);
        } finally {
          block.release();
        }
        assert.equal((await running).status, 503);
      },
    );
    await check(
      'failed attempt recovery reports stored error without a paid retry',
      async () => {
        const key = crypto.randomUUID();
        providerStatus = 500;
        assert.equal(
          (await keyed({ message: 'Recover provider failure' }, key)).status,
          502,
        );
        providerStatus = 200;
        const before = payloads.length,
          spent = await quota();
        const r = await statusOf(key);
        assert.equal(r.status, 200);
        const body = await r.json();
        assert.equal(body.state, 'failed');
        assert.equal(body.responseStatus, 502);
        assert.ok(body.error);
        assert.equal(body.messages, undefined);
        assert.equal(payloads.length, before);
        assert.equal(await quota(), spent);
      },
    );
    await check(
      'guest recovery honors cookie lifetime and deleted attachments remain unavailable',
      async () => {
        const key = crypto.randomUUID(),
          body = { message: 'Guest recovery' };
        const init = await keyed(body, key, '');
        assert.equal(init.status, 428);
        const cookie = init.headers.get('set-cookie').split(';')[0];
        const sent = await keyed(body, key, cookie);
        assert.equal(sent.status, 200);
        const guestConversation = (await sent.json()).conversationId;
        assert.equal((await statusOf(key, cookie)).status, 200);
        await db
          .prepare('UPDATE conversations SET guest_expires_at = 0 WHERE id = ?')
          .bind(guestConversation)
          .run();
        assert.equal((await statusOf(key, cookie)).status, 404);
        const own = await upload('recover-private.txt', 'RECOVER-FILE-TEST'),
          fileKey = crypto.randomUUID();
        assert.equal(
          (await keyed({ ...input, fileId: own.id }, fileKey)).status,
          200,
        );
        await call(
          `/api/files/${own.id}`,
          { confirm: true },
          alice.cookie,
          'DELETE',
        );
        const before = payloads.length;
        const recovered = await (await statusOf(fileKey)).json();
        assert.equal(recovered.messages[0].attachment.available, false);
        assert.equal(recovered.messages[0].attachment.downloadUrl, null);
        assert.doesNotMatch(
          JSON.stringify(recovered),
          /RECOVER-FILE-TEST|recover-private\.txt/,
        );
        assert.equal(payloads.length, before);
      },
    );
    await db.exec('PRAGMA optimize');
    const requestPlan = await db
      .prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM chat_requests WHERE conversation_id = ? AND state = 'pending'",
      )
      .bind(conversationId)
      .all();
    assert.match(
      JSON.stringify(requestPlan.results),
      /idx_chat_requests_pending_conversation/,
    );
    const plan = await db
      .prepare(
        'EXPLAIN QUERY PLAN SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 100',
      )
      .bind(conversationId)
      .all();
    assert.match(
      JSON.stringify(plan.results),
      /USING INDEX idx_messages_conversation_created/,
    );
    return checks;
  } finally {
    await mf.dispose();
  }
}
