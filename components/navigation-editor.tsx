'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
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
  defaultNavigation,
  validateNavigation,
  type NavigationConfig,
  type NavigationItem,
} from '@/lib/navigation-policy';
import type { DocumentEvent } from '@/lib/document-store';
type PageChoice = { id: string; title: string; slug: string; status: string };
type State = { revision: number; value: NavigationConfig };
function Choice({
  value,
  options,
  label,
  onChange,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (typeof v === 'string') onChange(v);
      }}
      disabled={disabled}
      items={options}
    >
      <SelectTrigger
        aria-label={label}
        className="min-h-11 w-full min-w-0 border-site-line bg-site-page"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-w-[90vw] border-site-line bg-site-surface text-site-ink">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function NavigationEditor() {
  const [state, setState] = useState<State>({
    revision: 0,
    value: defaultNavigation,
  });
  const [pages, setPages] = useState<PageChoice[]>([]);
  const [versions, setVersions] = useState<DocumentEvent[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const history = useCallback(async (before?: number) => {
    try {
      const response = await fetch(
        `/api/navigation?view=history${before === undefined ? '' : `&before=${before}`}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as {
        versions: DocumentEvent[];
        nextBefore: number | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'История недоступна');
      setVersions((current) =>
        before === undefined ? data.versions : [...current, ...data.versions],
      );
      setNextBefore(data.nextBefore);
      setHistoryError('');
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : 'Ошибка сети');
    }
  }, []);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const [response, pageResponse] = await Promise.all([
        fetch('/api/navigation?view=admin', { cache: 'no-store' }),
        fetch('/api/pages', { cache: 'no-store' }),
      ]);
      const data = (await response.json()) as State & { error?: string };
      const choices = (await pageResponse.json()) as { pages?: PageChoice[] };
      if (!response.ok || !pageResponse.ok)
        throw new Error(data.error || 'Не удалось загрузить навигацию');
      setState(data);
      setPages(choices.pages ?? []);
      setReady(true);
      setConflict(false);
      await history();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка сети');
    } finally {
      setBusy(false);
    }
  }, [history]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  function update(
    group: 'menu' | 'tabs',
    id: string,
    change: Partial<NavigationItem>,
  ) {
    setState((s) => ({
      ...s,
      value: {
        ...s.value,
        [group]: s.value[group].map((i) =>
          i.id === id ? { ...i, ...change } : i,
        ),
      },
    }));
    setMessage('');
  }
  function move(group: 'menu' | 'tabs', index: number, direction: number) {
    setState((s) => {
      const list = [...s.value[group]];
      const next = index + direction;
      if (next < 0 || next >= list.length) return s;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...s, value: { ...s.value, [group]: list } };
    });
    setMessage('');
  }
  function add(group: 'menu' | 'tabs') {
    const existing = state.value[group];
    const available = ['quick', 'modules', 'chat'].find(
      (target) =>
        !existing.some((i) => i.kind === 'section' && i.target === target),
    );
    const kind = available ? 'section' : 'page';
    const target =
      available ??
      pages.find(
        (p) =>
          p.status !== 'deleted' &&
          !existing.some((i) => i.kind === 'page' && i.target === p.id),
      )?.id ??
      '';
    const item: NavigationItem = {
      id:
        group === 'tabs' && available
          ? available
          : `item-${crypto.randomUUID()}`,
      label: 'Новый пункт',
      kind,
      target,
      visible: true,
      presentation: 'navigate',
    };
    // Keep IDs within the public hash contract (40 characters).
    item.id = item.id.slice(0, 40);
    setState((s) => ({
      ...s,
      value: { ...s.value, [group]: [...s.value[group], item] },
    }));
    setMessage('');
  }
  async function save(targetRevision?: number) {
    if (busy || !ready) return;
    if (targetRevision === undefined) {
      try {
        validateNavigation(state.value);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Некорректная навигация',
        );
        return;
      }
    }
    if (
      !window.confirm(
        targetRevision === undefined
          ? 'Применить меню и вкладки для всех посетителей сайта?'
          : `Восстановить навигацию версии ${targetRevision}? Изменения сразу появятся на сайте.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    setMessage('');
    setConflict(false);
    try {
      const response = await fetch('/api/navigation', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revision: state.revision,
          confirm: true,
          ...(targetRevision === undefined
            ? { value: state.value }
            : { targetRevision }),
        }),
      });
      const data = (await response.json()) as State & { error?: string };
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(data.error || 'Не удалось сохранить навигацию');
      }
      setState(data);
      setMessage(
        targetRevision === undefined
          ? 'Навигация сохранена'
          : 'Навигация восстановлена',
      );
      window.dispatchEvent(new Event('site-navigation-change'));
      await history();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Ошибка сети. Изменения остаются в редакторе.',
      );
    } finally {
      setBusy(false);
    }
  }
  const baseOptions = [
    { value: 'section:chat', label: 'Главная · Чат' },
    { value: 'section:quick', label: 'Главная · О сервисе' },
    { value: 'section:modules', label: 'Главная · Возможности' },
  ];
  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Меню и вкладки</h2>
        <p className="mt-2 text-sm leading-6 text-site-muted">
          Настройте названия, порядок и видимость. Страницы связаны по ID: смена
          адреса не ломает ссылки. Черновики и корзина скрыты от посетителей.
        </p>
        <p className="mt-2 text-sm text-site-muted">Версия {state.revision}</p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm"
          >
            {error}
          </p>
        )}
        {message && <output className="mt-4 block text-sm">{message}</output>}
        {(!ready || conflict) && (
          <Button
            disabled={busy}
            variant="outline"
            className="mt-4 min-h-11"
            onClick={() => {
              if (
                !ready ||
                window.confirm(
                  'Заменить несохранённые изменения актуальной версией?',
                )
              )
                void load();
            }}
          >
            Загрузить актуальную версию
          </Button>
        )}
      </div>
      <fieldset
        disabled={busy || !ready}
        className="min-w-0 space-y-5 disabled:opacity-70"
      >
        {(['menu', 'tabs'] as const).map((group) => (
          <div
            key={group}
            className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">
                {group === 'menu' ? 'Верхнее меню' : 'Вкладки главной'}
              </h3>
              <Button
                variant="outline"
                disabled={state.value[group].length >= 12}
                onClick={() => add(group)}
                className="min-h-11 border-site-line"
              >
                <Plus className="mr-2 size-4" />
                Добавить
              </Button>
            </div>
            {!state.value[group].length && (
              <p className="mt-4 text-sm text-site-muted">Пунктов пока нет</p>
            )}
            <div className="mt-4 space-y-4">
              {state.value[group].map((item, index) => {
                const locked =
                  group === 'tabs' &&
                  item.kind === 'section' &&
                  item.target === 'chat';
                const options = [
                  ...baseOptions,
                  ...(group === 'menu'
                    ? [{ value: 'catalog:catalog', label: 'Каталог' }]
                    : []),
                  ...pages
                    .filter(
                      (p) => p.status !== 'deleted' || p.id === item.target,
                    )
                    .map((p) => ({
                      value: `page:${p.id}`,
                      label: `${p.title} · ${p.status === 'published' ? p.slug : 'не опубликована'}`,
                    })),
                ].filter(
                  (option) =>
                    !state.value[group].some(
                      (other) =>
                        other.id !== item.id &&
                        `${other.kind}:${other.target}` === option.value,
                    ),
                );
                if (
                  !options.some(
                    (o) => o.value === `${item.kind}:${item.target}`,
                  )
                )
                  options.push({
                    value: `${item.kind}:${item.target}`,
                    label: 'Выберите страницу',
                  });
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-site-line p-4"
                  >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                      <label
                        htmlFor={`${group}-${item.id}`}
                        className="text-sm"
                      >
                        Название
                        <Input
                          id={`${group}-${item.id}`}
                          value={item.label}
                          onChange={(e) =>
                            update(group, item.id, { label: e.target.value })
                          }
                          maxLength={48}
                          className="mt-2 min-h-11 border-site-line bg-site-page"
                        />
                      </label>
                      <div className="text-sm">
                        <p className="mb-2">Назначение</p>
                        <Choice
                          value={`${item.kind}:${item.target}`}
                          options={options}
                          label={`Назначение: ${item.label}`}
                          disabled={locked || busy || !ready}
                          onChange={(v) => {
                            const [kind, target] = v.split(':');
                            update(group, item.id, {
                              kind: kind as NavigationItem['kind'],
                              target,
                              id:
                                group === 'tabs' && kind === 'section'
                                  ? target
                                  : ['chat', 'quick', 'modules'].includes(
                                        item.id,
                                      )
                                    ? `item-${crypto.randomUUID()}`.slice(0, 40)
                                    : item.id,
                              presentation: 'navigate',
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          disabled={locked}
                          onChange={(e) =>
                            update(group, item.id, {
                              visible: e.target.checked,
                            })
                          }
                        />
                        Показывать
                      </label>
                      {group === 'menu' && item.kind === 'page' && (
                        <div className="min-w-48">
                          <Choice
                            value={item.presentation}
                            disabled={busy || !ready}
                            label={`Открытие: ${item.label}`}
                            options={[
                              {
                                value: 'navigate',
                                label: 'Отдельная страница',
                              },
                              { value: 'modal', label: 'Модальное окно' },
                            ]}
                            onChange={(v) =>
                              update(group, item.id, {
                                presentation:
                                  v as NavigationItem['presentation'],
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="outline"
                          className="size-11 border-site-line"
                          disabled={index === 0}
                          aria-label={`Выше: ${item.label}`}
                          onClick={() => move(group, index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="outline"
                          className="size-11 border-site-line"
                          disabled={index === state.value[group].length - 1}
                          aria-label={`Ниже: ${item.label}`}
                          onClick={() => move(group, index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          variant="outline"
                          className="size-11 border-site-line"
                          disabled={locked}
                          aria-label={`Удалить пункт: ${item.label}`}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              value: {
                                ...s.value,
                                [group]: s.value[group].filter(
                                  (i) => i.id !== item.id,
                                ),
                              },
                            }))
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
      <Button
        disabled={busy || !ready}
        onClick={() => void save()}
        className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
      >
        {busy ? 'Подождите…' : 'Применить навигацию'}
      </Button>
      <details className="rounded-2xl border border-site-line bg-site-surface p-5">
        <summary className="min-h-11 cursor-pointer font-medium">
          История навигации
        </summary>
        {historyError && <p role="alert">{historyError}</p>}
        {!versions.length && (
          <p className="text-sm text-site-muted">
            История появится после первого сохранения.
          </p>
        )}
        <ul className="space-y-3">
          {versions.map((v) => (
            <li
              key={v.revision}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-3"
            >
              <div className="min-w-0 text-sm">
                <p>
                  Версия {v.revision} ·{' '}
                  {v.action === 'restore'
                    ? `Восстановлена из ${v.restoredFrom}`
                    : v.action === 'baseline'
                      ? 'По умолчанию'
                      : 'Изменение'}
                </p>
                <p className="text-site-muted">
                  {new Date(v.createdAt * 1000).toLocaleString('ru-RU')} ·{' '}
                  {v.source}
                </p>
                <p className="break-all text-xs text-site-muted">
                  Автор: {v.actorId}
                  {v.tokenId ? ` · Токен: ${v.tokenId}` : ''}
                </p>
              </div>
              {v.revision !== state.revision && (
                <Button
                  disabled={busy || !ready}
                  variant="outline"
                  className="min-h-11 border-site-line"
                  onClick={() => void save(v.revision)}
                >
                  Восстановить
                </Button>
              )}
            </li>
          ))}
        </ul>
        {nextBefore !== null && (
          <Button
            disabled={busy}
            variant="outline"
            className="mt-4 min-h-11"
            onClick={async () => {
              setBusy(true);
              await history(nextBefore);
              setBusy(false);
            }}
          >
            Более ранние версии
          </Button>
        )}
      </details>
    </section>
  );
}
