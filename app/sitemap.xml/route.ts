import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pages, products } from '@/db/schema';

function xml(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;'); }

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const [published, catalog] = await Promise.all([
    getDb().select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, 'published')).orderBy(asc(pages.slug)).limit(200),
    getDb().select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.active, true)).orderBy(asc(products.slug)).limit(200),
  ]);
  const rows = [{ slug: '/', updatedAt: null }, { slug: '/catalog', updatedAt: null }, ...published.filter((page) => page.slug !== '/'), ...catalog.map((product) => ({ slug: `/catalog/${product.slug}`, updatedAt: product.updatedAt }))];
  const urls = rows.map((row) => `<url><loc>${xml(`${base}${row.slug}`)}</loc>${row.updatedAt ? `<lastmod>${new Date(row.updatedAt).toISOString()}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
