/* oxlint-disable next/no-html-link-for-pages */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Eye,
  FileText,
  Plus,
  Save,
  Trash2,
  History,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Page = {
  id: string;
  slug: string;
  title: string;
  status: string;
  revision: number;
  blocks: unknown[];
  seo: Record<string, string>;
  updatedAt: number;
};
type Version = {
  revision: number;
  action: string;
  source: string;
  actorId: string;
  tokenId: string | null;
  createdAt: number;
};
type Form = {
  id?: string;
  revision?: number;
  title: string;
  slug: string;
  status: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  originalBlocks: unknown[];
  originalSeo: Record<string, string>;
};
const emptyForm: Form = {
  title: '',
  slug: '',
  status: 'draft',
  content: '',
  seoTitle: '',
  seoDescription: '',
  originalBlocks: [],
  originalSeo: {},
};
const editorContent = (blocks: unknown[]) =>
  blocks
    .map((b) => (typeof b === 'string' ? b : JSON.stringify(b, null, 2)))
    .join('\n\n');
const actionLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'В корзину',
  restore: 'Восстановление',
  baseline: 'Исходная версия',
};
function toForm(page: Page): Form {
  return {
    ...page,
    content: editorContent(page.blocks),
    seoTitle: page.seo.title ?? '',
    seoDescription: page.seo.description ?? '',
    originalBlocks: page.blocks,
    originalSeo: page.seo,
  };
}

