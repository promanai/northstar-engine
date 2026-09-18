/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { money, orderStatusLabels } from '@/lib/commerce-policy';
export type Order = {
  id: string;
  productId: string;
  productTitle: string | null;
  unitPrice: number | null;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentUrl: string | null;
  customerNote: string | null;
  customerId: string | null;
  revision: number;
  createdAt: string;
};
export function OrderList({ admin = false }: { admin?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        admin ? '/api/orders' : '/api/orders?mine=1',
      );
      if (!response.ok) throw new Error('Не удалось загрузить заказы');
      const data = (await response.json()) as { orders: Order[] };
      setOrders(data.orders);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }, [admin]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  return (
    <section className="mt-6 min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {admin ? 'Все заказы' : 'Мои заказы и оплаты'}
        </h2>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loading}
          onClick={() => void load()}
        >
          Обновить
        </Button>
      </div>
      {loading ? (
        <output className="py-8 text-site-muted">Загружаем заказы…</output>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !orders.length ? (
        <div className="rounded-2xl border border-site-line bg-site-surface p-6">
          <p>Заказов пока нет</p>
          <a
            className="mt-3 inline-flex min-h-11 items-center text-site-accent-ink underline"
            href="/catalog"
          >
            Выбрать услугу в каталоге
          </a>
        </div>
      ) : (
        orders.map((order) => (
          <a
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="block rounded-2xl border border-site-line bg-site-surface p-5 transition-colors hover:bg-site-raised"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div className="min-w-0">
                <p className="break-words text-lg font-medium">
                  {order.productTitle ?? 'Заказ из предыдущей версии'}
                </p>
                <p className="mt-2 text-sm text-site-muted">
                  {new Date(order.createdAt).toLocaleDateString('ru-RU')} ·{' '}
                  {order.quantity} шт. · № {order.id.slice(0, 8)}
                </p>
                {admin && (
                  <p className="mt-2 break-all text-sm text-site-muted">
                    Клиент: {order.customerId ?? 'не указан'}
                  </p>
                )}
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="font-semibold">
                  {money(order.amount, order.currency)}
                </p>
                <p className="mt-2 text-sm text-site-accent-ink">
                  {orderStatusLabels[order.status] ?? order.status}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-site-muted">Открыть заказ →</p>
          </a>
        ))
      )}
    </section>
  );
}
