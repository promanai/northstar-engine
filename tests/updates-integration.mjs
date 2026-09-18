import assert from 'node:assert/strict';

export async function updateTests({
  call,
  check,
  sql,
  adminCookie,
  aliceCookie,
}) {
  const api = '/api/updates';
  const secret = 'test-only-update-secret-not-for-production';
  const runner = (body) =>
    call(`${api}/runner`, { githubRunId: '12345', ...body }, '', {
      authorization: `Bearer ${secret}`,
    });
  const view = async () => (await call(api, undefined, adminCookie)).json();
  const configure = async (body) =>
    call(
      api,
      {
        action: 'configure',
        repository: 'owner/engine',
        automatic: false,
        revision: (await view()).revision,
        ...body,
      },
      adminCookie,
    );
  await check(
    'updater requires owner session and separate runner credentials',
    async () => {
      assert.equal((await call(api)).status, 403);
      assert.equal((await call(api, undefined, aliceCookie)).status, 403);
      assert.equal(
        (await call(api, { action: 'configure' }, aliceCookie)).status,
        403,
      );
      assert.equal(
        (await call(`${api}/runner`, { action: 'claim' }, adminCookie)).status,
        401,
      );
      const response = await call(api, undefined, adminCookie);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      assert.equal(data.state.automatic, false);
      assert.equal(data.runnerConfigured, true);
      assert.equal(JSON.stringify(data).includes(secret), false);
    },
  );
  await check(
    'repository changes require trust and disable automatic mode',
    async () => {
      assert.equal((await configure({})).status, 400);
      const response = await configure({
        trustRepository: 'owner/engine',
        automatic: true,
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).state.automatic, false);
      assert.equal((await configure({ revision: 0 })).status, 409);
      assert.equal(
        (await configure({ trustRepository: 'owner/engine', automatic: true }))
          .status,
        200,
      );
      assert.equal((await view()).state.automatic, true);
      assert.equal((await configure({ automatic: false })).status, 200);
    },
  );
  // Synthetic GitHub result in isolated D1: integration suite never calls GitHub.
  let data = await view();
  const parts = data.installed.version.split('.').map(Number);
  parts[2]++;
  const candidate = {
    repository: 'owner/engine',
    version: parts.join('.'),
    tag: `v${parts.join('.')}`,
    sha: 'a'.repeat(40),
    name: 'Test release',
    url: 'https://github.com/owner/engine/releases/tag/test',
    checkedAt: Date.now(),
  };
  await sql(
    `UPDATE engine_updates SET state='${JSON.stringify({ ...data.state, candidate }).replaceAll("'", "''")}' WHERE id='engine'`,
  );
  await check(
    'concurrent admin install requests create only one queued job',
    async () => {
      data = await view();
      const body = {
        action: 'install',
        revision: data.revision,
        sha: candidate.sha,
        trustRepository: 'owner/engine',
      };
      const responses = await Promise.all([
        call(api, body, adminCookie),
        call(api, body, adminCookie),
      ]);
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [200, 409],
      );
      assert.equal((await view()).state.active.status, 'queued');
      assert.equal(
        (await configure({ trustRepository: 'owner/engine' })).status,
        409,
      );
    },
  );
  let run;
  await check('parallel runners cannot claim the same job twice', async () => {
    const responses = await Promise.all([
      runner({ action: 'claim' }),
      runner({ action: 'claim', githubRunId: '54321' }),
    ]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    const claims = bodies.filter((body) => body.run);
    assert.equal(claims.length, 1);
    run = claims[0].run;
    assert.equal(run.sha, candidate.sha);
    assert.equal(run.status, 'running');
    assert.ok(Object.keys(claims[0].installedMigrations).length >= 6);
  });
  const job = (body) =>
    runner({ runId: run.id, githubRunId: run.githubRunId, ...body });
  await check(
    'runner must match claim and deployed stamp before confirming success',
    async () => {
      assert.equal(
        (await job({ action: 'authorize', githubRunId: '999' })).status,
        409,
      );
      assert.equal((await job({ action: 'authorize' })).status, 200);
      assert.equal(
        (await job({ action: 'complete', status: 'succeeded' })).status,
        409,
      );
      const current = await view();
      assert.equal(
        (
          await call(
            api,
            { action: 'cancel', revision: current.revision },
            adminCookie,
          )
        ).status,
        409,
      );
    },
  );
  await check(
    'failed completion is recorded once and callback retries are idempotent',
    async () => {
      assert.equal(
        (await job({ action: 'complete', status: 'failed' })).status,
        200,
      );
      assert.equal(
        (await job({ action: 'complete', status: 'failed' })).status,
        200,
      );
      data = await view();
      assert.equal(data.state.active, null);
      assert.equal(data.state.history.length, 1);
      assert.equal(data.state.history[0].status, 'failed');
      assert.equal((await job({ action: 'authorize' })).status, 409);
      assert.equal((await runner({ action: 'claim' })).status, 200);
      assert.ok((await view()).state.runnerSeenAt);
    },
  );
  await check(
    'changing fork clears stale release and requires fresh auto opt-in',
    async () => {
      const response = await configure({
        repository: 'another/fork',
        trustRepository: 'another/fork',
        automatic: true,
      });
      assert.equal(response.status, 200);
      data = await response.json();
      assert.equal(data.state.repository, 'another/fork');
      assert.equal(data.state.candidate, null);
      assert.equal(data.state.automatic, false);
    },
  );
  await check(
    'queued update can be cancelled without deleting its history',
    async () => {
      data = await view();
      const currentCandidate = {
        ...candidate,
        repository: data.state.repository,
        checkedAt: Date.now(),
      };
      await sql(
        `UPDATE engine_updates SET state='${JSON.stringify({ ...data.state, candidate: currentCandidate }).replaceAll("'", "''")}' WHERE id='engine'`,
      );
      assert.equal(
        (
          await call(
            api,
            {
              action: 'install',
              revision: data.revision,
              sha: currentCandidate.sha,
              trustRepository: currentCandidate.repository,
            },
            adminCookie,
          )
        ).status,
        200,
      );
      data = await view();
      assert.equal(
        (
          await call(
            api,
            { action: 'cancel', revision: data.revision },
            adminCookie,
          )
        ).status,
        200,
      );
      data = await view();
      assert.equal(data.state.active, null);
      assert.equal(data.state.history[0].status, 'cancelled');
      assert.equal(data.state.history.length, 2);
    },
  );
  await check(
    'abandoned runner expires into failure without an automatic retry',
    async () => {
      const state = {
        ...data.state,
        active: { ...run, updatedAt: Date.now() - 3 * 3600_000 },
      };
      await sql(
        `UPDATE engine_updates SET state='${JSON.stringify(state).replaceAll("'", "''")}' WHERE id='engine'`,
      );
      assert.equal((await runner({ action: 'claim' })).status, 200);
      data = await view();
      assert.equal(data.state.active, null);
      assert.equal(data.state.history[0].status, 'failed');
      assert.match(data.state.history[0].reason, /2 часа/);
    },
  );
}
