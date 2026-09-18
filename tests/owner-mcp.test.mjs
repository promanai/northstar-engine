import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBase64Url,
  fromBase64Url,
  signOwnerTokenPayload,
  verifyOwnerToken,
  createOwnerCapabilityToken,
  ownerHasScope,
  resolveOwnerPrincipal,
} from '../lib/owner-mcp-policy.ts';
import {
  OWNER_MCP_TOOLS,
  getVisibleOwnerTools,
  executeOwnerTool,
} from '../lib/owner-mcp-tools.ts';

void test('Base64Url roundtrip encoding and decoding handles binary bytes accurately', () => {
  const original = new Uint8Array([0, 1, 2, 255, 254, 128, 64, 32]);
  const encoded = toBase64Url(original);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  const decoded = fromBase64Url(encoded);
  assert.deepEqual(decoded, original);
});

void test('Owner capability token minting, HMAC verification, expiration and tampering checks', async () => {
  const secret = 'test-owner-secret-key-32-bytes-long!';
  const wrongSecret = 'another-secret-key-that-does-not-match';

  const { token, payload } = await createOwnerCapabilityToken({
    secret,
    siteId: 'aisites',
    ownerId: 'owner_user_1',
    agentName: 'Codex Agent',
    scopes: ['site:read', 'content:read'],
    expiresInDays: 7,
  });

  assert.ok(token.startsWith('nsk_owner_'));
  assert.equal(payload.siteId, 'aisites');
  assert.equal(payload.agentName, 'Codex Agent');
  assert.deepEqual(payload.scopes, ['site:read', 'content:read']);

  // Valid verification
  const verified = await verifyOwnerToken(token, secret);
  assert.ok(verified);
  assert.equal(verified?.jti, payload.jti);
  assert.equal(verified?.agentName, 'Codex Agent');

  // Wrong secret fails verification
  const invalidSecretResult = await verifyOwnerToken(token, wrongSecret);
  assert.equal(invalidSecretResult, null);

  // Tampered payload fails verification
  const parts = token.slice('nsk_owner_'.length).split('.');
  const tamperedPayloadB64 = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, scopes: ['*'] })),
  );
  const tamperedToken = `nsk_owner_${tamperedPayloadB64}.${parts[1]}`;
  const tamperedResult = await verifyOwnerToken(tamperedToken, secret);
  assert.equal(tamperedResult, null);

  // Tampered signature fails verification
  const badSigToken = `${token}bad`;
  const badSigResult = await verifyOwnerToken(badSigToken, secret);
  assert.equal(badSigResult, null);

  // Expired token fails verification
  const now = Math.floor(Date.now() / 1000);
  const expiredPayload = {
    ...payload,
    jti: 'tkn_expired_1',
    exp: now - 3600, // 1 hour ago
  };
  const expiredToken = await signOwnerTokenPayload(expiredPayload, secret);
  const expiredResult = await verifyOwnerToken(expiredToken, secret);
  assert.equal(expiredResult, null);

  // Revocation list check
  const revokedResult = await verifyOwnerToken(token, secret, {
    revokedJtis: [payload.jti],
  });
  assert.equal(revokedResult, null);
});

