/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { Localize, useLocale } from '@/components/locale-provider';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
export function ProductCheckout({
  product,
}: {
  product: { id: string; slug: string; price: number; currency: string };
}) {
  const { intl } = useLocale();
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(intl, { style: 'currency', currency }).format(
      amount / 100,
    );
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signIn, setSignIn] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setSignIn(false);
    const payload = JSON.stringify({
      productId: product.id,
      quantity: Number(quantity),
      customerNote: note,
    });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': attempt.current!.key,
        },
        body: payload,
      });
      const data = (await response.json()) as {
        error?: string;
        order?: { id: string };
      };
      if (response.status === 401) {
        setSignIn(true);
        throw new Error(
          'Войдите в аккаунт, чтобы заказ сохранился в вашем кабинете',
        );
      }
      if (!response.ok || !data.order)
        throw new Error(data.error ?? 'Не удалось оформить заказ');
      window.location.href = `/account/orders/${data.order.id}`;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Соединение прервано. Повторите отправку — заказ не будет продублирован',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Localize>
      {
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-7"
        >
          <h2 className="text-xl font-semibold">Оформление заказа</h2>
          <label htmlFor="order-quantity" className="block text-sm">
            Количество
            <Input
              id="order-quantity"
              className="mt-2 h-11 text-base"
              type="number"
              min={1}
              max={99}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={busy}
            />
          </label>
          <label htmlFor="order-note" className="block text-sm">
            Комментарий к заказу
            <Textarea
              id="order-note"
              className="mt-2 min-h-28 text-base"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="Что нам важно учесть"
            />
          </label>
          <div className="flex flex-wrap justify-between gap-3 border-t border-site-line pt-5">
            <span>Итого</span>
            <strong className="text-xl">
              {money(product.price * (Number(quantity) || 1), product.currency)}
            </strong>
          </div>
          <p className="text-sm leading-6 text-site-muted">
            Сначала создадим заказ. Деньги не списываются. Способ оплаты и
            итоговая сумма будут показаны в заказе.
          </p>
          {error && (
            <p role="alert" className="text-sm text-site-danger">
              {error}
            </p>
          )}
          {signIn && (
            <a
              className="block min-h-11 text-site-accent-ink underline"
              href={`/login?next=${encodeURIComponent('/catalog/' + encodeURIComponent(product.slug))}`}
            >
              Войти или зарегистрироваться
            </a>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
          >
            {busy ? 'Оформляем…' : 'Создать заказ'}
          </Button>
        </form>
      }
    </Localize>
  );
}
