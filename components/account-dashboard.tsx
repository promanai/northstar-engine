/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  LogOut,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderList } from '@/components/order-list';
import { FileManager } from '@/components/file-manager';
import { AgentAccess } from '@/components/agent-access';
import { BookingPanel } from '@/components/booking-panel';
import { TicketPanel } from '@/components/ticket-panel';
import { Input } from '@/components/ui/input';
import { SessionManager } from '@/components/session-manager';

const tabs = [
  { label: 'Обзор', icon: UserRound },
  { label: 'Бронирования', icon: CalendarDays },
  { label: 'Заказы', icon: CreditCard },
  { label: 'Обращения', icon: LifeBuoy },
];

type AccountUser = {
  revision: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export function AccountDashboard() {
  const [active, setActive] = useState('Обзор');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (window.location.hash === '#orders') setActive('Заказы');
      if (window.location.hash === '#tickets') setActive('Обращения');
      if (window.location.hash === '#bookings') setActive('Бронирования');
      if (window.location.hash === '#files') setActive('Файлы');
      if (window.location.hash === '#agents') setActive('AI-агенты');
    });
    void fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          window.location.href = '/login?next=%2Faccount';
          return;
        }
        const data = (await response.json()) as { user: AccountUser };
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        window.location.href = '/login?next=%2Faccount';
      });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (loading || !user)
    return (
      <div className="grid min-h-screen place-items-center bg-site-page text-sm text-site-muted">
        Загрузка кабинета…
      </div>
    );
  const greeting = user?.firstName ?? user?.email ?? 'клиент';
  return (
    <div className="dashboard-screen account-screen min-h-dvh bg-site-page text-site-ink">
      <header className="dashboard-header sticky top-0 z-30 border-b border-site-line bg-site-surface">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-8">
          <a
            href="/"
            className="flex min-h-11 items-center gap-2 text-sm text-site-muted hover:text-site-ink"
          >
            <ArrowLeft className="size-4" /> На сайт
          </a>
          <span className="min-w-0 text-center text-sm font-semibold sm:text-base">
            Личный кабинет
          </span>
          <Button
            onClick={logout}
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-site-muted hover:bg-site-raised hover:text-site-ink"
            aria-label="Выйти"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-site-accent-ink">
              Ваш профиль
            </p>
            <h1 className="mt-2 text-2xl font-semibold break-words tracking-[-0.04em] sm:text-3xl">
              Здравствуйте, {greeting}
            </h1>
            <p className="mt-2 text-sm text-site-muted">
              Здесь собраны ваши записи, платежи и обращения.
            </p>
          </div>
          <Badge className="w-fit border-site-line bg-site-accent/10 text-site-accent-ink">
            <CheckCircle2 className="mr-1 size-3" /> Вы вошли в аккаунт
          </Badge>
        </div>
        <a
          href="/account/profile"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-site-accent-ink"
        >
          <UserRound className="size-4" />
          Настройки профиля
          <ChevronRight className="size-4" />
        </a>
        <nav
          aria-label="Разделы личного кабинета"
          className="account-navigation"
        >
          {tabs.map(({ label, icon: Icon }) => (
            <button
              key={label}
              aria-pressed={active === label}
              aria-label={label}
              onClick={() => {
                setActive(label);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-sm sm:flex-row sm:gap-2 sm:px-3 sm:py-3 ${active === label ? 'bg-site-raised text-site-accent-ink' : 'text-site-muted hover:text-site-ink'}`}
            >
              <Icon className="size-5 shrink-0 sm:size-4" />
              <span className="sm:hidden">
                {label === 'Бронирования'
                  ? 'Записи'
                  : label === 'Обращения'
                    ? 'Помощь'
                    : label}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <Button
          variant="outline"
          className="mt-4 min-h-11"
          onClick={() => setActive('AI-агенты')}
        >
          Доступ AI-агентов
        </Button>
        <Button
          variant="outline"
          className="mt-4 ml-2 min-h-11"
          aria-pressed={active === 'Файлы'}
          onClick={() => setActive('Файлы')}
        >
          Файлы
        </Button>
        {active === 'Файлы' && <FileManager />}
        {active === 'AI-агенты' && <AgentAccess />}
        {active === 'Обзор' && (
          <Overview user={user} onBookings={() => setActive('Заказы')} />
        )}
        {active === 'Бронирования' && <BookingPanel />}
        {active === 'Заказы' && <Payments />}
        {active === 'Обращения' && <TicketPanel />}
      </main>
    </div>
  );
}

function Overview({
  user,
  onBookings,
}: {
  user: AccountUser | null;
  onBookings: () => void;
}) {
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Заказы и оплаты</h2>
        <p className="mt-4 text-base leading-7 text-site-muted">
          Оформленные услуги, зафиксированные суммы и подтверждения оплаты — в
          списке заказов.
        </p>
        <Button onClick={onBookings} className="mt-5 min-h-11">
          Мои заказы <ChevronRight className="ml-2 size-4" />
        </Button>
        <a
          href="/catalog"
          className="mt-3 flex min-h-11 items-center text-sm text-site-accent-ink"
        >
          Выбрать услугу →
        </a>
      </section>
      <section className="rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
        <h2 className="font-medium">Контактные данные</h2>
        <div className="mt-5 space-y-3 text-sm">
          <p className="flex items-center gap-3 break-all text-site-muted">
            <Mail className="size-4 shrink-0 text-site-accent-ink" />{' '}
            {user?.email}
          </p>
          <p className="flex items-center gap-3 text-site-muted">
            <Phone className="size-4 text-site-accent-ink" />{' '}
            {user?.phone ?? 'Телефон не указан'}
          </p>
        </div>
        <a
          href="/account/profile"
          className="mt-4 inline-block text-sm text-site-accent-ink hover:text-site-ink"
        >
          Изменить данные
        </a>
      </section>
    </div>
  );
}

function Payments() {
  return <OrderList />;
}

export function ProfileForm() {
  const [serverProfile, setServerProfile] = useState<AccountUser | null>(null);
  const [profile, setProfile] = useState({
    revision: 0,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void fetch('/api/auth/me')
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace('/login?next=%2Faccount%2Fprofile');
          return;
        }
        if (!response.ok) throw new Error('Не удалось загрузить профиль');
        const { user } = (await response.json()) as { user: AccountUser };
        setProfile((current) => ({
          ...current,
          revision: user.revision,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email,
          phone: user.phone ?? '',
        }));
        setLoading(false);
      })
      .catch(() =>
        setError(
          'Не удалось загрузить профиль. Обновите страницу и повторите.',
        ),
      );
  }, []);
  async function save(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (busy || loading) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = (await response.json()) as {
        error?: string;
        user: AccountUser;
      };
      if (!response.ok) {
        if (response.status === 409) {
          const r = await fetch('/api/auth/me', { cache: 'no-store' });
          if (r.ok) {
            const result = (await r.json()) as { user: AccountUser };
            setServerProfile(result.user);
          }
        }
        throw new Error(data.error ?? 'Не удалось сохранить профиль');
      }
      setMessage('Изменения сохранены');
      setServerProfile(null);
      setProfile((current) => ({
        ...current,
        revision: data.user.revision,
        email: data.user.email,
        firstName: data.user.firstName ?? '',
        lastName: data.user.lastName ?? '',
        phone: data.user.phone ?? '',
        currentPassword: '',
        newPassword: '',
      }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось сохранить изменения',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={save} className="mt-7 space-y-6">
        {serverProfile && (
          <div className="space-y-3 rounded-xl border border-site-line p-4">
            <p className="text-sm">
              Профиль изменён в другом окне. Ваши правки остаются в форме;
              сравните их с данными сервера.
            </p>
            <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">
              {JSON.stringify(serverProfile, null, 2)}
            </pre>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProfile({
                  revision: serverProfile.revision,
                  email: serverProfile.email,
                  firstName: serverProfile.firstName ?? '',
                  lastName: serverProfile.lastName ?? '',
                  phone: serverProfile.phone ?? '',
                  currentPassword: '',
                  newPassword: '',
                });
                setServerProfile(null);
                setError('');
              }}
            >
              Заменить черновик данными сервера
            </Button>
          </div>
        )}
        <fieldset
          disabled={loading || busy}
          className="rounded-2xl border border-site-line bg-site-surface p-5 sm:p-7"
        >
          <legend className="sr-only">Контактные данные</legend>
          <h2 className="text-xl font-semibold">Контактные данные</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {(
              [
                {
                  key: 'firstName',
                  label: 'Имя',
                  type: 'text',
                  autoComplete: 'given-name',
                },
                {
                  key: 'lastName',
                  label: 'Фамилия',
                  type: 'text',
                  autoComplete: 'family-name',
                },
                {
                  key: 'email',
                  label: 'Email',
                  type: 'email',
                  autoComplete: 'email',
                },
                {
                  key: 'phone',
                  label: 'Телефон',
                  type: 'tel',
                  autoComplete: 'tel',
                },
              ] as const
            ).map((field) => (
              <label
                key={field.key}
                htmlFor={`profile-${field.key}`}
                className="text-sm text-site-muted"
              >
                {field.label}
                <Input
                  id={`profile-${field.key}`}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  required={field.key === 'email'}
                  value={profile[field.key]}
                  onChange={(event) =>
                    setProfile({ ...profile, [field.key]: event.target.value })
                  }
                  className="mt-2 h-11 border-site-line bg-site-page text-site-ink"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset
          disabled={loading || busy}
          className="rounded-2xl border border-site-line bg-site-surface p-5 sm:p-7"
        >
          <legend className="sr-only">Смена пароля</legend>
          <h2 className="text-xl font-semibold">Смена пароля</h2>
          <p className="mt-2 text-sm text-site-muted">
            Оставьте поля пустыми, чтобы сохранить текущий пароль.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label
              htmlFor="profile-current-password"
              className="text-sm text-site-muted"
            >
              Текущий пароль
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                required={!!profile.newPassword}
                value={profile.currentPassword}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    currentPassword: event.target.value,
                  })
                }
                className="mt-2 h-11 border-site-line bg-site-page text-site-ink"
              />
            </label>
            <label
              htmlFor="profile-new-password"
              className="text-sm text-site-muted"
            >
              Новый пароль
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required={!!profile.currentPassword}
                value={profile.newPassword}
                onChange={(event) =>
                  setProfile({ ...profile, newPassword: event.target.value })
                }
                className="mt-2 h-11 border-site-line bg-site-page text-site-ink"
              />
              <span className="mt-2 block text-xs">Не менее 8 символов</span>
            </label>
          </div>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/50 p-4 text-sm"
          >
            {error}
          </p>
        )}
        {message && (
          <output className="block text-sm text-site-success">{message}</output>
        )}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="submit"
            disabled={busy || loading}
            className="h-11 rounded-xl bg-site-accent px-5 text-site-on-accent hover:bg-site-accent-hover"
          >
            {busy
              ? 'Сохраняем…'
              : loading
                ? 'Загружаем профиль…'
                : 'Сохранить изменения'}
          </Button>
          <a
            href="/account"
            className="inline-flex min-h-11 items-center justify-center text-sm text-site-muted"
          >
            Вернуться в кабинет
          </a>
        </div>
      </form>
      {!loading && <SessionManager key={profile.revision} />}
    </>
  );
}
