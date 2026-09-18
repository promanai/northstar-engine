import { publicAgentGuide } from '@/lib/public-markdown';
export async function GET() {
  try {
    return new Response(await publicAgentGuide(), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response('Content temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
