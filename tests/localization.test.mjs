import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLocale, locales, intlLocales } from '../lib/locales.ts';
import { messages } from '../lib/translations/messages.ts';
import { extendedMessages } from '../lib/translations/extended.ts';
import { contentMessages } from '../lib/translations/content.ts';
import { extraMessages } from '../lib/translations/extra.ts';

test('language preference is allowlisted, cookie wins, quality and region fallbacks are respected', () => {
  assert.equal(selectLocale('he', 'es-US,en;q=0.8', 'ru'), 'he');
  assert.equal(selectLocale('invalid', 'de,es-MX;q=0.8,en;q=0.2', 'ru'), 'es');
  assert.equal(selectLocale(null, 'he;q=0,en;q=0.5', 'ru'), 'en');
  assert.equal(selectLocale(null, 'iw-IL', 'ru'), 'he');
  assert.equal(selectLocale('<script>', 'unknown', 'ru'), 'ru');
  assert.deepEqual(locales, ['en', 'ru', 'es', 'he']);
});
test('registered interface and preset/demo phrases have all four translations', () => {
  const all = {
    ...messages,
    ...extendedMessages,
    ...extraMessages,
    ...contentMessages,
  };
  assert.ok(Object.keys(all).length > 400);
  for (const [key, row] of Object.entries(all))
    for (const locale of locales)
      assert.ok(
        typeof row[locale] === 'string' && row[locale].trim(),
        `${key}: ${locale}`,
      );
  for (const locale of locales)
    assert.ok(
      new Intl.DateTimeFormat(intlLocales[locale], {
        timeZone: 'America/New_York',
      }).format(new Date('2026-09-14T13:00:00Z')),
    );
  assert.equal(all['Book an appointment'].he, 'קביעת תור');
  assert.ok(all['DEMO · Dental examination'].es.startsWith('DEMO'));
});
