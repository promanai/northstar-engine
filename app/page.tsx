/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';
import { HomeExperience } from '@/components/home-experience';
import { SiteHeader } from '@/components/site-header';
import { WebMcpBridge } from '@/components/webmcp-bridge';
import { isLite } from '@/lib/engine-mode';
import { publicSiteConfig } from '@/lib/site-config-service';
import { SiteName } from '@/components/engine-provider';
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
    <main className="home-page site-theme-scope min-h-dvh bg-site-page text-site-ink">
      <WebMcpBridge />
      <SiteHeader />
      <HomeExperience />
      <footer className="home-footer border-t border-site-line px-4 py-3 text-sm text-site-muted sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <p className="text-xs">
            <SiteName />
          </p>
          {!isLite() && (
            <nav
              aria-label="Навигация в подвале"
              className="flex flex-wrap gap-4"
            >
              <a href="/account" className="hover:text-site-accent-ink">
                Кабинет
              </a>
              <a href="/admin" className="hover:text-site-accent-ink">
                Админка
              </a>
            </nav>
          )}
        </div>
      </footer>
    </main>
  );
}