void test('resolveOwnerPrincipal authenticates via direct admin token or signed capability token', async () => {
  const secret = 'super-secret-mcp-key';
  const adminSecret = 'initial-admin-token-12345';

  // 1. Missing or malformed auth header
  assert.equal(await resolveOwnerPrincipal({ authHeader: null, secret }), null);
  assert.equal(
    await resolveOwnerPrincipal({ authHeader: 'Basic 12345', secret }),
    null,
  );

  // 2. Direct Admin Token authentication
  const adminPrincipal = await resolveOwnerPrincipal({
    authHeader: `Bearer ${adminSecret}`,
    secret,
    adminSecrets: [adminSecret],
  });
  assert.ok(adminPrincipal);
  assert.equal(adminPrincipal?.agentName, 'Root Admin');
  assert.deepEqual(adminPrincipal?.scopes, ['*']);
  assert.equal(adminPrincipal?.siteId, '*');

  // 3. Signed Capability Token authentication
  const { token, payload } = await createOwnerCapabilityToken({
    secret,
    siteId: 'aisites',
    agentName: 'Antigravity Agent',
    scopes: ['site:read'],
  });

  const agentPrincipal = await resolveOwnerPrincipal({
    authHeader: `Bearer ${token}`,
    secret,
    adminSecrets: [adminSecret],
  });
  assert.ok(agentPrincipal);
  assert.equal(agentPrincipal?.id, payload.jti);
  assert.equal(agentPrincipal?.agentName, 'Antigravity Agent');
  assert.deepEqual(agentPrincipal?.scopes, ['site:read']);
  assert.equal(agentPrincipal?.siteId, 'aisites');

  // 4. Unknown Bearer token
  assert.equal(
    await resolveOwnerPrincipal({
      authHeader: 'Bearer unknown-random-token',
      secret,
      adminSecrets: [adminSecret],
    }),
    null,
  );
});

void test('ownerHasScope validates wildcard and individual scope boundaries', () => {
  assert.equal(ownerHasScope(['*'], 'site:read'), true);
  assert.equal(ownerHasScope(['*'], 'content:write'), true);
  assert.equal(ownerHasScope(['site:read'], 'site:read'), true);
  assert.equal(ownerHasScope(['site:read'], 'content:read'), false);
  assert.equal(ownerHasScope(['content:read'], 'site:read'), false);
});

void test('getVisibleOwnerTools filters tools based on principal scopes', () => {
  const fullPrincipal = {
    id: 'p1',
    ownerId: 'o1',
    agentName: 'Full',
    scopes: ['*'],
    siteId: 'aisites',
    role: 'owner',
    expiresAt: null,
  };
  const readOnlySitePrincipal = {
    id: 'p2',
    ownerId: 'o2',
    agentName: 'SiteReader',
    scopes: ['site:read'],
    siteId: 'aisites',
    role: 'owner',
    expiresAt: null,
  };
  const contentOnlyPrincipal = {
    id: 'p3',
    ownerId: 'o3',
    agentName: 'ContentReader',
    scopes: ['content:read'],
    siteId: 'aisites',
    role: 'owner',
    expiresAt: null,
  };

  assert.equal(
    getVisibleOwnerTools(fullPrincipal).length,
    OWNER_MCP_TOOLS.length,
  );

  const siteTools = getVisibleOwnerTools(readOnlySitePrincipal);
  assert.ok(siteTools.some((t) => t.name === 'site.get_status'));
  assert.ok(siteTools.some((t) => t.name === 'site.get_config'));
  assert.ok(!siteTools.some((t) => t.name === 'site.get_page'));

  const contentTools = getVisibleOwnerTools(contentOnlyPrincipal);
  assert.ok(contentTools.some((t) => t.name === 'site.list_pages'));
  assert.ok(contentTools.some((t) => t.name === 'site.get_page'));
  assert.ok(contentTools.some((t) => t.name === 'content.get_locales'));
  assert.ok(!contentTools.some((t) => t.name === 'site.get_config'));
});

