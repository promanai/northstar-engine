import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { wizardHtml, startWizard } from '../scripts/launch-wizard.mjs';

void test('wizard CLI exports standalone HTML without needing owner state and refuses overwrite', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'northstar-wizard-'));
  const output = path.join(dir, 'wizard.html');
  async function run() {
    const child = spawn(
      process.execPath,
      ['scripts/launch.mjs', 'wizard', '--output', output],
      { windowsHide: true, stdio: 'ignore' },
    );
    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
  }
  assert.equal(await run(), 0);
  const html = await readFile(output, 'utf8');
  assert.ok(html.includes('Граф зависимостей'));
  assert.equal(await run(), 1);
  assert.equal(await readFile(output, 'utf8'), html);
});

void test('wizard is standalone, CSP-hashed, parses and embeds no owner passport or remote scripts', async () => {
  const html = await wizardHtml();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const script = scripts[0][1];
  assert.ok(!script.includes('\r'));
  new Script(script);
  assert.ok(
    html.includes(
      'sha256-' + createHash('sha256').update(script).digest('base64'),
    ),
  );
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(
    !html.includes('SCRIPT_HASH') && !html.includes('<!--WIZARD_SCRIPT-->'),
  );
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
  for (const word of [
    'oravera.workers.dev',
    '0d5655076eaa643f1149d627c820e7261bbf2983705cd15473de8339ea8a09b9',
  ])
    assert.ok(!html.includes(word));
  assert.ok(
    script.includes('validatePassport(plan,next)') ||
      script.includes('validatePassport(plan, next)'),
  );
  assert.ok(
    !/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/.test(
      script,
    ),
  );
});

void test('wizard server binds loopback, serves only generic UI and denies writes/private paths/rebinding', async () => {
  const server = await startWizard();
  try {
    const address = server.address();
    assert.equal(address.address, '127.0.0.1');
    const base = `http://127.0.0.1:${address.port}`;
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    for (const p of [
      '/.northstar-launch/state.json',
      '/api',
      '/../state.json',
      '/?file=state.json',
    ])
      assert.equal((await fetch(base + p)).status, 404);
    assert.equal(
      (await fetch(base, { method: 'POST', body: 'do-not-store' })).status,
      404,
    );
    assert.equal(
      (await fetch(base, { headers: { Origin: 'https://outside.test' } }))
        .status,
      403,
    );
    const rebinding = await new Promise((resolve, reject) => {
      const req = request(
        base,
        { headers: { host: 'outside.test' } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(rebinding, 403);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
});
