const error = {
  description: 'Request rejected',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string' } },
      },
    },
  },
};
const errors = {
  '400': error,
  '401': error,
  '403': error,
  '404': error,
  '409': error,
  '413': error,
  '415': error,
  '429': {
    ...error,
    headers: { 'Retry-After': { schema: { type: 'integer' } } },
  },
  '503': error,
};
const order = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    productId: { type: 'string' },
    customerId: { type: 'string', nullable: true },
    productTitle: { type: 'string', nullable: true },
    unitPrice: { type: 'integer', nullable: true },
    quantity: { type: 'integer' },
    amount: {
      type: 'integer',
      description: 'Hundredths of currency, frozen at creation',
    },
    currency: { type: 'string' },
    status: {
      type: 'string',
      enum: ['pending', 'paid', 'cancelled', 'refunded'],
    },
    revision: { type: 'integer' },
    paymentProvider: { type: 'string' },
    paymentUrl: { type: 'string', format: 'uri', nullable: true },
    customerNote: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
const envelope = {
  type: 'object',
  properties: { order, replayed: { type: 'boolean' } },
};
const detail = {
  type: 'object',
  properties: {
    order,
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          note: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
const json = (schema: unknown) => ({
  description: 'Success',
  content: { 'application/json': { schema } },
});
const requestBody = (schema: unknown) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const id = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};
const security = [{ bearerAuth: [] }, { cookieAuth: [] }];
export const commercePaths = {
  '/orders': {
    get: {
      summary: 'List own orders; owners see all unless mine=1',
      security,
      parameters: [
        { name: 'mine', in: 'query', schema: { type: 'string', enum: ['1'] } },
      ],
      responses: {
        '200': json({
          type: 'object',
          properties: { orders: { type: 'array', items: order } },
        }),
        ...errors,
      },
    },
    post: {
      summary: 'Create pending order without charging money',
      description:
        'Price and title are snapshots. Reuse key for retries; different payload under the same key returns 409. Payment links are requested separately.',
      security,
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string', pattern: '^[a-zA-Z0-9_-]{16,128}$' },
        },
      ],
      requestBody: requestBody({
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', maxLength: 128 },
          quantity: { type: 'integer', minimum: 1, maximum: 99, default: 1 },
          customerId: {
            type: 'string',
            description: 'Only an owner can target another customer',
          },
          customerNote: { type: 'string', maxLength: 2000 },
        },
      }),
      responses: { '201': json(envelope), '200': json(envelope), ...errors },
    },
  },
  '/orders/{id}': {
    parameters: [id],
    get: {
      summary: 'Read accessible order and its history',
      security,
      responses: { '200': json(detail), ...errors },
    },
    patch: {
      summary: 'Record manual payment/refund or cancel manual order',
      description:
        'Does not move money. Requires latest revision. Customer may cancel only own pending manual order. External payment state changes only through adapter webhook.',
      security,
      requestBody: requestBody({
        type: 'object',
        required: ['status', 'revision'],
        properties: {
          status: { type: 'string', enum: ['paid', 'cancelled', 'refunded'] },
          revision: { type: 'integer', minimum: 0 },
        },
      }),
      responses: { '200': json(detail), ...errors },
    },
  },
  '/orders/{id}/checkout': {
    parameters: [id],
    post: {
      summary: 'Request HTTPS payment link for existing pending external order',
      description:
        'Adapter must deduplicate by Idempotency-Key=order.id, including concurrent calls. No payment is confirmed by this operation.',
      security,
      requestBody: requestBody({ type: 'object' }),
      responses: { '200': json(envelope), '502': error, ...errors },
    },
  },
  '/webhooks/payment': {
    post: {
      summary: 'Accept verified payment event from trusted adapter',
      description:
        'Adapter must verify the upstream provider signature. Event ID, exact amount/currency and valid forward transition are required. Replays are acknowledged without applying twice; conflicting/out-of-order events return 409.',
      security: [{ paymentWebhookSecret: [] }],
      requestBody: requestBody({
        type: 'object',
        required: ['eventId', 'orderId', 'status', 'amount', 'currency'],
        properties: {
          eventId: { type: 'string', maxLength: 128 },
          orderId: { type: 'string', maxLength: 128 },
          status: { type: 'string', enum: ['paid', 'cancelled', 'refunded'] },
          amount: { type: 'integer' },
          currency: { type: 'string' },
        },
      }),
      responses: {
        '200': json({
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            replayed: { type: 'boolean' },
          },
        }),
        ...errors,
      },
    },
  },
};