void test('executeOwnerTool executes Phase 1 read tools successfully with correct permissions', () => {
  const principal = {
    id: 'p_test',
    ownerId: 'owner_1',
    agentName: 'TestAgent',
    scopes: ['*'],
    siteId: 'aisites',
    role: 'owner',
    expiresAt: null,
  };

  const context = {
    mode: 'lite',
    commitSha: 'd5a268a',
    repository: 'https://github.com/promanai/northstar-engine',
  };

  // 1. northstar.capabilities
  const capResult = executeOwnerTool(
    'northstar.capabilities',
    {},
    principal,
    context,
  );
  assert.equal(capResult.isError, undefined);
  const capData = JSON.parse(capResult.content[0].text);
  assert.equal(capData.engine, 'northstar-engine');
  assert.equal(capData.mode, 'lite');
  assert.equal(capData.protocolVersion, '2026-07-28');
  assert.equal(capData.storage, 'none');
  assert.equal(capData.gitBacked, true);

  // 2. site.get_status
  const statusResult = executeOwnerTool('site.get_status', {}, principal, context);
  assert.equal(statusResult.isError, undefined);
  const statusData = JSON.parse(statusResult.content[0].text);
  assert.equal(statusData.status, 'healthy');
  assert.equal(statusData.mode, 'lite');
  assert.equal(statusData.commitSha, 'd5a268a');

  // 3. site.get_config
  const configResult = executeOwnerTool('site.get_config', {}, principal, context);
  assert.equal(configResult.isError, undefined);
  const configData = JSON.parse(configResult.content[0].text);
  assert.ok(configData.name);
  assert.ok(configData.theme);

  // 4. site.list_pages
  const listPagesResult = executeOwnerTool(
    'site.list_pages',
    {},
    principal,
    context,
  );
  assert.equal(listPagesResult.isError, undefined);
  const pagesData = JSON.parse(listPagesResult.content[0].text);
  assert.ok(Array.isArray(pagesData.pages));
  assert.ok(pagesData.pages.some((p) => p.slug === '/'));

  // 5. site.get_page (root /)
  const homePageResult = executeOwnerTool(
    'site.get_page',
    { slug: '/' },
    principal,
    context,
  );
  assert.equal(homePageResult.isError, undefined);
  const homePageData = JSON.parse(homePageResult.content[0].text);
  assert.equal(homePageData.slug, '/');
  assert.ok(homePageData.markdown.includes('# '));

  // 6. site.get_page (about /about)
  const aboutPageResult = executeOwnerTool(
    'site.get_page',
    { slug: '/about' },
    principal,
    context,
  );
  assert.equal(aboutPageResult.isError, undefined);
  const aboutPageData = JSON.parse(aboutPageResult.content[0].text);
  assert.equal(aboutPageData.slug, '/about');
  assert.ok(aboutPageData.markdown.length > 0);

  // 7. site.get_page missing page
  const missingPageResult = executeOwnerTool(
    'site.get_page',
    { slug: '/non-existent-page-xyz' },
    principal,
    context,
  );
  assert.equal(missingPageResult.isError, true);
  assert.match(missingPageResult.content[0].text, /Page not found/);

  // 8. site.get_page missing slug arg
  const noSlugResult = executeOwnerTool('site.get_page', {}, principal, context);
  assert.equal(noSlugResult.isError, true);
  assert.match(noSlugResult.content[0].text, /Missing required argument/);

  // 9. content.get_locales
  const localesResult = executeOwnerTool(
    'content.get_locales',
    {},
    principal,
    context,
  );
  assert.equal(localesResult.isError, undefined);
  const localesData = JSON.parse(localesResult.content[0].text);
  assert.ok(Array.isArray(localesData.supportedLocales));
  assert.ok(localesData.supportedLocales.includes('ru'));
  assert.ok(localesData.supportedLocales.includes('en'));

  // 10. Permission denied when missing scope
  const limitedPrincipal = {
    id: 'p_limited',
    ownerId: 'owner_1',
    agentName: 'LimitedAgent',
    scopes: ['content:read'],
    siteId: 'aisites',
    role: 'owner',
    expiresAt: null,
  };
  const deniedResult = executeOwnerTool(
    'site.get_config',
    {},
    limitedPrincipal,
    context,
  );
  assert.equal(deniedResult.isError, true);
  assert.match(deniedResult.content[0].text, /Permission denied/);

  // 11. Unknown tool
  const unknownResult = executeOwnerTool('unknown.tool', {}, principal, context);
  assert.equal(unknownResult.isError, true);
  assert.match(unknownResult.content[0].text, /Unknown tool/);
});
