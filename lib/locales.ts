export const locales = ['en', 'ru', 'es', 'he'] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  he: 'עברית',
};
export const intlLocales: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-US',
  he: 'he-IL',
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}
export function selectLocale(
  cookie: unknown,
  accept = '',
  fallback: Locale = 'en',
): Locale {
  if (isLocale(cookie)) return cookie;
  const candidates = accept
    .split(',')
    .map((part, index) => {
      const [tag, quality] = part.trim().split(';');
      const q = quality?.trim().startsWith('q=')
        ? Number(quality.trim().slice(2))
        : 1;
      const language = tag.toLowerCase().split('-')[0];
      return { language: language === 'iw' ? 'he' : language, q, index };
    })
    .filter((c) => isLocale(c.language) && c.q > 0 && c.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (candidates[0]?.language as Locale) || fallback;
}
