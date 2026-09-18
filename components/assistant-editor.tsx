'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminConfirm } from '@/components/admin-confirm';
import type { AssistantConfig } from '@/lib/admin-policy';
type Profile = AssistantConfig & { revision: number };
type Event = {
  revision: number;
  action: string;
  source: string;
  actorId: string;
  createdAt: number;
};
async function readProfile() {
  const r = await fetch('/api/assistant?view=admin', { cache: 'no-store' });
  const data = (await r.json()) as { assistant: Profile; error?: string };
  if (!r.ok) throw new Error(data.error ?? 'Не удалось загрузить ассистента');
  return data.assistant;
}
export function AssistantEditor() {
  const [draft, setDraft] = useState<Profile | null>(null),
    [latest, setLatest] = useState<Profile | null>(null),
    [history, setHistory] = useState<Event[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState<number | null>(null);
  const lock = useRef(false);
  async function versions(before?: number) {
    const r = await fetch(
      `/api/assistant?view=history${before !== undefined ? `&before=${before}` : ''}`,
      { cache: 'no-store' },
    );
    const data = (await r.json()) as { versions: Event[]; error?: string };
    if (!r.ok) throw new Error(data.error ?? 'История недоступна');
    setHistory((old) =>
      before !== undefined ? [...old, ...data.versions] : data.versions,
    );
  }
  async function load() {
    try {
      setDraft(await readProfile());
      setLatest(null);
      setError('');
      await versions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нет связи с сервером');
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  async function save(restore?: number) {
    if (!draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body =
        restore === undefined
          ? { ...draft, confirm: true }
          : {
              revision: draft.revision,
              targetRevision: restore,
              confirm: true,
            };
      const r = await fetch('/api/assistant', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as { assistant: Profile; error?: string };
      if (!r.ok) {
        if (r.status === 409) setLatest(await readProfile());
        throw new Error(data.error ?? 'Не удалось сохранить');
      }
      setDraft(data.assistant);
      setLatest(null);
      setTarget(null);
      setNotice('Сохранено. Новые ответы используют обновлённый контекст.');
      await versions();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось подтвердить сохранение. Проверьте серверную версию.',
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <section className="mt-6 min-w-0 space-y-5 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
      {error && (
        <p role="alert" className="break-words text-sm">
          {error}
        </p>
      )}
      {notice && (
        <output className="block text-sm text-site-success">{notice}</output>
      )}
      {!draft ? (
        <Button onClick={() => void load()}>Загрузить настройки</Button>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-4"
          >
            <fieldset
              disabled={busy}
              className="grid min-w-0 gap-4 sm:grid-cols-2"
            >
              <legend className="sr-only">Настройки консультанта</legend>
              <label className="text-sm" htmlFor="assistant-name">
                Имя
                <Input
                  id="assistant-name"
                  className="mt-2"
                  required
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label className="text-sm" htmlFor="assistant-locale">
                Язык по умолчанию
                <Input
                  id="assistant-locale"
                  className="mt-2"
                  required
                  maxLength={35}
                  value={draft.defaultLocale}
                  onChange={(e) =>
                    setDraft({ ...draft, defaultLocale: e.target.value })
                  }
                />
              </label>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm">Состояние консультанта</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['active', 'Включён'],
                    ['disabled', 'Отключён'],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      aria-pressed={draft.status === value}
                      onClick={() => setDraft({ ...draft, status: value })}
                      className={draft.status === value ? 'bg-site-raised' : ''}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <label
                className="min-w-0 text-sm sm:col-span-2"
                htmlFor="assistant-prompt"
              >
                Контекст бизнеса
                <Textarea
                  id="assistant-prompt"
                  className="mt-2 min-h-64 text-base leading-7"
                  maxLength={16000}
                  value={draft.systemPrompt}
                  onChange={(e) =>
                    setDraft({ ...draft, systemPrompt: e.target.value })
                  }
                />
              </label>
            </fieldset>
            <p className="text-sm leading-6 text-site-muted">
              Правила, услуги и тон общения. Не размещайте пароли и API-ключи в
              инструкциях. Модель и провайдер настраиваются в разделе «Модели».
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy || !!latest}>
                {busy ? 'Сохраняем…' : 'Сохранить изменения'}
              </Button>
              <span className="text-sm text-site-muted">
                Версия {draft.revision} · изменения применяются сразу
              </span>
            </div>
          </form>
          {latest && (
            <div className="space-y-3 rounded-xl border border-site-line bg-site-raised p-4">
              <h3 className="font-medium">
                На сервере уже версия {latest.revision}
              </h3>
              <p className="text-sm text-site-muted">
                Ваш черновик оставлен в форме. Скопируйте нужные правки перед
                заменой.
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(latest, null, 2)}
              </pre>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setDraft(latest);
                  setLatest(null);
                  setError('');
                }}
              >
                Заменить черновик серверной версией
              </Button>
            </div>
          )}
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              История изменений
            </summary>
            <p className="my-3 text-sm text-site-muted">
              Восстановление заменяет все поля, включая состояние включения.
              История старого движка хранится отдельно.
            </p>
            <ul className="space-y-2">
              {history.map((event) => (
                <li
                  key={event.revision}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-site-line p-3"
                >
                  <span className="min-w-0 break-all text-sm">
                    v{event.revision} · {event.action} · {event.source} ·{' '}
                    {new Date(event.createdAt * 1000).toLocaleString('ru')}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      busy || !!latest || event.revision === draft.revision
                    }
                    onClick={() => setTarget(event.revision)}
                  >
                    Восстановить
                  </Button>
                </li>
              ))}
            </ul>
            {history.length > 0 && history.length % 50 === 0 && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() =>
                  void versions(history.at(-1)!.revision).catch((e) =>
                    setError(String(e)),
                  )
                }
              >
                Ещё версии
              </Button>
            )}
          </details>
        </>
      )}
      <AdminConfirm
        open={target !== null}
        title={`Восстановить версию ${target}?`}
        description="Текущий черновик будет заменён. Восстановление действует сразу и может включить отключённого консультанта."
        busy={busy}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target !== null) void save(target);
        }}
      />
    </section>
  );
}
