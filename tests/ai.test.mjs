import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProfile,
  modelCapabilities,
  validateConfig,
  validateProfile,
} from '../lib/ai-policy.ts';
import {
  generateResponse,
  listProviderModels,
  responsePayload,
  AiFailure,
} from '../lib/ai-provider.ts';

const completed = {
  status: 'completed',
  output: [
    {
      type: 'reasoning',
      summary: [{ type: 'summary_text', text: 'PRIVATE REASONING' }],
    },
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'output_text', text: 'not assistant' }],
    },
    {
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'output_text', text: 'Hello' },
        { type: 'output_text', text: 'world' },
      ],
    },
  ],
  usage: {
    input_tokens: 20,
    output_tokens: 40,
    output_tokens_details: { reasoning_tokens: 25 },
    private: 'must not escape',
  },
};

void test('profiles validate types, boundaries and reject credentials/unknown tasks', () => {
  const p = defaultProfile();
  assert.deepEqual(validateProfile(p), p);
  for (const patch of [
    { provider: 'constructor' },
    { enabled: 'yes' },
    { model: '../token' },
    { reasoning: 'max' },
    { temperature: NaN },
    { maxOutputTokens: 0 },
    { maxOutputTokens: 32769 },
    { timeoutSeconds: 121 },
    { timeoutSeconds: '30' },
    { apiKey: 'SECRET' },
    { baseUrl: 'https://attacker.invalid' },
  ])
    assert.throws(() => validateProfile({ ...p, ...patch }));
  assert.throws(() => validateConfig({ chat: p }));
  assert.throws(() => validateConfig({ chat: p, text: p, audio: p }));
  assert.deepEqual(validateConfig({ chat: p, text: p }), { chat: p, text: p });
});
void test('documented reasoning matrix prevents unsupported model parameters', () => {
  assert.deepEqual(modelCapabilities('xai', 'grok-4.6').efforts, [
    'auto',
    'low',
    'medium',
    'high',
    'xhigh',
  ]);
  assert.equal(
    modelCapabilities('xai', 'grok-4.5').efforts.includes('xhigh'),
    false,
  );
  assert.equal(
    modelCapabilities('openai', 'gpt-6-astra').efforts.includes('none'),
    false,
  );
  assert.equal(
    modelCapabilities('openai', 'gpt-5.6-luna').efforts.includes('none'),
    true,
  );
  assert.equal(modelCapabilities('openai', 'gpt-4.1-mini').temperature, true);
  assert.equal(
    modelCapabilities('openai', 'gpt-4o-realtime-preview').temperature,
    false,
  );
  assert.deepEqual(modelCapabilities('xai', 'new-unknown-model').efforts, [
    'auto',
  ]);
  assert.throws(() =>
    validateProfile({
      ...defaultProfile(),
      model: 'gpt-6-astra',
      temperature: 0.4,
    }),
  );
});
void test('Responses payload omits auto parameters and opts out of response storage', () => {
  const p = defaultProfile();
  const input = [
    { role: 'system', content: 'BUSINESS' },
    { role: 'assistant', content: 'history' },
    { role: 'user', content: 'question' },
  ];
  assert.deepEqual(responsePayload(p, input), {
    model: p.model,
    input,
    store: false,
    max_output_tokens: 4096,
  });
  assert.deepEqual(
    responsePayload({ ...p, model: 'gpt-6-astra', reasoning: 'high' }, input)
      .reasoning,
    { effort: 'high' },
  );
  assert.equal(responsePayload({ ...p, temperature: 0 }, input).temperature, 0);
});
for (const provider of ['openai', 'xai'])
  void test(`${provider}: fixed endpoint/auth, history and only visible assistant output`, async () => {
    const p = {
      ...defaultProfile(provider),
      reasoning: provider === 'xai' ? 'low' : 'auto',
    };
    let calls = 0;
    const result = await generateResponse(
      p,
      'test-fixture-key',
      [{ role: 'user', content: 'Question' }],
      async (url, init) => {
        calls++;
        assert.equal(
          url,
          provider === 'xai'
            ? 'https://api.x.ai/v1/responses'
            : 'https://api.openai.com/v1/responses',
        );
        assert.equal(init.headers.authorization, 'Bearer test-fixture-key');
        assert.equal(init.redirect, 'manual');
        assert.equal(init.method, 'POST');
        assert.ok(init.signal instanceof AbortSignal);
        assert.equal(JSON.parse(init.body).input[0].content, 'Question');
        return Response.json(completed);
      },
    );
    assert.equal(calls, 1);
    assert.deepEqual(result, {
      text: 'Hello\nworld',
      model: p.model,
      provider,
      usage: { inputTokens: 20, outputTokens: 40, reasoningTokens: 25 },
    });
  });
void test('missing key fails before network; no provider failover or paid retries', async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json(completed);
  };
  await assert.rejects(
    generateResponse(defaultProfile(), '', [], transport),
    (e) => e instanceof AiFailure && e.code === 'not_configured',
  );
  assert.equal(calls, 0);
  for (const [status, code] of [
    [401, 'credentials'],
    [403, 'credentials'],
    [429, 'quota'],
    [400, 'configuration'],
    [404, 'configuration'],
    [500, 'unavailable'],
    [302, 'unavailable'],
  ]) {
    calls = 0;
    await assert.rejects(
      generateResponse(defaultProfile(), 'key', [], async () => {
        calls++;
        return Response.json({ error: 'SECRET FROM PROVIDER' }, { status });
      }),
      (e) =>
        e instanceof AiFailure &&
        e.code === code &&
        !e.message.includes('SECRET'),
    );
    assert.equal(calls, 1);
  }
});
void test('incomplete, malformed, oversized and reasoning-only responses are not successful chat replies', async () => {
  for (const body of [
    { ...completed, status: 'incomplete' },
    { ...completed, error: { message: 'SECRET' } },
    { status: 'completed', output: [] },
    { status: 'completed', output: [completed.output[0]] },
    {},
    { ...completed, status: 'in_progress' },
  ])
    await assert.rejects(
      generateResponse(defaultProfile(), 'key', [], async () =>
        Response.json(body),
      ),
      AiFailure,
    );
  await assert.rejects(
    generateResponse(
      defaultProfile(),
      'key',
      [],
      async () => new Response('{bad json with SECRET'),
    ),
    (e) => !e.message.includes('SECRET'),
  );
  await assert.rejects(
    generateResponse(
      defaultProfile(),
      'key',
      [],
      async () => new Response('x'.repeat(2_000_001)),
    ),
    (e) => e.code === 'invalid_response',
  );
  await assert.rejects(
    generateResponse(defaultProfile(), 'key', [], async () => {
      throw new DOMException('SECRET', 'TimeoutError');
    }),
    (e) => e.code === 'timeout' && !e.message.includes('SECRET'),
  );
});
void test('model discovery validates data and never exposes arbitrary provider metadata', async () => {
  const models = await listProviderModels('xai', 'key', async (url, init) => {
    assert.equal(url, 'https://api.x.ai/v1/models');
    assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined);
    return Response.json({
      data: [
        { id: 'grok-4.6', secret: 'hidden' },
        { id: 'grok-4.5' },
        { id: 'grok-4.6' },
        { id: '<script>' },
        { id: 1 },
        null,
      ],
    });
  });
  assert.deepEqual(models, ['grok-4.5', 'grok-4.6']);
  await assert.rejects(
    listProviderModels('openai', 'key', async () =>
      Response.json({ unexpected: [] }),
    ),
    AiFailure,
  );
});
