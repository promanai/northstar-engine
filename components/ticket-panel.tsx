'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Ticket = {
  id: string;
  customerId: string;
  subject: string;
  status: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
type TicketEvent = {
  id: string;
  author: string;
  action: string;
  body: string | null;
  revision: number;
  createdAt: number;
};
type Detail = {
  ticket: Ticket;
  events: TicketEvent[];
  nextBefore: number | null;
};
type List = { tickets: Ticket[]; nextBefore: string | null };
type Attempt = { path: string; method: string; body: Record<string, unknown> };
class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function api<T>(path: string, attempt?: Attempt): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    ...(attempt
      ? {
          method: attempt.method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(attempt.body),
        }
      : {}),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok)
    throw new ApiError(
      data.error ?? 'Не удалось выполнить запрос',
      response.status,
    );
  return data as T;
}
const time = (value: number) =>
  new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const status = (ticket: Ticket) =>
  ticket.status === 'closed' ? 'Закрыто' : 'Открыто';

export function TicketPanel({ admin = false }: { admin?: boolean }) {
  const formId = useId();
  const [list, setList] = useState<List>({ tickets: [], nextBefore: null });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const attempt = useRef<Attempt | null>(null);
  const locked = useRef(false),
    readEpoch = useRef(0);
  const listPath = `/api/tickets${admin ? '?all=true' : ''}`;
  const hasDraft = !!(draft || subject),
    freeze = busy || loading || uncertain;

  useEffect(() => {
    let active = true;
    void api<List>(listPath)
      .then((data) => {
        if (active) setList(data);
      })
      .catch(() => {
        if (active)
          setError('Не удалось загрузить обращения. Повторите загрузку.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      readEpoch.current += 1;
    };
  }, [listPath]);

  async function refreshList(older = false) {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError('');
    try {
      const data = await api<List>(
        `${listPath}${older && list.nextBefore ? `${admin ? '&' : '?'}before=${encodeURIComponent(list.nextBefore)}` : ''}`,
      );
      setList((old) =>
        older
          ? {
              ...data,
              tickets: [
                ...old.tickets,
                ...data.tickets.filter(
                  (t) => !old.tickets.some((x) => x.id === t.id),
                ),
              ],
            }
          : data,
      );
    } catch {
      setError('Список не загружен. Попробуйте ещё раз.');
    } finally {
      locked.current = false;
      setLoading(false);
    }
  }
  async function open(id: string, older = false) {
    if (locked.current) return;
    const epoch = ++readEpoch.current;
    locked.current = true;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await api<Detail>(
        `/api/tickets/${id}${older && detail?.nextBefore ? `?before=${detail.nextBefore}` : ''}`,
      );
      if (epoch !== readEpoch.current) return;
      setDetail((old) =>
        older && old?.ticket.id === id
          ? {
              ...old,
              events: [
                ...data.events.filter(
                  (e) => !old.events.some((x) => x.id === e.id),
                ),
                ...old.events,
              ],
              nextBefore: data.nextBefore,
            }
          : data,
      );
      setCreating(false);
    } catch {
      setError('Переписка недоступна или не загрузилась. Черновик сохранён.');
    } finally {
      locked.current = false;
      setLoading(false);
    }
  }
  async function write(action: 'message' | 'close' | 'reopen') {
    if (locked.current) return;
    if (!attempt.current) {
      if (!creating && !detail) return;
      attempt.current = {
        path: creating ? '/api/tickets' : `/api/tickets/${detail!.ticket.id}`,
        method: creating ? 'POST' : 'PATCH',
        body: {
          ...(creating
            ? { subject: subject.trim(), body: draft.trim() }
            : {
                action,
                revision: detail!.ticket.revision,
                ...(action === 'message' ? { body: draft.trim() } : {}),
              }),
          confirm: true,
          idempotencyKey: crypto.randomUUID(),
        },
      };
    }
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ id: string }>(
        attempt.current.path,
        attempt.current,
      );
      const sentMessage =
        attempt.current.method === 'POST' ||
        attempt.current.body.action === 'message';
      attempt.current = null;
      setUncertain(false);
      if (sentMessage) {
        setDraft('');
        setSubject('');
      }
      setCreating(false);
      setNotice('Сохранено');
      // A failed refresh must never turn a successful write into another send.
      try {
        const [next, rows] = await Promise.all([
          api<Detail>(`/api/tickets/${result.id}`),
          api<List>(listPath),
        ]);
        setDetail(next);
        setList(rows);
      } catch {
        setDetail(null);
        setNotice('Сохранено. Обновите список, чтобы прочитать переписку.');
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status < 500) {
        attempt.current = null;
        setUncertain(false);
        setError(
          `${cause.message}${cause.status === 409 ? ' Нажмите «Обновить переписку», сравните сообщения и затем отправьте снова.' : ''}`,
        );
      } else {
        setUncertain(true);
        setError(
          'Результат отправки неизвестен. Повторите ту же отправку: сохранённый ключ защищает от дублей. Не создавайте новое обращение вместо повтора.',
        );
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 min-w-0 space-y-4" aria-label="Обращения">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {admin ? 'Обращения клиентов' : 'Мои обращения'}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={freeze}
            onClick={() => void refreshList()}
          >
            Обновить список
          </Button>
          {!admin && (
            <Button
              className="min-h-11"
              disabled={freeze || hasDraft}
              onClick={() => {
                setCreating(true);
                setDetail(null);
                setNotice('');
                setError('');
              }}
            >
              Новое обращение
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-site-line bg-site-raised p-4 text-base leading-6"
        >
          {error}
        </p>
      )}
      {notice && (
        <output className="block text-sm text-site-muted">{notice}</output>
      )}
      {uncertain && (
        <Button
          className="min-h-11"
          disabled={busy}
          onClick={() => void write('message')}
        >
          Повторить ту же отправку
        </Button>
      )}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.6fr)]">
        <div className="max-h-[45vh] min-w-0 space-y-2 overflow-y-auto pr-1 lg:max-h-[70vh]">
          {loading && <p className="p-3 text-sm text-site-muted">Загрузка…</p>}
          {!loading && !list.tickets.length && (
            <p className="rounded-2xl border border-site-line p-5 text-base text-site-muted">
              Обращений пока нет
            </p>
          )}
          {list.tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              disabled={freeze || hasDraft}
              aria-pressed={detail?.ticket.id === ticket.id}
              onClick={() => void open(ticket.id)}
              className={`w-full rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${detail?.ticket.id === ticket.id ? 'border-site-accent bg-site-raised' : 'border-site-line bg-site-surface hover:bg-site-raised'}`}
            >
              <span className="block break-words text-base font-medium [overflow-wrap:anywhere]">
                {ticket.subject}
              </span>
              <span className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-site-muted">
                <span>{status(ticket)}</span>
                <span>{time(ticket.createdAt)}</span>
              </span>
            </button>
          ))}
          {list.nextBefore && (
            <Button
              variant="outline"
              className="min-h-11 w-full"
              disabled={freeze}
              onClick={() => void refreshList(true)}
            >
              Ещё обращения
            </Button>
          )}
          {hasDraft && (
            <p className="text-sm text-site-muted">
              Чтобы выбрать другое обращение, отправьте или очистите черновик
            </p>
          )}
        </div>
        <div className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
          {!creating && !detail && (
            <p className="text-base text-site-muted">
              {admin
                ? 'Выберите обращение, чтобы ответить клиенту'
                : 'Выберите переписку или создайте новое обращение'}
            </p>
          )}
          {detail && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="min-w-0 break-words text-lg font-semibold [overflow-wrap:anywhere]">
                  {detail.ticket.subject}
                </h3>
                <Badge variant="outline" className="text-sm">
                  {status(detail.ticket)}
                </Badge>
              </div>
              {admin && (
                <p className="mt-2 break-all text-sm text-site-muted">
                  Клиент: {detail.ticket.customerId}
                </p>
              )}
              <div className="my-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={freeze}
                  onClick={() => void open(detail.ticket.id)}
                >
                  Обновить переписку
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={
                    freeze || (hasDraft && detail.ticket.status !== 'closed')
                  }
                  onClick={() =>
                    void write(
                      detail.ticket.status === 'closed' ? 'reopen' : 'close',
                    )
                  }
                >
                  {detail.ticket.status === 'closed'
                    ? 'Открыть снова'
                    : 'Закрыть обращение'}
                </Button>
              </div>
              {detail.nextBefore && (
                <Button
                  variant="outline"
                  className="mb-4 min-h-11"
                  disabled={freeze}
                  onClick={() => void open(detail.ticket.id, true)}
                >
                  Предыдущие сообщения
                </Button>
              )}
              <ol className="space-y-3" aria-label="История обращения">
                {detail.events.map((event) => (
                  <li
                    key={event.id}
                    className={`min-w-0 rounded-xl border border-site-line p-4 ${event.author === 'support' ? 'bg-site-raised' : ''}`}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-sm text-site-muted">
                      <span>
                        {event.author === 'support'
                          ? 'Служба поддержки'
                          : 'Клиент'}
                      </span>
                      <time dateTime={new Date(event.createdAt).toISOString()}>
                        {time(event.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">
                      {event.action === 'close'
                        ? 'Обращение закрыто'
                        : event.action === 'reopen'
                          ? 'Обращение открыто снова'
                          : event.body}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}
          {(creating || detail?.ticket.status === 'open' || hasDraft) && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (creating || detail?.ticket.status === 'open')
                  void write('message');
              }}
            >
              {creating && (
                <label
                  htmlFor={`${formId}-subject`}
                  className="block text-sm font-medium"
                >
                  Тема
                  <Input
                    id={`${formId}-subject`}
                    className="mt-2 min-h-11 text-base md:text-base"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={160}
                    required
                    disabled={freeze}
                  />
                </label>
              )}
              <label
                htmlFor={`${formId}-body`}
                className="block text-sm font-medium"
              >
                {creating ? 'Чем можем помочь?' : 'Ваш ответ'}
                <Textarea
                  id={`${formId}-body`}
                  className="mt-2 min-h-32 text-base leading-7 md:text-base"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={8000}
                  rows={4}
                  required
                  disabled={freeze}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={
                    freeze ||
                    !draft.trim() ||
                    (creating
                      ? !subject.trim()
                      : detail?.ticket.status !== 'open')
                  }
                >
                  {busy
                    ? 'Сохранение…'
                    : creating
                      ? 'Создать обращение'
                      : 'Отправить ответ'}
                </Button>
                {hasDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={freeze}
                    onClick={() => {
                      setDraft('');
                      setSubject('');
                    }}
                  >
                    Очистить черновик
                  </Button>
                )}
              </div>
              <p className="text-sm leading-6 text-site-muted">
                Сообщение получит владелец сайта. Это не чат с ИИ. Черновик не
                сохраняется после закрытия раздела.
              </p>
            </form>
          )}
          {detail?.ticket.status === 'closed' && (
            <p className="mt-4 text-base text-site-muted">
              Для нового ответа откройте обращение снова
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
