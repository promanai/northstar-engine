export const bookingNotificationCron = '*/5 * * * *';
export const bookingEventLabels: Record<string, string> = {
  created: 'Новая запись — проверьте статус оплаты',
  cancel: 'Запись отменена',
  reschedule: 'Запись перенесена',
  complete: 'Приём завершён',
  payment_paid: 'Оплата подтверждена',
  payment_expired: 'Удержание истекло',
  payment_cancelled: 'Оплата отменена',
  payment_refunded: 'Возврат подтверждён',
};
type Config = {
  BOOKING_TELEGRAM_ENABLED?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  PUBLIC_SITE_URL?: string;
};
export function telegramConfiguration(config: Config) {
  if (config.BOOKING_TELEGRAM_ENABLED !== 'true') return null;
  if (
    !/^\d{5,16}:[A-Za-z0-9_-]{20,100}$/.test(config.TELEGRAM_BOT_TOKEN || '') ||
    !/^-?[1-9]\d{0,19}$/.test(config.TELEGRAM_CHAT_ID || '')
  )
    return null;
  try {
    const url = new URL(config.PUBLIC_SITE_URL || '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hostname === 'example.com' ||
      url.hostname === 'localhost' ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return {
      token: config.TELEGRAM_BOT_TOKEN!,
      chatId: config.TELEGRAM_CHAT_ID!,
      adminUrl: `${url.origin}/admin#bookings`,
    };
  } catch {
    return null;
  }
}
export type TelegramOutcome = {
  status: 'sent' | 'pending' | 'failed' | 'uncertain';
  messageId?: number;
  retryAfter?: number;
  error?: string;
};
// Fixed API host; no recipient, URL, formatting or personal data from customer input.
export async function sendBookingTelegram(
  config: NonNullable<ReturnType<typeof telegramConfiguration>>,
  event: { id: string; bookingId: string; action: string; revision: number },
  transport: typeof fetch = fetch,
): Promise<TelegramOutcome> {
  try {
    const response = await transport(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: `${bookingEventLabels[event.action] || 'Запись обновлена'}\nЗапись: ${event.bookingId}\nВерсия: ${event.revision}\nСобытие: ${event.id}\nПодробности доступны только после входа:\n${config.adminUrl}`,
          link_preview_options: { is_disabled: true },
          protect_content: true,
          allow_paid_broadcast: false,
        }),
      },
    );
    if (response.status >= 300 && response.status < 400)
      return { status: 'failed', error: 'telegram_redirect_blocked' };
    const data = (await response.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      error_code?: number;
      parameters?: { retry_after?: number };
    };
    if (
      response.ok &&
      data.ok === true &&
      Number.isSafeInteger(data.result?.message_id)
    )
      return { status: 'sent', messageId: data.result!.message_id };
    if (
      (response.status === 429 || data.error_code === 429) &&
      data.ok === false
    )
      return {
        status: 'pending',
        retryAfter: Math.max(
          60,
          Math.min(86400, Number(data.parameters?.retry_after) || 60),
        ),
        error: 'telegram_rate_limit',
      };
    if (data.ok === false && response.status < 500)
      return { status: 'failed', error: 'telegram_rejected' };
    return { status: 'uncertain', error: 'telegram_unconfirmed' };
  } catch {
    // Never retry an ambiguous send automatically: Telegram sendMessage has no idempotency key.
    // Never surface the raw fetch error: it may contain the bot token in the URL.
    return { status: 'uncertain', error: 'telegram_unconfirmed' };
  }
}
