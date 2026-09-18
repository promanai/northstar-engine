'use client';
import { Localize, useLocale } from '@/components/locale-provider';
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  type BookingView,
  type SlotView,
  wallTimeToIso,
} from '@/lib/booking-policy';
import { paymentLink } from '@/lib/commerce-policy';

const outline =
  'min-h-11 whitespace-normal border-site-line bg-site-surface text-site-ink hover:bg-site-raised';
export const patientTime = (stamp: number, zone: string, intl = 'en-US') =>
  new Intl.DateTimeFormat(intl, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone,
  }).format(stamp * 1000);
const formatPrice = (
  amount: number | null,
  currency: string | null,
  intl: string,
) =>
  amount === null || !currency
    ? 'Price not provided'
    : new Intl.NumberFormat(intl, { style: 'currency', currency }).format(
        amount / 100,
      );
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
async function request<T>(
  url: string,
  body?: unknown,
  method = 'POST',
  key?: string,
): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    ...(body === undefined
      ? {}
      : {
          method,
          headers: {
            'content-type': 'application/json',
            ...(key ? { 'idempotency-key': key } : {}),
          },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error('Your session expired. Sign in again before continuing.');
    if (response.status === 409)
      throw new Error(
        'The appointment, price or availability has changed, or online payment is unavailable. Refresh your appointments before trying again.',
      );
    throw new Error(
      'The action was not confirmed. Refresh your appointments to check the latest status.',
    );
  }
  return response.json() as Promise<T>;
}
export function PatientBookingFlow({
  booking,
  action = 'create',
  onClose,
  onDone,
}: {
  booking?: BookingView;
  action?: 'create' | 'reschedule' | 'cancel';
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { intl, t } = useLocale();
  const price = (amount: number | null, currency: string | null) =>
    formatPrice(amount, currency, intl);
  const time = (stamp: number, zone: string) => patientTime(stamp, zone, intl);
  const [day, setDay] = useState(today);
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [service, setService] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(action !== 'cancel');
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<SlotView | null>(null);
  const [confirm, setConfirm] = useState(action === 'cancel');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const retry = useRef({ body: '', key: '' });
  useEffect(() => {
    if (action === 'cancel') return;
    let active = true;
    setLoading(true);
    setError('');
    setSlots([]);
    setSelected(null);
    void (async () => {
      try {
        // Search boundaries follow clinic days, including DST transitions.
        const end = new Date(`${day}T12:00:00Z`);
        end.setUTCDate(end.getUTCDate() + 7);
        const query = new URLSearchParams({
          from: wallTimeToIso(`${day}T00:00`, 'America/New_York'),
          to: wallTimeToIso(
            `${end.toISOString().slice(0, 10)}T00:00`,
            'America/New_York',
          ),
        });
        if (booking?.productId) query.set('productId', booking.productId);
        const data = await request<{ slots: SlotView[]; truncated: boolean }>(
          `/api/booking-slots?${query}`,
        );
        if (active) {
          setSlots(data.slots);
          setTruncated(data.truncated);
        }
      } catch {
        if (active)
          setError(
            'Available times could not be loaded. Choose a valid date and try again.',
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [day, refresh, booking?.productId, action]);
  async function save() {
    if (lock.current || (action !== 'cancel' && !selected)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let result: { booking: BookingView };
      if (booking)
        result = await request(
          `/api/bookings/${booking.id}`,
          {
            action,
            revision: booking.revision,
            ...(selected ? { slotId: selected.id } : {}),
          },
          'PATCH',
        );
      else {
        const body = {
          slotId: selected!.id,
          expectedPrice: selected!.price,
          expectedCurrency: selected!.currency,
          expectedSlotRevision: selected!.revision,
        };
        const fingerprint = JSON.stringify(body);
        if (retry.current.body !== fingerprint)
          retry.current = { body: fingerprint, key: crypto.randomUUID() };
        result = await request(
          '/api/bookings',
          body,
          'POST',
          retry.current.key,
        );
      }
      const message =
        result.booking.status === 'cancelled'
          ? 'Appointment cancelled. Any refund must be arranged with the clinic.'
          : result.booking.paymentStatus === 'pending'
            ? 'Time held for payment, not yet confirmed. Continue payment from your appointment card.'
            : action === 'reschedule'
              ? 'Appointment rescheduled.'
              : 'Appointment confirmed.';
      onDone(
        `${t(message)} ${t('Reference:')} ${result.booking.id}. ${t('The clinic can see this change in its administration panel. No email or SMS has been sent by this action.')}`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The action was not confirmed.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const services = [
    ...new Map(slots.map((s) => [s.productId, s.service])).entries(),
  ];
  return (
    <Localize>
      {
        <section
          aria-label="Appointment booking"
          className="min-w-0 space-y-4 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {action === 'create'
                ? 'Book an appointment'
                : action === 'reschedule'
                  ? 'Reschedule appointment'
                  : 'Cancel appointment'}
            </h2>
            <Button
              variant="outline"
              className={outline}
              disabled={busy}
              onClick={onClose}
            >
              Close booking
            </Button>
          </div>
          {action !== 'cancel' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="min-w-0 text-sm">
                  Week starting · Miami time
                  <Input
                    type="date"
                    aria-label="Week starting"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    disabled={busy}
                    className="mt-2 min-h-11 w-full min-w-0 border-site-line bg-site-raised text-base text-site-ink"
                  />
                </label>
                <div className="min-w-0 text-sm">
                  <span>Service</span>
                  <Select
                    value={service || 'all'}
                    onValueChange={(value) =>
                      setService(value === 'all' ? '' : String(value))
                    }
                    disabled={loading || busy || !!booking}
                    items={[
                      {
                        value: 'all',
                        label: booking?.service || 'All available services',
                      },
                      ...services.map(([value, label]) => ({ value, label })),
                    ]}
                  >
                    <SelectTrigger
                      aria-label="Service"
                      className="mt-2 min-h-11 w-full min-w-0 border-site-line bg-site-raised text-base text-site-ink"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-site-line bg-site-surface text-site-ink">
                      <SelectItem value="all">
                        {booking?.service || 'All available services'}
                      </SelectItem>
                      {services.map(([id, title]) => (
                        <SelectItem key={id} value={id}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                className={outline}
                disabled={loading || busy}
                onClick={() => setRefresh((n) => n + 1)}
              >
                Refresh available times
              </Button>
              {loading ? (
                <p role="status">Loading available times…</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {slots
                    .filter((s) => !service || s.productId === service)
                    .map((slot) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        disabled={busy}
                        className={`${outline} h-auto min-w-0 justify-start p-4 text-left`}
                        onClick={() => {
                          setSelected(slot);
                          setError('');
                          setConfirm(true);
                        }}
                      >
                        <span className="min-w-0 space-y-1">
                          <span className="block font-semibold">
                            {slot.service}
                          </span>
                          <span className="block">
                            {time(slot.startsAt, slot.timeZone)}
                          </span>
                          <span className="block text-sm">
                            {slot.resourceName} · {slot.timeZone}
                          </span>
                          <span className="block text-sm">
                            {price(
                              booking ? booking.price : slot.price,
                              booking ? booking.currency : slot.currency,
                            )}
                          </span>
                        </span>
                      </Button>
                    ))}
                </div>
              )}
              {!loading &&
                !error &&
                !slots.filter((s) => !service || s.productId === service)
                  .length && (
                  <p>
                    No available times for this selection. Choose another week
                    or contact the clinic. No appointment has been created.
                  </p>
                )}
              {truncated && (
                <p>
                  Only the first 200 available times are shown. Choose a later
                  week to see more.
                </p>
              )}
              <p className="text-sm leading-6 text-site-muted">
                Review the service and time before confirming. Paid appointments
                are held for 15 minutes and require a separate payment. Do not
                submit medical details here.
              </p>
            </>
          )}
          {error && !confirm && <p role="alert">{error}</p>}
          {confirm && (
            <AlertDialog
              open
              onOpenChange={(open) => {
                if (!open && !busy) {
                  setConfirm(false);
                  if (action === 'cancel') onClose();
                }
              }}
            >
              <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto border border-site-line bg-site-surface text-site-ink [overflow-wrap:anywhere]">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {action === 'cancel'
                      ? 'Cancel this appointment?'
                      : action === 'reschedule'
                        ? 'Confirm new time?'
                        : 'Confirm appointment?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-site-muted">
                    {selected
                      ? `${t(selected.service)} · ${selected.resourceName} · ${time(selected.startsAt, selected.timeZone)} (${selected.timeZone}). ${price(booking ? booking.price : selected.price, booking ? booking.currency : selected.currency)}.`
                      : `${t(booking?.service || '')} · ${booking?.startsAt ? time(booking.startsAt, booking.timeZone || 'America/New_York') : t('Time not provided')}. ${t('Cancellation does not automatically refund payment.')}`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error && (
                  <p role="alert" className="text-base">
                    {error}
                  </p>
                )}
                <AlertDialogFooter className="border-site-line bg-site-surface">
                  <Button
                    variant="outline"
                    className={outline}
                    disabled={busy}
                    onClick={() => {
                      setConfirm(false);
                      if (action === 'cancel') onClose();
                    }}
                  >
                    Go back
                  </Button>
                  <Button
                    className="min-h-11 whitespace-normal bg-site-accent text-site-on-accent hover:bg-site-accent-hover hover:text-site-on-accent"
                    disabled={busy}
                    onClick={() => void save()}
                  >
                    {busy
                      ? 'Saving…'
                      : action === 'cancel'
                        ? 'Confirm cancellation'
                        : 'Confirm appointment'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      }
    </Localize>
  );
}

export function PatientPayment({
  booking,
  onChanged,
}: {
  booking: BookingView;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [url, setUrl] = useState('');
  const lock = useRef(false);
  return (
    <Localize>
      {
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            className={outline}
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError('');
              setUrl('');
              try {
                const result = await request<{
                  payment?: { paymentUrl?: string };
                }>(`/api/bookings/${booking.id}/checkout`, {});
                const link = paymentLink(result.payment?.paymentUrl);
                if (!link)
                  throw new Error(
                    'A secure payment link was not returned. Contact the clinic.',
                  );
                setUrl(link);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Payment is unavailable.',
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? 'Preparing payment…' : 'Get payment link'}
          </Button>
          {url && (
            <a
              className="block min-h-11 py-2 underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open secure payment
            </a>
          )}
          {url && (
            <Button variant="outline" className={outline} onClick={onChanged}>
              Check payment status
            </Button>
          )}
          {error && (
            <p role="alert">
              {error} Your existing reservation has not been duplicated.
            </p>
          )}
        </div>
      }
    </Localize>
  );
}
