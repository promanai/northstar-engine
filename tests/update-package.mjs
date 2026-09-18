// Smoke-test the real compiled bundle without touching Cloudflare or owner state.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrationHash } from '../scripts/update-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(root, '.test-state-update-package-'));
const installedMigrations = {};
for (const name of await readdir(path.join(root, 'drizzle')))
  if (name.endsWith('.sql'))
    installedMigrations[name] = migrationHash(
      await readFile(path.join(root, 'drizzle', name), 'utf8'),
    );
const plan = {
  run: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repository: 'test-owner/engine',
    version: '0.3.1',
    sha: 'a'.repeat(40),
  },
  installedMigrations,
};
const result = spawnSync(
  process.execPath,
  [path.join(root, 'scripts/update-runner.mjs'), 'package'],
  {
    cwd: temporary,
    windowsHide: true,
    encoding: 'utf8',
    env: {
      ...process.env,
      UPDATE_SOURCE: root,
      UPDATE_PLAN: Buffer.from(JSON.stringify(plan)).toString('base64'),
    },
  },
);
assert.equal(result.status, 0, result.stdout + result.stderr);
const bundle = path.join(temporary, 'update-bundle');
assert.ok((await stat(path.join(bundle, 'server/index.js'))).size > 0);
assert.ok((await readdir(path.join(bundle, 'client'))).length > 0);
assert.deepEqual(
  JSON.parse(await readFile(path.join(bundle, 'plan.json'), 'utf8')),
  plan,
);
for (const [name, hash] of Object.entries(installedMigrations))
  assert.equal(
    migrationHash(
      await readFile(path.join(bundle, 'migrations', name), 'utf8'),
    ),
    hash,
  );
console.log(
  'PASS real build packaging: Worker, assets, plan and immutable migration hashes',
);
console.log(`Isolated bundle retained at ${temporary}`);