export function PageEditor() {
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [versions, setVersions] = useState<Version[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trash, setTrash] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pages', { cache: 'no-store' });
      const data = (await response.json()) as {
        pages?: Page[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Не удалось загрузить страницы');
      setPages(data.pages ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось загрузить страницы',
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setVersions([]);
      setNextBefore(null);
      setHistoryError('');
      if (!form.id) {
        setHistoryLoading(false);
        return;
      }
      setHistoryLoading(true);
      await fetch(`/api/pages/${form.id}/history`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            versions: Version[];
            nextBefore: number | null;
            error?: string;
          };
          if (!response.ok)
            throw new Error(data.error || 'Не удалось загрузить историю');
          if (!controller.signal.aborted) {
            setVersions(data.versions);
            setNextBefore(data.nextBefore);
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setHistoryError(cause.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setHistoryLoading(false);
        });
    });
    return () => controller.abort();
  }, [form.id, form.revision]);

  function edit(page: Page) {
    setForm(toForm(page));
    setMessage('');
    setError('');
    setConflict(false);
  }
  function newPage() {
    setForm(emptyForm);
    setTrash(false);
    setMessage('');
    setError('');
    setConflict(false);
  }
  async function mutate(
    action: 'save' | 'delete' | 'restore',
    targetRevision?: number,
  ) {
    if (saving) return;
    if (
      action !== 'save' &&
      !window.confirm(
        action === 'delete'
          ? 'Перенести страницу в корзину? Её можно будет восстановить.'
          : 'Заменить текущий контент выбранной версией? Она будет сохранена как черновик.',
      )
    )
      return;
    const changedBlocks = form.content !== editorContent(form.originalBlocks);
    if (
      action === 'save' &&
      changedBlocks &&
      form.originalBlocks.some((b) => typeof b !== 'string') &&
      !window.confirm(
        'Структурированные блоки будут заменены текстом. Продолжить?',
      )
    )
      return;
    setSaving(true);
    setError('');
    setMessage('');
    setConflict(false);
    const body =
      action === 'save'
        ? {
            title: form.title,
            slug: form.slug,
            status: form.status,
            blocks: changedBlocks
              ? form.content.trim()
                ? [form.content.trim()]
                : []
              : form.originalBlocks,
            seo: {
              ...form.originalSeo,
              title: form.seoTitle,
              description: form.seoDescription,
            },
            ...(form.id ? { revision: form.revision } : {}),
          }
        : {
            revision: form.revision,
            confirm: true,
            ...(action === 'restore' ? { targetRevision } : {}),
          };
    const path = form.id
      ? `/api/pages/${form.id}${action === 'restore' ? '/restore' : ''}`
      : '/api/pages';
    try {
      const response = await fetch(path, {
        method:
          action === 'delete'
            ? 'DELETE'
            : action === 'restore' || !form.id
              ? 'POST'
              : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { page: Page; error?: string };
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(data.error || 'Не удалось сохранить изменения');
      }
      window.dispatchEvent(new Event('site-navigation-change'));
      setForm(toForm(data.page));
      setTrash(data.page.status === 'deleted');
      await load();
      setMessage(
        action === 'delete'
          ? 'Страница в корзине. История сохранена.'
          : action === 'restore'
            ? 'Версия восстановлена как черновик. Проверьте её перед публикацией.'
            : 'Страница сохранена',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Ошибка сети. Ваш текст сохранён в редакторе.',
      );
    } finally {
      setSaving(false);
    }
  }
  async function reloadCurrent() {
    if (
      !form.id ||
      !window.confirm(
        'Загрузить актуальную страницу и заменить несохранённый текст в редакторе?',
      )
    )
      return;
    setSaving(true);
    try {
      const response = await fetch(`/api/pages/${form.id}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as { page: Page; error?: string };
      if (!response.ok)
        throw new Error(data.error || 'Не удалось загрузить страницу');
      edit(data.page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка сети');
    } finally {
      setSaving(false);
    }
  }
  async function olderVersions() {
    if (historyLoading || nextBefore === null) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await fetch(
        `/api/pages/${form.id}/history?before=${nextBefore}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as {
        versions: Version[];
        nextBefore: number | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Не удалось загрузить историю');
      setVersions((current) => [...current, ...data.versions]);
      setNextBefore(data.nextBefore);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : 'Ошибка сети');
    } finally {
      setHistoryLoading(false);
    }
  }
  const deleted = form.status === 'deleted';
  const visiblePages = pages.filter((p) => (p.status === 'deleted') === trash);
  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-medium">Страницы сайта</h2>
          <Button
            disabled={saving || historyLoading}
            onClick={newPage}
            variant="outline"
            className="min-h-11 border-site-line"
          >
            <Plus className="mr-2 size-4" />
            Новая
          </Button>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={trash}
            onChange={(e) => setTrash(e.target.checked)}
          />
          Показать корзину ({pages.filter((p) => p.status === 'deleted').length}
          )
        </label>
        {loading && <p className="mt-4 text-sm text-site-muted">Загрузка…</p>}
        {!loading && !visiblePages.length && (
          <p className="mt-4 text-sm text-site-muted">
            {trash ? 'Корзина пуста' : 'Пока нет страниц'}
          </p>
        )}
        <div className="mt-4 space-y-2">
          {visiblePages.map((page) => (
            <button
              disabled={saving || historyLoading}
              key={page.id}
              type="button"
              onClick={() => edit(page)}
              className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border p-4 text-left ${form.id === page.id ? 'border-site-accent bg-site-raised' : 'border-site-line hover:bg-site-raised'}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{page.title}</span>
                <span className="mt-1 block truncate text-sm text-site-muted">
                  {page.slug}
                </span>
              </span>
              <Badge
                variant="outline"
                className="shrink-0 border-site-line text-site-muted"
              >
                {page.status === 'deleted'
                  ? 'В корзине'
                  : page.status === 'published'
                    ? 'Опубликована'
                    : 'Черновик'}
              </Badge>
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">
              {deleted
                ? 'Страница в корзине'
                : form.id
                  ? 'Редактор страницы'
                  : 'Новая страница'}
            </h2>
            {form.id && (
              <p className="mt-1 text-sm text-site-muted">
                Версия {form.revision}
              </p>
            )}
          </div>
          {form.id && !deleted && (
            <div className="flex flex-wrap gap-2">
              {form.status === 'published' && (
                <a
                  href={form.slug}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-xl border border-site-line px-3 text-sm"
                >
                  <Eye className="mr-2 size-4" />
                  Открыть
                </a>
              )}
              <Button
                disabled={saving}
                variant="outline"
                onClick={() => void mutate('delete')}
                className="min-h-11 border-site-line"
              >
                <Trash2 className="mr-2 size-4" />В корзину
              </Button>
            </div>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm"
          >
            {error}
          </p>
        )}
        {conflict && (
          <Button
            disabled={saving}
            variant="outline"
            onClick={() => void reloadCurrent()}
            className="mt-3 min-h-11"
          >
            Загрузить актуальную версию
          </Button>
        )}
        {message && (
          <output className="mt-4 block rounded-xl border border-site-line bg-site-raised p-3 text-sm">
            {message}
          </output>
        )}
        <fieldset
          disabled={saving || deleted}
          className="mt-6 min-w-0 disabled:opacity-70"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="page-title" className="text-sm">
              Название
              <Input
                id="page-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-2 min-h-11 border-site-line bg-site-page"
                maxLength={160}
              />
            </label>
            <label htmlFor="page-slug" className="text-sm">
              Адрес страницы
              <Input
                id="page-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="/about"
                className="mt-2 min-h-11 border-site-line bg-site-page"
                maxLength={180}
              />
            </label>
          </div>
          <label className="mt-4 block text-sm">
            Содержание страницы
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="mt-2 min-h-64 w-full resize-y rounded-xl border border-site-line bg-site-page px-3 py-3 text-base leading-7 outline-none focus:border-site-accent"
              maxLength={50000}
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label htmlFor="page-seo-title" className="text-sm">
              SEO-заголовок
              <Input
                id="page-seo-title"
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                className="mt-2 min-h-11 border-site-line bg-site-page"
                maxLength={160}
              />
            </label>
            <label htmlFor="page-seo-description" className="text-sm">
              SEO-описание
              <Input
                id="page-seo-description"
                value={form.seoDescription}
                onChange={(e) =>
                  setForm({ ...form, seoDescription: e.target.value })
                }
                className="mt-2 min-h-11 border-site-line bg-site-page"
                maxLength={320}
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-site-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.status === 'published'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.checked ? 'published' : 'draft',
                  })
                }
              />
              Опубликовать страницу
            </label>
            <Button
              onClick={() => void mutate('save')}
              disabled={saving || !form.title || !form.slug || deleted}
              className="min-h-11 bg-site-accent text-site-on-accent hover:bg-site-accent-hover"
            >
              <Save className="mr-2 size-4" />
              {saving ? 'Сохраняем…' : 'Сохранить страницу'}
            </Button>
          </div>
        </fieldset>
        {form.id && (
          <details
            className="mt-6 border-t border-site-line pt-4"
            open={deleted}
          >
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
              <History className="mr-2 inline size-4" />
              История и восстановление
            </summary>
            <p className="mb-3 text-sm text-site-muted">
              Восстановление создаёт новый черновик. Текущая версия остаётся в
              истории.
            </p>
            {historyError && (
              <p role="alert" className="text-sm">
                {historyError}
              </p>
            )}
            {historyLoading && (
              <p className="text-sm text-site-muted">Загрузка истории…</p>
            )}
            {!historyLoading && !versions.length && !historyError && (
              <p className="text-sm text-site-muted">
                История начнётся с первого сохранения после обновления движка.
              </p>
            )}
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.revision}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-site-line p-3"
                >
                  <div className="min-w-0 text-sm">
                    <p>
                      Версия {v.revision} · {actionLabels[v.action] ?? v.action}
                    </p>
                    <p className="text-site-muted">
                      {new Date(v.createdAt * 1000).toLocaleString('ru-RU')} ·{' '}
                      {v.source === 'mcp'
                        ? 'MCP-агент'
                        : v.source === 'rest'
                          ? 'Админка / API'
                          : 'Исходное состояние'}
                    </p>
                    <p className="break-all text-xs text-site-muted">
                      Автор: {v.actorId}
                      {v.tokenId ? ` · Токен: ${v.tokenId}` : ''}
                    </p>
                  </div>
                  {v.action !== 'delete' && v.revision !== form.revision && (
                    <Button
                      disabled={saving || historyLoading}
                      variant="outline"
                      onClick={() => void mutate('restore', v.revision)}
                      className="min-h-11 border-site-line"
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Восстановить
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {nextBefore !== null && (
              <Button
                disabled={historyLoading || saving}
                variant="outline"
                onClick={() => void olderVersions()}
                className="mt-3 min-h-11"
              >
                Более ранние версии
              </Button>
            )}
          </details>
        )}
        <p className="mt-4 text-sm leading-6 text-site-muted">
          <FileText className="mr-1 inline size-4" />
          Опубликованные страницы доступны в HTML, Markdown и sitemap.
        </p>
      </div>
    </section>
  );
}
