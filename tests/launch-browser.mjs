// Real Chromium with synthetic in-memory passports only. Never reads owner state.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startWizard } from '../scripts/launch-wizard.mjs';
import { createPassport, validatePassport } from '../scripts/launch-policy.mjs';

const plan = JSON.parse(
  await readFile(
    new URL('../onboarding/checklist.json', import.meta.url),
    'utf8',
  ),
);
const output = await mkdtemp(
  path.join(process.cwd(), '.test-state-launch-browser-'),
);
const server = await startWizard();
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
const expectedChecks = 8;
const fixture = () => {
  const s = createPassport(plan, 'lite');
  s.site = 'Synthetic QA';
  return s;
};
const upload = (page, value) =>
  page.locator('#file').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      typeof value === 'string' ? value : JSON.stringify(value),
    ),
  });
const waitText = (page, id, text) =>
  page.locator(id).filter({ hasText: text }).waitFor();
async function check(name, fn) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  const errors = [],
    outbound = [];
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.origin === origin) return route.continue();
    outbound.push(u.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(origin);
    await page
      .locator('#progress-text')
      .filter({ hasText: '0 из 23' })
      .waitFor();
    await fn(page, context);
    assert.deepEqual(errors, [], 'browser runtime errors');
    assert.deepEqual(outbound, [], 'external requests');
    checks.push({ name, passed: true });
    console.log('PASS ' + name);
  } catch (e) {
    checks.push({ name, passed: false });
    console.error('FAIL ' + name + ': ' + e.message);
    await page
      .screenshot({
        path: path.join(output, `failure-${checks.length}.png`),
        fullPage: true,
      })
      .catch(() => {});
  } finally {
    await context.close();
  }
}
try {
  browser = await chromium.launch({ headless: true });
  await check(
    'edit, validation, dependency progress and keyboard graph navigation',
    async (page) => {
      await page
        .locator('#questions textarea')
        .nth(0)
        .fill('Synthetic business');
      await page.locator('#status').selectOption('done');
      await page.locator('#form button[type=submit]').click();
      await waitText(page, '#message', 'Шаг не применён');
      await page.locator('#questions textarea').nth(1).fill('Visitors');
      await page.locator('#questions textarea').nth(2).fill('Contact');
      await page.locator('#evidence').fill('Synthetic evidence');
      await page.locator('#form button[type=submit]').click();
      await waitText(page, '#progress-text', '1 из 23');
      await page.locator('#graph-tab').click();
      assert.equal(await page.locator('#graph .node').count(), 24);
      const node = page.locator('#graph .node').filter({
        has: page.locator('text').filter({ hasText: 'Цели и результат' }),
      });
      await node.focus();
      await page.keyboard.press('Enter');
      await waitText(page, '#title', 'Цели и результат');
      await page.locator('#deps button').click();
      assert.equal(
        await page.locator('#questions textarea').nth(0).inputValue(),
        'Synthetic business',
      );
    },
  );
  await check(
    'import rejects invalid files without losing draft; replace confirmation and XSS-safe answers',
    async (page) => {
      await page.locator('#site').fill('Keep draft');
      page.once('dialog', (d) => d.accept());
      await upload(page, '{"wrong":"PRIVATE_BAD_PAYLOAD"}');
      await waitText(page, '#message', 'Файл не принят');
      assert.equal(await page.locator('#site').inputValue(), 'Keep draft');
      page.once('dialog', (d) => d.dismiss());
      await upload(page, fixture());
      assert.equal(await page.locator('#site').inputValue(), 'Keep draft');
      const s = fixture();
      s.tasks.purpose.answers[0] =
        '<img src=x onerror="window.qaInjected=true">';
      page.once('dialog', (d) => d.accept());
      await upload(page, s);
      await waitText(page, '#message', 'Паспорт открыт');
      assert.equal(await page.locator('#site').inputValue(), s.site);
      assert.equal(
        await page.locator('#questions textarea').nth(0).inputValue(),
        s.tasks.purpose.answers[0],
      );
      assert.equal(await page.evaluate(() => window.qaInjected), undefined);
      await upload(page, 'x'.repeat(512 * 1024 + 1));
      await waitText(page, '#message', 'Файл не принят');
      assert.equal(await page.locator('#site').inputValue(), s.site);
    },
  );
  await check(
    'download JSON round-trip and redacted Markdown export',
    async (page) => {
      const s = fixture();
      s.tasks.purpose.answers[0] = 'PRIVATE_QA_ANSWER';
      s.tasks.purpose.evidence = 'PRIVATE_QA_EVIDENCE';
      await upload(page, s);
      await waitText(page, '#message', 'Паспорт открыт');
      await page.evaluate(() => {
        window.showSaveFilePicker = undefined;
      });
      const jsonWait = page.waitForEvent('download');
      await page.locator('#save').click();
      const json = await jsonWait;
      const data = JSON.parse(await readFile(await json.path(), 'utf8'));
      validatePassport(plan, data);
      assert.deepEqual(data, s);
      const mdWait = page.waitForEvent('download');
      await page.locator('#report').click();
      const md = await mdWait;
      const report = await readFile(await md.path(), 'utf8');
      assert.ok(report.includes('flowchart TD'));
      assert.ok(!report.includes('PRIVATE_QA_'));
      assert.ok(!report.includes(s.site));
      page.once('dialog', (d) => d.accept());
      await upload(page, data);
      await waitText(page, '#message', 'Паспорт открыт');
      assert.equal(
        await page.locator('#questions textarea').nth(0).inputValue(),
        'PRIVATE_QA_ANSWER',
      );
    },
  );
  await check(
    'file save adapter: success, cancellation and write failure preserve state',
    async (page) => {
      await page.locator('#site').fill('Synthetic save');
      await page.evaluate(() => {
        window.qaSaved = '';
        window.showSaveFilePicker = async () => ({
          createWritable: async () => ({
            write: async (text) => {
              window.qaSaved = text;
            },
            close: async () => {},
            abort: async () => {},
          }),
        });
      });
      await page.locator('#save').click();
      await waitText(page, '#save-status', 'JSON сохранён');
      assert.equal(
        JSON.parse(await page.evaluate(() => window.qaSaved)).site,
        'Synthetic save',
      );
      await page.locator('#site').fill('Unsaved after cancel');
      await page.evaluate(() => {
        window.showSaveFilePicker = async () => {
          throw new DOMException('cancel', 'AbortError');
        };
      });
      await page.locator('#save').click();
      await waitText(page, '#message', 'Сохранение отменено');
      assert.equal(
        await page.locator('#site').inputValue(),
        'Unsaved after cancel',
      );
      await page.evaluate(() => {
        window.qaAborted = false;
        window.showSaveFilePicker = async () => ({
          createWritable: async () => ({
            write: async () => {
              throw new Error('synthetic failure');
            },
            close: async () => {},
            abort: async () => {
              window.qaAborted = true;
            },
          }),
        });
      });
      await page.locator('#save').click();
      await waitText(page, '#message', 'Не удалось сохранить');
      assert.equal(await page.evaluate(() => window.qaAborted), true);
      assert.equal(await page.locator('#save').isEnabled(), true);
    },
  );
  await check(
    'Lite/Standard switching and optional exclusion do not change other answers',
    async (page) => {
      await page
        .locator('#steps button')
        .filter({ hasText: 'Кабинет и доступ владельца' })
        .click();
      assert.equal(
        await page.locator('#questions textarea').first().isDisabled(),
        true,
      );
      await page.locator('#mode').selectOption('standard');
      assert.equal(
        await page.locator('#questions textarea').first().isEnabled(),
        true,
      );
      await waitText(page, '#progress-text', '0 из 24');
      await page.locator('#questions textarea').first().fill('Synthetic roles');
      await page.locator('#mode').selectOption('lite');
      assert.equal(
        await page.locator('#questions textarea').first().inputValue(),
        'Synthetic roles',
      );
      assert.equal(
        await page.locator('#questions textarea').first().isDisabled(),
        true,
      );
      await page
        .locator('#steps button')
        .filter({ hasText: 'Файлы, изображения и аудиозвонок' })
        .click();
      await page.locator('#status').selectOption('not_applicable');
      await page.locator('#form button[type=submit]').click();
      await waitText(page, '#message', 'Шаг не применён');
      await page.locator('#reason').fill('Not needed in synthetic site');
      await page.locator('#form button[type=submit]').click();
      await waitText(page, '#progress-text', '1 из 23');
    },
  );
  await check(
    '320px, 390px and 200% type remain usable without page overflow',
    async (page) => {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '32px';
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          'page overflow at ' + width,
        );
        await page.locator('#graph-tab').click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          'graph page overflow at ' + width,
        );
        await page.locator('#list-tab').click();
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '16px';
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join(output, 'mobile.png'),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.screenshot({
        path: path.join(output, 'desktop.png'),
        fullPage: true,
      });
    },
  );
  await check(
    'audit import, filters, safe navigation, rejected reports and mobile layout preserve passport',
    async (page) => {
      const report = {
        version: 1,
        kind: 'launch-source-audit',
        mode: 'lite',
        summary: { pass: 1, warn: 1, fail: 0, manual: 1 },
        boundaries: ['Local only'],
        checks: [
          {
            id: 'brand.name',
            taskId: 'brand',
            status: 'warn',
            title: 'Synthetic brand',
            action: '<img src=x onerror="window.auditInjected=true">',
          },
          {
            id: 'favicon.asset',
            taskId: 'favicon',
            status: 'pass',
            title: 'Synthetic icon',
            action: 'File exists',
          },
          {
            id: 'domain.live',
            taskId: 'domain',
            status: 'manual',
            title: 'Synthetic domain',
            action: 'Check HTTPS manually',
          },
        ],
      };
      const importReport = (value) =>
        page.locator('#audit-file').setInputFiles({
          name: 'audit.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            typeof value === 'string' ? value : JSON.stringify(value),
          ),
        });
      await page.locator('#questions textarea').nth(0).fill('PRIVATE_DRAFT');
      await page.locator('#audit-tab').click();
      assert.equal(await page.locator('#audit-empty').isVisible(), true);
      await importReport(report);
      await waitText(page, '#audit-message', 'Отчёт открыт');
      assert.equal(await page.locator('.audit-card').count(), 2);
      assert.equal(await page.locator('#audit-list img').count(), 0);
      assert.equal(await page.evaluate(() => window.auditInjected), undefined);
      await waitText(page, '#progress-text', '0 из 23');
      await page.locator('#audit-filter').selectOption('fail');
      await waitText(page, '#audit-list', 'Нет результатов');
      await page.locator('#audit-filter').selectOption('all');
      assert.equal(await page.locator('.audit-card').count(), 3);
      await page.evaluate(() => {
        window.showSaveFilePicker = undefined;
      });
      const passportDownload = page.waitForEvent('download');
      await page.locator('#save').click();
      const passport = JSON.parse(
        await readFile(await (await passportDownload).path(), 'utf8'),
      );
      const expectedPassport = createPassport(plan, 'lite');
      expectedPassport.tasks.purpose.answers[0] = 'PRIVATE_DRAFT';
      assert.deepEqual(
        passport,
        expectedPassport,
        'audit must never enter the saved passport',
      );
      const bad = structuredClone(report);
      bad.summary.warn = 0;
      await importReport(bad);
      await waitText(page, '#audit-message', 'Отчёт не принят');
      assert.equal(await page.locator('.audit-card').count(), 3);
      await importReport('x'.repeat(256 * 1024 + 1));
      await waitText(page, '#audit-message', 'Отчёт не принят');
      await page.locator('.audit-card button').first().click();
      await waitText(page, '#title', 'Название, логотип');
      await page.locator('#steps button').first().click();
      assert.equal(
        await page.locator('#questions textarea').nth(0).inputValue(),
        'PRIVATE_DRAFT',
      );
      // An invalid draft must become visible and focused when navigation is blocked.
      await page.locator('#status').selectOption('done');
      await page.locator('#audit-tab').click();
      await page.locator('.audit-card button').first().click();
      assert.equal(await page.locator('#editor').isVisible(), true);
      assert.equal(
        await page
          .locator('#questions textarea')
          .nth(1)
          .getAttribute('aria-invalid'),
        'true',
      );
      await page.locator('#status').selectOption('in_progress');
      await page.locator('#mode').selectOption('standard');
      await page.locator('#audit-tab').click();
      await waitText(page, '#audit-warning', 'не совпадает');
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '32px';
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          'audit overflow at ' + width,
        );
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '16px';
      });
      await page.locator('#audit-panel').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'audit-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#audit-panel').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'audit-mobile.png') });
      await page.locator('#audit-clear').click();
      assert.equal(await page.locator('#audit-empty').isVisible(), true);
      await importReport(report);
      page.once('dialog', (d) => d.accept());
      await upload(page, fixture());
      await waitText(page, '#message', 'Паспорт открыт');
      await page.locator('#audit-tab').click();
      assert.equal(await page.locator('#audit-empty').isVisible(), true);
    },
  );
  await check(
    'audit source comparison handles v2 match/change/invalid/legacy without changing passport',
    async (page) => {
      const report = {
        version: 2,
        kind: 'launch-source-audit',
        mode: 'lite',
        generatedAt: '2026-09-11T10:00:00.000Z',
        source: {
          scope: 'checked-inputs-v1',
          algorithm: 'sha256',
          digest: 'a'.repeat(64),
          complete: true,
          files: 5,
        },
        summary: { pass: 0, warn: 1, fail: 0, manual: 0 },
        boundaries: ['Synthetic only'],
        checks: [
          {
            id: 'brand.name',
            taskId: 'brand',
            status: 'warn',
            title: 'Проверка названия',
            action: 'Согласуйте название бизнеса',
          },
        ],
      };
      const load = (id, data) =>
        page
          .locator(id)
          .setInputFiles({
            name: 'synthetic-audit.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(data)),
          });
      await page.locator('#audit-tab').click();
      await load('#audit-file', report);
      await waitText(page, '#audit-message', 'Отчёт открыт');
      await load('#audit-compare-file', report);
      await waitText(page, '#audit-comparison', 'совпадают');
      const changed = structuredClone(report);
      changed.source.digest = 'b'.repeat(64);
      await load('#audit-compare-file', changed);
      await waitText(page, '#audit-comparison', 'отличаются');
      await load('#audit-compare-file', report);
      await waitText(page, '#audit-comparison', 'совпадают');
      await load('#audit-compare-file', { secret: 'PRIVATE_BAD_REPORT' });
      await waitText(page, '#audit-message', 'Файл для сверки не принят');
      await waitText(page, '#audit-comparison', 'ещё не выполнена');
      assert.equal(await page.locator('.audit-card').count(), 1);
      const legacy = structuredClone(report);
      legacy.version = 1;
      delete legacy.source;
      delete legacy.generatedAt;
      await load('#audit-compare-file', legacy);
      await waitText(page, '#audit-comparison', 'два отчёта версии 2');
      await load('#audit-compare-file', report);
      await waitText(page, '#audit-comparison', 'совпадают');
      await page.setViewportSize({ width: 320, height: 844 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '16px';
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#audit-comparison').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, 'audit-comparison-mobile.png'),
      });
      await page.evaluate(() => {
        window.showSaveFilePicker = undefined;
      });
      const downloaded = page.waitForEvent('download');
      await page.locator('#save').click();
      assert.deepEqual(
        JSON.parse(await readFile(await (await downloaded).path(), 'utf8')),
        createPassport(plan, 'lite'),
      );
      await load('#audit-file', report);
      await waitText(page, '#audit-comparison', 'ещё не выполнена');
      await page.locator('#audit-clear').click();
      assert.equal(await page.locator('#audit-empty').isVisible(), true);
    },
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
  await writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      {
        kind: 'launch-browser',
        checks,
        passed:
          checks.length === expectedChecks && checks.every((c) => c.passed),
        boundaries: [
          'synthetic only',
          'file picker API is stubbed; native OS dialog is not tested',
          'Chromium, not physical iOS/Android',
        ],
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(
  `${checks.filter((c) => c.passed).length}/${checks.length} browser checks passed. Artifacts: ${output}`,
);
if (checks.length !== expectedChecks || checks.some((c) => !c.passed))
  process.exitCode = 1;
