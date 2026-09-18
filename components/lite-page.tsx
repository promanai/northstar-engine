/* oxlint-disable next/no-html-link-for-pages */
import { Localize } from '@/components/locale-provider';
import { litePages, liteSite } from '@/lib/lite-content';
import { notFound } from 'next/navigation';
import { SiteHeader } from './site-header';
export function LitePage({ slug }: { slug: string }) {
  const page = litePages().find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh bg-site-page text-site-ink">
          {liteSite.businessType === 'dental' ? (
            <header className="border-b border-site-line px-4 py-5 sm:px-8">
              <a
                href="/"
                className="inline-flex min-h-11 items-center text-2xl font-semibold"
              >
                OraVera · Miami
              </a>
            </header>
          ) : (
            <SiteHeader />
          )}
          <article className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
            <h1 className="text-3xl font-semibold">{page.title}</h1>
            <p className="mt-5 text-lg text-site-muted">{page.description}</p>
            <div className="mt-8 whitespace-pre-wrap leading-8">
              {page.text}
            </div>
            <a
              href="/"
              className="mt-8 inline-flex min-h-11 items-center text-site-accent-ink"
            >
              {liteSite.locale === 'en'
                ? 'Back to the assistant'
                : 'На главную'}
            </a>
          </article>
        </main>
      }
    </Localize>
  );
}
