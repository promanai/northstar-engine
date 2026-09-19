import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  defaultProfile,
  modelCapabilities,
  suggestedModels,
  validateConfig,
  validateProfile,
} from '../lib/ai-policy.ts';
import {
  generateResponse,
  getProviderAdapter,
  listProviderModels,
  listSupportedProviders,
  testProviderConnection,
  AiFailure,
} from '../lib/ai-provider.ts';
import { createBuildStamp } from '../scripts/build-stamp.mjs';

const mockPromanOSChatResponse = {
  id: 'chatcmpl-pm-test-12345',
  object: 'chat.completion',
  created: 1711000000,
  model: 'pro-1',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Здравствуйте! Я ассистент клиники OraVera.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 15,
    completion_tokens: 28,
    total_tokens: 43,
    prompt_tokens_details: { cached_tokens: 4 },
    completion_tokens_details: { reasoning_tokens: 10 },
  },
  cost: {
    currency: 'USD',
    total: 0.00015,
  },
};

void test('PromanOS provider registration and capabilities in registry', () => {
  const providers = listSupportedProviders();
  assert.ok(providers.includes('promanos'), 'promanos must be in supported providers');
  assert.ok(providers.includes('openai'), 'openai must be in supported providers');
  assert.ok(providers.includes('xai'), 'xai must be in supported providers');

  const adapter = getProviderAdapter('promanos');
  assert.equal(adapter.id, 'promanos');
  assert.equal(adapter.name, 'PromanOS');
  assert.equal(adapter.defaultBaseUrl, 'https://api.promanos.com/v1');

  const caps = adapter.getCapabilities();
  assert.equal(caps.text, 'supported');
  assert.equal(caps.streaming, 'supported');
  assert.equal(caps.vision, 'supported');
  assert.equal(caps.audio_input, 'supported');
  assert.equal(caps.files, 'supported');
  assert.equal(caps.realtime_voice, 'supported');
  assert.equal(caps.models, 'supported');

  assert.deepEqual(suggestedModels.promanos, ['pro-1']);
});

void test('PromanOS profile validation and capabilities matrix', () => {
  const p = defaultProfile('promanos');
  assert.equal(p.provider, 'promanos');
  assert.equal(p.model, 'pro-1');

  const caps = modelCapabilities('promanos', 'pro-1');
  assert.equal(caps.temperature, true);
  assert.ok(caps.efforts.includes('none'));
  assert.ok(caps.efforts.includes('low'));
  assert.ok(caps.efforts.includes('medium'));
  assert.ok(caps.efforts.includes('high'));

  const validated = validateProfile({
    ...p,
    enabled: true,
    reasoning: 'medium',
    temperature: 0.7,
    maxOutputTokens: 2048,
    timeoutSeconds: 45,
    fallbackEnabled: true,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  });

  assert.equal(validated.provider, 'promanos');
  assert.equal(validated.fallbackEnabled, true);
  assert.equal(validated.fallbackProvider, 'openai');
  assert.equal(validated.fallbackModel, 'gpt-4o-mini');
});

void test('PromanOS missing key fails before network', async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json(mockPromanOSChatResponse);
  };

  const p = defaultProfile('promanos');
  await assert.rejects(
    generateResponse(p, '', [{ role: 'user', content: 'Привет' }], transport),
    (e) => e instanceof AiFailure && e.code === 'not_configured',
  );
  assert.equal(calls, 0);

  await assert.rejects(
    listProviderModels('promanos', undefined, transport),
    (e) => e instanceof AiFailure && e.code === 'not_configured',
  );
  assert.equal(calls, 0);

  const testConn = await testProviderConnection('promanos', undefined, transport);
  assert.equal(testConn.ok, false);
  assert.equal(testConn.status, 'not_configured');
  assert.equal(calls, 0);
});

