import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').notNull(),
    path: text('path').notNull(),
    target: text('target').notNull(),
    referrer: text('referrer').notNull(),
    device: text('device').notNull(),
    value: integer('value').notNull().default(0),
    conversationId: text('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_analytics_created').on(t.createdAt, t.id),
    index('idx_analytics_visitor_created').on(t.visitorId, t.createdAt, t.id),
  ],
);

export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => users.id),
    subject: text('subject').notNull(),
    status: text('status').notNull(),
    revision: integer('revision').notNull(),
    mutationId: text('mutation_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_support_tickets_customer_created').on(
      table.customerId,
      table.createdAt,
      table.id,
    ),
    index('idx_support_tickets_created').on(table.createdAt, table.id),
  ],
);
export const ticketEvents = sqliteTable(
  'ticket_events',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => supportTickets.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    author: text('author').notNull(),
    action: text('action').notNull(),
    body: text('body'),
    revision: integer('revision').notNull(),
    status: text('status').notNull(),
    fingerprint: text('fingerprint').notNull(),
    source: text('source').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_ticket_events_ticket_revision').on(
      table.ticketId,
      table.revision,
    ),
  ],
);

// Request identity survives completion/failure: never reuse a paid attempt's key.
export const chatRequests = sqliteTable(
  'chat_requests',
  {
    id: text('id').primaryKey(),
    fingerprint: text('fingerprint').notNull(),
    conversationId: text('conversation_id').notNull(),
    state: text('state').notNull(),
    leaseUntil: integer('lease_until').notNull(),
    response: text('response'),
    httpStatus: integer('http_status'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_chat_requests_pending_conversation')
      .on(table.conversationId)
      .where(sql`${table.state} = 'pending'`),
  ],
);

export const aiRequestBudget = sqliteTable('ai_request_budget', {
  id: text('id').primaryKey(),
  day: text('day').notNull(),
  month: text('month').notNull(),
  dayRequests: integer('day_requests').notNull(),
  monthRequests: integer('month_requests').notNull(),
});

export const siteDocuments = sqliteTable('site_documents', {
  key: text('key').primaryKey(),
  revision: integer('revision').notNull().default(0),
  value: text('value').notNull(),
  mutationId: text('mutation_id'),
});
export const siteDocumentRevisions = sqliteTable(
  'site_document_revisions',
  {
    documentKey: text('document_key')
      .notNull()
      .references(() => siteDocuments.key),
    revision: integer('revision').notNull(),
    value: text('value').notNull(),
    action: text('action').notNull(),
    actorId: text('actor_id').notNull(),
    tokenId: text('token_id'),
    source: text('source').notNull(),
    createdAt: integer('created_at').notNull(),
    restoredFrom: integer('restored_from'),
  },
  (table) => [
    uniqueIndex('idx_document_revisions_key_revision').on(
      table.documentKey,
      table.revision,
    ),
  ],
);

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
};
export const engineUpdates = sqliteTable('engine_updates', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  state: text('state').notNull(),
});
// Model routing only. Provider credentials belong in Worker secrets, never D1.
export const aiSettings = sqliteTable('ai_settings', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  config: text('config').notNull(),
});

