import { env } from 'cloudflare:workers';
import defaultConfig from '@/site.config.json';
import oraveraConfig from '@/presets/oravera.json';
// Explicit installation preset; the generic open-source starter stays unchanged.
const config =
  (env.SITE_PRESET ?? env.LITE_SITE_PRESET) === 'oravera'
    ? oraveraConfig
    : defaultConfig;
export type LiteProduct = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  active?: boolean;
};
export type LitePage = {
  slug: string;
  title: string;
  description: string;
  text: string;
};
// Public responses whitelist fields, including when the owner's config is extended.
export const liteProducts = (): LiteProduct[] =>
  (config.products as LiteProduct[])
    .filter((p) => p.active !== false)
    .map(
      ({
        id,
        slug,
        title,
        kind,
        shortDescription,
        description,
        price,
        currency,
      }) => ({
        id,
        slug,
        title,
        kind,
        shortDescription,
        description,
        price,
        currency,
      }),
    );
export const litePages = (): LitePage[] =>
  config.pages.map(({ slug, title, description, text }) => ({
    slug,
    title,
    description,
    text,
  }));
export const liteSite = {
  name: config.name,
  description: config.description,
  theme: config.theme,
  backgroundImage: config.backgroundImage,
  locale: ('locale' in config && config.locale === 'en' ? 'en' : 'ru') as
    | 'en'
    | 'ru',
  businessType: 'businessType' in config ? config.businessType : 'general',
};
export function liteMarkdown(slug: string): string | null {
  if (slug === '/')
    if (liteSite.businessType === 'dental')
      return `# ${liteSite.name}\n\n${liteSite.description}\n\nAI information assistant, not a dentist. Photo sharing requires activation and consent. Requests are not confirmed appointments. [Dental examination](/dental-exam) · [Photo guidance](/photo-guidance) · [Privacy](/privacy)`;
  if (slug === '/')
    return `# ${liteSite.name}\n\n${liteSite.description}\n\nЗадайте вопрос консультанту или откройте [каталог](/catalog).`;
  const productText = (p: LiteProduct) =>
    `# ${p.title}\n\n${p.shortDescription}\n\n${(p.price / 100).toFixed(2)} ${p.currency}\n\n${p.description}`;
  if (slug === '/catalog')
    return '# Каталог\n\n' + liteProducts().map(productText).join('\n\n');
  const product = liteProducts().find((p) => `/catalog/${p.slug}` === slug);
  if (product) return productText(product);
  const page = litePages().find((p) => p.slug === slug);
  return page ? `# ${page.title}\n\n${page.description}\n\n${page.text}` : null;
}
