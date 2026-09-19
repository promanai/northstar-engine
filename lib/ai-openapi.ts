const profile = {
  type: 'object',
  additionalProperties: false,
  required: [
    'enabled',
    'provider',
    'model',
    'reasoning',
    'temperature',
    'maxOutputTokens',
    'timeoutSeconds',
  ],
  properties: {
    enabled: { type: 'boolean' },
    provider: { type: 'string', enum: ['openai', 'xai', 'promanos'] },
    model: {
      type: 'string',
      maxLength: 128,
      pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$',
    },
    reasoning: {
      type: 'string',
      enum: ['auto', 'none', 'low', 'medium', 'high', 'xhigh', 'max'],
      description:
        'Model-specific support is validated. Unknown models only allow auto.',
    },
    temperature: {
      type: 'number',
      nullable: true,
      minimum: 0,
      maximum: 2,
      description:
        'null omits the parameter; only supported model families allow a number.',
    },
    maxOutputTokens: { type: 'integer', minimum: 128, maximum: 32768 },
    timeoutSeconds: { type: 'integer', minimum: 10, maximum: 120 },
  },
};
const config = {
  type: 'object',
  additionalProperties: false,
  required: ['chat', 'text'],
  properties: { chat: profile, text: profile },
};
const json = (schema: object) => ({ 'application/json': { schema } });
const view = {
  type: 'object',
  properties: {
    config,
    budget: {
      type: 'object',
      description:
        'Site-wide Standard quota for reserved paid attempts, including failures, not a currency budget. UTC calendar periods. Read-only; ceilings are Worker environment variables.',
      properties: {
        scope: { type: 'string', enum: ['site'] },
        accounting: { type: 'string', enum: ['reserved_attempts'] },
        enabled: { type: 'boolean' },
        dailyRequests: { type: 'integer' },
        monthlyRequests: { type: 'integer' },
        maxInputBytes: { type: 'integer' },
        maxOutputTokens: { type: 'integer' },
        ...Object.fromEntries(
          ['daily', 'monthly'].map((period) => [
            period,
            {
              type: 'object',
              properties: {
                period: { type: 'string' },
                used: { type: 'integer' },
                remaining: { type: 'integer' },
                resetsAt: { type: 'string', format: 'date-time' },
              },
            },
          ]),
        ),
      },
    },
    revision: { type: 'integer' },
    source: { type: 'string', enum: ['saved', 'environment'] },
    credentials: {
      type: 'object',
      properties: { openai: { type: 'boolean' }, xai: { type: 'boolean' } },
    },
  },
};
const errors = Object.fromEntries(
  ['400', '403', '409', '413', '415', '429', '502', '503'].map((code) => [
    code,
    {
      description:
        code === '409'
          ? 'Stale settings revision; reload before saving'
          : 'Validation, authorization, rate limit, provider or database failure',
      content: json({
        type: 'object',
        properties: { error: { type: 'string' }, code: { type: 'string' } },
      }),
    },
  ]),
);
export const aiPaths = {
  '/ai': {
    get: {
      summary: 'Read AI routing and credential presence (never secrets)',
      description:
        'Includes the site-wide quota and remaining reserved attempts; never returns prompts or user identities in counters.',
      security: [{ cookieAuth: [] }],
      responses: {
        ...errors,
        '200': { description: 'Owner/admin settings', content: json(view) },
      },
    },
    post: {
      summary: 'Configure AI, discover models, test a draft or generate text',
      security: [{ cookieAuth: [] }],
      description:
        'Owner/admin browser session only, same-origin JSON. Bearer tokens are denied. Credentials are Worker secrets OPENAI_API_KEY and XAI_API_KEY. Save uses optimistic revision and does not contact a provider. Test/generate are billed, require confirmPaid=true, have no automatic retries or failover. Test uses the supplied draft without saving, generate uses the saved enabled text profile. This API does not publish generated content.',
      requestBody: {
        required: true,
        content: json({
          oneOf: [
            {
              type: 'object',
              required: ['action', 'config', 'revision'],
              properties: {
                action: { type: 'string', enum: ['save'] },
                config,
                revision: { type: 'integer', minimum: 0 },
              },
            },
            {
              type: 'object',
              required: ['action', 'provider'],
              properties: {
                action: { type: 'string', enum: ['models'] },
                provider: { type: 'string', enum: ['openai', 'xai', 'promanos'] },
              },
            },
            {
              type: 'object',
              required: ['action', 'profile', 'confirmPaid'],
              properties: {
                action: { type: 'string', enum: ['test'] },
                profile,
                confirmPaid: { type: 'boolean', enum: [true] },
              },
            },
            {
              type: 'object',
              required: ['action', 'task', 'prompt', 'confirmPaid'],
              properties: {
                action: { type: 'string', enum: ['generate'] },
                task: { type: 'string', enum: ['text'] },
                prompt: { type: 'string', minLength: 1, maxLength: 8000 },
                confirmPaid: { type: 'boolean', enum: [true] },
              },
            },
          ],
        }),
      },
      responses: {
        ...errors,
        '200': {
          description:
            'Settings, model IDs, or generated text and whitelisted token usage',
          content: json({
            oneOf: [
              view,
              {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  models: { type: 'array', items: { type: 'string' } },
                },
              },
              {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  model: { type: 'string' },
                  provider: { type: 'string' },
                  usage: {
                    type: 'object',
                    properties: {
                      inputTokens: { type: 'integer', nullable: true },
                      outputTokens: { type: 'integer', nullable: true },
                      reasoningTokens: { type: 'integer', nullable: true },
                    },
                  },
                },
              },
            ],
          }),
        },
      },
    },
  },
};
