// Read-only checks against the local demo installation. No registration or booking writes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base = 'http://127.0.0.1:8787';
const state = await mkdtemp(
  path.join(process.cwd(), '.test-state-localization-'),
);
const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];
try {
  for (const [code, title, catalog, detail] of [
    [
      'en',
      'OraVera assistant',
      'Services and products',
      'DEMO · Dental examination',
    ],
    ['ru', 'Ассистент OraVera', 'Услуги и товары', 'ДЕМО · Осмотр стоматолога'],
    [
      'es',
      'Asistente de OraVera',
      'Servicios y productos',
      'DEMO · Revisión dental',
    ],
    ['he', 'העוזר של OraVera', 'שירותים ומוצרים', 'הדגמה · בדיקת שיניים'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addCookies([
      { name: 'site-language', value: code, url: base },
    ]);
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), code);
    assert.equal(
      await page.locator('html').getAttribute('dir'),
      code === 'he' ? 'rtl' : 'ltr',
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(state, `home-${code}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto(base + '/catalog');
    await page.getByRole('heading', { name: catalog, exact: true }).waitFor();
    await page.getByRole('heading', { name: detail, exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.goto(base + '/catalog/demo-examination');
    await page.getByRole('heading', { name: detail, exact: true }).waitFor();
    assert.ok((await page.title()).includes(detail));
    await page.getByRole('button').filter({ hasText: 'DEMO · Dr.' }).first().waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(state, `product-${code}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button').filter({ hasText: 'DEMO · Dr.' }).first().click();
    await page.getByRole('alertdialog').waitFor();
    const contrast = await page.getByRole('alertdialog').locator('[data-slot="alert-dialog-action"]').evaluate(element => {
      const style=getComputedStyle(element), canvas=document.createElement('canvas'); canvas.width=canvas.height=1;
      const ctx=canvas.getContext('2d');
      const lum=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const [r,g,b]=Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
      const a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    assert.ok(contrast >= 4.5, `Confirmation contrast ${code}: ${contrast}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path:path.join(state,`confirm-${code}.png`), animations:'disabled' });
    await context.close();
    checks.push(code);
    console.log(`PASS public localization ${code}`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(
    path.join(state, 'report.json'),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(state);
}
