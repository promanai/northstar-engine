export const billingPaths = {
  '/billing': {
    get: {
      summary:
        'Private subscription and infrastructure register with local AI counters',
      security: [{ cookieAuth: [] }],
      description:
        'Administrator browser session only, Bearer denied. Standard/D1. Returns revision, value.entries, limited revision metadata and aiBudget (null when unavailable). External service amounts, plans and renewal dates are manually entered, not billing API observations. Defaults are unknown, not zero. No secrets or external billing calls.',
      responses: {
        '200': {
          description:
            'Manual register and independent local AI quota snapshot; private no-store',
        },
        '403': { description: 'Administrator browser session required' },
        '503': { description: 'Storage unavailable' },
      },
    },
    put: {
      summary:
        'Replace the manual subscription register with optimistic concurrency',
      security: [{ cookieAuth: [] }],
      description:
        'Administrator browser session only; same-origin JSON. Supply current revision and complete value.entries (max 30). Each entry: id, kind (promanos/cloudflare/domain/other), name, resource, plan, status (unknown/active/trial/paused/cancelled), currency (USD/EUR/RUB), fee/spent/budget (nullable minor units), cycle (monthly/yearly/once), renewal (empty or YYYY-MM-DD), autoRenew (unknown/on/off), period (empty or YYYY-MM, required with usage), requests/requestLimit (nullable integers), notes. PromanOS plan: empty or demo-start/demo-basic/demo-plus/demo-pro/demo-business/demo-enterprise. Changes never purchase/cancel provider plans, renew domains or enforce spending caps. Prices/limits are not supplied by the six demo plans. No secret fields accepted.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['revision', 'value'],
              properties: {
                revision: { type: 'integer', minimum: 0 },
                value: {
                  type: 'object',
                  required: ['entries'],
                  properties: {
                    entries: {
                      type: 'array',
                      maxItems: 30,
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Exact committed revision and value' },
        '400': { description: 'Invalid input' },
        '403': { description: 'Forbidden' },
        '409': { description: 'Stale revision; reread before resubmitting' },
        '429': { description: 'Write rate limit' },
        '503': { description: 'Storage unavailable' },
      },
    },
  },
};
