// Real built UI and isolated local Worker; only /api/leads is mocked.
// The webhook transport is tested separately. No external delivery occurs here.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

export async function checkLeadBrowser(base, output) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  async function check(name, fn, enabled = true) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [],
      posts = [],
      outbound = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let respond = async (payload) => ({
      status: 202,
      json: { accepted: true, id: payload.id, delivery: 'accepted' },
    });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base) {
        outbound.push(url.origin);
        return route.abort();
      }
      if (url.pathname !== '/api/leads') return route.continue();
      if (route.request().method() === 'GET')
        return route.fulfill({
          json: enabled
            ? {
                enabled: true,
                recipient: 'Synthetic Receiver',
                privacyPath: '/about',
                configurationId: 'a'.repeat(64),
              }
            : { enabled: false },
        });
      const payload = route.request().postDataJSON();
      posts.push(payload);
      return route.fulfill(await respond(payload));
    });
    try {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === '/api/leads' &&
            r.request().method() === 'GET',
          { timeout: 45000 },
        ),
        page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 }),
      ]);
      if (enabled)
        await page
          .getByRole('button', { name: 'Оставить заявку', exact: true })
          .click();
      await fn({
        page,
        posts,
        setResponse: (fn) => {
          respond = fn;
        },
      });
      assert.deepEqual(errors, []);
      assert.deepEqual(outbound, []);
      results.push({ name, passed: true });
      console.log('PASS lead browser: ' + name);
    } catch (error) {
      console.error({ browserErrors: errors, outbound });
      console.error(await page.locator('body').ariaSnapshot());
      await page.screenshot({ path: path.join(output, 'lead-failure.png') });
      throw error;
    } finally {
      await context.close();
    }
  }
  const fill = async (page) => {
    await page.getByLabel('Ваше имя', { exact: true }).fill('Synthetic QA');
    await page
      .getByLabel('Email или телефон', { exact: true })
      .fill('test@example.com');
    await page
      .getByLabel('Что вам нужно', { exact: true })
      .fill('Synthetic enquiry');
  };
  const consent = (page) =>
    page
      .getByRole('checkbox', { name: /^Согласен передать указанные данные/ })
      .check();
  const send = (page) =>
    page.getByRole('button', { name: 'Подтвердить и отправить', exact: true });
  try {
    await check(
      'disabled module has no lead trigger',
      async ({ page, posts }) => {
        await page.getByRole('tab', { name: 'Чат', exact: true }).waitFor();
        assert.equal(
          await page
            .getByRole('button', { name: 'Оставить заявку', exact: true })
            .count(),
          0,
        );
        assert.equal(posts.length, 0);
      },
      false,
    );
    await check(
      'explicit consent, draft reopen, double-click guard and exact receipt',
      async ({ page, posts, setResponse }) => {
        await fill(page);
        assert.equal(await send(page).isDisabled(), true);
        await page
          .getByRole('button', { name: 'Закрыть', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Оставить заявку', exact: true })
          .click();
        assert.equal(
          await page.getByLabel('Ваше имя', { exact: true }).inputValue(),
          'Synthetic QA',
        );
        await consent(page);
        let release;
        setResponse(
          (payload) =>
            new Promise((resolve) => {
              release = () =>
                resolve({
                  status: 202,
                  json: {
                    accepted: true,
                    id: payload.id,
                    delivery: 'accepted',
                  },
                });
            }),
        );
        await send(page).click();
        await page.getByRole('button', { name: 'Передаём заявку…' }).waitFor();
        assert.equal(
          await page
            .getByRole('button', { name: 'Передаём заявку…' })
            .isDisabled(),
          true,
        );
        await page.waitForFunction(
          () => document.querySelector('[role="dialog"]') !== null,
        );
        // Await the recorded route without fixed sleeps.
        for (let i = 0; !release && i < 100; i++)
          await new Promise((r) => setTimeout(r, 20));
        assert.equal(posts.length, 1);
        release();
        await page
          .getByRole('status')
          .filter({ hasText: 'Сервис получателя подтвердил' })
          .waitFor();
        assert.equal(posts.length, 1);
        assert.deepEqual(
          Object.keys(posts[0]).sort(),
          [
            'configurationId',
            'consent',
            'contact',
            'id',
            'message',
            'name',
          ].sort(),
        );
        assert.equal(posts[0].consent, true);
        await page.getByRole('button', { name: 'Новая заявка' }).click();
        assert.equal(
          await page.getByLabel('Ваше имя', { exact: true }).inputValue(),
          '',
        );
        assert.equal(await send(page).isDisabled(), true);
      },
    );
    await check(
      'uncertain delivery freezes draft and explicit retry preserves ID and payload',
      async ({ page, posts, setResponse }) => {
        await fill(page);
        await consent(page);
        setResponse(() => ({ status: 502, json: { delivery: 'unknown' } }));
        await send(page).click();
        const retry = page.getByRole('button', {
          name: 'Повторить с тем же номером',
        });
        await retry.waitFor();
        assert.equal(
          await page.getByLabel('Ваше имя', { exact: true }).isDisabled(),
          true,
        );
        assert.equal(posts.length, 1);
        // A later pre-dispatch failure cannot undo an earlier uncertain delivery.
        setResponse(() => ({ status: 503, json: { delivery: 'not_sent' } }));
        await retry.click();
        await page
          .getByRole('alert')
          .filter({ hasText: 'могла дойти' })
          .waitFor();
        assert.deepEqual(posts[1], posts[0]);
        assert.equal(
          await page.getByLabel('Ваше имя', { exact: true }).isDisabled(),
          true,
        );
      },
    );
    await check(
      'not-sent rejection keeps editable draft and malformed receipt is not success',
      async ({ page, posts, setResponse }) => {
        await fill(page);
        await consent(page);
        setResponse(() => ({ status: 503, json: { delivery: 'not_sent' } }));
        await send(page).click();
        await page
          .getByRole('alert')
          .filter({ hasText: 'не отправлена' })
          .waitFor();
        assert.equal(
          await page.getByLabel('Ваше имя', { exact: true }).isEnabled(),
          true,
        );
        setResponse(() => ({
          status: 202,
          json: { accepted: true, id: 'wrong', delivery: 'accepted' },
        }));
        await send(page).click();
        await page
          .getByRole('button', { name: 'Повторить с тем же номером' })
          .waitFor();
        assert.notEqual(posts[1].id, posts[0].id);
        assert.equal(
          await page.getByRole('button', { name: 'Новая заявка' }).count(),
          0,
        );
      },
    );
    await check(
      'dialog fits mobile, desktop and 200 percent text without horizontal overflow',
      async ({ page }) => {
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({ width, height: 800 });
          for (const scale of [100, 200]) {
            await page.evaluate((size) => {
              document.documentElement.style.fontSize = size + '%';
            }, scale);
            const bounds = await page.getByRole('dialog').evaluate((node) => {
              const r = node.getBoundingClientRect();
              return {
                left: r.left,
                right: r.right,
                width: innerWidth,
                overflow: node.scrollWidth - node.clientWidth,
              };
            });
            assert.ok(
              bounds.left >= -1 && bounds.right <= bounds.width + 1,
              JSON.stringify(bounds),
            );
            assert.ok(bounds.overflow <= 1, JSON.stringify(bounds));
            await page.screenshot({
              path: path.join(output, `lead-${width}-${scale}.png`),
            });
            await send(page).scrollIntoViewIfNeeded();
            const button = await send(page).boundingBox();
            assert.ok(
              button && button.y >= 0 && button.y + button.height <= 801,
            );
            await page.screenshot({
              path: path.join(output, `lead-${width}-${scale}-actions.png`),
            });
            await page.getByRole('dialog').evaluate((node) => {
              node.scrollTop = 0;
            });
          }
        }
      },
    );
  } finally {
    await browser.close();
    await writeFile(
      path.join(output, 'lead-browser-report.json'),
      JSON.stringify(
        {
          checks: results,
          expected: 5,
          mocked: ['/api/leads'],
          externalDeliveryTested: false,
        },
        null,
        2,
      ),
    );
  }
}