export const users = sqliteTable('users', {
  revision: integer('revision').notNull().default(0),
  mutationId: text('mutation_id'),
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  role: text('role').notNull().default('customer'),
  suspended: integer('suspended').notNull().default(0),
  ...timestamps,
});
// No user FK: a deletion event must outlive the deleted contact. Never stores credentials.
export const customerRevisions = sqliteTable(
  'customer_revisions',
  {
    customerId: text('customer_id').notNull(),
    revision: integer('revision').notNull(),
    snapshot: text('snapshot').notNull(),
    action: text('action').notNull(),
    actorId: text('actor_id').notNull(),
    tokenId: text('token_id'),
    source: text('source').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_customer_revisions').on(table.customerId, table.revision),
  ],
);
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('idx_sessions_user_expiry').on(table.userId, table.expiresAt),
  ],
);
export const assistantProfiles = sqliteTable('assistant_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  defaultLocale: text('default_locale').notNull().default('ru'),
  activeModel: text('active_model').notNull().default('demo'),
  status: text('status').notNull().default('active'),
  ...timestamps,
});
export const assistantPromptVersions = sqliteTable(
  'assistant_prompt_versions',
  {
    id: text('id').primaryKey(),
    assistantId: text('assistant_id')
      .notNull()
      .references(() => assistantProfiles.id),
    version: integer('version').notNull(),
    prompt: text('prompt').notNull(),
    published: integer('published', { mode: 'boolean' })
      .notNull()
      .default(false),
    ...timestamps,
  },
);
export const pages = sqliteTable('pages', {
  revision: integer('revision').notNull().default(0),
  mutationId: text('mutation_id'),
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),
  blocks: text('blocks', { mode: 'json' })
    .$type<unknown[]>()
    .notNull()
    .default([]),
  seo: text('seo', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  ...timestamps,
});
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => users.id),
  guestTokenHash: text('guest_token_hash'),
  guestExpiresAt: integer('guest_expires_at', { mode: 'timestamp' }),
  locale: text('locale').notNull().default('ru'),
  status: text('status').notNull().default('open'),
  ...timestamps,
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    role: text('role').notNull(),
    content: text('content').notNull(),
    model: text('model'),
    fileId: text('file_id').references(() => files.id),
    ...timestamps,
  },
  (table) => [
    index('idx_messages_conversation_created').on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    index('idx_messages_role_created').on(
      table.role,
      table.createdAt,
      table.id,
    ),
  ],
);
export const bookingResources = sqliteTable('booking_resources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timeZone: text('time_zone').notNull(),
  active: integer('active').notNull().default(1),
  revision: integer('revision').notNull().default(0),
  ...timestamps,
});
export const bookingSlots = sqliteTable(
  'booking_slots',
  {
    id: text('id').primaryKey(),
    resourceId: text('resource_id')
      .notNull()
      .references(() => bookingResources.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    available: integer('available').notNull().default(1),
    revision: integer('revision').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('idx_slots_resource_start').on(table.resourceId, table.startsAt),
    index('idx_slots_product_start').on(table.productId, table.startsAt),
  ],
);
export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').references(() => users.id),
    service: text('service').notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp' }),
    status: text('status').notNull().default('pending'),
    slotId: text('slot_id').references(() => bookingSlots.id),
    productId: text('product_id').references(() => products.id),
    endsAt: integer('ends_at'),
    timeZone: text('time_zone'),
    resourceName: text('resource_name'),
    price: integer('price'),
    currency: text('currency'),
    customerNote: text('customer_note'),
    paymentStatus: text('payment_status').notNull().default('not_required'),
    holdExpiresAt: integer('hold_expires_at'),
    requestKey: text('request_key'),
    requestHash: text('request_hash'),
    mutationId: text('mutation_id'),
    revision: integer('revision').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_bookings_request').on(table.requestKey),
    uniqueIndex('idx_bookings_active_slot')
      .on(table.slotId)
      .where(sql`${table.status} IN ('confirmed', 'pending_payment')`),
    index('idx_bookings_customer_start').on(table.customerId, table.startsAt),
    index('idx_bookings_payment_hold').on(table.status, table.holdExpiresAt),
  ],
);
export const bookingEvents = sqliteTable(
  'booking_events',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    revision: integer('revision').notNull(),
    slotId: text('slot_id'),
    startsAt: integer('starts_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_booking_events_booking_revision').on(
      table.bookingId,
      table.revision,
    ),
  ],
);
export const bookingPaymentIntents = sqliteTable(
  'booking_payment_intents',
  {
    id: text('id').primaryKey(),
    bookingId: text('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    status: text('status').notNull().default('pending'),
    paymentUrl: text('payment_url'),
    providerPaymentId: text('provider_payment_id'),
    eventId: text('event_id').unique(),
    expiresAt: integer('expires_at').notNull(),
    ...timestamps,
  },
  (table) => [
    index('idx_booking_payment_status_expiry').on(
      table.status,
      table.expiresAt,
    ),
  ],
);
export const bookingNotifications = sqliteTable(
  'booking_notifications',
  {
    eventId: text('event_id')
      .primaryKey()
      .references(() => bookingEvents.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: integer('next_attempt_at').notNull().default(0),
    leaseId: text('lease_id'),
    leaseUntil: integer('lease_until'),
    sentAt: integer('sent_at'),
    messageId: integer('message_id'),
    lastError: text('last_error'),
  },
  (table) => [
    index('idx_booking_notifications_due').on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
);
export const bookingPaymentEvents = sqliteTable(
  'booking_payment_events',
  {
    id: text('id').primaryKey(),
    intentId: text('intent_id')
      .notNull()
      .references(() => bookingPaymentIntents.id),
    status: text('status').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_booking_payment_events_intent').on(
      table.intentId,
      table.createdAt,
    ),
  ],
);
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  config: text('config', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});
export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    objectKey: text('object_key').notNull().unique(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    status: text('status').notNull().default('uploaded'),
    requestKey: text('request_key'),
    contentHash: text('content_hash'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('files_user_request_unique').on(table.userId, table.requestKey),
    index('files_user_status_idx').on(table.userId, table.status),
    index('files_status_idx').on(table.status),
  ],
);
export const apiTokens = sqliteTable('api_tokens', {
  audience: text('audience').notNull().default('account'),
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  name: text('name').notNull(),
  scopes: text('scopes', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(['*']),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  ...timestamps,
});
export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  ...timestamps,
});
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  kind: text('kind').notNull().default('service'),
  title: text('title').notNull(),
  shortDescription: text('short_description').notNull(),
  description: text('description').notNull().default(''),
  price: integer('price').notNull().default(0),
  currency: text('currency').notNull().default('RUB'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  imageUrl: text('image_url'),
  aiInstructions: text('ai_instructions').notNull().default(''),
  metadata: text('metadata', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  seo: text('seo', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  ...timestamps,
});
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').references(() => users.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    productTitle: text('product_title'),
    unitPrice: integer('unit_price'),
    requestKey: text('request_key').unique(),
    requestHash: text('request_hash'),
    mutationId: text('mutation_id'),
    revision: integer('revision').notNull().default(0),
    quantity: integer('quantity').notNull().default(1),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('RUB'),
    status: text('status').notNull().default('pending'),
    paymentProvider: text('payment_provider').notNull().default('manual'),
    paymentUrl: text('payment_url'),
    customerNote: text('customer_note'),
    ...timestamps,
  },
  (table) => [
    index('idx_orders_customer_created').on(table.customerId, table.createdAt),
  ],
);
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id),
    actorId: text('actor_id'),
    status: text('status').notNull(),
    note: text('note').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_order_events_order_created').on(table.orderId, table.createdAt),
  ],
);

export const pageRevisions = sqliteTable(
  'page_revisions',
  {
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id),
    revision: integer('revision').notNull(),
    action: text('action').notNull(),
    actorId: text('actor_id').notNull(),
    tokenId: text('token_id'),
    source: text('source').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_page_revisions_page_revision').on(
      table.pageId,
      table.revision,
    ),
  ],
);

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_pwd_reset_user').on(table.userId, table.expiresAt),
    uniqueIndex('idx_pwd_reset_hash').on(table.tokenHash),
  ],
);

