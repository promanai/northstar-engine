/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useState } from 'react';
import { ArrowLeft, Command, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StandardLogin() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: {
    preventDefault: () => void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (isLoading) return;
    setError('');
    setInfo('');
    setIsLoading(true);
    const values = new FormData(event.currentTarget);
    const payload = Object.fromEntries(values.entries());

    try {
      if (mode === 'forgot') {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { error?: string; message?: string; resetToken?: string };
        if (!response.ok) {
          setError(data.error ?? 'Не удалось запросить сброс пароля');
          return;
        }
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setMode('reset');
          setInfo('Код сброса сформирован. Задайте новый пароль.');
        } else {
          setInfo(data.message ?? 'Инструкция отправлена на ваш email');
        }
        return;
      }

      if (mode === 'reset') {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...payload, token: payload.token || resetToken }),
        });
        const data = (await response.json()) as { error?: string; message?: string };
        if (!response.ok) {
          setError(data.error ?? 'Не удалось обновить пароль');
          return;
        }
        setMode('login');
        setInfo(data.message ?? 'Пароль успешно изменён. Войдите с новым паролем.');
        return;
      }

      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        user?: { role: string };
      };
      if (!response.ok) {
        setError(data.error ?? 'Не удалось выполнить запрос');
        return;
      }
      const requestedPath = new URLSearchParams(window.location.search).get(
        'next',
      );
      const allowed = ['/admin', '/account', '/account/profile'];
      const destination =
        requestedPath &&
        (allowed.includes(requestedPath) ||
          /^\/(catalog|account\/orders)\/[a-zA-Z0-9%_-]+$/.test(requestedPath))
          ? requestedPath
          : data.user?.role === 'admin'
            ? '/admin'
            : '/account';
      window.location.href = destination;
    } catch {
      setError('Сервер недоступен. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-site-page px-5 py-10 text-site-ink">
      <div className="w-full max-w-md">
        <a
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-site-muted hover:text-site-ink"
        >
          <ArrowLeft className="size-4" /> Вернуться на сайт
        </a>
        <div className="rounded-3xl border border-site-line bg-site-surface p-6 shadow-[0_24px_90px_rgba(0,0,0,0.3)] sm:p-8">
          <div className="grid size-11 place-items-center rounded-2xl bg-site-accent text-site-on-accent">
            <Command className="size-5" />
          </div>
          <h1 className="mt-7 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {mode === 'login'
              ? 'С возвращением'
              : mode === 'register'
                ? 'Создать профиль'
                : mode === 'forgot'
                  ? 'Сброс пароля'
                  : 'Новый пароль'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-site-muted">
            {mode === 'login'
              ? 'Войдите, чтобы посмотреть записи и обращения.'
              : mode === 'register'
                ? 'Создайте аккаунт для сохранения истории и управления заказами.'
                : mode === 'forgot'
                  ? 'Укажите email, на который зарегистрирован профиль.'
                  : 'Введите код сброса и укажите новый надёжный пароль.'}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className="block text-sm text-site-muted"
                  htmlFor="firstName"
                >
                  Имя
                  <Input
                    id="firstName"
                    name="firstName"
                    className="mt-2 h-10 border-site-line bg-site-surface text-site-ink"
                  />
                </label>
                <label
                  className="block text-sm text-site-muted"
                  htmlFor="lastName"
                >
                  Фамилия
                  <Input
                    id="lastName"
                    name="lastName"
                    className="mt-2 h-10 border-site-line bg-site-surface text-site-ink"
                  />
                </label>
              </div>
            )}
            {mode !== 'reset' && (
              <label
                className="block text-sm text-site-muted"
                htmlFor="login-email"
              >
                Email
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-site-subtle" />
                  <Input
                    id="login-email"
                    name="email"
                    autoComplete="email"
                    required
                    type="email"
                    placeholder="you@example.com"
                    className="h-10 border-site-line bg-site-surface pl-10 text-site-ink"
                  />
                </div>
              </label>
            )}
            {mode === 'reset' && (
              <label
                className="block text-sm text-site-muted"
                htmlFor="reset-token"
              >
                Код сброса
                <Input
                  id="reset-token"
                  name="token"
                  defaultValue={resetToken}
                  required
                  placeholder="prt_..."
                  className="mt-2 h-10 border-site-line bg-site-surface text-site-ink"
                />
              </label>
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <label
                className="block text-sm text-site-muted"
                htmlFor="login-password"
              >
                {mode === 'reset' ? 'Новый пароль' : 'Пароль'}
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-site-subtle" />
                  <Input
                    id="login-password"
                    name="password"
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    required
                    minLength={8}
                    type="password"
                    placeholder="минимум 8 символов"
                    className="h-10 border-site-line bg-site-surface pl-10 text-site-ink"
                  />
                </div>
              </label>
            )}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setInfo('');
                  }}
                  className="text-xs text-site-accent-ink hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>
            )}
            {mode === 'register' && (
              <details className="text-sm text-site-muted">
                <summary className="cursor-pointer py-2">
                  Первичная настройка сайта
                </summary>
                <label htmlFor="setup-token" className="mt-2 block">
                  Установочный код владельца
                  <Input
                    id="setup-token"
                    name="setupToken"
                    type="password"
                    autoComplete="off"
                    maxLength={256}
                    className="mt-2 h-11 border-site-line bg-site-surface text-site-ink"
                  />
                </label>
                <p className="mt-2 text-xs">
                  Только для первого администратора. Код задаётся владельцем в
                  Cloudflare, клиентам он не нужен.
                </p>
              </details>
            )}
            {info && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200"
              >
                {info}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            <Button
              disabled={isLoading}
              type="submit"
              className="h-10 w-full rounded-xl bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
            >
              {isLoading
                ? 'Проверяем…'
                : mode === 'login'
                  ? 'Войти'
                  : mode === 'register'
                    ? 'Зарегистрироваться'
                    : mode === 'forgot'
                      ? 'Запросить сброс'
                      : 'Сохранить пароль'}
            </Button>
          </form>
          <button
            disabled={isLoading}
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setInfo('');
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-site-accent-ink hover:text-site-accent-hover"
          >
            <UserRound className="size-4" />{' '}
            {mode === 'login'
              ? 'Создать новый профиль'
              : mode === 'register'
                ? 'У меня уже есть профиль'
                : 'Вернуться ко входу'}
          </button>
        </div>
      </div>
    </main>
  );
}
