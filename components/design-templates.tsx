/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { themes } from '@/lib/themes';
import {
  defaultSiteConfig,
  validateSiteConfig,
  type SiteConfig,
} from '@/lib/site-config-policy';
import type { DocumentEvent } from '@/lib/document-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
type State = { revision: number; value: SiteConfig; warnings?: string[] };
const surface =
  'rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6';
const control =
  'mt-2 min-h-11 w-full border-site-line bg-site-page text-site-ink';
export function DesignTemplates() {
  const [state, setState] = useState<State>({
    revision: 0,
    value: defaultSiteConfig,
  });
  const [value, setValue] = useState<SiteConfig>(defaultSiteConfig);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [versions, setVersions] = useState<DocumentEvent[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState(''),
    [historyBusy, setHistoryBusy] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(state.value);
  const selected = value.theme,
    applied = state.value.theme;
  function update(patch: Partial<SiteConfig>) {
    setValue((current) => ({ ...current, ...patch }));
    setMessage('');
  }
  function setSelected(theme: SiteConfig['theme']) {
    update({ theme });
  }
  const history = useCallback(async (before?: number) => {
    setHistoryBusy(true);
    try {
      const response = await fetch(
        '/api/site-config?view=history' +
          (before === undefined ? '' : '&before=' + before),
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
    } finally {
      setHistoryBusy(false);
    }
  }, []);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/site-config?view=admin', {
        cache: 'no-store',
      });
      const data = (await response.json()) as State & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Настройки недоступны');
      setState(data);
      setValue(data.value);
      setLoaded(true);
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
  async function save(targetRevision?: number) {
    if (!loaded || busy) return;
    let validated = value;
    try {
      if (targetRevision === undefined) validated = validateSiteConfig(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Проверьте настройки');
      return;
    }
    if (
      !window.confirm(
        targetRevision === undefined
          ? 'Применить название, описание, язык контента, тему и фон? Изменения сразу появятся на сайте.'
          : 'Восстановить версию ' +
              targetRevision +
              '? Все текущие поля, включая несохранённые правки, будут заменены.',
      )
    )
      return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body =
        targetRevision === undefined
          ? { revision: state.revision, value: validated, confirm: true }
          : { revision: state.revision, targetRevision, confirm: true };
      const response = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as State & { error?: string };
      if (!response.ok)
        throw new Error(data.error || 'Не удалось сохранить настройки');
      setState(data);
      setValue(data.value);
      window.dispatchEvent(new Event('site-config-change'));
      window.dispatchEvent(new Event('site-theme-change'));
      setMessage('Сохранена версия ' + data.revision);
      await history();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Ошибка сети. Правки оставлены в форме.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Сайт и оформление</h2>
          <p className="mt-1 text-sm text-site-muted">
            {loaded
              ? 'Версия ' +
                state.revision +
                (dirty ? ' · Есть несохранённые изменения' : '')
              : 'Загружаем настройки…'}
          </p>
        </div>
        <Button
          disabled={busy}
          variant="outline"
          className="min-h-11 border-site-line bg-transparent"
          onClick={() => {
            if (
              !dirty ||
              window.confirm(
                'Заменить несохранённые правки актуальными настройками?',
              )
            )
              void load();
          }}
        >
          Обновить данные
        </Button>
      </div>
      {state.warnings?.length ? (
        <div role="alert" className={surface}>
          {state.warnings.map((w) => (
            <p key={w} className="text-sm">
              {w}
            </p>
          ))}
        </div>
      ) : null}
      <fieldset disabled={busy || !loaded} className="min-w-0 space-y-6">
        <section className={surface}>
          <h3 className="text-lg font-semibold">Основное</h3>
          <label htmlFor="site-name" className="mt-4 block text-sm">
            Название сайта
          </label>
          <Input
            id="site-name"
            maxLength={100}
            value={value.name}
            onChange={(e) => update({ name: e.target.value })}
            className={control}
          />
          <label htmlFor="site-description" className="mt-4 block text-sm">
            Описание для поисковых систем
          </label>
          <Textarea
            id="site-description"
            maxLength={320}
            value={value.description}
            onChange={(e) => update({ description: e.target.value })}
            className={control}
          />
          <p className="mt-1 text-sm text-site-muted">
            До 320 символов, одной строкой. Используется в метаданных главной
            страницы.
          </p>
          <label htmlFor="site-locale" className="mt-4 block text-sm">
            Язык контента
          </label>
          <Select
            disabled={busy || !loaded}
            value={value.locale}
            items={[
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'he', label: 'עברית' },
            ]}
            onValueChange={(locale) => {
              if (
                locale === 'ru' ||
                locale === 'en' ||
                locale === 'es' ||
                locale === 'he'
              )
                update({ locale });
            }}
          >
            <SelectTrigger id="site-locale" className={control}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-site-line bg-site-surface text-site-ink">
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="he">עברית</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm text-site-muted">
            Метка языка контента для поиска. Не переводит интерфейс, страницы
            или ответы ассистента.
          </p>
        </section>
        <section className={surface}>
          <h3 className="text-lg font-semibold">Тема сайта</h3>
          <fieldset
            aria-label="Темы сайта"
            className="mt-6 grid gap-4 xl:grid-cols-3"
          >
            {themes.map((theme) => (
              <button
                key={theme.id}
                disabled={busy || !loaded}
                aria-pressed={selected === theme.id}
                onClick={() => setSelected(theme.id)}
                className={`min-w-0 rounded-2xl border-2 p-3 text-left transition-colors ${selected === theme.id ? 'border-site-accent-ink' : 'border-site-line hover:border-site-muted'}`}
              >
                <div data-site-theme={theme.id} className="theme-miniature">
                  <div className="flex items-center gap-2 border-b border-site-line pb-3">
                    <span className="size-3 rounded-full bg-site-accent" />
                    <span className="text-xs font-semibold">northstar</span>
                  </div>
                  <h3 className="mt-4 text-xl">Ваш консультант</h3>
                  <div className="mt-3 rounded-xl bg-site-raised p-3 text-xs text-site-muted">
                    Здравствуйте! Чем могу помочь?
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-site-line p-2">
                    <span className="text-xs text-site-muted">Ваш вопрос</span>
                    <span className="rounded-md bg-site-accent px-2 py-1 text-site-on-accent">
                      ↑
                    </span>
                  </div>
                </div>
                <span className="mt-4 flex items-center justify-between gap-2 font-semibold">
                  {theme.name}
                  {selected === theme.id && (
                    <Check className="size-4 text-site-accent-ink" />
                  )}
                </span>
                <span className="mt-2 block text-sm leading-6 text-site-muted">
                  {theme.description}
                </span>
                <span className="mt-3 block text-xs text-site-accent-ink">
                  {applied === theme.id
                    ? 'Применена на сайте'
                    : selected === theme.id
                      ? 'Выбрана для просмотра'
                      : 'Выбрать тему'}
                </span>
              </button>
            ))}
          </fieldset>

          <a
            href={'/?theme-preview=' + selected}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-site-line px-4 text-sm"
          >
            Предпросмотр темы <ArrowUpRight className="size-4" />
          </a>
        </section>
        <section className={surface}>
          <h3 className="text-lg font-semibold">Фоновое изображение</h3>
          <label htmlFor="site-background" className="mt-4 block text-sm">
            Ссылка на изображение
          </label>
          <Input
            id="site-background"
            maxLength={2048}
            value={value.backgroundImage}
            onChange={(e) => update({ backgroundImage: e.target.value })}
            placeholder="https://… или /images/background.jpg"
            className={control}
          />
          <p className="mt-2 text-sm text-site-muted">
            HTTPS-ссылка или путь на сайте. Внешнее изображение загружается
            браузером посетителя. Пустое поле убирает фон.
          </p>
          <Button
            variant="outline"
            className="mt-3 min-h-11 border-site-line bg-transparent"
            disabled={!value.backgroundImage}
            onClick={() => update({ backgroundImage: '' })}
          >
            Очистить поле
          </Button>
        </section>
        <Button
          disabled={busy || !loaded || !dirty}
          onClick={() => void save()}
          className="min-h-11 w-full rounded-xl bg-site-accent px-5 text-site-on-accent hover:bg-site-accent-hover sm:w-auto"
        >
          {busy ? 'Сохраняем…' : 'Применить изменения'}
        </Button>
      </fieldset>
      {message && (
        <output className="block rounded-xl border border-site-line bg-site-raised p-4 text-sm">
          {message}
        </output>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/50 p-4 text-sm"
        >
          {error} Правки в форме сохранены. При конфликте обновите данные перед
          повторным сохранением.
        </div>
      )}
      <section className={surface}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">История настроек</h3>
          <Button
            variant="outline"
            disabled={busy || historyBusy || !loaded}
            onClick={() => void history()}
          >
            Обновить историю
          </Button>
        </div>
        {historyError && (
          <p role="alert" className="mt-3 text-sm">
            {historyError}
          </p>
        )}
        {!versions.length && loaded && !historyError && (
          <p className="mt-3 text-sm text-site-muted">
            История появится после первого изменения.
          </p>
        )}
        <ul className="mt-4 divide-y divide-site-line">
          {versions.map((v) => (
            <li
              key={v.revision}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 break-all text-sm">
                <p>
                  Версия {v.revision}
                  {v.revision === state.revision ? ' · Текущая' : ''}
                  {v.restoredFrom !== null
                    ? ' · Откат к ' + v.restoredFrom
                    : ''}
                </p>
                <p className="mt-1 text-site-muted">
                  {new Date(v.createdAt * 1000).toLocaleString('ru-RU')} ·{' '}
                  {v.source} · {v.actorId}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={busy || !loaded || v.revision === state.revision}
                onClick={() => void save(v.revision)}
              >
                Восстановить
              </Button>
            </li>
          ))}
        </ul>
        {nextBefore !== null && (
          <Button
            variant="outline"
            disabled={busy || historyBusy}
            onClick={() => void history(nextBefore)}
          >
            Более ранние версии
          </Button>
        )}
      </section>
    </div>
  );
}
