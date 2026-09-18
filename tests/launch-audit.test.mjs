import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { auditLaunch, auditMarkdown } from '../scripts/launch-audit.mjs';

const config = () => ({
  name: 'PRIVATE_SYNTHETIC_BRAND',
  description: 'PRIVATE_SYNTHETIC_DESCRIPTION',
  theme: 'ocean',
  backgroundImage: '',
  pages: [
    {
      slug: '/about',
      title: 'About',
      description: 'Description',
      text: 'PRIVATE_SYNTHETIC_CONTENT',
    },
  ],
  products: [
    {
      id: 'service-1',
      slug: 'consultation',
      title: 'Consultation',
      kind: 'service',
      shortDescription: 'Short',
      description: 'Full',
      price: 1000,
      currency: 'USD',
    },
  ],
});
async function fixture(value = config()) {
  const root = await mkdtemp(path.join(tmpdir(), 'northstar-audit-'));
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'site.config.json'), JSON.stringify(value));
  await writeFile(
    path.join(root, 'public/favicon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  );
  for (const route of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    await mkdir(path.join(root, 'app', route), { recursive: true });
    await writeFile(
      path.join(root, 'app', route, 'route.ts'),
      '// synthetic route, not HTTP evidence',
    );
  }
  return root;
}
const status = (report, id) => report.checks.find((c) => c.id === id)?.status;

void test('source fingerprint is deterministic, path-independent and changes with every checked file', async () => {
  const root = await fixture();
  const original = await auditLaunch(root);
  assert.equal(original.version, 2);
  assert.equal(original.source.complete, true);
  assert.equal(original.source.files, 5);
  assert.equal((await auditLaunch(root)).source.digest, original.source.digest);
  assert.equal(
    (await auditLaunch(await fixture())).source.digest,
    original.source.digest,
  );
  for (const filename of [
    'site.config.json',
    'public/favicon.svg',
    'app/robots.txt/route.ts',
    'app/sitemap.xml/route.ts',
    'app/llms.txt/route.ts',
  ]) {
    const target = path.join(root, filename);
    const before = await readFile(target);
    await writeFile(target, Buffer.concat([before, Buffer.from(' ')]));
    assert.notEqual(
      (await auditLaunch(root)).source.digest,
      original.source.digest,
      filename,
    );
    await writeFile(target, before);
  }
  assert.notEqual(
    (await auditLaunch(root, 'standard')).source.digest,
    original.source.digest,
  );
  assert.ok(!JSON.stringify(original.source).includes(root));
});

void test('source fingerprint hashes original binary asset bytes and marks unavailable input incomplete', async () => {
  const value = config();
  value.backgroundImage = '/background.png';
  const root = await fixture(value);
  const absent = await auditLaunch(root);
  assert.equal(absent.source.complete, false);
  await writeFile(
    path.join(root, 'public/background.png'),
    Buffer.from([255, 1]),
  );
  const first = await auditLaunch(root);
  assert.equal(first.source.complete, true);
  assert.equal(first.source.files, 6);
  // Both buffers have the same lossy UTF-8 text, but must produce different digests.
  await writeFile(
    path.join(root, 'public/background.png'),
    Buffer.from([254, 1]),
  );
  assert.notEqual((await auditLaunch(root)).source.digest, first.source.digest);
});

void test('local audit maps findings to checklist and never exports input values or marks launch ready', async () => {
  const root = await fixture();
  const filename = path.join(root, 'site.config.json');
  const before = await readFile(filename, 'utf8');
  const report = await auditLaunch(root);
  assert.equal(report.summary.fail, 0);
  assert.equal(report.summary.warn, 0);
  assert.ok(report.summary.manual >= 4);
  assert.equal(report.ready, undefined);
  assert.equal(report.percent, undefined);
  assert.equal(status(report, 'favicon.asset'), 'pass');
  assert.equal(status(report, 'favicon.browser'), 'manual');
  const plan = JSON.parse(await readFile('onboarding/checklist.json', 'utf8'));
  for (const check of report.checks)
    assert.ok(plan.tasks.some((t) => t.id === check.taskId));
  assert.equal(
    new Set(report.checks.map((c) => c.id)).size,
    report.checks.length,
  );
  assert.ok(!JSON.stringify(report).includes('PRIVATE_SYNTHETIC'));
  assert.ok(!auditMarkdown(report).includes('PRIVATE_SYNTHETIC'));
  assert.equal(await readFile(filename, 'utf8'), before);
});

void test('audit detects placeholders, empty catalog, conflicting page slugs and invalid prices', async () => {
  const c = config();
  c.name = 'Northstar';
  c.products = [];
  c.pages[0].slug = '/admin/customers';
  let report = await auditLaunch(await fixture(c));
  assert.equal(status(report, 'brand.name'), 'warn');
  assert.equal(status(report, 'catalog.visible'), 'warn');
  assert.equal(status(report, 'pages.shape'), 'fail');
  for (const mutate of [
    (x) => x.pages.push({ ...x.pages[0] }),
    (x) => {
      x.products[0].price = 1.5;
    },
    (x) => x.products.push({ ...x.products[0] }),
    (x) => {
      x.products = null;
    },
    (x) => {
      x.theme = 'unknown';
    },
  ]) {
    const value = config();
    mutate(value);
    report = await auditLaunch(await fixture(value));
    assert.ok(report.summary.fail > 0);
  }
});

void test('audit fails closed on invalid, oversized or linked configuration without leaking its content', async () => {
  const root = await fixture();
  for (const raw of [
    '{"PRIVATE_BAD_JSON":',
    'null',
    'x'.repeat(2 * 1024 * 1024 + 1),
  ]) {
    await writeFile(path.join(root, 'site.config.json'), raw);
    const report = await auditLaunch(root);
    assert.equal(status(report, 'config.readable'), 'fail');
    assert.ok(!JSON.stringify(report).includes('PRIVATE_BAD_JSON'));
  }
  await assert.rejects(auditLaunch(root, 'unknown'), /INVALID_MODE/);
  const outside = await fixture();
  const linkRoot = await mkdtemp(path.join(tmpdir(), 'northstar-audit-link-'));
  // Junctions work without developer-mode symlink privileges on Windows.
  await symlink(
    path.join(outside, 'public'),
    path.join(linkRoot, 'public'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await writeFile(
    path.join(linkRoot, 'site.config.json'),
    JSON.stringify(config()),
  );
  assert.equal(status(await auditLaunch(linkRoot), 'favicon.asset'), 'warn');
  const internalRoot = await mkdtemp(
    path.join(tmpdir(), 'northstar-audit-internal-link-'),
  );
  const privateDirectory = path.join(internalRoot, '.northstar-launch');
  await mkdir(privateDirectory);
  await writeFile(
    path.join(privateDirectory, 'state.json'),
    'PRIVATE_PASSPORT',
  );
  await symlink(
    privateDirectory,
    path.join(internalRoot, 'public'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const linked = config();
  linked.backgroundImage = '/state.json';
  await writeFile(
    path.join(internalRoot, 'site.config.json'),
    JSON.stringify(linked),
  );
  assert.equal(
    status(await auditLaunch(internalRoot), 'background.asset'),
    'fail',
  );
});

void test('background audit checks only bounded local assets; remote URLs remain manual', async () => {
  for (const [url, expected] of [
    ['/favicon.svg', 'pass'],
    ['/missing.svg', 'fail'],
    ['/..%2Fsite.config.json', 'fail'],
    ['https://example.invalid/private.png', 'manual'],
    ['https://user:PRIVATE_PASSWORD@example.invalid/a.png', 'fail'],
    ['//example.invalid/a.png', 'fail'],
    ['javascript:alert(1)', 'fail'],
  ]) {
    const c = config();
    c.backgroundImage = url;
    const report = await auditLaunch(await fixture(c));
    assert.equal(status(report, 'background.asset'), expected, url);
    assert.ok(!JSON.stringify(report).includes('PRIVATE_PASSWORD'));
  }
});

void test('Standard audit does not mistake source catalog or brand for runtime D1 data', async () => {
  const c = config();
  c.pages = null;
  c.products = null;
  c.name = 'Northstar';
  const report = await auditLaunch(await fixture(c), 'standard');
  assert.equal(status(report, 'standard.runtime'), 'manual');
  assert.equal(status(report, 'catalog.shape'), undefined);
  assert.equal(status(report, 'brand.name'), undefined);
});

void test('audit CLI exports without passport, rejects unknown flags and refuses overwrite/public output', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'northstar-audit-cli-'));
  async function run(args) {
    const child = spawn(
      process.execPath,
      ['scripts/launch.mjs', 'audit', ...args],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let output = '';
    child.stdout.on('data', (d) => {
      output += d;
    });
    child.stderr.on('data', (d) => {
      output += d;
    });
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    return { code, output };
  }
  const output = path.join(root, 'report.json');
  assert.equal(
    (await run(['--mode', 'standard', '--json', '--output', output])).code,
    0,
  );
  const before = await readFile(output, 'utf8');
  assert.equal(JSON.parse(before).kind, 'launch-source-audit');
  assert.equal((await run(['--json', '--output', output])).code, 1);
  assert.equal(await readFile(output, 'utf8'), before);
  assert.equal((await run(['--state', 'PRIVATE_STATE_PATH'])).code, 1);
  assert.equal((await run(['--mode', 'unknown'])).code, 1);
  await mkdir(path.join(root, 'public'));
  assert.equal(
    (await run(['--output', path.join(root, 'public', 'report.md')])).code,
    1,
  );
  const strict = await run(['--json', '--require-pass']);
  const report = JSON.parse(strict.output);
  assert.equal(strict.code, report.summary.fail || report.summary.warn ? 1 : 0);
});
