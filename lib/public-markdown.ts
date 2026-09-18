import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pages, products } from '@/db/schema';
import { pageMarkdown, productMarkdown } from '@/lib/markdown';
import { litePages, liteSite } from '@/lib/lite-content';
import { publicSiteConfig } from '@/lib/site-config-service';

// Public representations only. Never use this reader for draft/admin exports.
export function publicContentPath(input: string): string | null {
  const path =
    (input.startsWith('/') ? input : `/${input}`).replace(/\/+$/, '') || '/';
  if (
    path.length > 180 ||
    !/^\/[a-z0-9а-яё/_-]*$/i.test(path) ||
    path.includes('//')
  )
    return null;
  if (/^\/(?:api|account|admin|login|_next)(?:\/|$)/i.test(path)) return null;
  return path;
}
export function prefersMarkdown(accept: string) {
  const entries = accept
    .toLowerCase()
    .split(',')
    .map((part) => {
      const [type, ...params] = part.trim().split(';');
      const quality = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      const q = quality ? Number(quality.slice(2)) : 1;
      return { type, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
    });
  const markdown = Math.max(
    0,
    ...entries.filter((e) => e.type === 'text/markdown').map((e) => e.q),
  );
  const html = Math.max(
    0,
    ...entries.filter((e) => e.type === 'text/html').map((e) => e.q),
  );
  return markdown > 0 && markdown >= html;
}
export async function publicMarkdown(input: string): Promise<string | null> {
  const path = publicContentPath(input);
  if (!path) return null;
  if (path === '/') {
    const config = await publicSiteConfig();
    return [
      `# ${config.name}`,
      '',
      config.description,
      '',
      '## Public information',
      '- [Catalog](/catalog)',
      '- [AI agent guide](/llms.txt)',
      ...(liteSite.businessType === 'dental'
        ? [
            '',
            'Patients can register or sign in at /login, then create limited agent access in /account. Clinical chat and medical photo storage are not enabled. Appointment availability and payment requirements must be checked live; a request is not a confirmed appointment.',
          ]
        : []),
    ].join('\n');
  }
  if (path === '/catalog') {
    const catalog = await getDb()
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.title))
      .limit(101);
    return [
      '# Catalog',
      '',
      ...catalog.slice(0, 100).map(productMarkdown),
      ...(catalog.length > 100
        ? ['Showing the first 100 items. Use /api/products for the catalog.']
        : []),
    ].join('\n\n');
  }
  if (path.startsWith('/catalog/')) {
    const product = await getDb()
      .select()
      .from(products)
      .where(eq(products.slug, path.slice(9)))
      .get();
    return product?.active ? productMarkdown(product) : null;
  }
  const page = await getDb()
    .select()
    .from(pages)
    .where(eq(pages.slug, path))
    .get();
  if (page) return page.status === 'published' ? pageMarkdown(page) : null;
  const preset =
    liteSite.businessType === 'dental'
      ? litePages().find((p) => p.slug === path)
      : null;
  return preset
    ? `# ${preset.title}\n\n${preset.description}\n\n${preset.text}`
    : null;
}
export async function publicAgentGuide(full = false) {
  const home = await publicMarkdown('/');
  const rows = await getDb()
    .select()
    .from(pages)
    .orderBy(asc(pages.slug))
    .limit(101);
  const presets =
    liteSite.businessType === 'dental' ? litePages().map((p) => p.slug) : [];
  const slugs = [
    ...new Set([
      '/catalog',
      ...presets,
      ...rows
        .slice(0, 100)
        .filter((p) => p.status === 'published')
        .map((p) => p.slug),
    ]),
  ].filter((p) => p !== '/' && publicContentPath(p));
  const visible: { slug: string; markdown: string }[] = [];
  for (const slug of slugs) {
    const row = rows.find((p) => p.slug === slug);
    const markdown = row
      ? row.status === 'published'
        ? pageMarkdown(row)
        : null
      : await publicMarkdown(slug);
    if (markdown !== null) visible.push({ slug, markdown });
  }
  return [
    home,
    '',
    '## Agent connection',
    '- OpenAPI: /api/openapi',
    '- MCP (JSON-RPC over HTTP): /api/mcp',
    '- Markdown: GET /api/content?slug=/path or GET /path with Accept: text/markdown',
    '- Register/sign in in the browser at /login. Patient agent access: /account (short-lived, revocable Bearer token). No automated OAuth connection is provided.',
    '- Patient read access: public pages, active catalog, own appointments. Booking access additionally allows creating, rescheduling, cancelling your appointments and requesting a payment link.',
    '- Inspect tools/list for available tools and scopes. Use get_page_markdown for published content. Do not infer availability from this document.',
    '- Confirm the service, time, price and cancellation with the patient before a write. Payment-link creation does not charge a card; the patient completes hosted checkout separately.',
    '- API access is not permission to store medical data or to administer the site.',
    '',
    '## Public pages',
    ...visible.map((p) =>
      full
        ? `<!-- ${p.slug} -->\n\n${p.markdown}`
        : `- [${p.markdown.split('\n')[0].replace(/^#\s*/, '')}](${p.slug})`,
    ),
    ...(rows.length > 100
      ? [
          'Page index limited to 100 database entries; use /api/content for other known published paths.',
        ]
      : []),
  ].join('\n\n');
}
export async function markdownResponse(input: string, head = false) {
  try {
    const markdown = await publicMarkdown(input);
    return new Response(head ? null : (markdown ?? '# Not found\n'), {
      status: markdown === null ? 404 : 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': 'no-store',
        vary: 'Accept',
      },
    });
  } catch {
    return new Response(head ? null : 'Content temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store', vary: 'Accept' },
    });
  }
}
