/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  money,
  orderStatusLabels,
  paymentLink,
  isOwner,
} from '@/lib/commerce-policy';
import type { Order } from '@/components/order-list';
type Event = { id: string; status: string; note: string; createdAt: string };
export function OrderDetail({ id }: { id: string }) {
  const [data, setData] = useState<{ order: Order; events: Event[] } | null>(
    null,
  );
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  const lock = useRef(false);
  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const auth = await fetch('/api/auth/me');
      if (auth.status === 401) {
        window.location.replace(
          `/login?next=${encodeURIComponent('/account/orders/' + id)}`,
        );
        return;
      }
      if (!auth.ok) throw new Error('Не удалось проверить авторизацию');
      const user = ((await auth.json()) as { user: { role: string } }).user;
      setAdmin(isOwner(user));
      const response = await fetch(`/api/orders/${id}`);
      const body = (await response.json()) as {
        order: Order;
        events: Event[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? 'Заказ недоступен');
      setData(body);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось загрузить заказ',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function action(status?: string) {
    if (lock.current || !data) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/orders/${id}${status ? '' : '/checkout'}`,
        {
          method: status ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            status ? { status, revision: data.order.revision } : {},
          ),
        },
      );
      const body = (await response.json()) as {
        order: Order;
        events: Event[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? 'Не удалось выполнить действие');
      setConfirm('');
      if (status) setData(body);
      else
        setData((current) =>
          current ? { ...current, order: body.order } : null,
        );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Соединение прервано. Обновите заказ перед повтором',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const order = data?.order;
  return (
    <main className="site-theme-scope min-h-dvh px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="flex flex-wrap gap-5 text-sm">
          <a
            className="inline-flex min-h-11 items-center text-site-muted"
            href="/account#orders"
          >
            ← Мои заказы
          </a>
          {admin && (
            <a
              className="inline-flex min-h-11 items-center text-site-accent-ink"
              href="/admin#orders"
            >
              Все заказы в админке
            </a>
          )}
        </nav>
        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <h1 className="text-2xl font-semibold">Заказ № {id.slice(0, 8)}</h1>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Обновить
          </Button>
        </div>
        {loading && <output className="mt-6">Загружаем заказ…</output>}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-site-line p-4"
          >
            {error}
          </p>
        )}
        {order && !loading && (
          <>
            <section className="mt-6 space-y-5 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-7">
              <p className="text-sm text-site-accent-ink">
                {orderStatusLabels[order.status] ?? order.status}
              </p>
              <h2 className="break-words text-2xl font-semibold">
                {order.productTitle ?? 'Заказ из предыдущей версии'}
              </h2>
              <p className="text-site-muted">
                {order.quantity} шт.
                {order.unitPrice !== null
                  ? ` × ${money(order.unitPrice, order.currency)}`
                  : ''}
              </p>
              <p className="text-3xl font-semibold">
                {money(order.amount, order.currency)}
              </p>
              <p className="text-sm text-site-muted">
                Сумма зафиксирована при оформлении
              </p>
              {order.customerNote && (
                <p className="whitespace-pre-wrap break-words border-t border-site-line pt-5 text-base">
                  {order.customerNote}
                </p>
              )}
              {order.status === 'pending' &&
                (order.paymentProvider === 'manual' ? (
                  <p className="rounded-xl bg-site-raised p-4 text-sm leading-6">
                    Онлайн-оплата для этого заказа не подключена. Уточните
                    способ оплаты у консультанта. Статус изменится после
                    подтверждения владельцем.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-site-muted">
                      Оплата проходит на защищённой странице провайдера.
                      Возвращение на сайт само по себе не подтверждает платёж.
                    </p>
                    {paymentLink(order.paymentUrl) ? (
                      <a
                        className="inline-flex min-h-11 items-center rounded-xl bg-site-accent px-5 text-site-on-accent"
                        href={paymentLink(order.paymentUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Перейти к оплате ↗
                      </a>
                    ) : (
                      <Button
                        disabled={busy}
                        className="min-h-11"
                        onClick={() => void action()}
                      >
                        Получить ссылку оплаты
                      </Button>
                    )}
                  </div>
                ))}
              <a
                href="/#chat"
                className="inline-flex min-h-11 items-center text-site-accent-ink underline"
              >
                Обсудить заказ с консультантом
              </a>
              {order.paymentProvider === 'manual' && (
                <div className="flex flex-wrap gap-3">
                  {order.status === 'pending' && (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      onClick={() => setConfirm('cancelled')}
                    >
                      Отменить заказ
                    </Button>
                  )}
                  {admin && order.status === 'pending' && (
                    <Button
                      className="min-h-11"
                      disabled={busy}
                      onClick={() => setConfirm('paid')}
                    >
                      Отметить получение оплаты
                    </Button>
                  )}
                  {admin && order.status === 'paid' && (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      onClick={() => setConfirm('refunded')}
                    >
                      Отметить выполненный возврат
                    </Button>
                  )}
                </div>
              )}
              {confirm && (
                <fieldset
                  aria-label="Подтверждение изменения статуса"
                  className="space-y-4 rounded-xl border border-site-line bg-site-raised p-4"
                >
                  <p>
                    {confirm === 'cancelled'
                      ? 'Отменить этот заказ? Повторно открыть его нельзя.'
                      : confirm === 'paid'
                        ? 'Подтвердите, что вы уже получили оплату. Это действие не списывает деньги.'
                        : 'Подтвердите, что вы уже вернули деньги клиенту. Это действие только фиксирует возврат.'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={busy}
                      className="min-h-11"
                      onClick={() => void action(confirm)}
                    >
                      {busy ? 'Сохраняем…' : 'Подтвердить'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      className="min-h-11"
                      onClick={() => setConfirm('')}
                    >
                      Назад
                    </Button>
                  </div>
                </fieldset>
              )}
            </section>
            <section className="mt-7">
              <h2 className="text-xl font-semibold">История заказа</h2>
              {data.events.length ? (
                <ol className="mt-4 space-y-3">
                  {data.events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-site-line bg-site-surface p-4"
                    >
                      <p className="text-sm text-site-muted">
                        {new Date(event.createdAt).toLocaleString('ru-RU')}
                      </p>
                      <p className="mt-2">{event.note}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-site-muted">
                  Заказ создан до включения журнала событий
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
