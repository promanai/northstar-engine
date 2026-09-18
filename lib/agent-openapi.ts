import { scopeLabels, customerScopes } from '@/lib/agent-policy';
const object = { type: 'object', additionalProperties: true };
const json = (schema: object) => ({ 'application/json': { schema } });
const errors = Object.fromEntries(
  ['400', '401', '403', '404', '413', '429', '503'].map((status) => [
    status,
    {
      description: 'Request rejected',
      content: json({
        type: 'object',
        properties: { error: { type: 'string' } },
      }),
    },
  ]),
);
export const agentPaths = {
  '/patient-agent': {
    get: {
      summary: 'List own patient-audience token metadata (no secrets)',
      security: [{ cookieAuth: [] }],
      responses: {
        ...errors,
        '200': {
          description: 'Latest 100 patient tokens, with a truncation flag',
          content: json(object),
        },
      },
    },
    post: {
      summary: 'Create limited personal patient agent access',
      security: [{ cookieAuth: [] }],
      description:
        'Browser session only. Explicit patient audience remains customer-level even if the issuer is an owner/admin. read: content:read, catalog:read, bookings:read. book adds bookings:write. No custom scopes or roles. Plaintext secret returned once; stored hashed. No OAuth. Booking writes do not charge a card.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          additionalProperties: false,
          required: ['name', 'access', 'expiresInDays', 'confirm'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            access: { type: 'string', enum: ['read', 'book'] },
            expiresInDays: { type: 'integer', minimum: 1, maximum: 30 },
            confirm: { type: 'boolean', const: true },
          },
        }),
      },
      responses: {
        ...errors,
        '201': {
          description: 'Token secret, expiry, patient audience and scopes',
          content: json(object),
        },
      },
    },
    delete: {
      summary: 'Revoke own patient-audience token',
      security: [{ cookieAuth: [] }],
      description:
        'Same-origin browser session and application/json required. Applies to subsequent requests; in-flight operations may finish.',
      parameters: [
        {
          name: 'id',
          in: 'query',
          required: true,
          schema: { type: 'string', maxLength: 128 },
        },
      ],
      responses: {
        ...errors,
        '200': { description: 'Revoked', content: json(object) },
      },
    },
  },
  '/tokens': {
    get: {
      summary: 'List own agent token metadata',
      security: [{ cookieAuth: [] }],
      description:
        'Browser session only; never returns token secrets or hashes.',
      responses: {
        ...errors,
        '200': {
          description: 'Own tokens and allowed scopes',
          content: json({
            type: 'object',
            properties: {
              tokens: { type: 'array', items: object },
              allowedScopes: { type: 'array', items: { type: 'string' } },
              owner: { type: 'boolean' },
            },
          }),
        },
      },
    },
    post: {
      summary: 'Issue a scoped, expiring agent token',
      security: [{ cookieAuth: [] }],
      description: `Session only. Customer scopes: ${customerScopes.join(', ')}. Default is read-only. Wildcard requires owner role and explicit confirmation. A token cannot mint another token. Use /patient-agent for explicitly patient-limited access even from an owner account.`,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            expiresInDays: {
              type: 'integer',
              minimum: 1,
              maximum: 365,
              default: 30,
            },
            scopes: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              uniqueItems: true,
              items: {
                type: 'string',
                enum: [...Object.keys(scopeLabels), '*'],
              },
            },
            confirmFullAccess: { type: 'boolean', default: false },
          },
        }),
      },
      responses: {
        ...errors,
        '201': {
          description: 'Plaintext token returned once',
          content: json({
            type: 'object',
            properties: {
              token: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
              scopes: { type: 'array', items: { type: 'string' } },
              warning: { type: 'string' },
            },
          }),
        },
      },
    },
    delete: {
      summary: 'Revoke own token',
      security: [{ cookieAuth: [] }],
      description:
        'Requires same-origin request and Content-Type: application/json. Revocation applies to subsequent requests, not an already running operation.',
      parameters: [
        {
          name: 'id',
          in: 'query',
          required: true,
          schema: { type: 'string', maxLength: 128 },
        },
      ],
      responses: {
        ...errors,
        '200': {
          description: 'Revoked',
          content: json({
            type: 'object',
            properties: { ok: { type: 'boolean' } },
          }),
        },
      },
    },
  },
  '/mcp': {
    post: {
      summary: 'Scoped owner/customer MCP over HTTP POST',
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      description:
        'Protocol 2025-03-26, JSON responses, no SSE or OAuth. Authentication required including initialize. tools/list is filtered by role/scopes; customer order tools operate on own orders only. Tool business failures use result.isError; protocol/permission failures use JSON-RPC error. Creating orders does not charge money. Checkout returns {order} with paymentUrl when available.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['jsonrpc', 'method'],
          properties: {
            jsonrpc: { type: 'string', enum: ['2.0'] },
            id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            method: {
              type: 'string',
              enum: [
                'initialize',
                'notifications/initialized',
                'ping',
                'tools/list',
                'tools/call',
              ],
            },
            params: object,
          },
        }),
      },
      responses: {
        ...errors,
        '200': {
          description:
            'JSON-RPC result or error; inspect result.isError for tool failure',
          content: json(object),
        },
        '202': { description: 'Initialization notification accepted' },
      },
    },
  },
};
