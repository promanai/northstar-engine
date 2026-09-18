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
import { DentalExperience } from '@/components/dental-experience';

export async function generateMetadata(): Promise<Metadata> {
  const config = await publicSiteConfig();
  const locale = await requestLocale(config.locale);
  return {
    title: config.name,
    description: translate(config.description, locale),
    ...(liteSite.businessType === 'dental'
      ? { icons: { icon: '/oravera-icon.svg' } }
      : {}),
    openGraph: {
      title: config.name,
      description: translate(config.description, locale),
      locale: { ru: 'ru_RU', en: 'en_US', es: 'es_US', he: 'he_IL' }[locale],
    },
  };
}
export default function Home() {
  if (liteSite.businessType === 'dental')
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
