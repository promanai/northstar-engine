/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { Localize, useLocale } from '@/components/locale-provider';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookingActivity } from '@/components/booking-activity';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  bookingStatus,
  bookingTime,
  wallTimeToIso,
  type BookingView,
  type SlotView,
  type ResourceView,
} from '@/lib/booking-policy';

const inputClass =
  'min-h-11 w-full min-w-0 border-site-line bg-site-raised text-base text-site-ink';
const outline =
  'min-h-11 whitespace-normal border-site-line bg-site-surface text-site-ink';
async function api<T>(
  path: string,
  body?: unknown,
  method = 'POST',
  key?: string,
): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method,
          headers: {
            'content-type': 'application/json',
            ...(key ? { 'idempotency-key': key } : {}),
          },
          body: JSON.stringify(body),
        },
  );
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Для записи войдите в аккаунт'
        : data.error || 'Не удалось выполнить действие',
    );
  return data;
}
function Choose({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Localize>
      {
        <div className="min-w-0 space-y-2">
          <span className="text-sm font-medium">{label}</span>
          <Select
            value={value || null}
            items={options}
            onValueChange={(value) => {
              if (value !== null) onChange(value);
            }}
          >
            <SelectTrigger aria-label={label} className={inputClass}>
              <SelectValue placeholder="Выберите" />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)] border-site-line bg-site-surface text-site-ink">
              {options.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    </Localize>
  );
}
function Confirm({
  title,
  description,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Localize>
      {
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) onClose();
          }}
        >
          <AlertDialogContent className="max-h-[90dvh] overflow-y-auto border-site-line bg-site-surface text-site-ink [overflow-wrap:anywhere]">
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-7 text-site-muted">
                {description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}
            <AlertDialogFooter className="border-site-line bg-site-surface">
              <AlertDialogCancel disabled={busy} className={outline}>
                Назад
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={onConfirm}
                className="min-h-11 whitespace-normal bg-site-accent text-site-on-accent hover:bg-site-accent-hover hover:text-site-on-accent"
              >
                {busy ? 'Выполняется…' : 'Подтвердить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    </Localize>
  );
}
const money = (price: number | null, currency: string | null) =>
  price === null
    ? 'не указана'
    : `${(price / 100).toLocaleString('ru-RU')} ${currency || ''}`;