void test('PromanOS models discovery parses dynamic catalog and deduplicates', async () => {
  let requestedUrl = '';
  let authHeader = '';
  let userAgent = '';
  let redirect = '';

  const transport = async (url, init) => {
    requestedUrl = url;
    authHeader = init.headers.authorization;
    userAgent = init.headers['user-agent'];
    redirect = init.redirect;

    return Response.json({
      object: 'list',
      data: [
        { id: 'pro-1' },
        { id: 'pro-1-2026-03-01' },
        { id: 'pro-1' }, // duplicate
        { id: 'invalid space id' },
        { id: '<script>alert(1)</script>' },
        { not_id: 'missing' },
      ],
    });
  };

  const models = await listProviderModels('promanos', 'pm-test-key-123', transport);
  assert.equal(requestedUrl, 'https://api.promanos.com/v1/models');
  assert.equal(authHeader, 'Bearer pm-test-key-123');
  assert.ok(userAgent.includes('Northstar-Engine'));
  assert.equal(redirect, 'manual');

  assert.deepEqual(models, ['pro-1', 'pro-1-2026-03-01']);
});

void test('PromanOS generateResponse sends OpenAI-compatible payload and parses metadata', async () => {
  let calledUrl = '';
  let bodyJson = null;

  const transport = async (url, init) => {
    calledUrl = url;
    bodyJson = JSON.parse(init.body);
    assert.equal(init.headers.authorization, 'Bearer pm-valid-key');
    assert.equal(init.headers['content-type'], 'application/json');
    assert.equal(init.redirect, 'manual');
    return Response.json(mockPromanOSChatResponse);
  };

  const profile = {
    ...defaultProfile('promanos'),
    model: 'pro-1',
    temperature: 0.5,
    maxOutputTokens: 1024,
  };

  const res = await generateResponse(
    profile,
    'pm-valid-key',
    [
      { role: 'system', content: 'Ты ассистент' },
      { role: 'user', content: 'Привет' },
    ],
    transport,
  );

  assert.equal(calledUrl, 'https://api.promanos.com/v1/chat/completions');
  assert.equal(bodyJson.model, 'pro-1');
  assert.equal(bodyJson.messages.length, 2);
  assert.equal(bodyJson.temperature, 0.5);
  assert.equal(bodyJson.max_tokens, 1024);

  assert.equal(res.text, 'Здравствуйте! Я ассистент клиники OraVera.');
  assert.equal(res.provider, 'promanos');
  assert.equal(res.model, 'pro-1');
  assert.equal(res.usage?.inputTokens, 15);
  assert.equal(res.usage?.outputTokens, 28);
  assert.equal(res.usage?.cachedTokens, 4);
  assert.equal(res.usage?.reasoningTokens, 10);
  assert.equal(res.providerMetadata?.requestId, 'chatcmpl-pm-test-12345');
  assert.deepEqual(res.providerMetadata?.cost, { currency: 'USD', total: 0.00015 });
});

