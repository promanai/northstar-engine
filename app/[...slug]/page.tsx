import { Localize } from '@/components/locale-provider';
import { PageBlocks } from '@/components/page-blocks';
/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { pages, products } from '@/db/schema';
import { getDb } from '@/db';
import { catalogMarkdown } from '@/lib/markdown';
import { pagePathForSlug } from '@/lib/page-policy';
import { SiteHeader } from '@/components/site-header';
import { isLite } from '@/lib/engine-mode';
import { litePages, liteSite } from '@/lib/lite-content';
import { LitePage } from '@/components/lite-page';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';

export const dynamic = 'force-dynamic';

async function getPublished(slug: string) {
  return getDb().select().from(pages).where(eq(pages.slug, slug)).get();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const locale = await requestLocale(liteSite.locale);
  const slug = `/${(await params).slug.join('/')}`;
  if (
    isLite() ||
    (liteSite.businessType === 'dental' && !(await getPublished(slug)))
  ) {
    const page = litePages().find((p) => p.slug === slug);
    return page
      ? {
          title: translate(page.title, locale),
          description: translate(page.description, locale),
          alternates: { canonical: slug },
          ...(liteSite.businessType === 'dental'
            ? { icons: { icon: '/oravera-icon.svg' } }
            : {}),
        }
      : { title: 'Страница не найдена', robots: { index: false } };
  }
  const page = await getPublished(slug);
  if (!page || page.status !== 'published')
    return { title: 'Страница не найдена', robots: { index: false } };
  const seo = page.seo ?? {};
  return {
    title: seo.title || page.title,
    description: seo.description || undefined,
    alternates: { canonical: pagePathForSlug(page.slug) },
  };
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const slug = `/${(await params).slug.join('/')}`;
  if (isLite()) return <Localize>{<LitePage slug={slug} />}</Localize>;
  const page = await getPublished(slug);
  if (!page && liteSite.businessType === 'dental')
    return <Localize>{<LitePage slug={slug} />}</Localize>;
  if (!page || page.status !== 'published') notFound();
  const catalog = await getDb()
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(products.title)
    .limit(100);
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh bg-site-page text-site-ink">
          <SiteHeader />
          <article className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
            <p className="text-sm text-site-accent-ink">{page.slug}</p>
            <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {page.title}
            </h1>
            <PageBlocks blocks={page.blocks ?? []} />
            {catalog.length > 0 && (
              <div className="mt-12 border-t border-site-line pt-8">
                <details>
                  <summary className="cursor-pointer font-medium">
                    Доступные услуги и товары
                  </summary>
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-site-muted">
                    {catalogMarkdown(catalog)}
                  </div>
                </details>
              </div>
            )}
            <p className="mt-12 border-t border-site-line pt-5 text-sm text-site-muted">
              <a href="/" className="text-site-accent-ink hover:underline">
                На главную
              </a>
              <span className="mx-2">·</span>
              <a
                href="/catalog"
                className="text-site-accent-ink hover:underline"
              >
                Каталог
              </a>
            </p>
          </article>
        </main>
      }
    </Localize>
  );
}
