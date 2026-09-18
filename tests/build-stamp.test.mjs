import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  createBuildStamp,
  fingerprintEntries,
  validateBuildStamp,
} from '../scripts/build-stamp.mjs';
import { readExpectedBuild } from '../scripts/standard-smoke.mjs';

void test('build fingerprint is order/CRLF independent and changes with source, names, binary bytes or metadata', () => {
  const first = [
    ['app/a.ts', Buffer.from('a\r\nb')],
    ['public/a.png', Buffer.from([0, 13, 10, 255])],
  ];
  const equivalent = [
    ['public/a.png', first[1][1]],
    ['app\\a.ts', Buffer.from('a\nb')],
  ];
  assert.equal(
    fingerprintEntries(first, { version: '1' }),
    fingerprintEntries(equivalent, { version: '1' }),
  );
  assert.notEqual(
    fingerprintEntries(first, {}),
    fingerprintEntries(first, { version: '1' }),
  );
  for (const changed of [
    [['app/b.ts', first[0][1]], first[1]],
    [['app/a.ts', Buffer.from('changed')], first[1]],
    [first[0], ['public/a.png', Buffer.from([0, 10, 255])]],
  ])
    assert.notEqual(
      fingerprintEntries(first, {}),
      fingerprintEntries(changed, {}),
    );
});

void test('build source collection excludes credentials, working state and reports; validates explicit release labels', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'northstar-stamp-'));
  await mkdir(path.join(root, 'app'));
  await writeFile(path.join(root, 'app/page.tsx'), 'export default 1');
  const metadata = { version: '0.4.0', repository: '', sha: '', mode: 'lite' };
  const first = createBuildStamp(root, metadata);
  for (const name of ['.env', 'test-cookies.txt', 'report.json'])
    await writeFile(path.join(root, name), 'secret');
  await mkdir(path.join(root, '.wrangler-state'));
  await writeFile(
    path.join(root, '.wrangler-state/data.sqlite'),
    'private-data',
  );
  assert.deepEqual(createBuildStamp(root, metadata), first);
  assert.equal(first.commit, null);
  assert.equal(first.id.length, 64);
  await writeFile(path.join(root, 'app/page.tsx'), 'export default 2');
  assert.notEqual(createBuildStamp(root, metadata).id, first.id);
  assert.throws(() => createBuildStamp(root, { ...metadata, sha: 'invented' }));
  assert.throws(() =>
    createBuildStamp(root, {
      ...metadata,
      repository: 'https://user:secret@repo.test',
    }),
  );
});

void test('expected build file is strictly shaped, bounded and rejects credentials or arbitrary content', async () => {
  const value = {
    format: 1,
    id: 'a'.repeat(64),
    version: '1.2.3',
    commit: null,
  };
  assert.deepEqual(validateBuildStamp(value), value);
  for (const bad of [
    null,
    {},
    { ...value, cookie: 'secret' },
    { ...value, id: 'short' },
    { ...value, commit: 'branch' },
    { ...value, format: 2 },
  ])
    assert.throws(() => validateBuildStamp(bad));
  const root = await mkdtemp(path.join(tmpdir(), 'northstar-expected-'));
  const file = path.join(root, 'expected.json');
  await writeFile(file, JSON.stringify(value));
  assert.deepEqual(await readExpectedBuild(file), value);
  await writeFile(file, 'x'.repeat(4097));
  await assert.rejects(readExpectedBuild(file));
  await assert.rejects(readExpectedBuild(root));
});