void test('PromanOS error mapping: credentials, balance, quota, configuration, unavailable, capability_unavailable', async () => {
  const errorCases = [
    [401, 'credentials'],
    [403, 'credentials'],
    [402, 'balance'],
    [429, 'quota'],
    [400, 'configuration'],
    [404, 'configuration'],
    [422, 'configuration'],
    [501, 'capability_unavailable'],
    [500, 'unavailable'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [302, 'unavailable'],
  ];

  for (const [status, expectedCode] of errorCases) {
    const transport = async () => Response.json({ error: { message: 'SECRET' } }, { status });
    await assert.rejects(
      generateResponse(defaultProfile('promanos'), 'pm-key', [], transport),
      (e) => e instanceof AiFailure && e.code === expectedCode,
      `Status ${status} should map to ${expectedCode}`,
    );
  }
});

void test('Backward compatibility: existing OpenAI configuration remains OpenAI after upgrade', () => {
  // Simulate saved config from an existing site running on OpenAI before multi-provider layer
  const existingOpenAiConfig = {
    chat: {
      enabled: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      reasoning: 'auto',
      temperature: null,
      maxOutputTokens: 4096,
      timeoutSeconds: 60,
    },
    text: {
      enabled: false,
      provider: 'openai',
      model: 'gpt-4o-mini',
      reasoning: 'auto',
      temperature: null,
      maxOutputTokens: 4096,
      timeoutSeconds: 60,
    },
  };

  const validated = validateConfig(existingOpenAiConfig);
  assert.equal(validated.chat.provider, 'openai', 'Chat provider must remain openai');
  assert.equal(validated.chat.model, 'gpt-4o-mini');
  assert.equal(validated.chat.enabled, true);
  assert.equal(validated.chat.fallbackEnabled, false);
  assert.equal(validated.text.provider, 'openai');
});

void test('Backward compatibility: existing xAI configuration remains xAI after upgrade', () => {
  const existingXaiConfig = {
    chat: {
      enabled: true,
      provider: 'xai',
      model: 'grok-4.6',
      reasoning: 'low',
      temperature: null,
      maxOutputTokens: 4096,
      timeoutSeconds: 60,
    },
    text: {
      enabled: false,
      provider: 'xai',
      model: 'grok-4.6',
      reasoning: 'auto',
      temperature: null,
      maxOutputTokens: 4096,
      timeoutSeconds: 60,
    },
  };

  const validated = validateConfig(existingXaiConfig);
  assert.equal(validated.chat.provider, 'xai', 'Chat provider must remain xai');
  assert.equal(validated.chat.model, 'grok-4.6');
  assert.equal(validated.chat.enabled, true);
});

void test('Provider credentials isolation: credentials cannot leak across providers', async () => {
  const interceptedHeaders = { promanos: '', openai: '', xai: '' };

  const transport = async (url, init) => {
    if (url.includes('promanos.com')) {
      interceptedHeaders.promanos = init.headers.authorization;
      return Response.json(mockPromanOSChatResponse);
    }
    if (url.includes('openai.com')) {
      interceptedHeaders.openai = init.headers.authorization;
      return Response.json({
        status: 'completed',
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'openai text' }] }],
      });
    }
    if (url.includes('api.x.ai')) {
      interceptedHeaders.xai = init.headers.authorization;
      return Response.json({
        status: 'completed',
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'xai text' }] }],
      });
    }
    return Response.json({}, { status: 404 });
  };

  // PromanOS request
  await generateResponse(defaultProfile('promanos'), 'key-pm-secret', [], transport);
  assert.equal(interceptedHeaders.promanos, 'Bearer key-pm-secret');
  assert.equal(interceptedHeaders.openai, '');
  assert.equal(interceptedHeaders.xai, '');

  // OpenAI request
  await generateResponse(defaultProfile('openai'), 'key-oai-secret', [], transport);
  assert.equal(interceptedHeaders.openai, 'Bearer key-oai-secret');
  assert.equal(interceptedHeaders.promanos, 'Bearer key-pm-secret'); // unchanged

  // xAI request
  await generateResponse(defaultProfile('xai'), 'key-xai-secret', [], transport);
  assert.equal(interceptedHeaders.xai, 'Bearer key-xai-secret');
});

void test('Fallback routing: transient 502 fails over to OpenAI fallback provider', async () => {
  let callCount = 0;
  const calls = [];

  const transport = async (url, init) => {
    callCount++;
    calls.push({ url, auth: init.headers.authorization });
    if (url.includes('promanos.com')) {
      return Response.json({ error: 'Gateway timeout' }, { status: 502 });
    }
    return Response.json({
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Ответ от резервного провайдера' }],
        },
      ],
      usage: { input_tokens: 10, output_tokens: 20 },
    });
  };

  const profileWithFallback = {
    ...defaultProfile('promanos'),
    fallbackEnabled: true,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  };

  const result = await generateResponse(
    profileWithFallback,
    'dual-compatible-key',
    [{ role: 'user', content: 'тест fallback' }],
    transport,
  );

  assert.equal(callCount, 2);
  assert.ok(calls[0].url.includes('promanos.com'));
  assert.ok(calls[1].url.includes('openai.com'));
  assert.equal(result.text, 'Ответ от резервного провайдера');
  assert.equal(result.provider, 'openai');
});

void test('Fallback routing: PromanOS 401 auth error fails closed immediately without failover', async () => {
  let callCount = 0;

  const transport = async (url) => {
    callCount++;
    if (url.includes('promanos.com')) {
      return Response.json({ error: 'Auth failed' }, { status: 401 });
    }
    return Response.json({ status: 'completed', output: [] });
  };

  const profileWithFallback = {
    ...defaultProfile('promanos'),
    fallbackEnabled: true,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  };

  await assert.rejects(
    generateResponse(
      profileWithFallback,
      'pm-key',
      [{ role: 'user', content: 'test' }],
      transport,
    ),
    (e) => e instanceof AiFailure && e.code === 'credentials',
  );

  assert.equal(callCount, 1);
});

