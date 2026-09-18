export function GET() { return new Response('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /api/\nSitemap: /sitemap.xml', { headers: { 'content-type': 'text/plain' } }); }
