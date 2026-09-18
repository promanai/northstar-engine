import { messages } from '@/lib/translations/messages';
import { extendedMessages } from '@/lib/translations/extended';
import { contentMessages } from '@/lib/translations/content';
import { extraMessages } from '@/lib/translations/extra';
import type { Locale } from '@/lib/locales';
const all = {
  ...messages,
  ...extraMessages,
  ...extendedMessages,
  ...contentMessages,
};
const reverse: typeof all = {};
for (const row of Object.values(all))
  for (const value of Object.values(row))
    if (!reverse[value]) reverse[value] = row;
export function translate(value: string, locale: Locale): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const row = all[normalized] ?? reverse[normalized];
  if (!row) return value;
  const text = row[locale] ?? normalized;
  return `${/^\s/.test(value) ? ' ' : ''}${text}${/\s$/.test(value) ? ' ' : ''}`;
}
