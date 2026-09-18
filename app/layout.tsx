import { NavigationProvider } from '@/components/navigation-provider';
import { publicNavigation } from '@/lib/navigation-service';
import { defaultNavigation, resolveNavigation } from '@/lib/navigation-policy';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteThemeProvider } from '@/components/site-theme-provider';
import { EngineProvider } from '@/components/engine-provider';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { isLite } from '@/lib/engine-mode';
import { publicSiteConfig } from '@/lib/site-config-service';
import { defaultSiteConfig } from '@/lib/site-config-policy';
import { LocaleProvider } from '@/components/locale-provider';
import { requestLocale } from '@/lib/locale-server';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Northstar',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let config = defaultSiteConfig;
  try {
    config = await publicSiteConfig();
  } catch {
    console.error('Site configuration unavailable; using safe defaults');
  }
  let navigation = resolveNavigation(defaultNavigation, []);
  try {
    navigation = await publicNavigation();
  } catch {
    console.error('Navigation unavailable; using safe defaults');
  }
  const locale = await requestLocale(config.locale);
  return (
    <html
      lang={locale}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      data-site-theme={config.theme}
      style={
        {
          '--site-background-image': config.backgroundImage
            ? `url(${JSON.stringify(config.backgroundImage)})`
            : 'none',
        } as React.CSSProperties
      }
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EngineProvider lite={isLite()} initial={config}>
          <NavigationProvider initial={navigation}>
            <SiteThemeProvider>
              <LocaleProvider initial={locale}>
                {children}
                <AnalyticsTracker />
              </LocaleProvider>
            </SiteThemeProvider>
          </NavigationProvider>
        </EngineProvider>
      </body>
    </html>
  );
}
