import { NextResponse } from 'next/server';
import { isLite } from '@/lib/engine-mode';
import { liteApi } from '@/lib/lite-api';
import {
  liteMarkdown,
  litePages,
  liteProducts,
  liteSite,
} from '@/lib/lite-content';

export async function liteRouting(request: Request) {
  if (!isLite()) return NextResponse.next();
  const path = new URL(request.url).pathname;
  if (/^\/api(?:\/|$)/.test(path)) return liteApi(request);
  if (/^\/(?:admin|account|login)(?:\/|$)/.test(path))
    return NextResponse.redirect(new URL('/', request.url), 307);
  if (path === '/llms.txt' || path === '/llms-full.txt')
    return new Response(
      [
        `# ${liteSite.name}`,
        liteSite.description,
        'Public catalog and read-only MCP. No accounts, payments, booking or saved conversations. An optional consented lead form may be available: GET /api/leads reports availability; submitting a lead is not a booking or purchase.',
        '- OpenAPI: /api/openapi',
        '- MCP (public read-only): /api/mcp',
        '- Markdown: /api/content?slug=/',
        ...litePages().map((p) => `- [${p.title}](${p.slug})`),
        liteMarkdown('/catalog'),
        ...(path === '/llms-full.txt'
          ? litePages().map((p) => liteMarkdown(p.slug))
          : []),
      ].join('\n\n'),
      { headers: { 'content-type': 'text/markdown; charset=utf-8' } },
    );
  if (path === '/sitemap.xml') {
    const escape = (text: string) =>
      text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('"', '&quot;');
    const paths = [
      '/',
      '/catalog',
      ...litePages().map((p) => p.slug),
      ...liteProducts().map((p) => `/catalog/${p.slug}`),
    ];
    return new Response(
      `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(new URL(p, request.url).href)}</loc></url>`).join('')}</urlset>`,
      { headers: { 'content-type': 'application/xml' } },
    );
  }
  if (request.headers.get('accept')?.includes('text/markdown')) {
    const text = liteMarkdown(path);
    if (text !== null)
      return new Response(text, {
        headers: {
          'content-type': 'text/markdown; charset=utf-8',
          vary: 'Accept',
        },
      });
  }
  return NextResponse.next();
}
