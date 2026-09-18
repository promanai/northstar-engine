export const chatPaths = {
  '/chat/request': {
    get: {
      summary:
        'Recover an existing browser chat attempt without sending it again',
      description:
        'Same user session or guest cookie as original attempt required. Idempotency-Key is supplied in a header, not the URL. No bearer/MCP access or cookie fallback. GET never calls AI, touches R2 bytes, changes the request journal or renews the lease. Read rate limit 60/min per identity. Completed result includes current authorized history (latest 100 user/assistant messages, safe attachment metadata); expired pending is reported as unknown. Pointer alone grants no access.',
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: {
            type: 'string',
            minLength: 16,
            maxLength: 128,
            pattern: '^[A-Za-z0-9_-]+$',
          },
        },
      ],
      responses: {
        '200': {
          description:
            'state pending/completed/failed/unknown. Pending: Retry-After: 3. Completed: conversationId, result (message, assistant, mode), messages. Failed: error and responseStatus. Private no-store; no request fingerprint, credential, object key or file bytes.',
        },
        '400': { description: 'Missing/invalid request key' },
        '401': {
          description:
            'Original browser identity required; bearer headers rejected',
        },
        '403': { description: 'Cross-origin request or unsupported role' },
        '404': {
          description:
            'Unknown key, another identity, removed conversation or expired guest access',
        },
        '429': { description: 'Read limit exceeded; Retry-After' },
        '503': { description: 'Storage unavailable; no paid retry' },
      },
    },
  },
  '/chat': {
    get: {
      summary: 'Read current provider for explicit file consent',
      security: [{ cookieAuth: [] }],
      responses: {
        '200': {
          description:
            'provider (openai/xai), fileAnalysisEnabled, maxInputBytes; private no-store. Model/key/prompt not returned.',
        },
        '401': { description: 'User browser session required' },
        '503': { description: 'Settings unavailable' },
      },
    },
    post: {
      summary:
        'Send a message, optionally analyze one owned stored file, and persist the successful turn',
      description:
        'Requires Idempotency-Key scoped to the authenticated user or guest cookie. Reuse the SAME key and body after transport failure; completed/failed attempts replay without another AI call. Different body with same key is 409. Pending or busy conversation returns 409/Retry-After. Expired attempts become unknown and are not restarted; a late response cannot commit. Guest without cookie first receives 428 + Set-Cookie, then repeats same request. X-Chat-Request-State: unclaimed/pending/busy/completed/failed/unknown/conflict. Text supports guest/session conversations. File analysis is session-only with explicit provider consent. Only own uploaded files in own conversations; admin read privileges do not authorize sending another customer file to AI. TXT/MD on OpenAI/xAI, images/PDF on a vision-capable OpenAI model. Base64 counts toward input quota. Prior attachments are never automatically re-sent. No MCP/bearer paid chat.',
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: {
            type: 'string',
            minLength: 16,
            maxLength: 128,
            pattern: '^[A-Za-z0-9_-]+$',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['message'],
              properties: {
                message: { type: 'string', minLength: 1, maxLength: 8000 },
                conversationId: { type: 'string', maxLength: 128 },
                fileId: { type: 'string', maxLength: 100 },
                confirmFile: { type: 'boolean', enum: [true] },
                fileProvider: { type: 'string', enum: ['openai', 'xai'] },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description:
            'message, conversationId, assistant, mode. With file: live only; file reference committed atomically with successful turn.',
        },
        '400': { description: 'Invalid input or missing file consent' },
        '401': { description: 'File analysis requires session' },
        '403': { description: 'Not own file/conversation' },
        '404': { description: 'File inaccessible or missing' },
        '409': {
          description:
            'Key conflict, pending/busy/unknown attempt, provider changed or file unavailable. Inspect code, X-Chat-Request-State and Retry-After.',
        },
        '413': { description: 'Input exceeds quota; base64 file included' },
        '415': { description: 'JSON required' },
        '422': { description: 'Unsupported file/provider combination' },
        '428': {
          description:
            'Guest cookie established; repeat same key/body with cookie before AI work',
        },
        '429': { description: 'Rate or site quota exhausted; Retry-After' },
        '502': { description: 'Provider failed; no saved message pair' },
        '503': { description: 'AI disabled or storage unavailable' },
      },
    },
  },
};
