const json = (schema: object) => ({ 'application/json': { schema } });
const id = { type: 'string', minLength: 1, maxLength: 128 };
const revision = { type: 'integer', minimum: 0 };
const instant = {
  type: 'string',
  format: 'date-time',
  description: 'ISO 8601 with Z or explicit offset, never local wall time',
};
const object = { type: 'object' };
const auth = [{ cookieAuth: [] }, { bearerAuth: [] }];
const errors = Object.fromEntries(
  ['400', '401', '403', '404', '409', '413', '415', '429', '503'].map(
    (status) => [
      status,
      {
        description:
          status === '409'
            ? 'Slot occupied/closed, stale revision, incompatible lifecycle or idempotency key conflict'
            : 'Request rejected',
        content: json({
          type: 'object',
          properties: { error: { type: 'string' } },
        }),
      },
    ],
  ),
);
const booking = {
  type: 'object',
  properties: {
    id,
    customerId: { ...id, nullable: true },
    service: { type: 'string' },
    slotId: { ...id, nullable: true },
    productId: { ...id, nullable: true },
    startsAt: {
      type: 'integer',
      nullable: true,
      description: 'Unix seconds UTC',
    },
    endsAt: {
      type: 'integer',
      nullable: true,
      description: 'Unix seconds UTC',
    },
    timeZone: { type: 'string', nullable: true },
    resourceName: { type: 'string', nullable: true },
    status: { type: 'string' },
    paymentStatus: {
      type: 'string',
      description:
        'not_required, pending, paid, cancelled, expired or refunded',
    },
    holdExpiresAt: {
      type: 'integer',
      nullable: true,
      description: 'Unix seconds UTC; paid booking hold deadline',
    },
    paymentUrl: { type: 'string', format: 'uri', nullable: true },
    price: {
      type: 'integer',
      nullable: true,
      description: 'Snapshot in minor currency units; not proof of payment',
    },
    currency: { type: 'string', nullable: true },
    customerNote: { type: 'string', nullable: true },
    revision,
  },
};
const detail = {
  type: 'object',
  properties: {
    booking,
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          revision,
          startsAt: { type: 'integer', nullable: true },
          createdAt: { type: 'integer' },
          slotId: { ...id, nullable: true },
        },
      },
    },
  },
};
export const bookingPaths = {
  '/booking-activity': {
    get: {
      summary: 'Clinic booking activity and Telegram delivery state',
      security: auth,
      description:
        'Owner/admin only; bookings:read for Bearer. Read-only. Most recent 50 events and next cursor. Does not return contact details or secrets.',
      parameters: [
        {
          name: 'period',
          in: 'query',
          schema: { type: 'string', enum: ['24h', '7d', '30d'] },
        },
        { name: 'before', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        ...errors,
        '200': {
          description:
            'Private event feed, next cursor and Telegram configuration status',
          content: json(object),
        },
      },
    },
    post: {
      summary:
        'Process Telegram queue or explicitly retry an unconfirmed delivery',
      security: [{ cookieAuth: [] }],
      description:
        'Administrator browser session only; Bearer rejected. Same-origin JSON. process requires confirm:true. retry requires eventId, confirm:true and confirmDuplicateRisk:true; may duplicate an already delivered message. 5 operations/minute. No destination or secret may be supplied.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['process', 'retry'] },
            confirm: { type: 'boolean', enum: [true] },
            eventId: id,
            confirmDuplicateRisk: { type: 'boolean', enum: [true] },
          },
          required: ['action', 'confirm'],
          additionalProperties: false,
        }),
      },
      responses: {
        ...errors,
        '200': {
          description:
            'Bounded processing result; not proof all notifications were delivered',
          content: json(object),
        },
      },
    },
  },
  '/bookings': {
    get: {
      summary: 'List own appointments; owner/admin may list all',
      security: auth,
      description:
        'Requires bookings:read for Bearer. Up to 200 records; truncated indicates more records. Legacy rows without slotId are read-only.',
      parameters: [
        { name: 'mine', in: 'query', schema: { type: 'string', enum: ['1'] } },
      ],
      responses: {
        ...errors,
        '200': {
          description: 'Private bookings',
          content: json({
            type: 'object',
            properties: {
              bookings: { type: 'array', items: booking },
              truncated: { type: 'boolean' },
            },
          }),
        },
      },
    },
    post: {
      summary: 'Atomically reserve one appointment slot',
      security: auth,
      description:
        'Requires bookings:write. Free services are confirmed immediately. Paid services are confirmed with paymentStatus=pending and hold the slot for 15 minutes; call checkout after explicit customer confirmation. Same key+payload replays the original booking. Administrator may supply customerId; customer cannot reserve for another user.',
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string', pattern: '^[a-zA-Z0-9_-]{16,128}$' },
        },
      ],
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          additionalProperties: false,
          required: ['slotId'],
          properties: {
            slotId: id,
            customerId: id,
            customerNote: { type: 'string', maxLength: 1000 },
            expectedPrice: {
              type: 'integer',
              minimum: 0,
              description:
                'Send with expectedCurrency and expectedSlotRevision from the reviewed slot; conflicts prevent reserving a changed offer.',
            },
            expectedCurrency: { type: 'string', pattern: '^[A-Z]{3}$' },
            expectedSlotRevision: revision,
          },
        }),
      },
      responses: {
        ...errors,
        '201': { description: 'Created', content: json(detail) },
        '200': { description: 'Idempotent replay', content: json(detail) },
      },
    },
  },
  '/bookings/{id}/checkout': {
    post: {
      summary: 'Request payment link for a held booking',
      security: auth,
      description:
        'Requires bookings:write. Calls the configured HTTPS payment adapter with a stable payment intent ID. The adapter must deduplicate concurrent requests. This does not mark the booking paid; only the verified booking payment webhook can do that. The 15-minute hold remains authoritative in D1.',
      requestBody: {
        required: true,
        content: json({ type: 'object', additionalProperties: false }),
      },
      responses: {
        ...errors,
        '200': {
          description: 'Payment intent and HTTPS link',
          content: json({
            type: 'object',
            properties: {
              booking,
              payment: {
                type: 'object',
                properties: {
                  id,
                  bookingId: id,
                  amount: { type: 'integer' },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  paymentUrl: { type: 'string', format: 'uri' },
                  expiresAt: { type: 'integer' },
                },
              },
            },
          }),
        },
      },
    },
  },
  '/bookings/{id}/refund': {
    post: {
      summary: 'Request a full Stripe refund for a paid booking',
      security: auth,
      description:
        'Owner/admin only. Calls the configured built-in Stripe adapter with a stable idempotency key, then records the verified refunded state. Customer consent and provider reconciliation remain mandatory outside this endpoint.',
      requestBody: {
        required: true,
        content: json({ type: 'object', additionalProperties: false }),
      },
      responses: {
        ...errors,
        '200': {
          description: 'Refund accepted and booking updated',
          content: json({ type: 'object' }),
        },
      },
    },
  },
  '/bookings/{id}': {
    parameters: [{ name: 'id', in: 'path', required: true, schema: id }],
    get: {
      summary: 'Read private booking and history',
      security: auth,
      responses: {
        ...errors,
        '200': { description: 'Appointment detail', content: json(detail) },
      },
    },
    patch: {
      summary: 'Cancel, reschedule or complete with optimistic revision',
      security: auth,
      description:
        'Requires bookings:write. Customer can cancel/reschedule only own future confirmed booking. Reschedule requires another available slot of the same service, retaining original price/title. Only owner/admin can complete, and only after endsAt. Failure leaves original slot and history intact.',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          additionalProperties: false,
          required: ['action', 'revision'],
          properties: {
            action: {
              type: 'string',
              enum: ['cancel', 'reschedule', 'complete'],
            },
            revision,
            slotId: id,
          },
        }),
      },
      responses: {
        ...errors,
        '200': { description: 'Updated appointment', content: json(detail) },
      },
    },
  },
  '/booking-slots': {
    get: {
      summary: 'Find available appointment times',
      security: [],
      description:
        'Public whitelist of available slots (no customer data). Optional managed=1 requires owner/admin and returns resources, closed/occupied slots without customer details. Bearer needs bookings:read; invalid Bearer never falls back to anonymous. Maximum window 31 days; default 7 days, up to 200 records, truncated signals more.',
      parameters: [
        { name: 'productId', in: 'query', schema: id },
        { name: 'from', in: 'query', schema: instant },
        { name: 'to', in: 'query', schema: instant },
        {
          name: 'managed',
          in: 'query',
          schema: { type: 'string', enum: ['1'] },
        },
      ],
      responses: {
        ...errors,
        '200': {
          description:
            'Slot times are Unix seconds UTC, timezone is IANA, price in minor units',
          content: json({
            type: 'object',
            properties: {
              slots: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id,
                    resourceId: id,
                    productId: id,
                    startsAt: { type: 'integer' },
                    endsAt: { type: 'integer' },
                    service: { type: 'string' },
                    resourceName: { type: 'string' },
                    timeZone: { type: 'string' },
                    price: { type: 'integer' },
                    currency: { type: 'string' },
                    available: { type: 'integer' },
                    occupied: { type: 'integer' },
                    revision,
                  },
                },
              },
              resources: { type: 'array', items: object },
              truncated: { type: 'boolean' },
              from: instant,
              to: instant,
            },
          }),
        },
      },
    },
    post: {
      summary: 'Owner/admin manages resources and immutable slots',
      security: auth,
      description:
        'Bearer requires bookings:write and owner/admin role. Slots cannot overlap for a resource, including closed slots. Closing resource/slot does not cancel existing reservations. Use resource or slot revision to change availability.',
      requestBody: {
        required: true,
        content: json({
          oneOf: [
            {
              type: 'object',
              required: ['action', 'name', 'timeZone'],
              properties: {
                action: { type: 'string', enum: ['create_resource'] },
                name: { type: 'string', maxLength: 120 },
                timeZone: { type: 'string', maxLength: 80 },
              },
            },
            {
              type: 'object',
              required: [
                'action',
                'resourceId',
                'productId',
                'startsAt',
                'endsAt',
              ],
              properties: {
                action: { type: 'string', enum: ['create_slot'] },
                resourceId: id,
                productId: id,
                startsAt: instant,
                endsAt: instant,
              },
            },
            {
              type: 'object',
              required: ['action', 'id', 'active', 'revision'],
              properties: {
                action: { type: 'string', enum: ['set_resource'] },
                id,
                active: { type: 'boolean' },
                revision,
              },
            },
            {
              type: 'object',
              required: ['action', 'id', 'available', 'revision'],
              properties: {
                action: { type: 'string', enum: ['set_slot'] },
                id,
                available: { type: 'boolean' },
                revision,
              },
            },
          ],
        }),
      },
      responses: {
        ...errors,
        '200': {
          description: 'Changed resource or slot ID',
          content: json({ type: 'object', properties: { id } }),
        },
      },
    },
  },
};
