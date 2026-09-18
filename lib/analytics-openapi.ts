const privateSecurity = [{ cookieAuth: [] }];
export const analyticsPaths = {
  '/analytics': {
    get: {
      summary: 'Private behavior and conversation analytics',
      security: privateSecurity,
      description:
        'Standard only, administrator browser session; bearer tokens rejected. periods: rolling 24h/7d/30d/90d, custom UTC ISO from inclusive/to exclusive <=90 days. Behavior filtered by retention; operational messages use selected period independently. visitor drills into 100 events; conversation reads 50 original messages across entire thread (not limited by selected period). before paginates detail. visitsBefore/chatsBefore paginate 50-entry report lists. Metrics are consented browser estimates, not unique people or billing. private,no-store. Report lazily deletes up to 2000 expired behavior rows.',
      parameters: [
        {
          name: 'period',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['24h', '7d', '30d', '90d', 'custom'],
            default: '24h',
          },
        },
        ...[
          'from',
          'to',
          'visitor',
          'conversation',
          'before',
          'visitsBefore',
          'chatsBefore',
        ].map((name) => ({ name, in: 'query', schema: { type: 'string' } })),
      ],
    },
    post: {
      summary: 'Configure analytics or clean expired events',
      security: privateSecurity,
      description:
        'Administrator session and same-origin JSON. {revision,value:{enabled,retentionDays:7|30|90},confirm:true} changes versioned settings. Default disabled/30 days. Shortening retention causes irreversible lazy cleanup. Alternative {action:"cleanup",confirm:true} deletes at most 2000 expired rows only. Never deletes operational conversations. 409 stale revision; 20 changes/minute.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
    },
  },
  '/analytics/events': {
    get: {
      summary: 'Public collection status',
      security: [],
      description:
        'Only enabled and retentionDays; no metrics, identities or messages.',
    },
    post: {
      summary: 'Consent-gated browser event',
      security: [],
      description:
        'Same-origin JSON only, no bearer tokens. {consent:true,event:{id:UUID,kind:page_view|click|scroll|engagement,path,target?,referrer?,device:mobile|tablet|desktop,value?}}. No arbitrary properties, text, form data, client identity/time or conversation IDs. Public configured paths only. Referrer stored as hostname, URL query/hash discarded. 428 sets HttpOnly 30-minute cookie before retry with same event ID. Max 120 requests/IP/minute and 10000 events/site/UTC day. IDs deduplicate within cookie session. DNT/GPC, admins, disabled collection excluded. {consent:false} clears cookie; does not erase history. Best effort, not authoritative business data.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        '200': {
          description: 'Accepted, duplicate or collection disabled/excluded',
        },
        '428': { description: 'Cookie established; repeat same event' },
        '429': { description: 'Rate/cap limit; Retry-After' },
        default: {
          description:
            'Rejected input, origin, identity or unavailable storage',
        },
      },
    },
  },
};
