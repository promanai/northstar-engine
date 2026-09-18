export const siteConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'locale', 'theme', 'backgroundImage'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 320 },
    locale: { type: 'string', enum: ['ru', 'en', 'es', 'he'] },
    theme: { type: 'string', enum: ['northstar', 'editorial', 'ocean'] },
    backgroundImage: {
      type: 'string',
      maxLength: 2048,
      description:
        'Empty, same-origin absolute path, or HTTPS URL without credentials',
    },
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
  properties: { revision, value: siteConfigSchema },
};
export const siteConfigPaths = {
  '/site-config': {
    get: {
      summary: 'Public resolved site configuration, or private state/history',
      security: [...security, {}],
      description:
        'Default: validated public settings only, never audit or credentials. view=admin/history requires owner/admin and site:read. History is paged by before, 50 entries per page.',
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
            'Public configuration, private revision/value/warnings, or versions/nextBefore',
          content: json({ type: 'object' }),
        },
      },
    },
    put: {
      summary: 'Replace or restore site configuration atomically',
      security,
      description:
        'Requires owner/admin + site:write; restoration also requires site:read. User confirmation required. Updates become public immediately. Known public fields only. Locale denotes content language, not automatic interface translation.',
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
                value: siteConfigSchema,
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
};
