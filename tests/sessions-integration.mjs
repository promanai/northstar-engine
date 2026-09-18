import assert from 'node:assert/strict';

export async function sessionTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  const password = 'Session-test-password-123';
  const email = 'session-check@example.test';
  let primary, secondary, currentId, otherId, userId;
  const cookie = (r) => r.headers.get('set-cookie')?.split(';')[0];
  const read = async (session = primary) => {
    const r = await call('/api/auth/sessions', undefined, session);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'private, no-store');
    return r.json();
  };
  const revoke = (target, extra = {}, session = primary) =>
    call(
      '/api/auth/sessions',
      {
        target,
        currentPassword: password,
        confirm: true,
        ...extra,
      },
      session,
      {},
      'DELETE',
    );
  await check(
    'sessions: own list excludes credentials, expired and other users; current is first',
    async () => {
      const registration = await call(
        '/api/auth/register',
        {
          email,
          password,
        },
        '',
        { 'cf-connecting-ip': '192.0.2.80' },
      );
      assert.equal(registration.status, 201);
      primary = cookie(registration);
      userId = (await registration.json()).user.id;
      const login = await call('/api/auth/login', { email, password });
      assert.equal(login.status, 200);
      secondary = cookie(login);
      const list = await read();
      assert.equal(list.sessions.length, 2);
      assert.equal(list.sessions[0].current, true);
      assert.equal(list.truncated, false);
      currentId = list.sessions[0].id;
      otherId = list.sessions[1].id;
      for (const item of list.sessions) {
        assert.deepEqual(Object.keys(item).sort(), [
          'createdAt',
          'current',
          'expiresAt',
          'id',
        ]);
        assert.ok(item.expiresAt > Date.now());
      }
      assert.ok(!JSON.stringify(list).includes(primary.split('=')[1]));
      assert.ok(
        !(await read(adminCookie)).sessions.some((s) => s.id === currentId),
      );
      assert.ok(
        !(await read(aliceCookie)).sessions.some((s) => s.id === currentId),
      );
      await sql(
        `INSERT INTO sessions (id,user_id,token,expires_at,created_at,updated_at) VALUES ('${crypto.randomUUID()}','${userId}','sha256:${'0'.repeat(64)}',1,1,1)`,
      );
      assert.equal((await read()).sessions.length, 2);
      const plan = await sql(
        `EXPLAIN QUERY PLAN SELECT id FROM sessions WHERE user_id='${userId}' AND expires_at>1`,
      );
      assert.ok(JSON.stringify(plan).includes('idx_sessions_user_expiry'));
      await sql('PRAGMA optimize');
    },
  );
  await check(
    'sessions: anonymous, bearer fallback, foreign origin and unknown parameters denied',
    async () => {
      assert.equal((await call('/api/auth/sessions')).status, 401);
      for (const headers of [
        { authorization: 'Bearer invalid' },
        { origin: 'https://foreign.invalid' },
        { 'sec-fetch-site': 'cross-site' },
      ]) {
        assert.ok(
          [401, 403].includes(
            (await call('/api/auth/sessions', undefined, primary, headers))
              .status,
          ),
        );
        assert.ok(
          [401, 403].includes(
            (
              await call(
                '/api/auth/sessions',
                { target: otherId, currentPassword: password, confirm: true },
                primary,
                headers,
                'DELETE',
              )
            ).status,
          ),
        );
      }
      assert.equal(
        (await call('/api/auth/sessions?userId=x', undefined, primary)).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/auth/sessions',
            { target: 'others', currentPassword: password, confirm: true },
            primary,
            { 'content-type': 'text/plain' },
            'DELETE',
          )
        ).status,
        415,
      );
    },
  );
  await check(
    'sessions: password and confirmation required; current and foreign sessions stay alive',
    async () => {
      assert.equal((await revoke(otherId, { confirm: false })).status, 400);
      assert.equal((await revoke(otherId, { userId: 'someone' })).status, 400);
      assert.equal(
        (await revoke(otherId, { currentPassword: 'wrong' })).status,
        403,
      );
      assert.equal((await revoke(currentId)).status, 400);
      const foreignId = (await read(aliceCookie)).sessions[0].id;
      assert.equal((await (await revoke(foreignId)).json()).revoked, 0);
      assert.equal(
        (await call('/api/auth/me', undefined, aliceCookie)).status,
        200,
      );
      assert.equal((await read()).sessions.length, 2);
    },
  );
  await check(
    'sessions: simultaneous revocation is repeat-safe and immediately invalidates the target',
    async () => {
      const results = await Promise.all([revoke(otherId), revoke(otherId)]);
      assert.ok(results.every((r) => r.status === 200));
      const values = await Promise.all(results.map((r) => r.json()));
      assert.equal(
        values.reduce((n, r) => n + r.revoked, 0),
        1,
      );
      assert.equal(
        (await call('/api/auth/me', undefined, secondary)).status,
        401,
      );
      assert.equal((await read()).sessions.length, 1);
    },
  );
  await check(
    'sessions: database failure cannot silently report successful revocation',
    async () => {
      // Isolated fixture only: fail a DELETE after authentication/password checking.
      secondary = cookie(await call('/api/auth/login', { email, password }));
      await sql(
        "CREATE TRIGGER session_test_failure BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'fixture'); END",
      );
      try {
        assert.equal((await revoke('others')).status, 503);
      } finally {
        await sql('DROP TRIGGER session_test_failure');
      }
      assert.equal(
        (await call('/api/auth/me', undefined, secondary)).status,
        200,
      );
    },
  );
  await check(
    'sessions: revoke all others preserves caller and API tokens; revoked caller cannot mutate',
    async () => {
      const tokensBefore = await sql(
        `SELECT COUNT(*) AS count FROM api_tokens`,
      );
      assert.equal((await (await revoke('others')).json()).revoked, 1);
      assert.deepEqual(
        await sql('SELECT COUNT(*) AS count FROM api_tokens'),
        tokensBefore,
      );
      assert.equal((await read()).sessions.length, 1);
      assert.equal((await revoke('others', {}, secondary)).status, 401);
      assert.equal(
        (await call('/api/auth/me', undefined, primary)).status,
        200,
      );
    },
  );
  await check(
    'sessions: password attempts are limited and contract excludes bearer authorization',
    async () => {
      const results = await Promise.all(
        Array.from({ length: 12 }, () =>
          revoke('others', { currentPassword: 'wrong' }),
        ),
      );
      assert.ok(results.some((r) => r.status === 429));
      assert.ok(results.every((r) => [403, 429].includes(r.status)));
      const spec = await (await call('/api/openapi')).json();
      assert.deepEqual(spec.paths['/auth/sessions'].get.security, [
        { cookieAuth: [] },
      ]);
      assert.deepEqual(spec.paths['/auth/sessions'].delete.security, [
        { cookieAuth: [] },
      ]);
    },
  );
}
