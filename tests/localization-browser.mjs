import assert from 'node:assert/strict';
import path from 'node:path';
export async function localizationBrowserTests({ page, check, state, base }) {
  await check(
    'four languages persist through navigation/reload; Hebrew RTL, forms and booking controls work',
    async () => {
      const settings = [
        {
          code: 'ru',
          name: 'Русский',
          book: 'Записаться на приём',
          close: 'Закрыть форму записи',
          login: 'Вход для пациента',
          privacy: 'Перед передачей информации',
        },
        {
          code: 'es',
          name: 'Español',
          book: 'Reservar una cita',
          close: 'Cerrar reserva',
          login: 'Acceso de pacientes',
          privacy: 'Antes de compartir información',
        },
        {
          code: 'he',
          name: 'עברית',
          book: 'קביעת תור',
          close: 'סגירת טופס התור',
          login: 'כניסה למטופלים',
          privacy: 'לפני שיתוף מידע',
        },
        {
          code: 'en',
          name: 'English',
          book: 'Book an appointment',
          close: 'Close booking',
          login: 'Patient sign in',
          privacy: 'Before sharing information',
        },
      ];
      for (const language of settings) {
        await page.goto(base + '/account');
        await page.locator('.site-language-bar [role="combobox"]').click();
        await page
          .getByRole('option', { name: language.name, exact: true })
          .click();
        await page.waitForFunction(
          (code) => document.documentElement.lang === code,
          language.code,
        );
        assert.equal(
          await page.locator('html').getAttribute('dir'),
          language.code === 'he' ? 'rtl' : 'ltr',
        );
        await page
          .getByRole('button', { name: language.book, exact: true })
          .click();
        await page
          .getByRole('button', { name: language.close, exact: true })
          .waitFor();
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${language.code}/${width}`,
          );
        }
        if (language.code === 'he') {
          await page.setViewportSize({ width: 390, height: 900 });
          await page
            .getByRole('button', { name: language.close, exact: true })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(state, 'localization-he-booking.png'),
            animations: 'disabled',
          });
        }
        await page
          .getByRole('button', { name: language.close, exact: true })
          .click();
        await page.reload();
        await page
          .getByRole('button', { name: language.book, exact: true })
          .waitFor();
        assert.equal(
          await page.locator('html').getAttribute('lang'),
          language.code,
        );
        await page.goto(base + '/privacy');
        await page
          .getByRole('heading', { name: language.privacy, exact: true })
          .waitFor();
        await page.goto(base + '/login');
        await page
          .getByRole('heading', { name: language.login, exact: true })
          .waitFor();
        const email = page.locator('input[name="email"]');
        await email.fill('draft@example.invalid');
        await page.locator('.site-language-bar [role="combobox"]').click();
        await page
          .getByRole('option', { name: 'English', exact: true })
          .click();
        assert.equal(await email.inputValue(), 'draft@example.invalid');
        const response = await fetch(base + '/', {
          headers: {
            cookie: `site-language=${language.code}`,
            'accept-language': 'en',
          },
        });
        const html = await response.text();
        assert.equal(response.status, 200);
        assert.match(html, new RegExp(`lang="${language.code}"`));
        assert.match(response.headers.get('vary'), /cookie/i);
      }
      await page.goto(base + '/account');
      await page
        .getByRole('button', { name: 'Book an appointment', exact: true })
        .waitFor();
    },
  );
}
