import test from 'node:test';
import assert from 'node:assert/strict';
import { liteLeads, liteLeadStatus, validateLead } from '../lib/lite-leads.ts';

const setup = () => ({
  LITE_LEADS_ENABLED: 'true',
  LITE_LEAD_WEBHOOK_URL: 'https://receiver.example.com/leads',
  LITE_LEAD_WEBHOOK_TOKEN: 'a'.repeat(40),
  LITE_LEAD_RECIPIENT: 'Synthetic Receiver',
  LITE_LEAD_PRIVACY_PATH: '/privacy',
  LITE_LEAD_LIMITER: { limit: async () => ({ success: true }) },
});
const lead = async (env = setup()) => ({
  id: crypto.randomUUID(),
  name: ' Test ',
  contact: 'test@example.com',
  message: 'Synthetic request\nNo personal data',
  consent: true,
  configurationId: (await liteLeadStatus(env)).configurationId,
});
function request(body, headers = {}) {
  return new Request('https://site.example.com/api/leads', {
    method: 'POST',
    headers: {
      origin: 'https://site.example.com',
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const never = async () => {
  assert.fail('Unexpected outbound request');
};
const accepted = async (_url, options) =>
  Response.json({ accepted: true, id: JSON.parse(options.body).id });

test('Lite lead capability fails closed and never exposes receiver credentials', async () => {
  assert.deepEqual(await liteLeadStatus({}), { enabled: false });
  for (const key of Object.keys(setup())) {
    const env = setup();
    delete env[key];
    assert.deepEqual(await liteLeadStatus(env), { enabled: false }, key);
  }
  for (const url of [
    'http://receiver.example.com',
    'https://127.0.0.1',
    'https://[::1]',
    'https://localhost',
    'https://foo.internal',
    'https://foo.local',
    'https://foo.test',
    'https://a:b@receiver.example.com',
    'https://receiver.example.com?secret=1',
    'https://receiver.example.com#x',
    'https://receiver.example.com:444',
  ]) {
    assert.equal(
      (await liteLeadStatus({ ...setup(), LITE_LEAD_WEBHOOK_URL: url }))
        .enabled,
      false,
      url,
    );
  }
  const status = await liteLeadStatus(setup());
  assert.equal(status.enabled, true);
  assert.match(status.configurationId, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(
    JSON.stringify(status),
    /receiver\.example|aaaaa|WEBHOOK/,
  );
});

test('Lite lead strict schema requires explicit consent and bounded contact fields', async () => {
  const valid = await lead();
  assert.equal(validateLead(valid).name, 'Test');
  assert.equal(
    validateLead({ ...valid, contact: '+1 (234) 567-8901' }).contact,
    '+1 (234) 567-8901',
  );
  for (const invalid of [
    null,
    [],
    {},
    { ...valid, consent: false },
    { ...valid, history: [] },
    { ...valid, contact: '123' },
    { ...valid, contact: 'not email' },
    { ...valid, name: '\nTest' },
    { ...valid, name: 'a'.repeat(121) },
    { ...valid, message: 'a'.repeat(4001) },
    { ...valid, id: 'not-uuid' },
  ]) {
    assert.throws(() => validateLead(invalid));
    assert.equal(
      (await liteLeads(request(invalid), setup(), never)).status,
      400,
    );
  }
});

test('Lite leads reject cross origin, bearer, wrong content type and disabled mode before transport', async () => {
  const body = await lead();
  for (const headers of [
    { origin: 'https://evil.example' },
    { origin: '' },
    { authorization: 'Bearer user-token' },
    { 'sec-fetch-site': 'cross-site' },
  ]) {
    assert.equal(
      (await liteLeads(request(body, headers), setup(), never)).status,
      403,
    );
  }
  assert.equal(
    (
      await liteLeads(
        request(body, { 'content-type': 'text/plain' }),
        setup(),
        never,
      )
    ).status,
    415,
  );
  assert.equal((await liteLeads(request(body), {}, never)).status, 503);
  assert.equal(
    (
      await liteLeads(
        new Request('https://site.example.com/api/leads', { method: 'DELETE' }),
        setup(),
        never,
      )
    ).status,
    405,
  );
});

test('Lite lead receiver configuration and token changes invalidate old consent', async () => {
  const body = await lead();
  for (const change of [
    { LITE_LEAD_RECIPIENT: 'Another Receiver' },
    { LITE_LEAD_PRIVACY_PATH: '/other-privacy' },
    { LITE_LEAD_WEBHOOK_TOKEN: 'b'.repeat(40) },
    { LITE_LEAD_WEBHOOK_URL: 'https://other.example.com/leads' },
  ]) {
    const r = await liteLeads(request(body), { ...setup(), ...change }, never);
    assert.equal(r.status, 409);
    assert.equal((await r.json()).delivery, 'not_sent');
  }
});

test('Lite lead rate limiter fails closed', async () => {
  const body = await lead();
  const denied = await liteLeads(
    request(body),
    {
      ...setup(),
      LITE_LEAD_LIMITER: { limit: async () => ({ success: false }) },
    },
    never,
  );
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('retry-after'), '60');
  assert.equal(
    (
      await liteLeads(
        request(body),
        {
          ...setup(),
          LITE_LEAD_LIMITER: {
            limit: async () => {
              throw new Error('private');
            },
          },
        },
        never,
      )
    ).status,
    503,
  );
});

test('Lite leads forward only explicit fields and stable idempotency key, without cookies or history', async () => {
  const body = await lead();
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    return accepted(url, options);
  };
  for (let i = 0; i < 2; i++) {
    const r = await liteLeads(
      request(body, {
        cookie: 'secret=private',
        'cf-connecting-ip': '192.0.2.5',
      }),
      setup(),
      transport,
    );
    assert.equal(r.status, 202);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('set-cookie'), null);
    assert.deepEqual(await r.json(), {
      accepted: true,
      id: body.id,
      delivery: 'accepted',
    });
  }
  assert.equal(calls.length, 2); // Explicit retries, not local exactly-once storage.
  assert.equal(calls[0].options.body, calls[1].options.body);
  const { url, options } = calls[0];
  assert.equal(url, setup().LITE_LEAD_WEBHOOK_URL);
  assert.equal(options.redirect, 'manual');
  assert.deepEqual(options.headers, {
    'content-type': 'application/json',
    authorization: 'Bearer ' + setup().LITE_LEAD_WEBHOOK_TOKEN,
    'idempotency-key': body.id,
  });
  assert.deepEqual(JSON.parse(options.body), {
    version: 1,
    id: body.id,
    name: 'Test',
    contact: body.contact,
    message: body.message,
    consent: true,
    recipient: 'Synthetic Receiver',
    privacyPath: '/privacy',
  });
});

test('Lite leads do not retry or claim success after failed or ambiguous acknowledgments', async () => {
  const body = await lead();
  for (const outcome of [
    () => new Response(null, { status: 204 }),
    () => new Response('private', { status: 500 }),
    () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example' },
      }),
    () => Response.json({ accepted: true, id: 'wrong' }),
    () => Response.json({ accepted: false, id: body.id }),
    () => new Response('x'.repeat(4097)),
    () => {
      throw new Error('receiver-secret-private');
    },
  ]) {
    let calls = 0;
    const r = await liteLeads(request(body), setup(), async () => {
      calls++;
      return outcome();
    });
    assert.equal(calls, 1);
    assert.equal(r.status, 502);
    const result = await r.json();
    assert.equal(result.delivery, 'unknown');
    assert.equal(result.id, body.id);
    assert.doesNotMatch(JSON.stringify(result), /private|receiver-secret|evil/);
  }
});

test('Lite leads bound request bytes, including streamed UTF8 bodies', async () => {
  for (const body of [
    '{',
    ' '.repeat(16385),
    JSON.stringify({ ...(await lead()), message: '😀'.repeat(4000) }),
  ]) {
    assert.equal((await liteLeads(request(body), setup(), never)).status, 400);
  }
});
