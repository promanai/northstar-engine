const security = [{ cookieAuth: [] }, { bearerAuth: [] }];
const revision = { type: 'integer', minimum: 0 };
const confirm = { type: 'boolean', enum: [true] };
const id = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};
const json = (schema: unknown) => ({ 'application/json': { schema } });
const body = (properties: unknown, required: string[]) => ({
  required: true,
  content: json({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  }),
});
const contacts = {
  email: { type: 'string', format: 'email', maxLength: 254 },
  firstName: { type: 'string', maxLength: 120 },
  lastName: { type: 'string', maxLength: 120 },
  phone: { type: 'string', maxLength: 40 },
};
const customer = {
  type: 'object',
  properties: {
    ...contacts,
    firstName: { ...contacts.firstName, nullable: true },
    lastName: { ...contacts.lastName, nullable: true },
    phone: { ...contacts.phone, nullable: true },
    role: { type: 'string', enum: ['customer'] },
    id: { type: 'string' },
    revision,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
const assistant = {
  type: 'object',
  properties: {
    revision,
    name: { type: 'string' },
    systemPrompt: { type: 'string' },
    defaultLocale: { type: 'string' },
    status: { type: 'string', enum: ['active', 'disabled'] },
  },
};
const errors = {
  default: {
    description:
      '400 validation/confirmation; 401/403 authentication/scope; 404 absent/protected role; 409 stale revision, duplicate email or linked data; 413 body limit; 429 rate limit; 503 storage failure',
    content: json({
      type: 'object',
      properties: { error: { type: 'string' } },
    }),
  },
};
const success = (schema: unknown) => ({
  ...errors,
  '200': { description: 'Successful response', content: json(schema) },
});
const result = (key: string, schema: unknown) => ({
  type: 'object',
  properties: { [key]: schema },
});
export const adminPaths = {
  '/assistant': {
    get: {
      summary:
        'Read public identity, or private profile/history with assistant:read',
      security: [{}, ...security],
      description:
        'Default view always returns only name/defaultLocale/status, even for administrators. view=admin returns assistant with revision; view=history returns up to 50 revision metadata records. Never publicly exposes instructions, provider routing or history. New history starts with imported baseline; old prompt logs remain stored separately.',
      parameters: [
        {
          name: 'view',
          in: 'query',
          schema: { type: 'string', enum: ['admin', 'history'] },
        },
        { name: 'before', in: 'query', schema: revision },
      ],
      responses: success({
        type: 'object',
        properties: {
          assistant,
          versions: { type: 'array', items: { type: 'object' } },
        },
      }),
    },
    put: {
      summary:
        'Change/restore assistant with assistant:write, revision and confirmation',
      security,
      description:
        'Partial update, at least one field; changes apply immediately. Restore with targetRevision also requires assistant:read and may enable the consultant. No activeModel or secrets: model routing uses session-only /ai. Shared REST/MCP limit 20 writes/user/minute. Missing/stale revision never overwrites current state.',
      requestBody: {
        required: true,
        content: json({
          oneOf: [
            {
              type: 'object',
              additionalProperties: false,
              required: ['revision', 'confirm'],
              properties: {
                revision,
                confirm,
                name: { type: 'string', minLength: 1, maxLength: 120 },
                systemPrompt: { type: 'string', maxLength: 16000 },
                defaultLocale: { type: 'string', maxLength: 35 },
                status: { type: 'string', enum: ['active', 'disabled'] },
              },
            },
            {
              type: 'object',
              additionalProperties: false,
              required: ['revision', 'targetRevision', 'confirm'],
              properties: { revision, targetRevision: revision, confirm },
            },
          ],
        }),
      },
      responses: success(result('assistant', assistant)),
    },
  },
  '/customers': {
    get: {
      summary: 'List customer contacts with customers:read',
      security,
      description:
        '100 per page, ID descending. Object {customers,nextBefore}. No passwords, tokens, administrator accounts. Empty strings clear optional contact fields on writes.',
      parameters: [
        {
          name: 'before',
          in: 'query',
          schema: { type: 'string', maxLength: 100 },
        },
      ],
      responses: success({
        type: 'object',
        properties: {
          customers: { type: 'array', items: customer },
          nextBefore: { type: 'string', nullable: true },
        },
      }),
    },
    post: {
      summary: 'Create customer after confirmation with customers:write',
      security,
      description:
        'Optional initial password 8–256 characters. No invitation is sent. Unique normalized email; after uncertain result inspect list before repeating. Shared REST/MCP write limit 30/user/minute.',
      requestBody: body(
        {
          ...contacts,
          password: { type: 'string', minLength: 8, maxLength: 256 },
          confirm,
        },
        ['email', 'confirm'],
      ),
      responses: {
        ...errors,
        '201': {
          description: 'Created customer',
          content: json(result('customer', customer)),
        },
      },
    },
  },
  '/customers/{id}': {
    get: {
      summary: 'Read one customer with customers:read',
      security,
      parameters: [id],
      responses: success(result('customer', customer)),
    },
    patch: {
      summary:
        'Update contact with customers:write, current revision and confirmation',
      security,
      parameters: [id],
      description:
        'Partial contact update. No role or password changes. Changing email revokes customer sessions/tokens atomically. Profile self-service increments the same revision. Protected administrator accounts always return 404.',
      requestBody: body({ ...contacts, revision, confirm }, [
        'revision',
        'confirm',
      ]),
      responses: success(result('customer', customer)),
    },
    delete: {
      summary: 'Delete unused customer after confirmation with customers:write',
      security,
      parameters: [id],
      description:
        'Current revision required. Sessions/tokens are revoked atomically; linked business data blocks entire transaction with 409. No cascaded deletion. Private audit snapshots remain, so this is not personal-data erasure. A repeated delete returns 404; read history to verify an uncertain result.',
      requestBody: body({ revision, confirm }, ['revision', 'confirm']),
      responses: success({
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          id: { type: 'string' },
          revision,
        },
      }),
    },
  },
  '/customers/{id}/history': {
    get: {
      summary: 'Private customer history with customers:read',
      security,
      parameters: [id, { name: 'before', in: 'query', schema: revision }],
      description:
        'At most 50 entries, newest first. Contains contact snapshots and actor/source, never credentials. History survives contact deletion; no automatic retention or restore. Older profile edits before this release have no historical snapshots.',
      responses: success({
        type: 'object',
        properties: { versions: { type: 'array', items: { type: 'object' } } },
      }),
    },
  },
};
