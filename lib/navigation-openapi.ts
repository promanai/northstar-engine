export const navigationItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'kind', 'target', 'visible', 'presentation'],
  properties: {
    id: { type: 'string', pattern: '^[a-z][a-z0-9-]{0,39}$' },
    label: { type: 'string', minLength: 1, maxLength: 48 },
    kind: { type: 'string', enum: ['section', 'page', 'catalog'] },
    target: { type: 'string', maxLength: 100 },
    visible: { type: 'boolean' },
    presentation: { type: 'string', enum: ['navigate', 'modal'] },
  },
};
export const navigationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['menu', 'tabs'],
  properties: {
    menu: { type: 'array', maxItems: 12, items: navigationItemSchema },
    tabs: { type: 'array', maxItems: 12, items: navigationItemSchema },
  },
};
const json = (schema: object) => ({ 'application/json': { schema } });
const revision = { type: 'integer', minimum: 0 };
const security = [{ cookieAuth: [] }, { bearerAuth: [] }];
const errors = Object.fromEntries(
  ['400', '403', '404', '409', '413', '429', '503'].map((status) => [
    status,
    {
      description:
        status === '409'
          ? 'Concurrent update: read current state, do not blindly retry'
          : 'Request rejected',
      content: json({
        type: 'object',
        properties: { error: { type: 'string' } },
      }),
    },
  ]),
);
const state = {
  type: 'object',
  properties: { revision, value: navigationSchema },
};
export const navigationPaths = {
  '/navigation': {
    get: {
      summary: 'Public resolved navigation, or private state/history',
      security: [...security, {}],
      description:
        'Default: visible links with current published page URLs, never audit or draft references. view=admin/history requires owner/admin and site:read. History is paged by before, 50 entries per page.',
      parameters: [
        {
          name: 'view',
          in: 'query',
          schema: { type: 'string', enum: ['public', 'admin', 'history'] },
        },
        { name: 'before', in: 'query', schema: revision },
      ],
      responses: {
        ...errors,
        '200': {
          description:
            'Public menu/tabs, private revision/value, or versions/nextBefore',
          content: json({ type: 'object' }),
        },
      },
    },
    put: {
      summary: 'Replace or restore navigation atomically',
      security,
      description:
        'Requires owner/admin + site:write; restoration also requires site:read. User confirmation required. Updates become public immediately. Page targets are stable page IDs. Chat tab is mandatory. Modal is allowed only for a menu page.',
      requestBody: {
        required: true,
        content: json({
          oneOf: [
            {
              type: 'object',
              additionalProperties: false,
              required: ['revision', 'value', 'confirm'],
              properties: {
                revision,
                value: navigationSchema,
                confirm: { type: 'boolean', enum: [true] },
              },
            },
            {
              type: 'object',
              additionalProperties: false,
              required: ['revision', 'targetRevision', 'confirm'],
              properties: {
                revision,
                targetRevision: revision,
                confirm: { type: 'boolean', enum: [true] },
              },
            },
          ],
        }),
      },
      responses: {
        ...errors,
        '200': { description: 'Committed state', content: json(state) },
      },
    },
  },
  '/navigation/page': {
    get: {
      summary:
        'Published page content for modal or tab; ignores privileged cookies',
      security: [],
      parameters: [
        { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        ...errors,
        '200': {
          description: 'Only title, slug, blocks',
          content: json({
            type: 'object',
            properties: {
              title: { type: 'string' },
              slug: { type: 'string' },
              blocks: { type: 'array', items: {} },
            },
          }),
        },
      },
    },
  },
};
