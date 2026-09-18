import type { products, pages } from '@/db/schema';

type Product = typeof products.$inferSelect;
type Page = typeof pages.$inferSelect;

function clean(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.replaceAll('\r', '').trim();
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return `${value}`;
  return JSON.stringify(value) ?? '';
}
export function blocksToMarkdown(blocks: unknown[]) {
  return blocks
    .map((block) => {
      if (typeof block === 'string') return block;
      if (!block || typeof block !== 'object' || Array.isArray(block))
        return '';
      const value = block as Record<string, unknown>;
      const text =
        typeof value.text === 'string'
          ? value.text
          : typeof value.content === 'string'
            ? value.content
            : '';
      if (!text) return '';
      if (value.type === 'heading') return `## ${text}`;
      if (value.type === 'list') return `- ${text}`;
      if (
        value.type === 'cta' &&
        typeof value.href === 'string' &&
        /^\/(?!\/)/.test(value.href)
      )
        return `[${text.replaceAll(']', '\\]')}](${value.href.replaceAll(')', '%29').replaceAll('\n', '')})`;
      return text;
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function productMarkdown(product: Product) {
  const price = (product.price / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
  });
  return [
    `# ${clean(product.title)}`,
    '',
    `- Тип: ${product.kind}`,
    `- Цена: ${price} ${product.currency}`,
    `- Slug: ${product.slug}`,
    '',
    clean(product.shortDescription),
    '',
    clean(product.description),
  ]
    .join('\n')
    .trim();
}

export function pageMarkdown(page: Page, catalog: Product[] = []) {
  const seo = page.seo ?? {};
  const lines = [
    `# ${clean(page.title)}`,
    '',
    clean(seo.description),
    '',
    blocksToMarkdown(page.blocks ?? []),
  ];
  if (catalog.length)
    lines.push(
      '',
      '## Доступные услуги и товары',
      '',
      ...catalog.map(
        (product) =>
          `- [${clean(product.title)}](/catalog/${product.slug}) — ${(product.price / 100).toLocaleString('ru-RU')} ${product.currency}: ${clean(product.shortDescription)}`,
      ),
    );
  return lines
    .filter((line, index) => line || lines[index - 1])
    .join('\n')
    .trim();
}

export function catalogMarkdown(catalog: Product[]) {
  return [
    '# Каталог',
    '',
    'Заказать товар или услугу можно через `POST /api/orders` или MCP tool `create_order`.',
    '',
    ...catalog.map(productMarkdown),
  ]
    .join('\n\n')
    .trim();
}
