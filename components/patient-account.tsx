'use client';
import { Localize, useLocale } from '@/components/locale-provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientAgentAccess } from '@/components/patient-agent-access';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { BookingView } from '@/lib/booking-policy';
import {
  PatientBookingFlow,
  PatientPayment,
} from '@/components/patient-booking-flow';

type Patient = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
};
const statuses: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Awaiting confirmation',
  pending_payment: 'Awaiting payment',
  cancelled: 'Cancelled',
  completed: 'Completed',
};
const formatTime = (
  stamp: number | null,
  zone: string | null,
  intl: string,
) => {
  if (stamp === null) return 'Time not confirmed';
  try {
    return new Intl.DateTimeFormat(intl, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone || 'America/New_York',
    }).format(stamp * 1000);
  } catch {
    return new Intl.DateTimeFormat(intl, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    }).format(stamp * 1000);
  }
};
export function PatientAccount() {
  const { intl, t } = useLocale();
  const time = (stamp: number | null, zone: string | null) =>
    formatTime(stamp, zone, intl);
  const [patient, setPatient] = useState<Patient>();
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [asOf, setAsOf] = useState(0);
  const [flow, setFlow] = useState<{
    action: 'create' | 'reschedule' | 'cancel';
    booking?: BookingView;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setBusy(true);
    setError('');
    try {
      const responses = await Promise.all(
        ['/api/auth/me', '/api/bookings?mine=1'].map((url) =>
          fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) }),
        ),
      );
      if (current !== sequence.current) return;
      if (responses.some((r) => r.status === 401)) {
        setPatient(undefined);
        setBookings([]);
        window.location.replace('/login?next=%2Faccount');
        return;
      }
      if (responses.some((r) => !r.ok)) throw new Error();
      const [identity, data] = await Promise.all([
        responses[0].json() as Promise<{ user?: Patient }>,
        responses[1].json() as Promise<{
          bookings?: BookingView[];
          truncated?: boolean;
        }>,
      ]);
      if (current !== sequence.current) return;
      if (!identity.user || !Array.isArray(data.bookings)) throw new Error();
      setPatient(identity.user);
      setBookings(data.bookings);
      setTruncated(data.truncated === true);
      setAsOf(Date.now());
    } catch {
      if (current === sequence.current) {
        setError(
          'We could not load your account. Please try again. Do not rely on an older appointment status.',
        );
        setBookings([]);
      }
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }, []);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [load, invalidate]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [load]);
  async function logout() {
    if (leaving) return;
    setLeaving(true);
    setError('');
    ++sequence.current;
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      setPatient(undefined);
      setBookings([]);
      window.location.replace('/login?next=%2Faccount');
    } catch {
      setError('Sign out was not confirmed. Please try again.');
      setLeaving(false);
      setBusy(false);
    }
  }
  const past = (booking: BookingView) =>
    ['cancelled', 'completed'].includes(booking.status) ||
    (booking.endsAt ?? booking.startsAt ?? Infinity) * 1000 < asOf;
  const upcoming = bookings
    .filter((b) => !past(b))
    .sort((a, b) => (a.startsAt ?? Infinity) - (b.startsAt ?? Infinity));
  const history = bookings.filter(past);
  const cards = (items: BookingView[], empty: string) =>
    items.length ? (
      <ul className="grid gap-4">
        {items.map((booking) => (
          <li
            key={booking.id}
            className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{booking.service}</h3>
              <span className="rounded-lg border border-site-line bg-site-raised px-3 py-1 text-sm font-medium">
                {booking.status === 'confirmed' &&
                booking.paymentStatus === 'pending'
                  ? 'Awaiting payment'
                  : statuses[booking.status] ||
                    'Please confirm with the clinic'}
              </span>
            </div>
            <p className="mt-4 text-lg font-medium">
              {time(booking.startsAt, booking.timeZone)}
            </p>
            <p className="mt-1 text-sm text-site-muted">
              {booking.timeZone || 'America/New_York'}
              {booking.endsAt !== null
                ? ` · ${t('Ends')} ${time(booking.endsAt, booking.timeZone)}`
                : ''}
            </p>
            <dl className="mt-4 grid gap-3 text-base sm:grid-cols-2">
              <div>
                <dt className="text-sm text-site-muted">
                  Dentist / appointment resource
                </dt>
                <dd className="mt-1">
                  {booking.resourceName || 'To be confirmed by the clinic'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-site-muted">Location</dt>
                <dd className="mt-1">
                  Miami · confirm the address with the clinic
                </dd>
              </div>
            </dl>
            {(booking.status === 'pending_payment' ||
              (booking.status === 'confirmed' &&
                booking.paymentStatus === 'pending')) && (
              <p className="mt-4 text-sm leading-6">
                This appointment is not yet confirmed. Contact the clinic about
                payment
                {booking.holdExpiresAt
                  ? ` ${t('before')} ${time(booking.holdExpiresAt, booking.timeZone)}`
                  : ''}
                .
              </p>
            )}
            {booking.status === 'pending' && (
              <p className="mt-4 text-sm leading-6">
                The clinic still needs to confirm this request.
              </p>
            )}
            <p className="mt-4 break-all text-sm text-site-muted">
              Reference: {booking.id}
            </p>
            {booking.slotId &&
              ['confirmed', 'pending_payment'].includes(booking.status) &&
              (booking.startsAt || 0) * 1000 > asOf && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.status === 'confirmed' &&
                    booking.paymentStatus !== 'pending' && (
                      <Button
                        variant="outline"
                        className="min-h-11 border-site-line bg-site-surface text-site-ink"
                        onClick={() => {
                          setNotice('');
                          setFlow({ action: 'reschedule', booking });
                        }}
                      >
                        Reschedule
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    className="min-h-11 border-site-line bg-site-surface text-site-ink"
                    onClick={() => {
                      setNotice('');
                      setFlow({ action: 'cancel', booking });
                    }}
                  >
                    Cancel appointment
                  </Button>
                </div>
              )}
            {booking.slotId &&
              booking.status === 'confirmed' &&
              booking.paymentStatus === 'pending' &&
              (booking.holdExpiresAt || 0) * 1000 > asOf && (
                <PatientPayment
                  booking={booking}
                  onChanged={() => void load()}
                />
              )}
          </li>
        ))}
      </ul>
    ) : (
      <div className="rounded-2xl border border-dashed border-site-line px-5 py-10 text-center">
        <CalendarDays className="mx-auto mb-4 size-7 text-site-muted" />
        <p className="text-lg font-medium">{empty}</p>
        <p className="mx-auto mt-2 max-w-lg text-base leading-7 text-site-muted">
          Confirmed bookings and appointments added by the clinic appear here.
          An AI conversation or a separate contact request does not
          automatically create an appointment.
        </p>
      </div>
    );
  return (
    <Localize>
      {
        <main className="site-theme-scope min-h-dvh bg-site-page text-site-ink [overflow-wrap:anywhere]">
          <header className="border-b border-site-line">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center text-xl font-semibold"
              >
                OraVera
              </Link>
              <div className="flex flex-wrap gap-2">
                {patient && ['admin', 'owner'].includes(patient.role) && (
                  <Link
                    href="/admin"
                    className="inline-flex min-h-11 items-center px-3 text-sm underline"
                  >
                    Clinic administration
                  </Link>
                )}
                <Button
                  variant="outline"
                  disabled={leaving || !patient}
                  onClick={() => void logout()}
                  className="min-h-11 border-site-line bg-site-surface text-site-ink hover:bg-site-raised"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  My appointments
                </h1>
                <p className="mt-2 text-base text-site-muted">
                  {patient?.firstName ? (
                    <>
                      {t('Welcome')},{' '}
                      <bdi translate="no">{patient.firstName}</bdi>
                    </>
                  ) : (
                    'Your OraVera patient account'
                  )}
                </p>
              </div>
              <Button
                onClick={() => void load()}
                disabled={busy || leaving}
                variant="outline"
                className="min-h-11 border-site-line bg-site-surface text-site-ink hover:bg-site-raised"
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-site-line p-4 text-base leading-7"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-xl border border-site-line bg-site-surface p-4 leading-7"
              >
                {notice}
              </p>
            )}
            {patient && !leaving && (
              <div>
                {!flow ? (
                  <Button
                    className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover hover:text-site-on-accent"
                    onClick={() => {
                      setNotice('');
                      setFlow({ action: 'create' });
                    }}
                  >
                    Book an appointment
                  </Button>
                ) : (
                  <PatientBookingFlow
                    key={`${flow.action}-${flow.booking?.id || 'new'}-${flow.booking?.revision || 0}`}
                    {...flow}
                    onClose={() => setFlow(null)}
                    onDone={(message) => {
                      setFlow(null);
                      setNotice(message);
                      void load();
                    }}
                  />
                )}
              </div>
            )}
            {busy ? (
              <output className="py-8 text-base">
                Loading your appointments…
              </output>
            ) : !error && patient ? (
              <>
                <Tabs defaultValue="upcoming" className="min-w-0 gap-5">
                  <TabsList
                    aria-label="Appointment periods"
                    className="h-auto! grid w-full grid-cols-2 border border-site-line bg-site-surface p-1 sm:w-fit"
                  >
                    <TabsTrigger
                      value="upcoming"
                      className="min-h-11 min-w-0 whitespace-normal px-3 text-base text-site-muted hover:text-site-ink data-active:bg-site-raised data-active:text-site-ink"
                    >
                      Upcoming ({upcoming.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="min-h-11 min-w-0 whitespace-normal px-3 text-base text-site-muted hover:text-site-ink data-active:bg-site-raised data-active:text-site-ink"
                    >
                      History ({history.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming">
                    {cards(upcoming, 'No upcoming appointments')}
                  </TabsContent>
                  <TabsContent value="history">
                    {cards(history, 'No past or cancelled appointments')}
                  </TabsContent>
                </Tabs>
                {truncated && (
                  <output className="text-sm leading-6">
                    Showing the latest 200 appointments only. Contact the clinic
                    if a record is missing.
                  </output>
                )}
                {!leaving && <PatientAgentAccess />}
                <section
                  aria-labelledby="patient-contact"
                  className="rounded-2xl border border-site-line p-5"
                >
                  <h2 id="patient-contact" className="text-lg font-semibold">
                    Your contact details
                  </h2>
                  <dl className="mt-4 grid gap-4 text-base sm:grid-cols-3">
                    <div>
                      <dt className="text-sm text-site-muted">Name</dt>
                      <dd className="mt-1">
                        <bdi translate="no">
                          {[patient.firstName, patient.lastName]
                            .filter(Boolean)
                            .join(' ')}
                        </bdi>
                        {!patient.firstName &&
                          !patient.lastName &&
                          'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-site-muted">Email</dt>
                      <dd translate="no" dir="ltr" className="mt-1">
                        {patient.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-site-muted">Phone</dt>
                      <dd className="mt-1">
                        {patient.phone || 'Not provided'}
                      </dd>
                    </div>
                  </dl>
                </section>
              </>
            ) : null}
            <p className="text-sm leading-6 text-site-muted">
              If no suitable time is available or you need help, contact the
              clinic. Medical photos are not stored in this account.
            </p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-base underline"
            >
              Back to the assistant
            </Link>
          </div>
        </main>
      }
    </Localize>
  );
}
