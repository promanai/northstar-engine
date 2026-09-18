// Real local D1/auth/booking APIs; synthetic accounts only, no R2 or external AI.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const root = process.cwd();
const state = await mkdtemp(path.join(root, '.test-state-admin-ui-'));
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const config = path.join(root, 'deployment/oravera.standard.local.json');
const args = ['--config', config, '--persist-to', state];
const options = {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
};
const migration = spawnSync(
  process.execPath,
  [cli, 'd1', 'migrations', 'apply', 'DB', '--local', ...args],
  { ...options, encoding: 'utf8' },
);
assert.equal(migration.status, 0, migration.stdout + migration.stderr);
const socket = createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const base = `http://127.0.0.1:${port}`;
let worker,
  logs = '';
const results = [];
const check = async (name, fn) => {
  console.log('CHECK ' + name);
  await fn();
  results.push(name);
  console.log('PASS admin console: ' + name);
};
async function call(route, body, cookie = '', method) {
  const response = await fetch(base + route, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      origin: base,
      ...(cookie ? { cookie } : {}),
      ...(body?.idempotencyKey
        ? { 'idempotency-key': body.idempotencyKey }
        : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    text,
    json: () => JSON.parse(text),
  };
}
async function start() {
  worker = spawn(
    process.execPath,
    [
      cli,
      'dev',
      '--local',
      ...args,
      '--port',
      String(port),
      '--inspector-port',
      '0',
      '--var',
      'INITIAL_ADMIN_TOKEN:synthetic-owner-setup-code-not-production',
      '--var',
      'LITE_HEALTH_DATA_ENABLED:false',
      '--var',
      'LITE_AI_ENABLED:false',
      '--var',
      'AI_PAID_REQUESTS_ENABLED:false',
    ],
    { ...options, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const stream of [worker.stdout, worker.stderr])
    stream.on('data', (data) => {
      logs = (logs + data).slice(-6000);
    });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call('/api/health')).status === 200) return;
    } catch {
      /* Starting. */
    }
    if (worker.exitCode !== null) throw new Error(logs);
    await delay(250);
  }
  throw new Error('Worker did not start: ' + logs);
}
async function stop() {
  if (!worker || worker.exitCode !== null) return;
  const ended = new Promise((r) => worker.once('exit', r));
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(worker.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else worker.kill('SIGTERM');
  await ended;
}
const password = 'Synthetic-local-password-123';
async function register(email, setupToken) {
  const result = await call('/api/auth/register', {
    email,
    password,
    firstName: email.split('@')[0],
    ...(setupToken ? { setupToken } : {}),
  });
  assert.equal(result.status, 201, result.text);
  return {
    ...result.json().user,
    cookie: result.headers.get('set-cookie').split(';')[0],
  };
}
let browser;
try {
  await start();
  const owner = await register(
    'console-owner@example.invalid',
    'synthetic-owner-setup-code-not-production',
  );
  await check(
    'billing private D1 persistence, revision conflicts and validation',
    async () => {
      assert.equal((await call('/api/billing')).status, 403);
      const customer = await register('billing-customer@example.invalid');
      assert.equal(
        (await call('/api/billing', undefined, customer.cookie)).status,
        403,
      );
      const initial = await call('/api/billing', undefined, owner.cookie);
      assert.equal(initial.status, 200);
      assert.match(initial.headers.get('cache-control'), /no-store/);
      const snapshot = initial.json();
      assert.equal(snapshot.revision, 0);
      assert.equal(snapshot.value.entries[0].fee, null);
      assert.equal(snapshot.aiBudget.enabled, false);
      const value = structuredClone(snapshot.value);
      Object.assign(value.entries[0], {
        plan: 'demo-pro',
        status: 'active',
        fee: 4900,
        period: new Date().toISOString().slice(0, 7),
        spent: 4000,
        budget: 3000,
        requests: 120,
        requestLimit: 100,
      });
      const changed = await call(
        '/api/billing',
        { revision: 0, value },
        owner.cookie,
        'PUT',
      );
      assert.equal(changed.status, 200, changed.text);
      assert.equal(changed.json().revision, 1);
      assert.equal(
        (
          await call(
            '/api/billing',
            { revision: 0, value },
            owner.cookie,
            'PUT',
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            '/api/billing',
            {
              revision: 1,
              value: { entries: [{ ...value.entries[0], fee: -1 }] },
            },
            owner.cookie,
            'PUT',
          )
        ).status,
        400,
      );
      const persisted = (
        await call('/api/billing', undefined, owner.cookie)
      ).json();
      assert.equal(persisted.value.entries[0].fee, 4900);
      assert.equal(persisted.revision, 1);
      assert.ok(persisted.history.some((h) => h.revision === 1));
      const denied = await fetch(base + '/api/billing', {
        headers: {
          cookie: owner.cookie,
          authorization: 'Bearer synthetic-invalid',
        },
      });
      assert.equal(denied.status, 403);
      const cross = await fetch(base + '/api/billing', {
        method: 'PUT',
        headers: {
          cookie: owner.cookie,
          origin: 'https://example.invalid',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ revision: 1, value }),
      });
      assert.equal(cross.status, 403);
      const publicData =
        (await call('/api/settings')).text +
        (await call('/llms-full.txt')).text;
      assert.ok(!publicData.includes('demo-pro'));
      assert.equal(
        (
          await call(
            '/api/billing',
            { revision: 1, value: snapshot.value },
            owner.cookie,
            'PUT',
          )
        ).status,
        200,
      );
    },
  );
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const [name, ...value] = owner.cookie.split('=');
  await context.addCookies([{ name, value: value.join('='), url: base }]);
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const noOverflow = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'horizontal overflow at ' + page.viewportSize().width,
    );
  await page.goto(base + '/admin');
  await page
    .getByRole('heading', { name: 'Обзор сайта', exact: true })
    .waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Показатели сайта"]')
        ?.getAttribute('aria-busy') === 'false',
  );
  await check(
    'neutral palette, branding, metrics and all 18 desktop sections',
    async () => {
      assert.match(await page.locator('.admin-brand').innerText(), /OraVera/);
      const nav = page.getByRole('navigation', {
        name: 'Разделы управления',
        exact: true,
      });
      assert.equal(await nav.getByRole('link').count(), 18);
      assert.equal(
        await page
          .locator('.admin-console')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgb(16, 16, 16)',
      );
      await noOverflow();
      await page.screenshot({
        path: path.join(state, 'admin-desktop.png'),
        fullPage: true,
      });
      const items = await nav.getByRole('link').evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent.trim(),
          href: el.getAttribute('href'),
        })),
      );
      for (const item of items) {
        await nav.getByRole('link', { name: item.text, exact: true }).click();
        await page
          .getByRole('heading', {
            name: item.text === 'Обзор' ? 'Обзор сайта' : item.text,
            exact: true,
            level: 1,
          })
          .waitFor();
        assert.equal(new URL(page.url()).hash, item.href);
        await noOverflow();
      }
    },
  );
  await check('deep links, reload, browser back and forward', async () => {
    await page.goto(base + '/admin#models');
    await page
      .getByRole('heading', { name: 'Модели', exact: true, level: 1 })
      .waitFor();
    await page
      .getByRole('navigation', { name: 'Разделы управления', exact: true })
      .getByRole('link', { name: 'Страницы', exact: true })
      .click();
    await page.goBack();
    await page
      .getByRole('heading', { name: 'Модели', exact: true, level: 1 })
      .waitFor();
    await page.goForward();
    await page
      .getByRole('heading', { name: 'Страницы', exact: true, level: 1 })
      .waitFor();
    await page.reload();
    try {
      await page
        .getByRole('heading', { name: 'Страницы', exact: true, level: 1 })
        .waitFor();
    } catch (error) {
      console.log(
        JSON.stringify({
          url: page.url(),
          errors,
          text: (await page.locator('body').innerText()).slice(0, 2500),
        }),
      );
      await page.screenshot({ path: path.join(state, 'failure.png') });
      throw error;
    }
  });
  await check(
    'mobile drawer, portal theme, Escape, section selection at 320/390/768px',
    async () => {
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow();
        const trigger = page.getByRole('button', {
          name: 'Открыть разделы админки',
        });
        await trigger.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await page.waitForFunction(() => {
          const popup = document.querySelector('[role="dialog"]');
          return (
            popup &&
            getComputedStyle(popup).opacity === '1' &&
            !popup.hasAttribute('data-starting-style')
          );
        });
        assert.equal(await dialog.locator('.admin-nav-item').count(), 18);
        assert.equal(
          await dialog.evaluate((el) => getComputedStyle(el).backgroundColor),
          'rgb(23, 23, 23)',
        );
        if (width === 390)
          await page.screenshot({
            path: path.join(state, 'admin-mobile-menu.png'),
          });
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        await trigger.click();
        await dialog.getByRole('link', { name: 'Обзор', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByRole('heading', { name: 'Обзор сайта', exact: true })
          .waitFor();
        await noOverflow();
        if (width === 390)
          await page.screenshot({
            path: path.join(state, 'admin-mobile.png'),
            fullPage: true,
          });
      }
    },
  );
  await check(
    'keyboard contrast, 200% text and public theme isolation',
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const link = page.locator('.admin-sidebar [aria-current="page"]');
      await link.hover();
      const colors = await link.evaluate((el) => ({
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      }));
      const lum = (rgb) =>
        rgb
          .match(/[0-9.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      assert.ok((lum(colors.color) + 0.05) / (lum(colors.bg) + 0.05) >= 4.5);
      await page.evaluate(
        () => (document.documentElement.style.fontSize = '200%'),
      );
      await noOverflow();
      await page.evaluate(() =>
        document.documentElement.style.removeProperty('font-size'),
      );
      await page
        .locator('.admin-header')
        .getByRole('link', { name: 'Открыть сайт', exact: true })
        .click();
      await page.waitForURL(base + '/');
      assert.equal(
        await page.locator('html').getAttribute('data-admin-ui'),
        null,
      );
      assert.equal(await page.locator('.admin-console').count(), 0);
      await page.goto(base + '/account');
      assert.equal(
        await page.locator('html').getAttribute('data-admin-ui'),
        null,
      );
    },
  );
  await check(
    'billing UI six demo plans, saved current subscription, domain renewal, mobile and deletion',
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(base + '/admin#billing');
      await page
        .getByRole('heading', {
          name: 'Подписки и расходы',
          exact: true,
          level: 1,
        })
        .waitFor();
      await page
        .getByRole('button', { name: 'Изменить PromanOS AI', exact: true })
        .click();
      const plans = page.getByLabel(
        'Тариф PromanOS (6 демонстрационных примеров)',
      );
      assert.equal(await plans.locator('option').count(), 7);
      await plans.selectOption('demo-pro');
      await page
        .getByLabel('Статус по данным владельца')
        .selectOption('active');
      await page.getByLabel('Стоимость за платёжный период').fill('49');
      await page
        .getByLabel('Месяц учёта расходов')
        .fill(new Date().toISOString().slice(0, 7));
      await page.getByLabel('Расход за указанный месяц').fill('40');
      await page.getByLabel('Месячный бюджет (предупреждение)').fill('30');
      await page
        .getByRole('button', { name: 'Сохранить учёт', exact: true })
        .click();
      await page
        .getByText('Сохранено в учёте сайта.', { exact: false })
        .waitFor();
      await page.reload();
      await page.getByText('Демо · Pro', { exact: true }).waitFor();
      await page
        .getByText('Достигнут бюджет расходов', { exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'Изменить Домен', exact: true })
        .click();
      await page
        .getByLabel('Домен и регистратор')
        .fill('synthetic.example.invalid — test registrar');
      await page
        .getByLabel('Дата следующего продления')
        .fill(new Date().toISOString().slice(0, 10));
      await page
        .getByRole('button', { name: 'Сохранить учёт', exact: true })
        .click();
      await page.getByText('Продление сегодня', { exact: true }).waitFor();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({top:0,behavior:'instant'});
    });
    await page.screenshot({
      path: path.join(state, 'billing-desktop.png'),
        fullPage: true,
      });
      await page
        .getByRole('button', { name: 'Добавить сервис', exact: true })
        .click();
      await page.getByLabel('Название', { exact: true }).fill('Synthetic SMS');
      await page
        .getByRole('button', { name: 'Сохранить учёт', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Изменить Synthetic SMS', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Удалить из учёта', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Подтвердить удаление', exact: true })
        .click();
      await page
        .getByText('Запись удалена из учёта.', { exact: false })
        .waitFor();
      assert.equal(
        await page
          .getByRole('button', { name: 'Изменить Synthetic SMS', exact: true })
          .count(),
        0,
      );
      await page.setViewportSize({ width: 390, height: 900 });
      await noOverflow();
    await page.getByRole('button',{name:'Изменить PromanOS AI',exact:true}).waitFor();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({top:0,behavior:'instant'});
    });
    await page.screenshot({
      path: path.join(state, 'billing-mobile.png'),
        fullPage: true,
      });
      await page
        .getByRole('button', { name: 'Изменить Cloudflare', exact: true })
        .click();
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow();
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = '200%'),
      );
      await noOverflow();
      await page.evaluate(() =>
        document.documentElement.style.removeProperty('font-size'),
      );
      await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    },
  );
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(state, 'admin-ui-report.json'),
    JSON.stringify(
      {
        results,
        errors,
        scope: 'isolated synthetic D1; no remote API or deployment',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, state }));
} finally {
  await browser?.close();
  await stop();
}
