// Isolated built Workers, synthetic inputs only. No paid AI or real patient data.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const output = await mkdtemp(path.join(root, '.test-state-oravera-'));
const browser = await chromium.launch({ headless: true });
const results = [];
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log('PASS OraVera: ' + name);
};
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';

async function run(enabled) {
  const socket = createServer();
  await new Promise((r) => socket.listen(0, '127.0.0.1', r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const base = `http://127.0.0.1:${port}`;
  const worker = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
      'dev',
      '--local',
      '--config',
      'deployment/oravera.preview.json',
      '--port',
      String(port),
      '--inspector-port',
      '0',
      '--persist-to',
      path.join(output, enabled ? 'enabled' : 'disabled'),
      ...(enabled
        ? [
            '--var',
            'LITE_HEALTH_DATA_ENABLED:true',
            '--var',
            'LITE_AI_ENABLED:true',
            '--var',
            'OPENAI_API_KEY:synthetic-not-a-key',
            '--var',
            'AI_PAID_REQUESTS_ENABLED:true',
          ]
        : []),
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    },
  );
  let logs = '';
  for (const stream of [worker.stdout, worker.stderr])
    stream.on('data', (data) => {
      logs = (logs + data).slice(-6000);
    });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [],
    outbound = [],
    posts = [];
  let fail = false;
  page.on('pageerror', (e) => errors.push(e.message));
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== base) {
      outbound.push(url.origin);
      return route.abort();
    }
    if (url.pathname === '/api/leads' && enabled) {
      if (request.method() === 'GET')
        return route.fulfill({
          json: {
            enabled: true,
            recipient: 'Synthetic clinic receiver',
            privacyPath: '/privacy',
            configurationId: 'a'.repeat(64),
          },
        });
      const body = request.postDataJSON();
      posts.push({ path: url.pathname, body });
      return route.fulfill({
        status: 202,
        json: { accepted: true, id: body.id, delivery: 'accepted' },
      });
    }
    if (request.method() === 'POST' && url.pathname.startsWith('/api/chat')) {
      assert.ok(enabled, 'disabled UI must never submit chat');
      posts.push({ path: url.pathname, body: request.postDataJSON() });
      return route.fulfill({
        status: fail ? 503 : 200,
        json: fail
          ? { error: 'synthetic failure' }
          : {
              mode: 'live',
              message:
                'Synthetic reply: the clinic must confirm your examination.',
            },
      });
    }
    return route.continue();
  });
  const request = async (url, body) => {
    const response = await fetch(base + url, {
      signal: AbortSignal.timeout(10000),
      ...(body
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: base },
            body: JSON.stringify(body),
          }
        : {}),
    });
    return { status: response.status, text: await response.text() };
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        ready = (await request('/api/health')).status === 200;
      } catch {
        /* Starting. */
      }
      if (ready) break;
      if (worker.exitCode !== null) throw new Error(logs);
      await delay(250);
    }
    assert.ok(ready, logs);
    if (!enabled) {
      await check(
        'closed medical routes; read-only public pages and contract',
        async () => {
          for (const route of ['/api/chat', '/api/chat/attachment'])
            for (const clinicalConsent of [undefined, true])
              assert.equal(
                (
                  await request(route, {
                    message: 'synthetic visit question',
                    clinicalConsent,
                  })
                ).status,
                503,
              );
          assert.equal(
            JSON.parse((await request('/api/leads')).text).enabled,
            false,
          );
          assert.equal((await request('/api/leads', {})).status, 503);
          assert.equal(
            JSON.parse((await request('/api/realtime')).text).enabled,
            false,
          );
          assert.equal(
            JSON.parse((await request('/api/health')).text).storage,
            'none',
          );
          const spec = JSON.parse((await request('/api/openapi')).text);
          for (const route of ['/chat', '/chat/attachment'])
            assert.ok(
              spec.paths[route].post.requestBody.content[
                'application/json'
              ].schema.required.includes('clinicalConsent'),
            );
          for (const route of [
            '/about',
            '/dental-exam',
            '/photo-guidance',
            '/privacy',
          ]) {
            const result = await request(route);
            assert.equal(result.status, 200);
            assert.match(result.text, /Back to the assistant/);
          }
          const markdown = await request('/api/content?slug=/');
          assert.match(markdown.text, /OraVera/);
          assert.doesNotMatch(
            markdown.text,
            /dentalSystemPolicy|OPENAI_API_KEY/,
          );
        },
      );
    } else {
      await check(
        'enabled Worker still rejects missing consent before provider access',
        async () => {
          assert.equal(
            (
              await request('/api/chat', {
                message: 'synthetic',
                clinicalConsent: false,
              })
            ).status,
            503,
          );
          assert.equal(
            (
              await request('/api/chat/attachment', {
                message: 'synthetic',
                clinicalConsent: true,
                attachment: {
                  name: 'sample.txt',
                  mime: 'text/plain',
                  data: 'aGVsbG8=',
                },
              })
            ).status,
            400,
          );
          assert.equal(
            JSON.parse((await request('/api/realtime')).text).enabled,
            false,
          );
        },
      );
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    if (!enabled) {
      await check(
        'preview controls, information dialogs and mobile layout',
        async () => {
          assert.equal(
            await page.getByLabel('Your message', { exact: true }).isDisabled(),
            true,
          );
          assert.equal(
            await page
              .getByRole('button', { name: 'Attach oral photo' })
              .isDisabled(),
            true,
          );
          assert.equal(
            await page
              .getByRole('button', {
                name: 'Request an examination',
                exact: true,
              })
              .count(),
            0,
          );
          for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              String(width),
            );
            await page
              .getByRole('button', { name: 'About oral photos', exact: true })
              .click();
            assert.equal(await page.getByRole('dialog').count(), 1);
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await page
              .getByRole('button', { name: 'Close', exact: true })
              .last()
              .click();
            await page.getByRole('dialog').waitFor({ state: 'hidden' });
          }
          await page.screenshot({
            path: path.join(output, 'desktop.png'),
            fullPage: true,
          });
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({
            path: path.join(output, 'mobile.png'),
            fullPage: true,
          });
          await page.addStyleTag({
            content: 'html { font-size: 200% !important; }',
          });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          assert.equal(posts.length, 0);
        },
      );
    } else {
      await check(
        'explicit consent, image upload and per-turn reset (mock AI)',
        async () => {
          const input = page.getByLabel('Your message', { exact: true });
          const consent = page.getByRole('checkbox').first();
          assert.equal(await input.isDisabled(), true);
          await consent.check();
          await input.fill('Synthetic visit question');
          await page
            .getByLabel('Select an oral photo')
            .setInputFiles({
              name: 'synthetic.png',
              mimeType: 'image/png',
              buffer: Buffer.from(png, 'base64'),
            });
          await page
            .getByText('Selected photo: synthetic.png', { exact: true })
            .waitFor();
          await page
            .getByRole('button', { name: 'Send message', exact: true })
            .click();
          await page
            .getByText(
              'Synthetic reply: the clinic must confirm your examination.',
              { exact: true },
            )
            .waitFor();
          assert.equal(posts.length, 1);
          assert.equal(posts[0].path, '/api/chat/attachment');
          assert.equal(posts[0].body.clinicalConsent, true);
          assert.equal(posts[0].body.attachment.data, png);
          assert.equal(await input.isDisabled(), true);
          assert.equal(await consent.isChecked(), false);
          await consent.check();
          await input.fill('Synthetic follow-up');
          fail = true;
          await page
            .getByRole('button', { name: 'Send message', exact: true })
            .click();
          await page.getByRole('alert').waitFor();
          assert.equal(posts.length, 2);
          assert.equal(posts[1].body.attachment, undefined);
          assert.equal(await input.isDisabled(), true);
          assert.match(
            await page.getByRole('alert').innerText(),
            /will not resend/,
          );
        },
      );
      await check(
        'separate English request form sends no chat or image (mock receiver)',
        async () => {
          await page
            .getByRole('button', {
              name: 'Request an examination',
              exact: true,
            })
            .click();
          await page
            .getByLabel('Your name', { exact: true })
            .fill('Synthetic Visitor');
          await page
            .getByLabel('Email or phone', { exact: true })
            .fill('synthetic@example.invalid');
          await page
            .getByLabel('Preferred visit / callback times', { exact: true })
            .fill('A callback next week');
          await page
            .getByRole('checkbox', { name: /^I agree to send these details/ })
            .check();
          await page
            .getByRole('button', { name: 'Confirm and send', exact: true })
            .click();
          await page.getByText(/This is not a confirmed appointment/).waitFor();
          const last = posts.at(-1);
          assert.equal(last.path, '/api/leads');
          assert.deepEqual(
            Object.keys(last.body).sort(),
            [
              'id',
              'name',
              'contact',
              'message',
              'consent',
              'configurationId',
            ].sort(),
          );
        },
      );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(outbound, []);
  } finally {
    await context.close();
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/pid', String(worker.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    else worker.kill('SIGTERM');
  }
}
try {
  await run(false);
  await run(true);
} finally {
  await browser.close();
  await writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      {
        passed: results,
        ai: 'mocked',
        receiver: 'mocked',
        realPatientData: false,
      },
      null,
      2,
    ),
  );
  console.log('OraVera report: ' + output);
}
