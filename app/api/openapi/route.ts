import { filePaths } from '@/lib/file-openapi';
import { ticketPaths } from '@/lib/ticket-openapi';
import { analyticsPaths } from '@/lib/analytics-openapi';
import { chatPaths } from '@/lib/chat-openapi';
import { adminPaths } from '@/lib/admin-openapi';
import { siteConfigPaths } from '@/lib/site-config-openapi';
import { pagePaths } from '@/lib/page-openapi';
import { navigationPaths } from '@/lib/navigation-openapi';
import { commercePaths } from '@/lib/commerce-openapi';
import { agentPaths } from '@/lib/agent-openapi';
import { aiPaths } from '@/lib/ai-openapi';
import { bookingPaths } from '@/lib/booking-openapi';
import { billingPaths } from '@/lib/billing-openapi';

const operationMethods = ['get', 'post', 'put', 'patch', 'delete'];
const defaultResponses = {
  '200': { description: 'Successful response' },
  default: {
    description: 'Request rejected or service unavailable',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  },
};

function operationId(method: string, route: string) {
  const slug = route
    .replaceAll('{', 'by_')
    .replaceAll('}', '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${method}_${slug || 'root'}`;
}

function completePaths(pathItems: Record<string, Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(pathItems).map(([route, item]) => {
      const completed = { ...item };
      for (const method of operationMethods) {
        const operation = completed[method];
        if (!operation || typeof operation !== 'object') continue;
        const normalized = { ...(operation as Record<string, unknown>) };
        normalized.operationId ??= operationId(method, route);
        normalized.responses ??= defaultResponses;
        completed[method] = normalized;
      }
      return [route, completed];
    }),
  );
}
export async function GET() {
  return Response.json({
    openapi: '3.0.3',
    info: {
      title: 'Northstar Engine API',
      version: '0.4.0',
      description: 'AI-first API for a self-hosted Cloudflare site.',
    },
    servers: [{ url: '/api', description: 'Current installation' }],
    security: [{ bearerAuth: [] }],
    paths: completePaths({
      '/auth/sessions': {
        get: {
          summary: 'List own active browser sessions',
          security: [{ cookieAuth: [] }],
          description:
            'Standard only. Session cookie, strict customer/admin/owner roles, no bearer fallback or foreign origin. No URL parameters. Up to 100 sessions, current first, then createdAt/id descending; truncated=true if more. Only id, createdAt/expiresAt in milliseconds, current flag. No tokens, hashes, IP or device information. Private no-store; 30 reads/user/minute.',
        },
        delete: {
          summary: 'Revoke own other browser sessions',
          security: [{ cookieAuth: [] }],
          description:
            'Standard only. Requires currentPassword and confirm:true. target is a session UUID or others. Current session cannot be revoked here; use logout. Unknown/foreign/already revoked targets all return revoked:0 without revealing ownership. Atomic password/current-session recheck. Repeat-safe; 10 attempts/user/15 minutes. Does not revoke API tokens, stop in-flight operations or prevent new logins. Private no-store.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['target', 'currentPassword', 'confirm'],
                  properties: {
                    target: {
                      type: 'string',
                      description: 'others or session UUID',
                    },
                    currentPassword: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 256,
                      writeOnly: true,
                    },
                    confirm: { type: 'boolean', enum: [true] },
                  },
                },
              },
            },
          },
        },
      },
      '/overview': {
        get: {
          summary: 'Administrator operational overview',
          security: [{ cookieAuth: [] }],
          description:
            'Standard only; owner/admin browser session, no bearer fallback. private,no-store. 10 reads/minute/admin. Rolling period 24h/7d/30d (default30d), half-open UTC range returned in milliseconds. Counts: newly created customers/orders/bookings/tickets, distinct guest/customer conversations with saved user messages in period (including demo). Administrators excluded from customers/conversations. Current pending orders/open tickets and active upcoming 7-day bookings ignore selected period. Expired payment holds excluded. Latest five ticket subjects/statuses/creation dates across all time. No payment sums, response-time estimates, growth percentages, contact details or message bodies. No behavioral consent needed: operational data, not visitor tracking.',
          parameters: [
            {
              name: 'period',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['24h', '7d', '30d'],
                default: '30d',
              },
            },
          ],
        },
      },
      ...ticketPaths,
      ...analyticsPaths,
      ...commercePaths,
      ...aiPaths,
      ...bookingPaths,
      ...billingPaths,
      '/auth/register': {
        post: { summary: 'Register the first owner or a customer' },
      },
      '/auth/login': { post: { summary: 'Create a browser session' } },
      '/auth/logout': {
        post: { summary: 'Delete the current browser session' },
      },
      '/auth/me': {
        get: { summary: 'Get current user' },
        patch: {
          summary: 'Update own profile or password with current revision',
          description:
            'Cookie only. Read revision from GET /auth/me and include it in PATCH. Competing admin/self-service updates return 409, never overwrite. Allowed fields: revision, firstName, lastName, email, phone, currentPassword, newPassword. Password changes revoke browser sessions. Customer contact history omits all credentials.',
        },
      },
      ...chatPaths,
      '/conversations': {
        get: {
          summary: 'List saved conversations and messages',
          description:
            'Private no-store. scope=mine selects own conversations (also for admin chat). Customers always own-only. Latest 100 messages in chronological order, attachment metadata requires file read permission; unavailable file has no download URL. Contents/base64/object keys are never returned.',
        },
      },
      ...pagePaths,
      ...navigationPaths,
      ...siteConfigPaths,
      '/content': { get: { summary: 'Get a published page as Markdown' } },
      '/products': {
        get: { summary: 'List public catalog or owner catalog' },
        post: { summary: 'Create a product or service' },
      },
      '/products/{id}': {
        get: { summary: 'Get a catalog item' },
        patch: { summary: 'Update a catalog item' },
        delete: { summary: 'Delete a catalog item' },
      },
      ...filePaths,
      '/settings': {
        get: {
          summary:
            'Public: known branding fields only; administrator: extension settings and current branding',
        },
        put: {
          summary:
            'Legacy extension setting only. Branding requires /site-config with revision; navigation requires /navigation.',
        },
      },
      ...adminPaths,
      '/health': {
        get: {
          summary: 'Liveness and build identity',
          security: [],
          description:
            'No-store, no D1/R2/provider reads. Returns status, service, runtime mode, storage type, build version and build {format:1,id,version,commit}. Build ID fingerprints selected source inputs, not a signature or runtime configuration. commit is null unless stamped at build time. Does not confirm database readiness or applied migrations.',
        },
      },
      ...agentPaths,
    }),
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'northstar_session' },
        paymentWebhookSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-payment-secret',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Northstar API token',
        },
      },
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
            amount: { type: 'integer', description: 'Minor currency units' },
            status: { type: 'string' },
            paymentUrl: { type: 'string', nullable: true },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            title: { type: 'string' },
            shortDescription: { type: 'string' },
            price: { type: 'integer' },
            currency: { type: 'string' },
            active: { type: 'boolean' },
          },
        },
      },
    },
  });
}
