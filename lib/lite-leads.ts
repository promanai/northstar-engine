// Stateless, opt-in lead transport. No database, chat history, cookies or file bytes.
export type LeadEnv = {
  LITE_LEADS_ENABLED?: string;
  LITE_LEAD_WEBHOOK_URL?: string;
  LITE_LEAD_WEBHOOK_TOKEN?: string;
  LITE_LEAD_RECIPIENT?: string;
  LITE_LEAD_PRIVACY_PATH?: string;
  LITE_LEAD_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...(status === 429 ? { 'retry-after': '60' } : {}),
    },
  });
const clean = (v: unknown, max: number): v is string =>
  typeof v === 'string' &&
  !!v.trim() &&
  v.length <= max &&
  !Array.from(v).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
function configuration(env: LeadEnv) {
  if (
    env.LITE_LEADS_ENABLED !== 'true' ||
    !env.LITE_LEAD_LIMITER ||
    !clean(env.LITE_LEAD_RECIPIENT, 120) ||
    !env.LITE_LEAD_PRIVACY_PATH ||
    !/^\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(env.LITE_LEAD_PRIVACY_PATH) ||
    env.LITE_LEAD_PRIVACY_PATH.length > 200 ||
    !env.LITE_LEAD_WEBHOOK_TOKEN ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(env.LITE_LEAD_WEBHOOK_TOKEN)
  )
    return null;
  try {
    const raw = env.LITE_LEAD_WEBHOOK_URL;
    if (!raw || raw.length > 2048 || raw !== raw.trim()) return null;
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.port && url.port !== '443') ||
      (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,}$/i.test(url.hostname) &&
        !/^[a-z0-9-]+\.[a-z]{2,}$/i.test(url.hostname)) ||
      /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/i.test(
        url.hostname,
      )
    )
      return null;
    return {
      url: url.href,
      token: env.LITE_LEAD_WEBHOOK_TOKEN,
      recipient: env.LITE_LEAD_RECIPIENT.trim(),
      privacyPath: env.LITE_LEAD_PRIVACY_PATH,
    };
  } catch {
    return null;
  }
}
async function configurationId(
  config: NonNullable<ReturnType<typeof configuration>>,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(config.token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(
      JSON.stringify([config.url, config.recipient, config.privacyPath]),
    ),
  );
  return Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function liteLeadStatus(env: LeadEnv) {
  const config = configuration(env);
  return config
    ? {
        enabled: true as const,
        recipient: config.recipient,
        privacyPath: config.privacyPath,
        configurationId: await configurationId(config),
      }
    : { enabled: false as const };
}
export function validateLead(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_LEAD');
  const v = value as Record<string, unknown>;
  const keys = [
    'id',
    'name',
    'contact',
    'message',
    'consent',
    'configurationId',
  ];
  if (
    Object.keys(v).length !== keys.length ||
    !keys.every((k) => Object.hasOwn(v, k)) ||
    typeof v.id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      v.id,
    ) ||
    !clean(v.name, 120) ||
    !clean(v.contact, 200) ||
    typeof v.message !== 'string' ||
    !v.message.trim() ||
    v.message.length > 4000 ||
    v.consent !== true ||
    typeof v.configurationId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v.configurationId)
  )
    throw new Error('INVALID_LEAD');
  const contact = (v.contact as string).trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) &&
    !(
      /^[+\d ()-]+$/.test(contact) &&
      contact.replace(/\D/g, '').length >= 7 &&
      contact.replace(/\D/g, '').length <= 20
    )
  )
    throw new Error('INVALID_LEAD');
  return {
    id: v.id,
    name: (v.name as string).trim(),
    contact,
    message: v.message.trim(),
    consent: true as const,
    configurationId: v.configurationId,
  };
}
async function boundedJson(message: Request | Response, max: number) {
  const reader = message.body?.getReader();
  if (!reader) throw new Error('NO_BODY');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('TIMEOUT')), 8000);
  });
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      length += value.byteLength;
      if (length > max) throw new Error('TOO_LARGE');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function liteLeads(
  request: Request,
  env: LeadEnv,
  transport: typeof fetch = fetch,
): Promise<Response> {
  const notSent = async (error: string, status: number) => {
    // Drain small rejected bodies for Worker keep-alive; cap bytes and time.
    if (!request.bodyUsed && request.body) {
      try {
        await boundedJson(request, 16384);
      } catch {
        /* Discard invalid input. */
      }
    }
    return reply({ error, delivery: 'not_sent' }, status);
  };
  if (request.method === 'GET') return reply(await liteLeadStatus(env));
  if (request.method !== 'POST') return notSent('Метод не поддерживается', 405);
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    request.headers.has('authorization')
  )
    return notSent('Недопустимый источник запроса', 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get('content-type') ?? '',
    )
  )
    return notSent('Требуется JSON', 415);
  const config = configuration(env);
  if (!config)
    return notSent('Приём заявок не подключён владельцем сайта', 503);
  let lead: ReturnType<typeof validateLead>;
  try {
    lead = validateLead(await boundedJson(request, 16384));
  } catch {
    return notSent(
      'Проверьте имя, email или телефон, текст до 4000 символов и согласие на передачу',
      400,
    );
  }
  if (lead.configurationId !== (await configurationId(config)))
    return notSent(
      'Настройки получателя изменились. Обновите страницу и повторно подтвердите передачу',
      409,
    );
  try {
    if (
      !(
        await env.LITE_LEAD_LIMITER!.limit({
          key: 'lead:' + (request.headers.get('cf-connecting-ip') ?? 'local'),
        })
      ).success
    )
      return notSent('Слишком много заявок. Повторите через минуту', 429);
  } catch {
    return notSent('Приём заявок временно недоступен', 503);
  }
  try {
    const response = await transport(config.url, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + config.token,
        'idempotency-key': lead.id,
      },
      body: JSON.stringify({
        version: 1,
        id: lead.id,
        name: lead.name,
        contact: lead.contact,
        message: lead.message,
        consent: true,
        recipient: config.recipient,
        privacyPath: config.privacyPath,
      }),
    });
    if (![200, 202].includes(response.status)) {
      void response.body?.cancel().catch(() => {});
      throw new Error('NOT_ACKNOWLEDGED');
    }
    const receipt = (await boundedJson(response, 4096)) as Record<
      string,
      unknown
    > | null;
    if (!receipt || receipt.accepted !== true || receipt.id !== lead.id)
      throw new Error('INVALID_RECEIPT');
    return reply({ accepted: true, id: lead.id, delivery: 'accepted' }, 202);
  } catch {
    // Never retry automatically: the recipient might have accepted the request already.
    return reply(
      {
        error:
          'Не удалось подтвердить приём. Заявка могла дойти. Повтор возможен только с тем же номером; проверьте его у получателя',
        id: lead.id,
        delivery: 'unknown',
      },
      502,
    );
  }
}

export const liteLeadOpenApi = {
  get: {
    operationId: 'get_leads',
    summary: 'Opt-in lead form capability; no credentials or endpoint exposed',
    security: [],
    responses: {
      '200': {
        description: 'Enabled and public recipient details, or disabled',
      },
    },
  },
  post: {
    operationId: 'post_leads',
    summary:
      'Explicitly consented lead to owner-configured receiver; no local storage or automatic retries',
    security: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'id',
              'name',
              'contact',
              'message',
              'consent',
              'configurationId',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', minLength: 1, maxLength: 120 },
              contact: { type: 'string', minLength: 1, maxLength: 200 },
              message: { type: 'string', minLength: 1, maxLength: 4000 },
              consent: { type: 'boolean', enum: [true] },
              configurationId: { type: 'string', pattern: '^[a-f0-9]{64}$' },
            },
          },
        },
      },
    },
    responses: {
      '202': {
        description:
          'Receiver explicitly acknowledged this ID; not a completed order',
      },
      '502': {
        description:
          'Delivery unknown; do not generate another ID or retry automatically',
      },
      default: {
        description:
          'Rejected before dispatch: validation, origin, configuration or rate limit',
      },
    },
  },
};
