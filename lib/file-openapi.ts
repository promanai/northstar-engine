const security = [{ cookieAuth: [] }, { bearerAuth: [] }];
const file = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string', nullable: true },
    filename: { type: 'string' },
    contentType: { type: 'string' },
    size: { type: 'integer' },
    status: {
      type: 'string',
      enum: ['uploading', 'uploaded', 'deleting', 'deleted'],
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    downloadUrl: { type: 'string', nullable: true },
    recoverable: { type: 'boolean' },
  },
};
const json = (schema: unknown) => ({ 'application/json': { schema } });
const error = {
  description:
    '400 invalid input; 401 unauthenticated/invalid scope; 403 forbidden; 404 absent/not owned; 409 quota/in-progress/conflict; 413 too large; 415 content type; 429 rate limit; 503 storage failure',
  content: json({ type: 'object', properties: { error: { type: 'string' } } }),
};
const itemResponse = {
  description: 'File metadata, no storage key or content hash',
  content: json({ type: 'object', properties: { file } }),
};
const id = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};
export const filePaths = {
  '/files': {
    get: {
      summary: 'List owned file metadata (Standard only; files:read)',
      security,
      description:
        'Administrators may set all=true. UUID cursor ordering, at most 50 rows. Active and incomplete operations count towards quota; deleted tombstones are omitted.',
      parameters: [
        {
          name: 'all',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
        {
          name: 'before',
          in: 'query',
          schema: { type: 'string', maxLength: 100 },
        },
      ],
      responses: {
        '200': {
          description: 'Files, cursor and own quota',
          content: json({
            type: 'object',
            properties: {
              files: { type: 'array', items: file },
              nextBefore: { type: 'string', nullable: true },
              usage: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  bytes: { type: 'integer' },
                },
              },
              limits: {
                type: 'object',
                properties: {
                  userCount: { type: 'integer' },
                  siteCount: { type: 'integer' },
                  userBytes: { type: 'integer' },
                  siteBytes: { type: 'integer' },
                },
              },
            },
          }),
        },
        default: error,
      },
    },
    post: {
      summary: 'Upload one private file (Standard only; files:write)',
      security,
      description:
        'Exactly one file field. PNG/JPEG/WebP/PDF <=2 MiB, UTF-8 TXT/MD <=64000 bytes. Signature checks are not malware scanning. Use same key and bytes after network errors. A changed payload or incomplete/deleted prior operation returns 409. New attempt needs a new key. 30 attempts per user/minute shared across tokens. Persisted uploads are not yet included in AI chat context.',
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: {
            type: 'string',
            minLength: 16,
            maxLength: 100,
            pattern: '^[A-Za-z0-9_-]+$',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        '201': itemResponse,
        '200': {
          description: 'Idempotent replay',
          content: json({
            type: 'object',
            properties: { file, replayed: { type: 'boolean' } },
          }),
        },
        default: error,
      },
    },
  },
  '/files/{id}': {
    get: {
      summary: 'Read owned file metadata (files:read)',
      security,
      parameters: [id],
      responses: { '200': itemResponse, default: error },
    },
    delete: {
      summary: 'Permanently remove owned file contents (files:write)',
      security,
      parameters: [id],
      description:
        'Administrators may remove any owner file. Ask user before irreversible deletion. Repeat same id after failures. Recent pending uploads are protected for 15 minutes. Metadata tombstone is retained; quota released only after confirmed R2 delete. Shared REST/MCP limit: 30 deletes/user/minute.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          additionalProperties: false,
          required: ['confirm'],
          properties: { confirm: { type: 'boolean', enum: [true] } },
        }),
      },
      responses: { '200': itemResponse, default: error },
    },
  },
  '/files/{id}/download': {
    get: {
      summary: 'Download owned file bytes (files:read)',
      security,
      parameters: [id],
      description:
        'Authenticated only. Administrators may download any owner file. Attachment disposition, octet-stream, no-store, nosniff and sandbox CSP; never inline or a public R2 URL.',
      responses: {
        '200': {
          description: 'Binary file',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        default: error,
      },
    },
  },
};
