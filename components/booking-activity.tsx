'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { bookingEventLabels } from '@/lib/booking-telegram-policy';
type Event = {
  id: string;
  bookingId: string;
  action: string;
  revision: number;
  createdAt: number;
  delivery: string;
  attempts: number;
  sentAt: number | null;
};
type Feed = {
  events: Event[];
  next: string | null;
  telegram: { configured: boolean; enabled: boolean };
};
const states: Record<string, string> = {
  pending: 'В очереди',
  sending: 'Отправляется',
  sent: 'Telegram принял сообщение',
  uncertain: 'Доставка не подтверждена — проверьте чат',
  failed: 'Ошибка — требуется проверка',
  not_queued: 'История до подключения очереди',
};
const outline =
  'min-h-11 whitespace-normal border-site-line bg-site-surface text-site-ink';
export function BookingActivity() {
  const [period, setPeriod] = useState('7d'),
    [feed, setFeed] = useState<Feed>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<'process' | Event | null>(
    null,
  );
  const load = useCallback(
    async (before?: string) => {
      setBusy(true);
      setError('');
      try {
        const query = new URLSearchParams({
          period,
          ...(before ? { before } : {}),
        });
        const response = await fetch(`/api/booking-activity?${query}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error('Не удалось загрузить уведомления');
        const data = (await response.json()) as Feed;
        setFeed((old) =>
          before && old
            ? { ...data, events: [...old.events, ...data.events] }
            : data,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setBusy(false);
      }
    },
    [period],
  );
  useEffect(() => {
    setFeed(undefined);
    void load();
  }, [load]);
  async function process() {
    if (!confirmation || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/booking-activity', {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          confirmation === 'process'
            ? { action: 'process', confirm: true }
            : {
                action: 'retry',
                eventId: confirmation.id,
                confirm: true,
                confirmDuplicateRisk: true,
              },
        ),
      });
      if (!response.ok)
        throw new Error(
          'Обработка не подтверждена. Обновите ленту и проверьте Telegram перед повтором.',
        );
      setConfirmation(null);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Не удалось обработать очередь',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Уведомления о записях"
      className="space-y-4 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Уведомления о записях</h2>
        <Button
          variant="outline"
          className={outline}
          disabled={busy}
          onClick={() => void load()}
        >
          Обновить уведомления
        </Button>
      </div>
      <p className="text-sm leading-6 text-site-muted">
        Создание, перенос, отмена и оплата — из общего журнала сайта и MCP.
        Статус Telegram не меняет статус записи. Лента обновляется кнопкой, не в
        реальном времени.
      </p>
      <Tabs
        value={period}
        onValueChange={(value) => {
          if (!busy) setPeriod(String(value));
        }}
      >
        <TabsList className="h-auto flex-wrap bg-site-raised">
          <TabsTrigger disabled={busy} value="24h" className="min-h-11">
            24 часа
          </TabsTrigger>
          <TabsTrigger disabled={busy} value="7d" className="min-h-11">
            7 дней
          </TabsTrigger>
          <TabsTrigger disabled={busy} value="30d" className="min-h-11">
            30 дней
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {feed && (
        <div className="space-y-2 rounded-xl border border-site-line p-4">
          <p className="font-medium">
            Telegram:{' '}
            {feed.telegram.configured
              ? 'настроен'
              : feed.telegram.enabled
                ? 'настройки неполные'
                : 'выключен'}
          </p>
          {!feed.telegram.configured && (
            <p className="text-sm leading-6 text-site-muted">
              На сервере задайте TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
              PUBLIC_SITE_URL и BOOKING_TELEGRAM_ENABLED=true. Не вставляйте
              токен в страницы, контекст AI или переписку. При включении будут
              обработаны накопленные события очереди.
            </p>
          )}
          <p className="text-sm leading-6 text-site-muted">
            В Telegram уходят только тип события, номер записи и ссылка на
            защищённую админку. Не ФИО, контакты, фото или комментарии. «Принял
            сообщение» не означает, что сотрудник его прочитал.
          </p>
          <Button
            variant="outline"
            className={outline}
            disabled={busy || !feed.telegram.configured}
            onClick={() => setConfirmation('process')}
          >
            Обработать очередь Telegram
          </Button>
        </div>
      )}
      {error && !confirmation && <p role="alert">{error}</p>}
      {busy && <p role="status">Обновление…</p>}
      <ol className="space-y-3">
        {feed?.events.map((event) => (
          <li
            key={event.id}
            className="min-w-0 rounded-xl border border-site-line p-4 [overflow-wrap:anywhere]"
          >
            <p className="font-medium">
              {bookingEventLabels[event.action] || 'Запись обновлена'}
            </p>
            <p className="mt-1 text-sm text-site-muted">
              {new Date(event.createdAt * 1000).toLocaleString('ru-RU')} ·
              версия {event.revision}
            </p>
            <p className="mt-2 text-sm">Запись: {event.bookingId}</p>
            <p className="mt-2 text-sm">
              Telegram: {states[event.delivery] || event.delivery} · попыток:{' '}
              {event.attempts}
            </p>
            {['uncertain', 'failed'].includes(event.delivery) && (
              <Button
                variant="outline"
                className={`${outline} mt-3`}
                disabled={busy || !feed.telegram.configured}
                onClick={() => setConfirmation(event)}
              >
                Проверить и повторить
              </Button>
            )}
          </li>
        ))}
      </ol>
      {feed && !busy && !error && !feed.events.length && (
        <p>За выбранный период событий нет</p>
      )}
      {feed?.next && (
        <Button
          variant="outline"
          className={outline}
          disabled={busy}
          onClick={() => void load(feed.next!)}
        >
          Показать ещё события
        </Button>
      )}
      {confirmation && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirmation(null);
          }}
        >
          <AlertDialogContent className="border-site-line bg-site-surface text-site-ink">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Отправить уведомления в Telegram?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-site-muted">
                {confirmation === 'process'
                  ? 'Будут обработаны до трёх ожидающих событий. Адресат берётся только из серверных настроек.'
                  : 'Сначала проверьте чат. Предыдущая отправка могла пройти успешно. Повтор может создать дубликат сообщения; он не создаёт новую запись.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && <p role="alert">{error}</p>}
            <AlertDialogFooter>
              <Button
                variant="outline"
                className={outline}
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Назад
              </Button>
              <Button disabled={busy} onClick={() => void process()}>
                {busy ? 'Обработка…' : 'Подтверждаю отправку'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}
