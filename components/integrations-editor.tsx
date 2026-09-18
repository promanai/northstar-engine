'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IntegrationsConfig } from '@/lib/integrations-service';
import {
  Send,
  Share2,
  CreditCard,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type IntegrationsState = IntegrationsConfig & { revision: number };

export function IntegrationsEditor() {
  const [data, setData] = useState<IntegrationsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<'telegram' | 'webhook' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const lock = useRef(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations', { cache: 'no-store' });
      const json = (await res.json()) as {
        integrations: IntegrationsState;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось загрузить настройки');
      setData(json.integrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка связи с сервером');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function handleSave(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!data || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const res = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revision: data.revision,
          integrations: data,
          confirm: true,
        }),
      });

      const json = (await res.json()) as {
        integrations?: IntegrationsState;
        error?: string;
      };

      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(json.error ?? 'Не удалось сохранить интеграции');
      }

      if (json.integrations) {
        setData(json.integrations);
      } else {
        await load();
      }

      setNotice('Настройки интеграций успешно сохранены.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  async function handleTest(type: 'telegram' | 'webhook') {
    if (testing) return;
    setTesting(type);
    setError('');
    setNotice('');

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'test', type }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Проверка не удалась');
      }

      setNotice(json.message ?? 'Проверка связи выполнена успешно!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при тестировании связи');
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-site-line bg-site-surface p-6 text-center text-sm text-site-muted">
        Загружаем настройки интеграций…
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mt-6 rounded-2xl border border-site-line bg-site-surface p-6">
        <p className="text-sm text-red-500">{error || 'Не удалось получить данные'}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Повторить попытку
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-6 min-w-0 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-semibold">Центр интеграций</h2>
          <p className="mt-1 text-sm text-site-muted">
            Подключение внешних каналов связи, CRM-систем, эквайринга и уведомлений
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Обновить
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить все изменения'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {notice && (
        <output className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{notice}</span>
        </output>
      )}

      {/* Grid of Integration Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Telegram Integration */}
        <div className="flex flex-col justify-between rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Telegram-уведомления</h3>
                  <p className="text-xs text-site-muted">
                    Оповещения администратора и дежурных врачей
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  data.telegram.enabled && data.telegram.botToken && data.telegram.chatId
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-site-raised text-site-muted'
                }`}
              >
                {data.telegram.enabled ? 'Включено' : 'Выключено'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="tg-enabled"
                checked={data.telegram.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    telegram: { ...data.telegram, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-site-line accent-site-primary"
              />
              <label htmlFor="tg-enabled" className="text-sm font-medium cursor-pointer">
                Активировать отправку сообщений в Telegram
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-medium">
                Bot Token (от @BotFather)
                <Input
                  className="mt-1"
                  placeholder="например, 1234567890:AAHfj..."
                  value={data.telegram.botToken}
                  onChange={(e) =>
                    setData({
                      ...data,
                      telegram: { ...data.telegram, botToken: e.target.value },
                    })
                  }
                />
              </label>

              <label className="block text-xs font-medium">
                Chat ID (ID пользователя или закрытой группы)
                <Input
                  className="mt-1"
                  placeholder="например, -1001234567890"
                  value={data.telegram.chatId}
                  onChange={(e) =>
                    setData({
                      ...data,
                      telegram: { ...data.telegram, chatId: e.target.value },
                    })
                  }
                />
              </label>
            </div>

            <div className="space-y-2 border-t border-site-line/60 pt-3">
              <p className="text-xs font-medium text-site-muted">События для отправки:</p>
              <div className="grid gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.telegram.notifyOnBookings}
                    onChange={(e) =>
                      setData({
                        ...data,
                        telegram: {
                          ...data.telegram,
                          notifyOnBookings: e.target.checked,
                        },
                      })
                    }
                    className="h-3.5 w-3.5 rounded accent-site-primary"
                  />
                  <span>Новые бронирования и перенос визитов</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.telegram.notifyOnOrders}
                    onChange={(e) =>
                      setData({
                        ...data,
                        telegram: {
                          ...data.telegram,
                          notifyOnOrders: e.target.checked,
                        },
                      })
                    }
                    className="h-3.5 w-3.5 rounded accent-site-primary"
                  />
                  <span>Оформление и оплата заказов</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.telegram.notifyOnTickets}
                    onChange={(e) =>
                      setData({
                        ...data,
                        telegram: {
                          ...data.telegram,
                          notifyOnTickets: e.target.checked,
                        },
                      })
                    }
                    className="h-3.5 w-3.5 rounded accent-site-primary"
                  />
                  <span>Вызов оператора в AI-чате (новые тикеты)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-site-line pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || testing === 'telegram'}
              onClick={() => void handleTest('telegram')}
            >
              {testing === 'telegram' ? 'Отправляем…' : 'Проверить связь с Telegram'}
            </Button>
          </div>
        </div>

        {/* 2. Webhook CRM Integration */}
        <div className="flex flex-col justify-between rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Webhooks для CRM</h3>
                  <p className="text-xs text-site-muted">
                    Связка с AmoCRM, Bitrix24, 1C или Zapier
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  data.webhooks.enabled && data.webhooks.url
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-site-raised text-site-muted'
                }`}
              >
                {data.webhooks.enabled ? 'Включено' : 'Выключено'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="wh-enabled"
                checked={data.webhooks.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    webhooks: { ...data.webhooks, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-site-line accent-site-primary"
              />
              <label htmlFor="wh-enabled" className="text-sm font-medium cursor-pointer">
                Активировать исходящие вебхуки
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-medium">
                Webhook Endpoint URL (HTTPS)
                <Input
                  className="mt-1"
                  placeholder="https://api.crm.ru/webhooks/oravera"
                  value={data.webhooks.url}
                  onChange={(e) =>
                    setData({
                      ...data,
                      webhooks: { ...data.webhooks, url: e.target.value },
                    })
                  }
                />
              </label>

              <label className="block text-xs font-medium">
                Секретный ключ подписи (HMAC-SHA256)
                <Input
                  className="mt-1"
                  placeholder="whsec_xxxxxxxxxxxxxxxxxxxx"
                  value={data.webhooks.secret}
                  onChange={(e) =>
                    setData({
                      ...data,
                      webhooks: { ...data.webhooks, secret: e.target.value },
                    })
                  }
                />
              </label>
            </div>

            <div className="border-t border-site-line/60 pt-3">
              <p className="text-xs font-medium text-site-muted">Подписанные события:</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {['booking.created', 'order.created', 'ticket.created'].map((ev) => (
                  <span
                    key={ev}
                    className="rounded bg-site-page px-2 py-1 font-mono text-[11px] text-site-muted border border-site-line"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-site-line pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || testing === 'webhook'}
              onClick={() => void handleTest('webhook')}
            >
              {testing === 'webhook' ? 'Отправляем…' : 'Отправить тестовый вебхук'}
            </Button>
          </div>
        </div>

        {/* 3. Online Payments Integration */}
        <div className="flex flex-col justify-between rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Платежный шлюз</h3>
                  <p className="text-xs text-site-muted">
                    Эквайринг, СБП и онлайн-оплата счетов
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-site-raised px-2.5 py-0.5 text-xs font-semibold text-site-muted">
                {data.payments.provider === 'stripe' ? 'Stripe' : 'По согласованию'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <label className="text-xs font-medium">
                Провайдер оплаты
                <Select
                  value={data.payments.provider}
                  onValueChange={(val) => {
                    if (val)
                      setData({
                        ...data,
                        payments: {
                          ...data.payments,
                          provider: val as 'manual' | 'stripe',
                        },
                      });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Ручной / СБП (По согласованию)</SelectItem>
                    <SelectItem value="stripe">Stripe Checkout</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="text-xs font-medium">
                Основная валюта
                <Input
                  className="mt-1"
                  value={data.payments.currency}
                  maxLength={4}
                  onChange={(e) =>
                    setData({
                      ...data,
                      payments: {
                        ...data.payments,
                        currency: e.target.value.toUpperCase(),
                      },
                    })
                  }
                />
              </label>
            </div>

            {data.payments.provider === 'stripe' && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-medium">
                  Stripe Publishable Key
                  <Input
                    className="mt-1"
                    placeholder="pk_live_..."
                    value={data.payments.stripePublishableKey}
                    onChange={(e) =>
                      setData({
                        ...data,
                        payments: {
                          ...data.payments,
                          stripePublishableKey: e.target.value,
                        },
                      })
                    }
                  />
                </label>

                <label className="block text-xs font-medium">
                  Stripe Secret Key
                  <Input
                    className="mt-1"
                    placeholder="sk_live_..."
                    value={data.payments.stripeSecretKey}
                    onChange={(e) =>
                      setData({
                        ...data,
                        payments: {
                          ...data.payments,
                          stripeSecretKey: e.target.value,
                        },
                      })
                    }
                  />
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="payments-testmode"
                    checked={data.payments.testMode}
                    onChange={(e) =>
                      setData({
                        ...data,
                        payments: {
                          ...data.payments,
                          testMode: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-site-line accent-site-primary"
                  />
                  <label htmlFor="payments-testmode" className="text-xs cursor-pointer">
                    Тестовый режим (Test Mode)
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-site-line pt-4 text-xs text-site-muted">
            Платежи синхронизируются через проверенные вебхуки с криптографической верификацией подписи.
          </div>
        </div>

        {/* 4. Email Notifications Integration */}
        <div className="flex flex-col justify-between rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Почтовый сервис (Email)</h3>
                  <p className="text-xs text-site-muted">
                    Отправка ссылок сброса пароля и чеков
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  data.email.enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-site-raised text-site-muted'
                }`}
              >
                {data.email.enabled ? 'Включено' : 'Выключено'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="email-enabled"
                checked={data.email.enabled}
                onChange={(e) =>
                  setData({
                    ...data,
                    email: { ...data.email, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-site-line accent-site-primary"
              />
              <label htmlFor="email-enabled" className="text-sm font-medium cursor-pointer">
                Активировать отправку служебных писем
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <label className="text-xs font-medium">
                Email отправителя
                <Input
                  className="mt-1"
                  placeholder="noreply@orav-era.ru"
                  value={data.email.fromEmail}
                  onChange={(e) =>
                    setData({
                      ...data,
                      email: { ...data.email, fromEmail: e.target.value },
                    })
                  }
                />
              </label>

              <label className="text-xs font-medium">
                Имя отправителя
                <Input
                  className="mt-1"
                  placeholder="Клиника OraVera"
                  value={data.email.fromName}
                  onChange={(e) =>
                    setData({
                      ...data,
                      email: { ...data.email, fromName: e.target.value },
                    })
                  }
                />
              </label>
            </div>

            <label className="block text-xs font-medium pt-1">
              API-ключ (Resend / SMTP пароль)
              <Input
                className="mt-1"
                placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                value={data.email.apiKey}
                onChange={(e) =>
                  setData({
                    ...data,
                    email: { ...data.email, apiKey: e.target.value },
                  })
                }
              />
            </label>
          </div>

          <div className="mt-5 border-t border-site-line pt-4 text-xs text-site-muted">
            Используется для отправки одноразовых ссылок восстановления доступа и подтверждений записи.
          </div>
        </div>
      </div>
    </form>
  );
}
