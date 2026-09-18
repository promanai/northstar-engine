import type { Metadata } from 'next';
import { Catalog } from '@/components/catalog';
import { isLite } from '@/lib/engine-mode';
import { liteProducts } from '@/lib/lite-content';
import { requestLocale } from '@/lib/locale-server';
import { translate } from '@/lib/translations';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  return {
    title: translate('Каталог услуг и товаров', locale),
    description: translate('Services and products', locale),
  };
}
export default function CatalogPage() {
  return <Catalog initialItems={isLite() ? liteProducts() : undefined} />;
}
