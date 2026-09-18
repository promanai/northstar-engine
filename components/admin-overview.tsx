'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  CalendarDays,
  FileText,
  MessageSquareText,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewData, OverviewPeriod } from '@/lib/overview-policy';

export function AdminOverview({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const [period, setPeriod] = useState<OverviewPeriod>('30d');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      setData(null);
      try {
        const response = await fetch(`/api/overview?period=${period}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          if (response.status === 403)
            throw new Error(
              'Доступ к обзору недоступен. Войдите под аккаунтом администратора.',
            );
          if (response.status === 429)
            throw new Error(
              'Слишком частое обновление. Повторите через минуту.',
            );
          throw new Error('Не удалось загрузить обзор. Попробуйте ещё раз.');
        }
        const value = (await response.json()) as OverviewData;
        if (active) setData(value);
      } catch (reason) {
        if (active)
          setError(
            controller.signal.aborted
              ? 'Сервер не ответил вовремя. Повторите загрузку.'
              : reason instanceof Error
                ? reason.message
                : 'Не удалось загрузить обзор',
          );
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [period, revision]);
  const metrics = [
    {
      key: 'customers',
      label: 'Новые клиенты',
      section: 'Клиенты',
      icon: Users,
    },
    {
      key: 'conversations',
      label: 'Активные диалоги',
      section: 'Аналитика',
      icon: MessageSquareText,
    },
    { key: 'orders', label: 'Новые заказы', section: 'Заказы', icon: FileText },
    {
      key: 'bookings',
      label: 'Новые бронирования',
      section: 'Бронирования',
      icon: CalendarDays,
    },
    {
      key: 'tickets',
      label: 'Новые обращения',
      section: 'Обращения',
      icon: MessageSquareText,
    },
  ] as const;
  return (
    <section
      className="mt-6 space-y-5"
      aria-label="Показатели сайта"
      aria-busy={loading}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label
            htmlFor="overview-period"
            className="mb-2 block text-sm text-site-muted"
          >
            Период показателей
          </label>
          <NativeSelect
            id="overview-period"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as OverviewPeriod)
            }
            className="w-full sm:w-52 [&_select]:min-h-11"
          >
            <NativeSelectOption value="24h">
              Последние 24 часа
            </NativeSelectOption>
            <NativeSelectOption value="7d">Последние 7 дней</NativeSelectOption>
            <NativeSelectOption value="30d">
              Последние 30 дней
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <Button
          variant="outline"
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading}
          className="min-h-11 border-site-line bg-site-surface text-site-ink"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Обновить
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-site-line bg-site-surface p-4 text-sm leading-6"
        >
          {error}{' '}
          <Button
            variant="link"
            onClick={() => setRevision((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
      )}
      {loading && (
        <div>
          <output className="mb-3 block text-sm text-site-muted">
            Загружаем данные сайта…
          </output>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-5">
            {metrics.map(({ key }) => (
              <Skeleton key={key} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      )}
      {!loading && data && (
        <>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-5">
            {metrics.map(({ key, label, section, icon: Icon }) => (
              <Card
                key={key}
                className="gap-0 border border-site-line bg-site-surface p-4 text-site-ink ring-0"
              >
                <div className="flex min-h-10 items-start justify-between gap-2">
                  <h2 className="text-sm font-medium text-site-muted">
                    {label}
                  </h2>
                  <Icon
                    className="size-4 shrink-0 text-site-accent-ink"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {data.summary[key].toLocaleString('ru-RU')}
                </p>
                <Button
                  variant="link"
                  onClick={() => onNavigate(section)}
                  className="mt-2 min-h-10 justify-start px-0 text-site-accent-ink"
                >
                  {section}
                </Button>
              </Card>
            ))}
          </div>
          <p className="text-sm leading-6 text-site-muted">
            Диалоги учитываются по сохранённым сообщениям клиентов и гостей,
            включая demo-ответы. Это данные операций, не посещаемость и не
            выручка. Заказы и бронирования включают все статусы.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border border-site-line bg-site-surface p-5 text-site-ink ring-0">
              <h2 className="text-lg font-semibold">Текущие задачи</h2>
              <p className="text-sm text-site-muted">
                Не зависят от выбранного периода
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Заказы ожидают оплаты',
                    value: data.summary.pendingOrders,
                    section: 'Заказы',
                  },
                  {
                    label: 'Открытые обращения',
                    value: data.summary.openTickets,
                    section: 'Обращения',
                  },
                  {
                    label: 'Записи на ближайшие 7 дней',
                    value: data.summary.upcomingBookings,
                    section: 'Бронирования',
                  },
                ].map((item) => (
                  <Button
                    key={item.section}
                    variant="outline"
                    onClick={() => onNavigate(item.section)}
                    className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal border-site-line bg-site-surface py-3 text-left text-site-ink"
                  >
                    <span>{item.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {item.value.toLocaleString('ru-RU')}
                    </span>
                  </Button>
                ))}
              </div>
              <p className="text-sm leading-6 text-site-muted">
                Предстоящие записи включают подтверждённые и ещё действующие
                платёжные резервы.
              </p>
            </Card>
            <Card className="border border-site-line bg-site-surface p-5 text-site-ink ring-0">
              <h2 className="text-lg font-semibold">Последние обращения</h2>
              <p className="text-sm text-site-muted">
                Последние 5 созданных обращений за всё время
              </p>
              {data.recentTickets.length === 0 ? (
                <p className="py-3 text-sm text-site-muted">
                  Обращений пока нет
                </p>
              ) : (
                <ul className="divide-y divide-site-line">
                  {data.recentTickets.map((ticket) => (
                    <li key={ticket.id} className="py-3">
                      <p className="break-words text-base font-medium [overflow-wrap:anywhere]">
                        {ticket.subject}
                      </p>
                      <p className="mt-1 text-sm text-site-muted">
                        {ticket.status === 'open'
                          ? 'Открыто'
                          : ticket.status === 'closed'
                            ? 'Закрыто'
                            : 'Неизвестный статус'}{' '}
                        · {new Date(ticket.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="outline"
                onClick={() => onNavigate('Обращения')}
                className="min-h-11"
              >
                Все обращения
              </Button>
            </Card>
          </div>
          <p className="text-sm text-site-muted">
            Данные на {new Date(data.to).toLocaleString('ru-RU')}. Даты показаны
            в часовом поясе устройства.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Быстрые действия">
        <Button
          variant="outline"
          onClick={() => onNavigate('Ассистент')}
          className="min-h-11"
        >
          <Bot className="size-4" aria-hidden="true" />
          Настроить ассистента
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate('Страницы')}
          className="min-h-11"
        >
          Управлять страницами
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate('Аналитика')}
          className="min-h-11"
        >
          Подробная аналитика
        </Button>
      </div>
    </section>
  );
}
