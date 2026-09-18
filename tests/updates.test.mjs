import assert from 'node:assert/strict';
import test from 'node:test';
import {
  repositoryName,
  releaseVersion,
  compareVersions,
  automaticEligible,
  githubRelease,
} from '../lib/update-policy.ts';
import {
  migrationHash,
  validateMigrations,
  validatePlan,
} from '../scripts/update-runner.mjs';

const sha = 'a'.repeat(40);
const release = { repository: 'owner/engine', version: '0.3.1', sha };
const installed = {
  repository: 'owner/engine',
  version: '0.3.0',
  sha: 'b'.repeat(40),
};
void test('update source normalizes GitHub URLs and rejects arbitrary hosts and paths', () => {
  assert.equal(
    repositoryName('https://github.com/Owner/Engine.git/'),
    'owner/engine',
  );
  for (const input of [
    'https://evil.test/owner/repo',
    'https://github.com@evil.test/a/b',
    'owner/repo/actions',
    'owner/repo?x=1',
    '../repo',
    'git@github.com:owner/repo',
    null,
  ])
    assert.equal(repositoryName(input), null);
});
void test('stable versions compare numerically and reject prereleases and invalid tags', () => {
  assert.equal(releaseVersion('v0.3.1'), '0.3.1');
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0);
  for (const tag of [
    'v01.2.3',
    '1.2',
    '1.2.3-beta',
    '1.2.3+meta',
    'latest',
    '1.2.3\n',
  ])
    assert.equal(releaseVersion(tag), null);
});
void test('automatic upgrades reject downgrades, major changes and failed commit retries', () => {
  assert.equal(automaticEligible(release, installed, []), true);
  for (const version of ['0.2.0', '0.3.0', '1.0.0'])
    assert.equal(
      automaticEligible({ ...release, version }, installed, []),
      false,
    );
  assert.equal(
    automaticEligible(release, installed, [{ ...release, status: 'failed' }]),
    false,
  );
  assert.equal(
    automaticEligible(release, installed, [
      { ...release, status: 'cancelled' },
    ]),
    true,
  );
});
void test('GitHub release resolves to immutable SHA and only trusted canonical URLs', async () => {
  const requests = [];
  const result = await githubRelease(
    'Owner/Engine',
    'synthetic-token',
    async (url, options) => {
      requests.push(url);
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.authorization, 'Bearer synthetic-token');
      return Response.json(
        requests.length === 1
          ? {
              tag_name: 'v0.3.1',
              html_url: 'https://evil.test',
              name: 'Release',
            }
          : { sha },
      );
    },
  );
  assert.deepEqual(requests, [
    'https://api.github.com/repos/owner/engine/releases/latest',
    'https://api.github.com/repos/owner/engine/commits/v0.3.1',
  ]);
  assert.equal(result.sha, sha);
  assert.equal(
    result.url,
    'https://github.com/owner/engine/releases/tag/v0.3.1',
  );
});
void test('GitHub missing, throttled, prerelease and invalid commit responses fail closed', async () => {
  for (const status of [404, 429, 500])
    await assert.rejects(
      githubRelease(
        'owner/engine',
        undefined,
        async () => new Response('', { status }),
      ),
    );
  await assert.rejects(
    githubRelease('owner/engine', undefined, async () =>
      Response.json({ tag_name: 'v0.3.1', prerelease: true }),
    ),
  );
  await assert.rejects(
    githubRelease('owner/engine', undefined, async (url) =>
      Response.json(
        url.endsWith('latest') ? { tag_name: 'v0.3.1' } : { sha: 'main' },
      ),
    ),
  );
});
void test('migration baseline survives CRLF and requires immutable existing migrations', () => {
  const sql = 'CREATE TABLE example (id TEXT);\n';
  const baseline = { '0000.sql': migrationHash(sql) };
  assert.equal(migrationHash(sql), migrationHash(sql.replaceAll('\n', '\r\n')));
  validateMigrations(baseline, {
    '0000.sql': sql,
    '0001.sql': 'ALTER TABLE example ADD COLUMN label TEXT;',
  });
  assert.throws(() => validateMigrations(baseline, {}));
  assert.throws(() =>
    validateMigrations(baseline, { '0000.sql': sql + '-- changed' }),
  );
});
void test('destructive migrations require manual upgrade; additive schema is allowed', () => {
  for (const sql of [
    'DROP TABLE example;',
    'DELETE FROM example;',
    'UPDATE example SET id=1;',
    'ALTER TABLE example DROP COLUMN id;',
    'CREATE TABLE t(id); DROP TABLE example;',
    'PRAGMA writable_schema=ON;',
  ])
    assert.throws(() => validateMigrations({}, { 'new.sql': sql }));
  validateMigrations(
    {},
    {
      'new.sql':
        'CREATE TABLE t(id TEXT); CREATE UNIQUE INDEX idx ON t(id); ALTER TABLE t ADD COLUMN name TEXT;',
    },
  );
});
void test('runner rejects injected repository, mutable ref and malformed plan', () => {
  const plan = {
    run: { ...release, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    installedMigrations: {},
  };
  assert.equal(validatePlan(plan), plan);
  for (const run of [
    { ...plan.run, repository: 'owner/repo\nINJECT=1' },
    { ...plan.run, sha: 'main' },
    { ...plan.run, version: '1.0.0;curl' },
  ])
    assert.throws(() => validatePlan({ ...plan, run }));
  assert.throws(() => validatePlan({ run: plan.run }));
});
