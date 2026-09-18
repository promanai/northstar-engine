'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminConfirm } from '@/components/admin-confirm';
import type {
  KnowledgeCategory,
  KnowledgeConfig,
  KnowledgeItem,
} from '@/lib/knowledge-service';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  History,
  Tag,
} from 'lucide-react';

type KnowledgeState = KnowledgeConfig & { revision: number };

type VersionEvent = {
  revision: number;
  action: string;
  actorId: string;
  source: string;
  createdAt: number;
};

const categoryLabels: Record<KnowledgeCategory, string> = {
  faq: 'Частые вопросы (FAQ)',
  about: 'О клинике / компании',
  prep: 'Правила и подготовка',
  general: 'Общее',
};

const emptyItem: KnowledgeItem = {
  id: '',
  title: '',
  category: 'general',
  content: '',
  active: true,
  updatedAt: '',
};

export function KnowledgeEditor() {
  const [data, setData] = useState<KnowledgeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filtering & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Editing state
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<VersionEvent[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const lock = useRef(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/knowledge?view=admin', { cache: 'no-store' });
      const json = (await res.json()) as { knowledge: KnowledgeState; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось загрузить базу знаний');
      setData(json.knowledge);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch('/api/knowledge?view=history', { cache: 'no-store' });
      const json = (await res.json()) as { versions: VersionEvent[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось загрузить историю');
      setHistory(json.versions);
      setShowHistory(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при загрузке истории');
    }
  }

  async function saveItems(items: KnowledgeItem[], rollbackRevision?: number) {
    if (!data || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body =
        rollbackRevision !== undefined
          ? {
              revision: data.revision,
              targetRevision: rollbackRevision,
              confirm: true,
            }
          : {
              revision: data.revision,
              items,
              confirm: true,
            };

      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as { knowledge?: KnowledgeState; error?: string };
      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(json.error ?? 'Не удалось сохранить изменения');
      }

      if (json.knowledge) {
        setData(json.knowledge);
      } else {
        await load();
      }

      setNotice(
        rollbackRevision !== undefined
          ? `База знаний восстановлена к версии ${rollbackRevision}.`
          : 'База знаний успешно сохранена. AI-консультант обновлён.',
      );
      setEditingItem(null);
      setIsNew(false);
      setDeletingId(null);
      setShowHistory(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  function handleSaveDraft(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!data || !editingItem) return;
    if (!editingItem.title.trim()) {
      setError('Укажите заголовок статьи');
      return;
    }
    if (!editingItem.content.trim()) {
      setError('Укажите текст статьи');
      return;
    }

    const itemToSave: KnowledgeItem = {
      ...editingItem,
      id: isNew ? crypto.randomUUID() : editingItem.id,
      updatedAt: new Date().toISOString(),
    };

    const nextItems = isNew
      ? [itemToSave, ...data.items]
      : data.items.map((it) => (it.id === itemToSave.id ? itemToSave : it));

    void saveItems(nextItems);
  }

  function handleToggleActive(item: KnowledgeItem) {
    if (!data) return;
    const nextItems = data.items.map((it) =>
      it.id === item.id ? { ...it, active: !it.active, updatedAt: new Date().toISOString() } : it,
    );
    void saveItems(nextItems);
  }

  function handleDeleteConfirm() {
    if (!data || !deletingId) return;
    const nextItems = data.items.filter((it) => it.id !== deletingId);
    void saveItems(nextItems);
  }

  const items = data?.items ?? [];
  const filtered = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const activeCount = items.filter((i) => i.active).length;

  return (
    <section className="mt-6 min-w-0 space-y-5 rounded-2xl border border-site-line bg-site-surface p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">База знаний</h2>
          <p className="mt-1 text-sm text-site-muted">
            Статьи, правила и ответы на частые вопросы, на которые опирается AI-ассистент
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() => void loadHistory()}
          >
            <History className="mr-1.5 h-4 w-4" />
            История
          </Button>
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Обновить
          </Button>
          <Button
            disabled={busy || editingItem !== null}
            onClick={() => {
              setEditingItem({ ...emptyItem, id: crypto.randomUUID() });
              setIsNew(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить статью
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <p role="alert" className="break-words rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && (
        <output className="block rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </output>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-site-muted" />
            <Input
              type="search"
              placeholder="Поиск по статьям и FAQ…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              if (val) setSelectedCategory(val);
            }}
          >
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории ({items.length})</SelectItem>
              <SelectItem value="faq">Частые вопросы ({items.filter((i) => i.category === 'faq').length})</SelectItem>
              <SelectItem value="about">О клинике ({items.filter((i) => i.category === 'about').length})</SelectItem>
              <SelectItem value="prep">Подготовка ({items.filter((i) => i.category === 'prep').length})</SelectItem>
              <SelectItem value="general">Общее ({items.filter((i) => i.category === 'general').length})</SelectItem>
            </SelectContent>
          </Select>

          <span className="rounded-xl border border-site-line bg-site-page px-3 py-2 text-xs text-site-muted">
            Активно для AI: <strong>{activeCount}</strong> из {items.length}
          </span>
        </div>
      </div>

      {/* Edit Form Modal/Drawer */}
      {editingItem && (
        <form
          onSubmit={handleSaveDraft}
          className="space-y-4 rounded-xl border border-site-primary/40 bg-site-page p-4 sm:p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {isNew ? 'Новая статья в базу знаний' : 'Редактирование статьи'}
            </h3>
            <span className="text-xs text-site-muted">
              Версия базы: {data?.revision ?? 0}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="sm:col-span-2 text-sm font-medium">
              Заголовок статьи
              <Input
                className="mt-1.5"
                required
                maxLength={200}
                placeholder="например, Правила подготовки к приёму"
                value={editingItem.title}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, title: e.target.value })
                }
              />
            </label>

            <label className="text-sm font-medium">
              Категория
              <Select
                value={editingItem.category}
                onValueChange={(val) => {
                  if (val) {
                    setEditingItem({
                      ...editingItem,
                      category: val as KnowledgeCategory,
                    });
                  }
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faq">Частые вопросы (FAQ)</SelectItem>
                  <SelectItem value="about">О клинике / компании</SelectItem>
                  <SelectItem value="prep">Правила и подготовка</SelectItem>
                  <SelectItem value="general">Общее</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Текст статьи (инструкции и факты для AI-консультанта и клиентов)
            <Textarea
              className="mt-1.5 min-h-36 font-sans text-sm leading-relaxed"
              required
              maxLength={10000}
              placeholder="Опишите подробные правила, регламенты, цены или часы работы…"
              value={editingItem.content}
              onChange={(e) =>
                setEditingItem({ ...editingItem, content: e.target.value })
              }
            />
          </label>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active-checkbox"
              checked={editingItem.active}
              onChange={(e) =>
                setEditingItem({ ...editingItem, active: e.target.checked })
              }
              className="h-4 w-4 rounded border-site-line accent-site-primary"
            />
            <label htmlFor="active-checkbox" className="text-sm cursor-pointer">
              Включить в контекст AI-консультанта (активная статья)
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить статью'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditingItem(null);
                setIsNew(false);
              }}
            >
              Отмена
            </Button>
          </div>
        </form>
      )}

      {/* History view */}
      {showHistory && history && (
        <div className="space-y-3 rounded-xl border border-site-line bg-site-page p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">История изменений базы знаний</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(false)}
            >
              Закрыть
            </Button>
          </div>
          <ul className="divide-y divide-site-line max-h-60 overflow-y-auto text-xs">
            {history.map((h) => (
              <li key={h.revision} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-semibold">Версия {h.revision}</span> ·{' '}
                  <span className="text-site-muted">
                    {new Date(h.createdAt * 1000).toLocaleString('ru-RU')}
                  </span>
                </div>
                {data && h.revision !== data.revision && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void saveItems([], h.revision)}
                  >
                    Откатить к этой версии
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading & Empty State */}
      {loading && (
        <output className="block py-6 text-sm text-site-muted">
          Загружаем базу знаний…
        </output>
      )}

      {!loading && !filtered.length && (
        <div className="py-10 text-center text-sm text-site-muted">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-site-muted/60" />
          {search || selectedCategory !== 'all'
            ? 'Статьи по заданным фильтрам не найдены'
            : 'В базе знаний пока нет статей. Добавьте первую!'}
        </div>
      )}

      {/* Articles Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((item) => (
          <article
            key={item.id}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
              item.active
                ? 'border-site-line bg-site-page'
                : 'border-site-line/60 bg-site-raised/50 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-site-surface px-2 py-0.5 text-xs text-site-muted">
                  <Tag className="h-3 w-3" />
                  {categoryLabels[item.category] ?? item.category}
                </span>

                <button
                  type="button"
                  title={item.active ? 'Активна (отключить)' : 'Отключена (включить)'}
                  onClick={() => handleToggleActive(item)}
                  className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                >
                  {item.active ? (
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Активна
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-site-muted">
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Отключена
                    </span>
                  )}
                </button>
              </div>

              <h4 className="mt-2 text-base font-semibold leading-snug">
                {item.title}
              </h4>

              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-site-muted whitespace-pre-wrap">
                {item.content}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-site-line/50 pt-3 text-xs text-site-muted">
              <span>
                Обновлено: {new Date(item.updatedAt || Date.now()).toLocaleDateString('ru-RU')}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setEditingItem(item);
                    setIsNew(false);
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                  onClick={() => setDeletingId(item.id)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AdminConfirm
        open={deletingId !== null}
        title="Удалить статью из базы знаний?"
        description="Статья будет исключена из базы знаний и больше не будет передаваться в контекст AI-ассистента."
        busy={busy}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
}
