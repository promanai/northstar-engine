const json = (schema: object) => ({ 'application/json': { schema } });
const revision = { type: 'integer', minimum: 0 };
const fields = {
  title: { type: 'string', maxLength: 160 },
  slug: { type: 'string', maxLength: 180 },
  status: { type: 'string', enum: ['draft', 'published'] },
  blocks: {
    type: 'array',
    maxItems: 50,
    items: { oneOf: [{ type: 'string' }, { type: 'object' }] },
  },
  seo: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      keywords: { type: 'string' },
    },
  },
};
const body = (properties: object, required: string[]) => ({
  required: true,
  content: json({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  }),
});
const parameters = [
  { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
];
const security = [{ cookieAuth: [] }, { bearerAuth: [] }];
const page = {
  type: 'object',
  properties: {
    ...fields,
    id: { type: 'string' },
    revision,
    status: { type: 'string', enum: ['draft', 'published', 'deleted'] },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' },
  },
};
const errors = Object.fromEntries(
  ['400', '403', '404', '409', '413', '429', '503'].map((code) => [
    code,
    {
      description:
        code === '409'
          ? 'Stale revision or occupied slug. Read current page before trying again.'
          : 'Request rejected',
      content: json({
        type: 'object',
        properties: { error: { type: 'string' } },
      }),
    },
  ]),
);
const responses = {
  ...errors,
  '200': {
    description: 'Current committed page',
    content: json({ type: 'object', properties: { page } }),
  },
};
export const pagePaths = {
  '/pages': {
    get: {
      summary:
        'List published pages; admins with pages:read also see drafts and trash',
      security: [...security, {}],
      responses: {
        ...errors,
        '200': {
          description: 'Up to 200 pages',
          content: json({
            type: 'object',
            properties: { pages: { type: 'array', items: page } },
          }),
        },
      },
    },
    post: {
      summary: 'Create a page and its first revision',
      security,
      requestBody: body(fields, ['title', 'slug']),
      responses: { ...errors, '201': responses['200'] },
    },
  },
  '/pages/{id}': {
    parameters,
    get: {
      summary:
        'Read current page including revision; private states require pages:read',
      security: [...security, {}],
      responses,
    },
    patch: {
      summary: 'Update with optimistic concurrency; requires pages:write',
      security,
      requestBody: body({ ...fields, revision }, ['revision']),
      responses,
    },
    delete: {
      summary:
        'Move to trash after user confirmation; retains content and reserved slug',
      security,
      requestBody: body(
        { revision, confirm: { type: 'boolean', enum: [true] } },
        ['revision', 'confirm'],
      ),
      responses,
    },
  },
  '/pages/{id}/history': {
    parameters,
    get: {
      summary: 'Private revision metadata, newest first; requires pages:read',
      security,
      parameters: [{ name: 'before', in: 'query', schema: revision }],
      responses: {
        ...errors,
        '200': {
          description: 'Up to 50 versions; pass nextBefore for older entries',
          content: json({
            type: 'object',
            properties: {
              nextBefore: { ...revision, nullable: true },
              versions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    revision,
                    action: { type: 'string' },
                    actorId: { type: 'string' },
                    tokenId: { type: 'string', nullable: true },
                    source: { type: 'string' },
                    createdAt: { type: 'integer' },
                  },
                },
              },
            },
          }),
        },
      },
    },
  },
  '/pages/{id}/restore': {
    parameters,
    post: {
      summary:
        'Restore historical content as a new draft; requires pages:read AND pages:write',
      security,
      requestBody: body(
        {
          revision,
          targetRevision: revision,
          confirm: { type: 'boolean', enum: [true] },
        },
        ['revision', 'targetRevision', 'confirm'],
      ),
      responses,
    },
  },
};
