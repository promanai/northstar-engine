import { validateOpenApi, validatePublicCatalog } from './contract-policy.mjs';
import { validateBuildStamp } from './build-stamp.mjs';

export function smokeTarget(value, allowLocal = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('INVALID_TARGET');
  }
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(allowLocal && local && url.protocol === 'http:')) ||
    (local && !allowLocal)
  )
    throw new Error('INVALID_TARGET');
  return url.origin;
}

export function smokeCredentials(origin, adminOrigin, cookie = '') {
  // An inherited environment secret must never select its destination implicitly.
  if (!adminOrigin && !cookie) return '';
  if (
    adminOrigin !== origin ||
    !/^northstar_session=[A-Za-z0-9_-]{20,256}$/.test(cookie)
  )
    throw new Error('ADMIN_ORIGIN_OR_COOKIE_INVALID');
  return cookie;
}

function requireCheck(condition, code) {
  if (!condition) throw new Error(code);
}

const safeCodes = new Set([
  'REDIRECT_REJECTED',
  'HTTP_STATUS_MISMATCH',
  'CONTENT_TYPE_MISMATCH',
  'BODY_TOO_LARGE',
  'NOT_STANDARD_HEALTH',
  'STANDARD_CONTRACT_MISMATCH',
  'HTML_INVALID',
  'PUBLIC_CATALOG_INVALID',
  'EMPTY_MARKDOWN',
  'DISCOVERY_INVALID',
  'DENIAL_BODY_INVALID',
  'ADMIN_REQUIRED',
  'PRIVATE_CACHE_REQUIRED',
  'OVERVIEW_INVALID',
  'BUILD_MISMATCH',
  'INVALID_BUILD_STAMP',
]);