void test('Fallback routing: PromanOS 402 balance error fails closed immediately without failover', async () => {
  let callCount = 0;

  const transport = async (url) => {
    callCount++;
    if (url.includes('promanos.com')) {
      return Response.json({ error: 'Payment Required' }, { status: 402 });
    }
    return Response.json({ status: 'completed', output: [] });
  };

  const profileWithFallback = {
    ...defaultProfile('promanos'),
    fallbackEnabled: true,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  };

  await assert.rejects(
    generateResponse(
      profileWithFallback,
      'pm-key',
      [{ role: 'user', content: 'test' }],
      transport,
    ),
    (e) => e instanceof AiFailure && e.code === 'balance',
  );

  assert.equal(callCount, 1);
});

void test('Fallback routing: fallback disabled → transient 502 throws directly without fallback', async () => {
  let callCount = 0;

  const transport = async () => {
    callCount++;
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  };

  const profileNoFallback = {
    ...defaultProfile('promanos'),
    fallbackEnabled: false,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  };

  await assert.rejects(
    generateResponse(
      profileNoFallback,
      'pm-key',
      [{ role: 'user', content: 'test' }],
      transport,
    ),
    (e) => e instanceof AiFailure && e.code === 'unavailable',
  );

  assert.equal(callCount, 1);
});

void test('Fallback routing: primary success → fallback not invoked', async () => {
  let callCount = 0;

  const transport = async (url) => {
    callCount++;
    assert.ok(url.includes('promanos.com'), 'Only primary provider should be called');
    return Response.json(mockPromanOSChatResponse);
  };

  const profileWithFallback = {
    ...defaultProfile('promanos'),
    fallbackEnabled: true,
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
  };

  const result = await generateResponse(
    profileWithFallback,
    'pm-key',
    [{ role: 'user', content: 'test' }],
    transport,
  );

  assert.equal(callCount, 1);
  assert.equal(result.provider, 'promanos');
});

void test('Catalog isolation: duplicate model IDs across providers remain isolated by provider', () => {
  // Test that two providers with identically-named models resolve to their own capabilities
  const promanosCaps = modelCapabilities('promanos', 'custom-1');
  const openaiCaps = modelCapabilities('openai', 'custom-1');
  const xaiCaps = modelCapabilities('xai', 'custom-1');

  // PromanOS allows temperature and standard efforts for unknown/custom models
  assert.equal(promanosCaps.temperature, true);
  // OpenAI defaults unknown models to auto effort and no temperature
  assert.equal(openaiCaps.temperature, false);
  assert.deepEqual(openaiCaps.efforts, ['auto']);
  assert.deepEqual(xaiCaps.efforts, ['auto']);
});

void test('Security: secrets do not appear in serialized errors or logs', async () => {
  const superSecretKey = 'super-secret-worker-bearer-token-xyz';
  const superSecretErrorBody = 'INTERNAL DB STACK TRACE WITH SECRET PASSWORD';

  const transport = async () => {
    return Response.json({ error: superSecretErrorBody }, { status: 500 });
  };

  try {
    await generateResponse(defaultProfile('promanos'), superSecretKey, [], transport);
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof AiFailure);
    assert.ok(!err.message.includes(superSecretKey), 'Error message must not contain API key');
    assert.ok(!err.message.includes(superSecretErrorBody), 'Error message must not echo upstream body');
    const serialized = JSON.stringify(err);
    assert.ok(!serialized.includes(superSecretKey), 'Serialized error must not contain API key');
    assert.ok(!serialized.includes(superSecretErrorBody), 'Serialized error must not echo secret body');
  }
});

void test('Version integrity: canonical build version matches package version 0.5.0 without drift', () => {
  const pkgContent = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkgContent.version, '0.5.0', 'package.json version must be 0.5.0');

  // Verify vite.config.ts uses pkg.version as fallback and contains no hardcoded 0.4.0
  const viteConfigContent = readFileSync('vite.config.ts', 'utf8');
  assert.ok(viteConfigContent.includes('pkg.version'), 'vite.config.ts must reference pkg.version');
  assert.ok(!viteConfigContent.includes("'0.4.0'"), "vite.config.ts must not contain hardcoded '0.4.0'");

  // Verify createBuildStamp validates and succeeds with canonical version
  const stamp = createBuildStamp(process.cwd(), {
    version: pkgContent.version,
    repository: '',
    sha: '',
    mode: 'standard',
  });
  assert.equal(stamp.version, '0.5.0');
});
