'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminConfirm } from '@/components/admin-confirm';
type Contact = {
  id: string;
  revision: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  suspended: number;
  createdAt: string;
};
type Stats = Record<string, { orders: number; bookings: number }>;
type Draft = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};
const blank: Draft = { email: '', firstName: '', lastName: '', phone: '' };
const fields = [
  ['firstName', 'Имя'],
  ['lastName', 'Фамилия'],
  ['email', 'Email'],
  ['phone', 'Телефон'],
] as const;
export function CustomerEditor() {
  const [rows, setRows] = useState<Contact[]>([]),
    [stats, setStats] = useState<Stats>({}),
    [cursor, setCursor] = useState<string | null>(null),
    [selected, setSelected] = useState<Contact | null>(null),
    [draft, setDraft] = useState<Draft>(blank),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [deleting, setDeleting] = useState(false),
    [latest, setLatest] = useState<Contact | null>(null),
    [history, setHistory] = useState<unknown[] | null>(null),
    [search, setSearch] = useState(''),
    [inviteToken, setInviteToken] = useState('');
  const lock = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function load(before?: string, query?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (before) params.set('before', before);
      if (query) params.set('query', query);
      const qs = params.toString();
      const r = await fetch(
        `/api/customers${qs ? `?${qs}` : ''}`,
        { cache: 'no-store' },
      );
      const data = (await r.json()) as {
        customers: Contact[];
        nextBefore: string | null;
        stats: Stats;
        error?: string;
      };
      if (!r.ok) throw new Error(data.error ?? 'Список недоступен');
      setRows((old) => (before ? [...old, ...data.customers] : data.customers));
      setCursor(data.nextBefore);
      setStats((old) => (before ? { ...old, ...data.stats } : data.stats));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нет связи с сервером');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);
  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void load(undefined, value.trim() || undefined);
    }, 300);
  }
  function edit(row: Contact | null) {
    setSelected(row);
    setDraft(
      row
        ? {
            email: row.email,
            firstName: row.firstName ?? '',
            lastName: row.lastName ?? '',
            phone: row.phone ?? '',
          }
        : blank,
    );
    setEditing(true);
    setLatest(null);
    setHistory(null);
    setInviteToken('');
    setError('');
    setNotice('');
  }
  async function save(remove = false) {
    if (lock.current || (remove && !selected)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = remove
        ? { revision: selected!.revision, confirm: true }
        : {
            ...draft,
            ...(selected ? { revision: selected.revision } : {}),
            confirm: true,
          };
      const r = await fetch(
        selected ? `/api/customers/${selected.id}` : '/api/customers',
        {
          method: remove ? 'DELETE' : selected ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = (await r.json()) as { customer?: Contact; error?: string };
      if (!r.ok) {
        if (r.status === 409 && selected) {
          const response = await fetch(`/api/customers/${selected.id}`, {
            cache: 'no-store',
          });
          if (response.ok) {
            const current = (await response.json()) as { customer: Contact };
            if (current.customer.revision !== selected.revision)
              setLatest(current.customer);
          }
        }
        throw new Error(data.error ?? 'Не удалось сохранить');
      }
      if (remove) {
        setEditing(false);
        setSelected(null);
        setDeleting(false);
        setNotice('Карточка удалена. Служебная история сохранена.');
      } else {
        edit(data.customer!);
        setNotice('Карточка сохранена');
      }
      await load(undefined, search.trim() || undefined);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось подтвердить результат. Проверьте список перед повтором.',
      );
      setDeleting(false);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function showHistory() {
    if (!selected) return;
    try {
      const r = await fetch(`/api/customers/${selected.id}/history`, {
        cache: 'no-store',
      });
      const data = (await r.json()) as { versions: unknown[]; error?: string };
      if (!r.ok) throw new Error(data.error ?? 'История недоступна');
      setHistory(data.versions);
    } catch (e) {
      setError(String(e));
    }
  }
  async function handleSuspend(suspend: boolean) {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch(`/api/customers/${selected.id}/suspend`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suspended: suspend }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Не удалось изменить статус');
      setSelected({ ...selected, suspended: suspend ? 1 : 0 });
      setNotice(suspend ? 'Аккаунт заблокирован. Сессии отозваны.' : 'Аккаунт разблокирован.');
      await load(undefined, search.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при смене статуса');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function handleInvite() {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setInviteToken('');
    try {
      const r = await fetch(`/api/customers/${selected.id}/invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const data = (await r.json()) as { ok?: boolean; resetToken?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Не удалось создать ссылку');
      if (data.resetToken) setInviteToken(data.resetToken);
      setNotice('Ссылка для установки пароля создана.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании ссылки');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <section className="mt-6 min-w-0 space-y-4 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Клиенты</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() => void load(undefined, search.trim() || undefined)}
          >
            Обновить список
          </Button>
          <Button disabled={busy || editing} onClick={() => edit(null)}>
            Добавить клиента
          </Button>
        </div>
      </div>
      {/* Search */}
      <Input
        type="search"
        placeholder="Поиск по имени, email, телефону…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      {error && (
        <p role="alert" className="break-words text-sm">
          {error}
        </p>
      )}
      {notice && (
        <output className="block text-sm text-site-success">{notice}</output>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-4 rounded-xl border border-site-line bg-site-page p-4"
        >
          <h3 className="font-medium">
            {selected
              ? `Редактирование · версия ${selected.revision}`
              : 'Новая карточка'}
            {selected?.suspended ? (
              <span className="ml-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Заблокирован
              </span>
            ) : null}
          </h3>
          <p className="text-sm leading-6 text-site-muted">
            Пароль и роль здесь не меняются. Новая карточка создаётся без входа
            и приглашения. Смена email завершает сессии клиента и отзывает его
            токены.
          </p>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Контакты</legend>
            {fields.map(([key, label]) => (
              <label className="text-sm" key={key}>
                {label}
                <Input
                  className="mt-2"
                  type={
                    key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
                  }
                  required={key === 'email'}
                  maxLength={key === 'email' ? 254 : key === 'phone' ? 40 : 120}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !!latest}>
              Сохранить карточку
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setSelected(null);
                setHistory(null);
                setLatest(null);
                setInviteToken('');
              }}
            >
              Отменить правки
            </Button>
            {selected && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void showHistory()}
                >
                  История
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !!latest}
                  onClick={() => setDeleting(true)}
                >
                  Удалить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleSuspend(!selected.suspended)}
                >
                  {selected.suspended ? 'Разблокировать' : 'Заблокировать'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleInvite()}
                >
                  Пригласить (ссылка)
                </Button>
              </>
            )}
          </div>
          {inviteToken && (
            <div className="space-y-2 rounded-lg border border-site-line bg-site-page p-3">
              <p className="text-sm font-medium">
                Ссылка для установки пароля
              </p>
              <p className="text-xs text-site-muted">
                Передайте клиенту этот токен. Он действителен 15 минут.
                Клиент должен перейти на страницу входа → «Забыли пароль?» → ввести
                токен и задать пароль.
              </p>
              <code className="block break-all rounded bg-site-surface p-2 text-xs">
                {inviteToken}
              </code>
            </div>
          )}
          {latest && (
            <div className="space-y-3 rounded-lg border border-site-line p-3">
              <p className="text-sm">
                На сервере версия {latest.revision}. Черновик не заменён.
              </p>
              <pre className="overflow-auto whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(latest, null, 2)}
              </pre>
              <Button
                type="button"
                variant="outline"
                onClick={() => edit(latest)}
              >
                Заменить черновик серверной версией
              </Button>
            </div>
          )}
          {history && (
            <details open>
              <summary className="text-sm font-medium">
                Последние 50 событий
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(history, null, 2)}
              </pre>
            </details>
          )}
        </form>
      )}
      {loading && (
        <output className="block text-sm text-site-muted">
          Загружаем клиентов…
        </output>
      )}
      {!loading && !rows.length && !error && (
        <p className="py-5 text-sm text-site-muted">Клиентов пока нет</p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const s = stats[row.id];
          return (
            <li
              key={row.id}
              className="min-w-0 rounded-xl border border-site-line p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="break-words font-medium">
                  {[row.firstName, row.lastName].filter(Boolean).join(' ') ||
                    'Без имени'}
                </p>
                {row.suspended ? (
                  <span className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Заблокирован
                  </span>
                ) : null}
              </div>
              <p className="mt-1 break-all text-sm text-site-muted">
                {row.email}
              </p>
              {row.phone && (
                <p className="mt-1 text-sm text-site-muted">{row.phone}</p>
              )}
              <p className="mt-2 text-xs text-site-muted">
                Версия {row.revision} ·{' '}
                {new Date(row.createdAt).toLocaleDateString('ru')}
              </p>
              {s && (s.orders > 0 || s.bookings > 0) && (
                <p className="mt-1 text-xs text-site-muted">
                  {s.orders > 0 && (
                    <span className="mr-3">
                      Заказы: <strong>{s.orders}</strong>
                    </span>
                  )}
                  {s.bookings > 0 && (
                    <span>
                      Записи: <strong>{s.bookings}</strong>
                    </span>
                  )}
                </p>
              )}
              <Button
                className="mt-3"
                variant="outline"
                disabled={busy || editing}
                onClick={() => edit(row)}
              >
                Редактировать
              </Button>
            </li>
          );
        })}
      </ul>
      {cursor && (
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => void load(cursor, search.trim() || undefined)}
        >
          Показать ещё
        </Button>
      )}
      <AdminConfirm
        open={deleting}
        title="Удалить карточку клиента?"
        description="Сессии и токены будут отозваны. Если есть заказы, записи, диалоги или файлы, удаление будет отменено целиком. Служебная история контактов останется — это не полное удаление персональных данных."
        busy={busy}
        onCancel={() => setDeleting(false)}
        onConfirm={() => void save(true)}
      />
    </section>
  );
}