// Fixed GET-only probes. No login, writes, MCP calls, AI, payment or deployment.
export async function runStandardSmoke({
  url,
  allowLocal = false,
  adminOrigin,
  cookie = '',
  expectedBuild,
  transport = fetch,
}) {
  const origin = smokeTarget(url, allowLocal);
  const credential = smokeCredentials(origin, adminOrigin, cookie);
  const expected =
    expectedBuild === undefined ? undefined : validateBuildStamp(expectedBuild);
  const report = {
    kind: 'standard-http-smoke',
    format: 1,
    origin,
    startedAt: new Date().toISOString(),
    passed: false,
    authenticated: Boolean(credential),
    requests: 0,
    checks: [],
    release: {
      status: expected ? 'not_verified' : 'not_requested',
      ...(expected ? { expected } : {}),
    },
    boundaries: [
      'GET probes only; server logs and read quotas may change',
      'not deployment, migration, backup/restore, R2, paid AI or payment acceptance',
      'no browser or load test; build stamp matching is not cryptographic attestation',
    ],
  };
  const check = async (name, action) => {
    const start = Date.now();
    try {
      await action();
      report.checks.push({
        name,
        status: 'passed',
        durationMs: Date.now() - start,
      });
      return true;
    } catch (error) {
      // Never serialize network exceptions, response bodies/headers or credentials.
      const code =
        error instanceof Error && safeCodes.has(error.message)
          ? error.message
          : 'PROBE_FAILED';
      report.checks.push({
        name,
        status: 'failed',
        code,
        durationMs: Date.now() - start,
      });
      return false;
    }
  };
  const request = async (
    route,
    {
      auth = false,
      headers = {},
      statuses = [200],
      type = 'application/json',
    } = {},
  ) => {
    report.requests++;
    const response = await transport(origin + route, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: {
        accept: type,
        'cache-control': 'no-cache',
        ...headers,
        ...(auth ? { cookie: credential } : {}),
      },
    });
    const reader = response.body?.getReader();
    try {
      requireCheck(
        !response.redirected &&
          !(response.status >= 300 && response.status < 400),
        'REDIRECT_REJECTED',
      );
      requireCheck(statuses.includes(response.status), 'HTTP_STATUS_MISMATCH');
      requireCheck(
        (response.headers.get('content-type') ?? '')
          .toLowerCase()
          .includes(type),
        'CONTENT_TYPE_MISMATCH',
      );
      const parts = [];
      let size = 0;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        requireCheck(size <= 1024 * 1024, 'BODY_TOO_LARGE');
        parts.push(value);
      }
      const body = Buffer.concat(parts).toString('utf8');
      return {
        response,
        value: type === 'application/json' ? JSON.parse(body) : body,
      };
    } finally {
      await reader?.cancel().catch(() => {});
    }
  };
  const health = await check('health', async () => {
    const { value, response } = await request('/api/health');
    requireCheck(
      value.status === 'ok' &&
        value.service === 'northstar-engine' &&
        value.mode !== 'lite',
      'NOT_STANDARD_HEALTH',
    );
    if (expected) {
      report.release.status = 'mismatch';
      const actual = validateBuildStamp(value.build);
      requireCheck(
        response.headers.get('cache-control')?.includes('no-store'),
        'PRIVATE_CACHE_REQUIRED',
      );
      requireCheck(
        ['id', 'version', 'commit'].every((k) => actual[k] === expected[k]),
        'BUILD_MISMATCH',
      );
      report.release.status = 'matched';
    }
  });
  const contract =
    health &&
    (await check('standard-contract', async () => {
      const { value } = await request('/api/openapi');
      requireCheck(
        value['x-engine-mode'] !== 'lite' &&
          validateOpenApi(value).length === 0 &&
          value.paths?.['/overview']?.get &&
          value.paths?.['/tickets']?.get &&
          value.paths?.['/analytics']?.get,
        'STANDARD_CONTRACT_MISMATCH',
      );
    }));
  if (contract) {
    await check('public-home', async () => {
      const { value } = await request('/', { type: 'text/html' });
      requireCheck(
        /<html[\s>]/i.test(value) && /<title>[^<]+<\/title>/i.test(value),
        'HTML_INVALID',
      );
    });
    await check('public-catalog', async () => {
      const { value } = await request('/api/products');
      requireCheck(
        validatePublicCatalog(value).length === 0,
        'PUBLIC_CATALOG_INVALID',
      );
    });
    await check('markdown-content', async () => {
      const { value } = await request('/api/content?slug=%2F', {
        type: 'text/markdown',
      });
      requireCheck(value.trim().length > 0, 'EMPTY_MARKDOWN');
    });
    await check('agent-discovery', async () => {
      const { value } = await request('/llms.txt', { type: 'text/plain' });
      requireCheck(
        ['/api/openapi', '/api/mcp', '/api/content'].every((s) =>
          value.includes(s),
        ),
        'DISCOVERY_INVALID',
      );
    });
    for (const route of [
      '/api/auth/me',
      '/api/overview',
      '/api/tickets',
      '/api/conversations',
      '/api/files',
    ]) {
      await check(`anonymous-denied:${route}`, async () => {
        const { value } = await request(route, { statuses: [401, 403] });
        requireCheck(
          typeof value.error === 'string' &&
            Object.keys(value).every((k) => ['error', 'code'].includes(k)),
          'DENIAL_BODY_INVALID',
        );
      });
    }
    if (credential) {
      const session = await check('administrator-session', async () => {
        const { value, response } = await request('/api/auth/me', {
          auth: true,
        });
        requireCheck(
          ['admin', 'owner'].includes(value.user?.role),
          'ADMIN_REQUIRED',
        );
        requireCheck(
          response.headers.get('cache-control')?.includes('no-store'),
          'PRIVATE_CACHE_REQUIRED',
        );
      });
      if (session) {
        await check('administrator-overview', async () => {
          const { value, response } = await request(
            '/api/overview?period=24h',
            { auth: true },
          );
          requireCheck(
            response.headers.get('cache-control')?.includes('no-store'),
            'PRIVATE_CACHE_REQUIRED',
          );
          requireCheck(
            value.period === '24h' &&
              value.to - value.from === 86400000 &&
              [
                'customers',
                'conversations',
                'orders',
                'bookings',
                'tickets',
                'pendingOrders',
                'openTickets',
                'upcomingBookings',
              ].every(
                (k) =>
                  Number.isSafeInteger(value.summary?.[k]) &&
                  value.summary[k] >= 0,
              ) &&
              Array.isArray(value.recentTickets) &&
              value.recentTickets.length <= 5,
            'OVERVIEW_INVALID',
          );
        });
        await check('foreign-origin-denied', async () => {
          await request('/api/overview', {
            auth: true,
            headers: {
              origin: 'https://smoke-cross-origin.invalid',
              'sec-fetch-site': 'cross-site',
            },
            statuses: [403],
          });
        });
        await check('bearer-fallback-denied', async () => {
          await request('/api/overview', {
            auth: true,
            headers: { authorization: 'Bearer smoke-invalid-token' },
            statuses: [403],
          });
        });
      }
    } else
      report.checks.push({
        name: 'authenticated-probes',
        status: 'skipped',
        code: 'NO_ADMIN_SESSION',
      });
  } else
    report.checks.push({
      name: 'remaining-probes',
      status: 'skipped',
      code: 'STANDARD_GATE_FAILED',
    });
  report.passed = report.checks.every((c) => c.status !== 'failed');
  report.finishedAt = new Date().toISOString();
  return report;
}
