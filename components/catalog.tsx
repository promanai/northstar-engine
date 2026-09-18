/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { Localize, useLocale } from '@/components/locale-provider';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, ArrowUpRight } from 'lucide-react';
import { WebMcpBridge } from '@/components/webmcp-bridge';
import { useLite } from '@/components/engine-provider';
import { SiteHeader } from '@/components/site-header';

type Product = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  shortDescription: string;
  price: number;
  currency: string;
};
export function Catalog({ initialItems }: { initialItems?: Product[] }) {
  const { intl, t } = useLocale();
  const lite = useLite();
  const [items, setItems] = useState<Product[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);
  const [error, setError] = useState('');
  async function load() {
    try {
      const response = await fetch('/api/products?public=1');
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { products?: Product[] };
      setItems(data.products ?? []);
      setError('');
    } catch {
      setError('Не удалось загрузить каталог. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (initialItems !== undefined) return;
    void Promise.resolve().then(load);
  }, [initialItems]);
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh">
          <WebMcpBridge />
          <SiteHeader />
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
            <nav
              aria-label="Навигация каталога"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <a
                href="/"
                className="inline-flex min-h-11 items-center gap-2 text-sm text-site-muted"
              >
                <ArrowLeft className="size-4" /> На главную
              </a>
              {!lite && (
                <a
                  href="/account"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-site-line bg-site-surface px-4 text-sm"
                >
                  Личный кабинет <ArrowUpRight className="size-4" />
                </a>
              )}
            </nav>
            <div className="mb-8 mt-9 border-b border-site-line pb-7">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Услуги и товары
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-site-muted">
                Выберите подходящий вариант или обсудите задачу с консультантом.
              </p>
            </div>
            {loading ? (
              <output className="block py-14 text-center text-site-muted">
                Загружаем каталог…
              </output>
            ) : error ? (
              <div role="alert" className="home-panel text-center">
                <p>{error}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    void load();
                  }}
                  className="mt-4 min-h-11 rounded-xl border border-site-line px-4"
                >
                  Повторить
                </button>
              </div>
            ) : items.length === 0 ? (
              <section className="home-panel mx-auto max-w-xl py-12 text-center">
                <Package className="mx-auto size-9 text-site-accent-ink" />
                <h2 className="mt-5 text-xl font-semibold">
                  Каталог скоро появится
                </h2>
                <p className="mt-3 text-base leading-7 text-site-muted">
                  Пока расскажите консультанту, что вы ищете.
                </p>
                <a
                  href="/#chat"
                  className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-site-accent px-5 text-sm font-medium text-site-on-accent hover:bg-site-accent-hover"
                >
                  Перейти к чату
                </a>
              </section>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex min-w-0 flex-col rounded-2xl border border-site-line bg-site-surface p-6"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="size-5 text-site-accent-ink" />
                      <span className="text-xs text-site-muted">
                        {item.kind === 'product' ? 'Товар' : 'Услуга'}
                      </span>
                    </div>
                    <h2 className="mt-5 break-words text-xl font-semibold">
                      {item.title}
                    </h2>
                    <p className="mt-3 flex-1 break-words text-base leading-7 text-site-muted">
                      {item.shortDescription}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-5">
                      <strong>
                        {new Intl.NumberFormat(intl, {
                          style: 'currency',
                          currency: item.currency,
                        }).format(item.price / 100)}
                      </strong>
                      <a
                        href={`/catalog/${encodeURIComponent(item.slug)}`}
                        aria-label={`${t('Details')}: ${t(item.title)}`}
                        className="inline-flex min-h-11 items-center rounded-xl bg-site-accent px-4 text-sm text-site-on-accent hover:bg-site-accent-hover"
                      >
                        Подробнее
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      }
    </Localize>
  );
}
