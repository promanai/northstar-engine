import { documentStore } from '@/lib/document-store';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { RequestFailure } from '@/lib/request-security';
import { expectedRevision } from '@/lib/admin-policy';

export type TelegramIntegration = {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyOnBookings: boolean;
  notifyOnOrders: boolean;
  notifyOnTickets: boolean;
};

export type WebhookIntegration = {
  enabled: boolean;
  url: string;
  secret: string;
  events: string[];
};

export type PaymentsIntegration = {
  provider: 'manual' | 'stripe';
  stripePublishableKey: string;
  stripeSecretKey: string;
  currency: string;
  testMode: boolean;
};

export type EmailIntegration = {
  enabled: boolean;
  provider: 'resend' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type IntegrationsConfig = {
  telegram: TelegramIntegration;
  webhooks: WebhookIntegration;
  payments: PaymentsIntegration;
  email: EmailIntegration;
};

export const defaultIntegrations: IntegrationsConfig = {
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyOnBookings: true,
    notifyOnOrders: true,
    notifyOnTickets: true,
  },
  webhooks: {
    enabled: false,
    url: '',
    secret: '',
    events: ['booking.created', 'order.created', 'ticket.created'],
  },
  payments: {
    provider: 'manual',
    stripePublishableKey: '',
    stripeSecretKey: '',
    currency: 'RUB',
    testMode: true,
  },
  email: {
    enabled: false,
    provider: 'resend',
    apiKey: '',
    fromEmail: 'noreply@example.com',
    fromName: 'Клиника OraVera',
  },
};

function checked<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректный запрос',
    );
  }
}

function requireIntegrationsAdmin(actor: ContentActor | null, write = false) {
  if (
    !actor ||
    !isAdministrator(actor.role) ||
    (actor.tokenId &&
      !actor.scopes?.includes('*') &&
      !actor.scopes?.includes(`integrations:${write ? 'write' : 'read'}`) &&
      !actor.scopes?.includes(`settings:${write ? 'write' : 'read'}`))
  )
    throw new RequestFailure('Недостаточно прав для управления интеграциями', 403);
  return actor;
}

function store() {
  return documentStore<IntegrationsConfig>('integrations-config', defaultIntegrations);
}

function maskSecret(val: string): string {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return val.slice(0, 4) + '••••••••' + val.slice(-4);
}

export async function readIntegrations(actor: ContentActor | null, raw = false) {
  requireIntegrationsAdmin(actor);
  const state = await store().read();
  if (raw) return { ...state.value, revision: state.revision };

  // Mask sensitive credentials before returning to client
  const masked: IntegrationsConfig = {
    ...state.value,
    telegram: {
      ...state.value.telegram,
      botToken: maskSecret(state.value.telegram.botToken),
    },
    webhooks: {
      ...state.value.webhooks,
      secret: maskSecret(state.value.webhooks.secret),
    },
    payments: {
      ...state.value.payments,
      stripeSecretKey: maskSecret(state.value.payments.stripeSecretKey),
    },
    email: {
      ...state.value.email,
      apiKey: maskSecret(state.value.email.apiKey),
    },
  };

  return { ...masked, revision: state.revision };
}

