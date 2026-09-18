import { NextResponse } from 'next/server';
import { discardBody } from './lib/security-policy';
import { isLite } from './lib/engine-mode';
import { liteRouting } from './lib/lite-routing';
import { liteSite } from './lib/lite-content';
import { getSessionUser } from './lib/auth';
import { isAdministrator } from './lib/access-policy';
import {
  markdownResponse,
  prefersMarkdown,
  publicContentPath,
} from './lib/public-markdown';

// Browser cookie mutations must originate on this installation. Non-browser
// bearer clients can omit Origin; provider webhooks have their own shared secret.
export async function proxy(request: Request) {
  if (isLite()) return liteRouting(request);
  // OraVera Standard currently enables accounts/appointments only, not a
  // clinical record or stored-photo workflow. Fail closed even if AI is enabled.
  if (liteSite.businessType === 'dental') {
    let path: string;
    try {
      path = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response('Invalid path', { status: 400 });
    }
    if (/^\/api\/(?:chat|files|realtime|leads)(?:\/|$)/.test(path)) {
      await discardBody(request);
      if (
        request.method === 'GET' &&
        ['/api/realtime', '/api/leads'].includes(path.replace(/\/$/, ''))
      )
        return Response.json(
          { enabled: false },
          { headers: { 'cache-control': 'no-store' } },
        );
      return Response.json(
        {
          error:
            'Clinical chat and file storage are not enabled on this installation.',
          code: 'clinical_workflow_disabled',
        },
        { status: 503, headers: { 'cache-control': 'no-store' } },
      );
    }
    if (/^\/(?:account|admin)(?:\/|$)/.test(path)) {
      try {
        const user = await getSessionUser(request);
        if (!user)
          return NextResponse.redirect(
            new URL(
              `/login?next=${encodeURIComponent(path.startsWith('/admin') ? '/admin' : '/account')}`,
              request.url,
            ),
            307,
          );
        if (path.startsWith('/admin') && !isAdministrator(user.role))
          return new Response('Access denied', {
            status: 403,
            headers: { 'cache-control': 'no-store' },
          });
      } catch {
        return new Response(
          'Your account is temporarily unavailable. Please try again.',
          { status: 503, headers: { 'cache-control': 'no-store' } },
        );
      }
      if (['GET', 'HEAD'].includes(request.method)) {
        const response = NextResponse.next();
        response.headers.set('cache-control', 'private, no-store');
        response.headers.set('x-robots-tag', 'noindex, nofollow');
        return response;
      }
    }
  }
  if (['GET', 'HEAD'].includes(request.method)) {
    let path: string;
    try {
      path = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response('Invalid path', { status: 400 });
    }
    if (publicContentPath(path)) {
      if (prefersMarkdown(request.headers.get('accept') || ''))
        return markdownResponse(path, request.method === 'HEAD');
      const response = NextResponse.next();
      response.headers.set('vary', 'Accept, Cookie, Accept-Language');
      return response;
    }
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method))
    return NextResponse.next();
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    // Release the incoming stream on rejected writes, including keep-alive clients.
    await discardBody(request);
    return Response.json(
      { error: 'Межсайтовый запрос запрещён' },
      { status: 403, headers: { 'cache-control': 'no-store' } },
    );
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/|favicon.ico).*)'] };
