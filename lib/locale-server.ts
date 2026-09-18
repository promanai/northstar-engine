import { cookies, headers } from 'next/headers';
import { selectLocale, type Locale } from '@/lib/locales';
export async function requestLocale(fallback: Locale = 'en') {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  return selectLocale(
    jar.get('site-language')?.value,
    requestHeaders.get('accept-language') || '',
    fallback,
  );
}
