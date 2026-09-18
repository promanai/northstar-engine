import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import {
  createPassport,
  evaluatePassport,
  launchMarkdown,
  validateChecklist,
  validatePassport,
  serializePassport,
  PASSPORT_MAX_BYTES,
} from '../scripts/launch-policy.mjs';
const plan = JSON.parse(
  await readFile(
    new URL('../onboarding/checklist.json', import.meta.url),
    'utf8',
  ),
);
const clone = (v) => structuredClone(v);
const done = (s) => {
  s.status = 'done';
  s.answers = s.answers.map(() => 'Ответ согласован');
  s.evidence = 'Проверено на тестовой установке';
};

void test('passport export enforces the import byte limit without mutating answers', () => {
  const state = createPassport(plan, 'lite');
  state.site = 'Синтетический тест';
  assert.deepEqual(JSON.parse(serializePassport(plan, state)), state);
  for (const task of Object.values(state.tasks)) {
    task.answers = task.answers.map(() => 'я'.repeat(4000));
    task.evidence = 'я'.repeat(4000);
  }
  validatePassport(plan, state);
  const before = structuredClone(state);
  assert.ok(
    Buffer.byteLength(JSON.stringify(state, null, 2) + '\n') >
      PASSPORT_MAX_BYTES,
  );
  assert.throws(() => serializePassport(plan, state), /PASSPORT_TOO_LARGE/);
  assert.deepEqual(state, before);
});

void test('launch graph is complete, topologically ordered and rejects duplicate, cyclic or unknown tasks', () => {
  assert.equal(validateChecklist(plan).tasks.length, 24);
  for (const id of [
    'favicon',
    'domain',
    'assistant_role',
    'assistant_actions',
    'privacy',
    'qa',
    'launch',
  ])
    assert.ok(plan.tasks.find((t) => t.id === id));
  for (const mutate of [
    (p) => p.tasks[0].dependsOn.push('launch'),
    (p) => p.tasks[1].dependsOn.push('missing'),
    (p) => (p.tasks[1].id = p.tasks[0].id),
  ]) {
    const p = clone(plan);
    mutate(p);
    assert.throws(() => validateChecklist(p));
  }
});
void test('launch mode scopes and next steps never imply business readiness from deployment', () => {
  const lite = createPassport(plan, 'lite');
  let r = evaluatePassport(plan, lite);
  assert.equal(r.ready, false);
  assert.equal(r.total, 23);
  assert.equal(r.percent, 0);
  assert.deepEqual(r.next, ['purpose']);
  assert.equal(r.tasks.find((t) => t.id === 'accounts').status, 'out_of_scope');
  done(lite.tasks.hosting);
  done(lite.tasks.domain);
  done(lite.tasks.launch);
  r = evaluatePassport(plan, lite);
  assert.equal(r.percent, 0);
  assert.equal(r.tasks.find((t) => t.id === 'launch').status, 'blocked');
  done(lite.tasks.purpose);
  assert.deepEqual(evaluatePassport(plan, lite).next, ['goals', 'brand']);
  assert.equal(
    evaluatePassport(plan, createPassport(plan, 'standard')).total,
    24,
  );
});
void test('launch completion requires answers/evidence and optional exclusions require reasons', () => {
  const s = createPassport(plan, 'standard');
  s.tasks.purpose.status = 'done';
  assert.throws(() => validatePassport(plan, s));
  done(s.tasks.purpose);
  assert.equal(validatePassport(plan, s), s);
  s.tasks.purpose.status = 'not_applicable';
  s.tasks.purpose.reason = 'skip';
  assert.throws(() => validatePassport(plan, s));
  done(s.tasks.purpose);
  s.tasks.media.status = 'not_applicable';
  assert.throws(() => validatePassport(plan, s));
  s.tasks.media.reason = 'Не требуется владельцу';
  assert.equal(validatePassport(plan, s), s);
  for (const task of plan.tasks)
    if (task.id !== 'media') done(s.tasks[task.id]);
  const r = evaluatePassport(plan, s);
  assert.equal(r.ready, true);
  assert.equal(r.percent, 100);
  assert.deepEqual(r.next, []);
  s.tasks.goals.status = 'in_progress';
  assert.equal(evaluatePassport(plan, s).ready, false);
});
void test('launch reports exclude owner answers/evidence and reject schema drift', () => {
  const s = createPassport(plan, 'lite');
  s.site = 'PRIVATE-SITE';
  done(s.tasks.purpose);
  s.tasks.purpose.answers[0] = 'PRIVATE-ANSWER';
  s.tasks.purpose.evidence = 'PRIVATE-EVIDENCE';
  const output =
    JSON.stringify(evaluatePassport(plan, s)) + launchMarkdown(plan, s);
  for (const marker of ['PRIVATE-SITE', 'PRIVATE-ANSWER', 'PRIVATE-EVIDENCE'])
    assert.ok(!output.includes(marker));
  assert.ok(output.includes('flowchart TD'));
  for (const mutate of [
    (x) => (x.version = 2),
    (x) => (x.mode = 'invalid'),
    (x) => (x.tasks.fake = {}),
    (x) => delete x.tasks.domain,
    (x) => x.tasks.purpose.answers.push('extra'),
    (x) => (x.tasks.purpose.cookie = 'secret'),
  ]) {
    const x = clone(s);
    mutate(x);
    assert.throws(() => validatePassport(plan, x));
  }
});
void test('launch CLI generates usable files, fails readiness, refuses overwrite and public output', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'northstar-launch-test-'));
  const state = path.join(dir, 'state.json');
  const run = async (args) => {
    const child = spawn(process.execPath, ['scripts/launch.mjs', ...args], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    return { code, output };
  };
  assert.equal((await run(['init', '--state', state])).code, 0);
  const original = await readFile(state, 'utf8');
  assert.equal((await run(['init', '--state', state])).code, 1);
  assert.equal(await readFile(state, 'utf8'), original);
  const status = await run([
    'status',
    '--state',
    state,
    '--json',
    '--require-ready',
  ]);
  assert.equal(status.code, 1);
  assert.equal(JSON.parse(status.output).ready, false);
  const report = path.join(dir, 'report.md');
  assert.equal(
    (await run(['report', '--state', state, '--output', report])).code,
    0,
  );
  assert.ok((await readFile(report, 'utf8')).includes('Favicon'));
  assert.equal(
    (await run(['report', '--state', state, '--output', report])).code,
    1,
  );
  await mkdir(path.join(dir, 'public'));
  assert.equal(
    (await run(['init', '--state', path.join(dir, 'public', 'state.json')]))
      .code,
    1,
  );
  await writeFile(state, JSON.stringify({ secret: 'NEVER-LOG-THIS' }));
  const bad = await run(['status', '--state', state]);
  assert.equal(bad.code, 1);
  assert.ok(!bad.output.includes('NEVER-LOG-THIS'));
});