export async function changeIntegrations(
  actor: ContentActor | null,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireIntegrationsAdmin(actor, true);

  if (body.confirm !== true)
    throw new RequestFailure('Требуется confirm: true для сохранения интеграций');

  const expected = checked(() => expectedRevision(body.revision));
  const documents = store();
  const current = await documents.read();

  const conflict = () =>
    new RequestFailure(
      'Настройки интеграций уже изменены другим администратором. Обновите страницу.',
      409,
    );

  if (current.revision !== expected) throw conflict();

  const input = body.integrations as Partial<IntegrationsConfig> | undefined;
  if (!input || typeof input !== 'object')
    throw new RequestFailure('Некорректные параметры интеграций');

  const unmask = (newVal: string | undefined, oldVal: string) => {
    if (!newVal || newVal.includes('••••••••')) return oldVal;
    return newVal.trim();
  };

  const next: IntegrationsConfig = {
    telegram: {
      enabled: Boolean(input.telegram?.enabled),
      botToken: unmask(input.telegram?.botToken, current.value.telegram.botToken),
      chatId: (input.telegram?.chatId ?? current.value.telegram.chatId).trim(),
      notifyOnBookings: input.telegram?.notifyOnBookings !== false,
      notifyOnOrders: input.telegram?.notifyOnOrders !== false,
      notifyOnTickets: input.telegram?.notifyOnTickets !== false,
    },
    webhooks: {
      enabled: Boolean(input.webhooks?.enabled),
      url: (input.webhooks?.url ?? current.value.webhooks.url).trim(),
      secret: unmask(input.webhooks?.secret, current.value.webhooks.secret),
      events: Array.isArray(input.webhooks?.events)
        ? input.webhooks.events
        : current.value.webhooks.events,
    },
    payments: {
      provider: input.payments?.provider === 'stripe' ? 'stripe' : 'manual',
      stripePublishableKey: (
        input.payments?.stripePublishableKey ??
        current.value.payments.stripePublishableKey
      ).trim(),
      stripeSecretKey: unmask(
        input.payments?.stripeSecretKey,
        current.value.payments.stripeSecretKey,
      ),
      currency: (input.payments?.currency ?? 'RUB').trim().toUpperCase(),
      testMode: input.payments?.testMode !== false,
    },
    email: {
      enabled: Boolean(input.email?.enabled),
      provider: input.email?.provider === 'smtp' ? 'smtp' : 'resend',
      apiKey: unmask(input.email?.apiKey, current.value.email.apiKey),
      fromEmail: (input.email?.fromEmail ?? current.value.email.fromEmail).trim(),
      fromName: (input.email?.fromName ?? current.value.email.fromName).trim(),
    },
  };

  const saved = await documents.save(
    current,
    next,
    user.id,
    user.tokenId ?? null,
    source,
    null,
  );

  if (!saved) throw conflict();

  return readIntegrations(user);
}

export async function testIntegration(
  actor: ContentActor | null,
  type: 'telegram' | 'webhook',
) {
  requireIntegrationsAdmin(actor);
  const current = (await store().read()).value;

  if (type === 'telegram') {
    const { botToken, chatId } = current.telegram;
    if (!botToken || !chatId) {
      throw new RequestFailure('Укажите Bot Token и Chat ID перед проверкой связи');
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🔔 <b>Тест интеграции OraVera</b>\nПодключение Telegram-бота работает штатно. Уведомления о бронированиях и заказах активны.',
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await res.json()) as { ok: boolean; description?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.description || 'Не удалось доставить сообщение');
      }

      return {
        ok: true,
        message: 'Тестовое сообщение успешно отправлено в Telegram!',
      };
    } catch (e) {
      throw new RequestFailure(
        `Ошибка связи с Telegram: ${e instanceof Error ? e.message : 'Таймаут или неверный токен'}`,
        400,
      );
    }
  }

  if (type === 'webhook') {
    const { url } = current.webhooks;
    if (!url) {
      throw new RequestFailure('Укажите Webhook URL перед проверкой связи');
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'NorthstarEngine-Webhook/1.0',
        },
        body: JSON.stringify({
          event: 'test.ping',
          timestamp: new Date().toISOString(),
          site: 'OraVera',
          data: { status: 'healthy', message: 'Тестовый вебхук проверки связи' },
        }),
        signal: AbortSignal.timeout(10000),
      });

      return {
        ok: true,
        status: res.status,
        message: `Вебхук отправлен успешно (HTTP ${res.status}).`,
      };
    } catch (e) {
      throw new RequestFailure(
        `Ошибка отправки вебхука: ${e instanceof Error ? e.message : 'Сервер не отвечает'}`,
        400,
      );
    }
  }

  throw new RequestFailure('Неподдерживаемый тип тестирования');
}
