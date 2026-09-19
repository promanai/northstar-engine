/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';
import { NorthstarV50Experience } from '@/components/northstar-v50-experience';
import { WebMcpBridge } from '@/components/webmcp-bridge';
import { isLite } from '@/lib/engine-mode';
import { publicSiteConfig } from '@/lib/site-config-service';
import { env } from 'cloudflare:workers';
import { liteSite } from '@/lib/lite-content';
import { dentalChatAvailable } from '@/lib/dental-policy';
import { headers } from 'next/headers';
import { DentalExperience } from '@/components/dental-experience';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await publicSiteConfig();
  const locale = await requestLocale(config.locale);
  let host = '';
  try {
    const headerList = await headers();
    host = headerList.get('host') || '';
  } catch {
    // fallback
  }
  const isDental =
    (env.SITE_PRESET ?? env.LITE_SITE_PRESET) === 'oravera' ||
    liteSite.businessType === 'dental' ||
    host.includes('oravera');
  return {
    title: isDental ? 'OraVera | Dental care in Miami' : config.name,
    description: isDental
      ? 'Fast relief for your dental pain. Treatment, prices, insurance, mouth photos, or booking in Miami.'
      : translate(config.description, locale),
    ...(isDental ? { icons: { icon: '/oravera-icon.svg' } } : {}),
    openGraph: {
      title: isDental ? 'OraVera | Dental care in Miami' : config.name,
      description: isDental
        ? 'Fast relief for your dental pain. Treatment, prices, insurance, mouth photos, or booking in Miami.'
        : translate(config.description, locale),
      locale: { ru: 'ru_RU', en: 'en_US', es: 'es_US', he: 'he_IL' }[locale],
    },
  };
}
export default async function Home() {
  let host = '';
  try {
    const headerList = await headers();
    host =
      headerList.get('x-forwarded-host') ||
      headerList.get('host') ||
      '';
  } catch {
    // fallback
  }
  const isDental =
    (env.SITE_PRESET ?? env.LITE_SITE_PRESET) === 'oravera' ||
    liteSite.businessType === 'dental' ||
    host.includes('oravera');
  if (isDental)
    return (
      <DentalExperience
        accountEnabled={!isLite()}
        chatEnabled={
          isLite() &&
          dentalChatAvailable(env) &&
          (!env.AI_PAID_REQUESTS_ENABLED ||
            env.AI_PAID_REQUESTS_ENABLED === 'true')
        }
        provider={env.LITE_AI_PROVIDER === 'xai' ? 'xAI' : 'OpenAI'}
      />
    );
  return (
    <>
      <WebMcpBridge />
      <NorthstarV50Experience />
    </>
  );
}
