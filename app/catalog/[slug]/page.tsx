/* oxlint-disable next/no-html-link-for-pages */
import { Localize, LocaleMoney } from '@/components/locale-provider';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { ProductCheckout } from '@/components/product-checkout';
import { SlotPicker } from '@/components/booking-panel';
import { isLite } from '@/lib/engine-mode';
import { liteProducts } from '@/lib/lite-content';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';
export const dynamic = 'force-dynamic';
async function productFor(slug: string) {
  if (isLite()) return liteProducts().find((p) => p.slug === slug);
  return getDb()
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      kind: products.kind,
      shortDescription: products.shortDescription,
      description: products.description,
      price: products.price,
      currency: products.currency,
    })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .get();
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await productFor((await params).slug);
  const locale = await requestLocale();
  return {
    title: translate(product?.title ?? 'Предложение не найдено', locale),
    description: product
      ? translate(product.shortDescription, locale)
      : undefined,
    ...(!product ? { robots: { index: false } } : {}),
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await productFor((await params).slug);
  if (!product) notFound();
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh px-4 py-7 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-5xl">
            <nav
              aria-label="Навигация услуги"
              className="flex flex-wrap justify-between gap-3 text-sm"
            >
              <a
                href="/catalog"
                className="inline-flex min-h-11 items-center text-site-muted"
              >
                ← Каталог
              </a>
              {!isLite() && (
                <a
                  href="/account"
                  className="inline-flex min-h-11 items-center text-site-accent-ink"
                >
                  Личный кабинет
                </a>
              )}
            </nav>
            <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1fr_380px]">
              <article className="min-w-0 py-2">
                <p className="text-sm text-site-accent-ink">
                  {product.kind === 'product' ? 'Товар' : 'Услуга'}
                </p>
                <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                  {product.title}
                </h1>
                <p className="mt-5 break-words text-lg leading-8 text-site-muted">
                  {product.shortDescription}
                </p>
                <p className="mt-7 text-2xl font-semibold">
                  <LocaleMoney
                    amount={product.price}
                    currency={product.currency}
                  />
                </p>
                <div className="mt-7 whitespace-pre-wrap break-words border-t border-site-line pt-6 text-base leading-8">
                  {product.description ||
                    'Дополнительные детали можно уточнить у консультанта.'}
                </div>
                <a
                  href="/#chat"
                  className="mt-6 inline-flex min-h-11 items-center text-site-accent-ink underline"
                >
                  Задать вопрос консультанту
                </a>
              </article>
              {!isLite() && (
                <ProductCheckout
                  product={{
                    id: product.id,
                    slug: product.slug,
                    price: product.price,
                    currency: product.currency,
                  }}
                />
              )}
            </div>
            {!isLite() && product.kind === 'service' && (
              <SlotPicker productId={product.id} />
            )}
          </div>
        </main>
      }
    </Localize>
  );
}