const startDay = () => new Date().toISOString().slice(0, 10);
function slotQuery(day: string, productId?: string, managed = false) {
  const from = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(from.getTime())) throw new Error('Укажите дату поиска');
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: new Date(from.getTime() + 7 * 86400_000).toISOString(),
  });
  if (productId) query.set('productId', productId);
  if (managed) query.set('managed', '1');
  return `/api/booking-slots?${query}`;
}
export function SlotPicker({
  productId,
  booking,
  onDone,
}: {
  productId?: string;
  booking?: BookingView;
  onDone?: () => void;
}) {
  const { intl, t } = useLocale();
  const money = (amount: number | null, currency: string | null) =>
    amount === null || !currency
      ? t('Price not provided')
      : new Intl.NumberFormat(intl, { style: 'currency', currency }).format(
          amount / 100,
        );
  const bookingTime = (stamp: number, zone: string) =>
    new Intl.DateTimeFormat(intl, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone,
    }).format(stamp * 1000);
  const [day, setDay] = useState(startDay);
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [selected, setSelected] = useState<SlotView | null>(null);
  const [note, setNote] = useState('');
  const retry = useRef({ fingerprint: '', key: '' });
  const uid = useId();
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ slots: SlotView[]; truncated: boolean }>(
        slotQuery(day, productId),
      );
      setSlots(data.slots);
      setTruncated(data.truncated);
    } catch (e) {
      setSlots([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [day, productId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function reserve() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      let createdBooking: BookingView | undefined;
      if (booking)
        await api(
          `/api/bookings/${booking.id}`,
          {
            action: 'reschedule',
            slotId: selected.id,
            revision: booking.revision,
          },
          'PATCH',
        );
      else {
        const body = { slotId: selected.id, customerNote: note };
        const fingerprint = JSON.stringify(body);
        if (retry.current.fingerprint !== fingerprint)
          retry.current = { fingerprint, key: crypto.randomUUID() };
        const result = await api<{ booking: BookingView }>(
          '/api/bookings',
          body,
          'POST',
          retry.current.key,
        );
        createdBooking = result.booking;
        if (createdBooking.paymentStatus === 'pending') {
          const checkout = await api<{ payment?: { paymentUrl?: string } }>(
            `/api/bookings/${createdBooking.id}/checkout`,
            {},
            'POST',
          );
          if (checkout.payment?.paymentUrl)
            setPaymentUrl(checkout.payment.paymentUrl);
        }
      }
      if (createdBooking?.paymentStatus === 'pending') {
        setNotice(
          'Слот удержан на 15 минут. Перейдите к оплате по ссылке ниже.',
        );
      } else {
        setNotice(
          booking
            ? 'Запись перенесена'
            : 'Вы записаны. Подробности — в личном кабинете.',
        );
      }
      setSelected(null);
      await load();
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Localize>
      {
        <section
          className="mt-5 min-w-0 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-5"
          aria-label="Доступное время"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {booking ? 'Выберите новое время' : 'Записаться на услугу'}
            </h3>
            <Button
              type="button"
              variant="outline"
              className={outline}
              disabled={loading || busy}
              onClick={() => void load()}
            >
              Обновить
            </Button>
          </div>
          <label htmlFor={`${uid}-day`} className="mt-4 block text-sm">
            Начало поиска · 7 дней, границы в UTC
            <Input
              id={`${uid}-day`}
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              disabled={busy}
              className={`${inputClass} mt-2`}
            />
          </label>
          {error && !selected && (
            <p role="alert" className="mt-3 text-sm text-red-500">
              {error}{' '}
              <a className="underline" href="/login?next=%2Faccount%23bookings">
                Войти
              </a>
            </p>
          )}
          {notice && (
            <output className="mt-3 block text-sm">
              {notice}{' '}
              <a href="/account#bookings" className="underline">
                Мои записи
              </a>
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 inline-flex min-h-11 items-center rounded-xl bg-site-accent px-4 font-medium text-site-on-accent hover:bg-site-accent-hover"
                >
                  Перейти к оплате
                </a>
              )}
            </output>
          )}
          {loading ? (
            <p className="mt-4 text-sm text-site-muted">
              Загрузка свободного времени…
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {slots.map((slot) => (
                <Button
                  type="button"
                  key={slot.id}
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setSelected(slot);
                    setError('');
                  }}
                  className={`${outline} h-auto min-w-0 items-start py-3 text-left`}
                >
                  <span className="min-w-0 space-y-1">
                    <span className="block break-words font-semibold">
                      {slot.service}
                    </span>
                    <span className="block text-sm">
                      {bookingTime(slot.startsAt, slot.timeZone)} —{' '}
                      {new Intl.DateTimeFormat(intl, {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: slot.timeZone,
                      }).format(slot.endsAt * 1000)}
                    </span>
                    <span className="block break-words text-sm text-site-muted">
                      {slot.resourceName} · {slot.timeZone}
                    </span>
                    <span className="block text-sm">
                      {money(
                        booking ? booking.price : slot.price,
                        booking ? booking.currency : slot.currency,
                      )}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
          {!loading && !slots.length && (
            <p className="mt-4 text-sm text-site-muted">
              На выбранную неделю свободных слотов нет. Выберите другую дату или
              уточните время у консультанта.
            </p>
          )}
          {truncated && (
            <p className="mt-3 text-sm text-site-muted">
              Показаны первые 200 слотов. Выберите более позднее начало поиска.
            </p>
          )}
          {!booking && (
            <label htmlFor={`${uid}-note`} className="mt-4 block text-sm">
              Комментарий к записи
              <Textarea
                id={`${uid}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                disabled={busy}
                className={`${inputClass} mt-2`}
              />
            </label>
          )}
          <p className="mt-3 text-sm text-site-muted">
            Время указано в часовом поясе ресурса. Для платной услуги слот
            удерживается на 15 минут; оплата проходит на защищённой странице
            провайдера.
          </p>
          {selected && (
            <Confirm
              title={booking ? 'Перенести запись?' : 'Подтвердить запись?'}
              description={`${t(selected.service)} · ${selected.resourceName} · ${bookingTime(selected.startsAt, selected.timeZone)} (${selected.timeZone}). ${money(booking ? booking.price : selected.price, booking ? booking.currency : selected.currency)}. ${t('Paid appointments are held for 15 minutes.')}`}
              busy={busy}
              error={error}
              onClose={() => setSelected(null)}
              onConfirm={() => void reserve()}
            />
          )}
        </section>
      }
    </Localize>
  );
}
export function BookingPanel({ admin = false }: { admin?: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [rows, setRows] = useState<BookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [move, setMove] = useState<BookingView | null>(null);
  const [confirm, setConfirm] = useState<{
    booking: BookingView;
    action: 'cancel' | 'complete';
  } | null>(null);
  const [history, setHistory] = useState<{
    id: string;
    events: {
      action: string;
      revision: number;
      startsAt: number | null;
      createdAt: number;
    }[];
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ bookings: BookingView[]; truncated: boolean }>(
        `/api/bookings${admin ? '' : '?mine=1'}`,
      );
      setRows(data.bookings);
      setTruncated(data.truncated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [admin]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function change() {
    if (!confirm || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(
        `/api/bookings/${confirm.booking.id}`,
        { action: confirm.action, revision: confirm.booking.revision },
        'PATCH',
      );
      setConfirm(null);
      setHistory(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Localize>
      {
        <div className="mt-6 min-w-0 space-y-5">
          {admin && (
            <>
              <BookingActivity />
              <BookingSchedule />
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {admin ? 'Записи клиентов' : 'Мои записи'}
            </h2>
            <Button
              className={outline}
              variant="outline"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              Обновить записи
            </Button>
          </div>
          {error && !confirm && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-site-muted">Загрузка записей…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-site-line p-4 text-site-muted">
              Записей пока нет
            </p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-5"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="break-words text-lg font-semibold">
                    {row.service}
                  </h3>
                  <span className="text-sm text-site-muted">
                    {bookingStatus[row.status] || row.status}
                  </span>
                </div>
                <p className="mt-2">
                  {bookingTime(row.startsAt, row.timeZone || 'UTC')} ·{' '}
                  {row.timeZone || 'UTC'}
                </p>
                <p className="mt-1 text-sm text-site-muted">
                  {row.resourceName || 'Ресурс не указан'} ·{' '}
                  {money(row.price, row.currency)}
                </p>
                {admin && (
                  <p className="mt-2 break-all text-sm text-site-muted">
                    ID клиента: {row.customerId || 'не указан'}
                  </p>
                )}
                {row.customerNote && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                    {row.customerNote}
                  </p>
                )}
                {!row.slotId && (
                  <p className="mt-3 text-sm text-site-muted">
                    Старая запись без слота · только чтение
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.slotId &&
                    row.status === 'confirmed' &&
                    (row.startsAt || 0) * 1000 > now && (
                      <Button
                        variant="outline"
                        className={outline}
                        disabled={busy}
                        onClick={() => {
                          setMove(row);
                          setError('');
                        }}
                      >
                        Перенести
                      </Button>
                    )}
                  {row.slotId &&
                    row.status === 'confirmed' &&
                    (admin || (row.startsAt || 0) * 1000 > now) && (
                      <Button
                        variant="outline"
                        className={outline}
                        disabled={busy}
                        onClick={() => {
                          setError('');
                          setConfirm({ booking: row, action: 'cancel' });
                        }}
                      >
                        Отменить запись
                      </Button>
                    )}
                  {admin &&
                    row.slotId &&
                    row.status === 'confirmed' &&
                    row.paymentStatus !== 'pending' &&
                    (row.endsAt || Infinity) * 1000 <= now && (
                      <Button
                        variant="outline"
                        className={outline}
                        disabled={busy}
                        onClick={() => {
                          setError('');
                          setConfirm({ booking: row, action: 'complete' });
                        }}
                      >
                        Услуга выполнена
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    className={outline}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const data = await api<{
                          events: NonNullable<typeof history>['events'];
                        }>(`/api/bookings/${row.id}`);
                        setHistory({ id: row.id, events: data.events });
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    История
                  </Button>
                </div>
                {history?.id === row.id && (
                  <ol className="mt-4 space-y-2 border-t border-site-line pt-3 text-sm text-site-muted">
                    {history.events.length ? (
                      history.events.map((event) => (
                        <li key={event.revision}>
                          {bookingTime(event.createdAt, row.timeZone || 'UTC')}{' '}
                          ·{' '}
                          {{
                            created: 'Запись создана',
                            cancel: 'Отменена',
                            reschedule: 'Перенесена',
                            complete: 'Услуга выполнена',
                          }[event.action] || event.action}
                          {event.action === 'reschedule'
                            ? ` → ${bookingTime(event.startsAt, row.timeZone || 'UTC')}`
                            : ''}
                        </li>
                      ))
                    ) : (
                      <li>Для старой записи событий нет</li>
                    )}
                  </ol>
                )}
              </article>
            ))
          )}
          {truncated && (
            <p className="text-sm text-site-muted">
              Показаны последние 200 записей
            </p>
          )}
          {move && (
            <div>
              <Button
                variant="outline"
                className={outline}
                onClick={() => setMove(null)}
              >
                Закрыть перенос
              </Button>
              <SlotPicker
                key={`${move.id}-${move.revision}`}
                productId={move.productId || undefined}
                booking={move}
                onDone={() => {
                  setMove(null);
                  setHistory(null);
                  void load();
                }}
              />
            </div>
          )}
          {!admin && !move && <SlotPicker onDone={() => void load()} />}
          {confirm && (
            <Confirm
              title={
                confirm.action === 'cancel'
                  ? 'Отменить запись?'
                  : 'Подтвердить выполнение?'
              }
              description={`${confirm.booking.service} · ${bookingTime(confirm.booking.startsAt, confirm.booking.timeZone || 'UTC')}. Статус оплаты не меняется.`}
              error={error}
              busy={busy}
              onClose={() => setConfirm(null)}
              onConfirm={() => void change()}
            />
          )}
        </div>
      }
    </Localize>
  );
}
function BookingSchedule() {
  const uid = useId();
  const [day, setDay] = useState(startDay),
    [resources, setResources] = useState<ResourceView[]>([]),
    [slots, setSlots] = useState<SlotView[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [name, setName] = useState(''),
    [zone, setZone] = useState('UTC'),
    [resourceId, setResourceId] = useState(''),
    [productId, setProductId] = useState('');
  const [start, setStart] = useState(''),
    [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const resource = resources.find((r) => r.id === resourceId);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [data, catalog] = await Promise.all([
        api<{ resources: ResourceView[]; slots: SlotView[] }>(
          slotQuery(day, undefined, true),
        ),
        api<{
          products: {
            id: string;
            title: string;
            active: boolean;
            kind: string;
          }[];
        }>('/api/products'),
      ]);
      setResources(data.resources);
      setSlots(data.slots);
      setProducts(
        catalog.products.filter((p) => p.active && p.kind === 'service'),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [day]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function action(body: () => unknown) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/booking-slots', body());
      await load();
      setNotice('Расписание сохранено');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Localize>
      {
        <section className="min-w-0 space-y-5 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Ресурсы и расписание</h2>
          <p className="text-sm text-site-muted">
            Один слот — один клиент. Слоты ресурса не пересекаются. Закрытие
            слота или ресурса запрещает новые записи, но не отменяет
            существующие.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          {notice && <output className="block text-sm">{notice}</output>}
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void action(() => ({
                action: 'create_resource',
                name,
                timeZone: zone,
              }));
            }}
          >
            <label htmlFor={`${uid}-name`} className="text-sm">
              Имя специалиста или ресурса
              <Input
                id={`${uid}-name`}
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label htmlFor={`${uid}-zone`} className="text-sm">
              Часовой пояс IANA
              <Input
                id={`${uid}-zone`}
                required
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Europe/Moscow"
                className={`${inputClass} mt-2`}
              />
            </label>
            <Button
              disabled={busy}
              className="min-h-11 bg-site-accent text-site-accent-ink"
            >
              Добавить ресурс
            </Button>
          </form>
          <div className="space-y-2">
            {resources.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-site-raised p-3"
              >
                <span className="min-w-0 break-words text-sm">
                  {r.name} · {r.timeZone} · {r.active ? 'Открыт' : 'Закрыт'}
                </span>
                <Button
                  variant="outline"
                  className={outline}
                  disabled={busy}
                  onClick={() =>
                    void action(() => ({
                      action: 'set_resource',
                      id: r.id,
                      active: !r.active,
                      revision: r.revision,
                    }))
                  }
                >
                  {r.active ? 'Закрыть ресурс' : 'Открыть ресурс'}
                </Button>
              </div>
            ))}
          </div>
          <form
            className="space-y-4 border-t border-site-line pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void action(() => ({
                action: 'create_slot',
                resourceId,
                productId,
                startsAt: wallTimeToIso(start, resource?.timeZone || ''),
                endsAt: wallTimeToIso(end, resource?.timeZone || ''),
              }));
            }}
          >
            <h3 className="font-semibold">Добавить время для услуги</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Choose
                label="Ресурс"
                value={resourceId}
                options={resources
                  .filter((r) => r.active)
                  .map((r) => ({
                    value: r.id,
                    label: `${r.name} · ${r.timeZone}`,
                  }))}
                onChange={setResourceId}
              />
              <Choose
                label="Услуга каталога"
                value={productId}
                options={products.map((p) => ({ value: p.id, label: p.title }))}
                onChange={setProductId}
              />
              <label htmlFor={`${uid}-start`} className="min-w-0 text-sm">
                Начало
                <Input
                  id={`${uid}-start`}
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <label htmlFor={`${uid}-end`} className="min-w-0 text-sm">
                Окончание
                <Input
                  id={`${uid}-end`}
                  type="datetime-local"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </label>
            </div>
            <p className="text-sm text-site-muted">
              Ввод в часовом поясе ресурса:{' '}
              {resource?.timeZone || 'выберите ресурс'}. Длительность 5 минут —
              12 часов. Неоднозначное время при переводе часов отклоняется.
            </p>
            <Button
              disabled={busy || !resourceId || !productId}
              className="min-h-11 bg-site-accent text-site-accent-ink"
            >
              Добавить слот
            </Button>
          </form>
          <label htmlFor={`${uid}-day`} className="block text-sm">
            Расписание на 7 дней с даты (UTC)
            <Input
              id={`${uid}-day`}
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>
          <Button
            variant="outline"
            className={outline}
            disabled={busy}
            onClick={() => void load()}
          >
            Обновить расписание
          </Button>
          <div className="space-y-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className="min-w-0 rounded-xl border border-site-line p-3"
              >
                <p className="break-words font-medium">
                  {s.service} · {s.resourceName}
                </p>
                <p className="mt-1 text-sm text-site-muted">
                  {bookingTime(s.startsAt, s.timeZone)} —{' '}
                  {bookingTime(s.endsAt, s.timeZone)} · {s.timeZone}
                </p>
                <p className="mt-1 text-sm">
                  {s.occupied ? 'Занят' : s.available ? 'Открыт' : 'Закрыт'}
                </p>
                <Button
                  className={`${outline} mt-3`}
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void action(() => ({
                      action: 'set_slot',
                      id: s.id,
                      available: !s.available,
                      revision: s.revision,
                    }))
                  }
                >
                  {s.available
                    ? 'Закрыть новые записи'
                    : 'Открыть новые записи'}
                </Button>
              </div>
            ))}
          </div>
          {!busy && !slots.length && (
            <p className="text-sm text-site-muted">На эту неделю слотов нет</p>
          )}
        </section>
      }
    </Localize>
  );
}
