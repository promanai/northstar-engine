/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { SessionList } from '@/lib/session-policy';

export function SessionManager() {
  const [data, setData] = useState<SessionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      setData(null);
      try {
        const response = await fetch('/api/auth/sessions', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401 && active) setExpired(true);
          throw new Error(
            response.status === 401
              ? 'Сессия завершена. Войдите снова.'
              : 'Не удалось загрузить сессии. Повторите позже.',
          );
        }
        const value = (await response.json()) as SessionList;
        if (active) {
          setData(value);
          setExpired(false);
        }
      } catch (reason) {
        if (active)
          setError(
            controller.signal.aborted
              ? 'Сервер не ответил вовремя. Повторите загрузку.'
              : reason instanceof Error
                ? reason.message
                : 'Не удалось загрузить сессии',
          );
      } finally {
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [revision]);

  async function revoke() {
    if (!target || busy || !password) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target,
          currentPassword: password,
          confirm: true,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const value = (await response.json()) as {
        revoked?: number;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 401) setExpired(true);
        throw new Error(value.error ?? 'Не удалось завершить сессии');
      }
      setMessage(
        value.revoked
          ? `Завершено сессий: ${value.revoked}`
          : 'Подходящих активных сессий больше нет',
      );
      setTarget(null);
      setRevision((v) => v + 1);
    } catch (reason) {
      setError(
        reason instanceof Error &&
          reason.name !== 'TimeoutError' &&
          reason.name !== 'TypeError'
          ? reason.message
          : 'Результат не подтверждён. Закройте окно и обновите список перед повтором.',
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  const otherCount = data?.sessions.filter((s) => !s.current).length ?? 0;
  return (
    <section
      aria-label="Активные сессии"
      className="mt-8 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Активные сессии</h2>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
          disabled={loading || busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Обновить сессии
        </Button>
      </div>
      <p className="mt-3 text-sm leading-6 text-site-muted">
        Здесь показаны входы в ваш аккаунт. Устройства, IP-адреса и время
        последней активности не собираются.
      </p>
      {loading && (
        <output className="mt-4 block text-sm text-site-muted">
          Загружаем сессии…
        </output>
      )}
      {error && !target && (
        <p role="alert" className="mt-4 text-sm leading-6">
          {error}
        </p>
      )}
      {message && (
        <output className="mt-4 block text-sm text-site-success">
          {message}
        </output>
      )}
      {expired && (
        <a
          className="mt-4 inline-flex min-h-11 items-center text-sm underline"
          href="/login?next=%2Faccount%2Fprofile"
        >
          Войти снова
        </a>
      )}
      {!loading && data && (
        <>
          <ul className="mt-4 divide-y divide-site-line">
            {data.sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="text-base font-medium">
                    {s.current
                      ? 'Текущая сессия'
                      : `Сессия ${s.id.slice(0, 8)}`}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-site-muted">
                    Вход: {new Date(s.createdAt).toLocaleString('ru-RU')}
                    <br />
                    Действует до:{' '}
                    {new Date(s.expiresAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    className="min-h-11 shrink-0 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
                    aria-label={`Завершить сессию ${s.id.slice(0, 8)}`}
                    onClick={() => {
                      setTarget(s.id);
                      setPassword('');
                      setError('');
                    }}
                  >
                    Завершить
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {data.truncated && (
            <p className="my-3 text-sm text-site-muted">
              Показаны первые 100 сессий. Кнопка ниже завершит все остальные,
              включая не показанные.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 h-auto w-full whitespace-normal border-site-line bg-site-page py-3 text-site-ink hover:bg-site-raised hover:text-site-ink"
            disabled={busy || otherCount === 0}
            onClick={() => {
              setTarget('others');
              setPassword('');
              setError('');
            }}
          >
            Завершить все остальные сессии
          </Button>
          <p className="mt-3 text-sm leading-6 text-site-muted">
            Текущая сессия останется открытой. Ключи AI-агентов не отзываются —
            ими можно управлять отдельно в кабинете. Даты показаны в часовом
            поясе устройства.
          </p>
        </>
      )}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setTarget(null);
            setPassword('');
          }
        }}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto data-[size=default]:max-w-[calc(100vw-2rem)] border border-site-line bg-site-surface text-site-ink">
          <AlertDialogTitle>
            {target === 'others'
              ? 'Завершить остальные сессии?'
              : 'Завершить выбранную сессию?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-site-muted">
            Для следующего запроса в завершённой сессии понадобится снова войти.
            Уже начатые операции не отменяются. Подтвердите действие текущим
            паролем.
          </AlertDialogDescription>
          <label className="text-sm text-site-muted" htmlFor="session-password">
            Текущий пароль
          </label>
          <Input
            id="session-password"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            className="min-h-11 border-site-line bg-site-page text-site-ink"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm leading-6">
              {error}
            </p>
          )}
          <AlertDialogFooter className="border-site-line bg-site-page">
            <AlertDialogCancel
              className="min-h-11 border-site-line bg-site-page text-site-ink hover:bg-site-raised hover:text-site-ink"
              disabled={busy}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
              disabled={busy || !password}
              onClick={() => void revoke()}
            >
              {busy ? 'Завершаем…' : 'Подтвердить завершение'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
