/* oxlint-disable next/no-html-link-for-pages */
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { money } from '@/lib/commerce-policy';
type Product = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  kind: string;
  price: number;
  currency: string;
  aiInstructions: string;
  active: boolean;
};
const empty = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  kind: 'service',
  price: '',
  currency: 'RUB',
  aiInstructions: '',
};
export function CatalogAdmin() {
  const [items, setItems] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/products');
      if (!r.ok) throw new Error('Не удалось загрузить каталог');
      setItems(((await r.json()) as { products: Product[] }).products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  async function mutate(method: string, id: string | null, body?: unknown) {
    const r = await fetch(`/api/products${id ? '/' + id : ''}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = (await r.json()) as { error?: string };
    if (!r.ok) throw new Error(data.error ?? 'Не удалось сохранить');
  }
  async function save(e: { preventDefault(): void }) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await mutate(editing ? 'PATCH' : 'POST', editing, {
        ...form,
        slug: form.slug || undefined,
        price: Math.round(Number(form.price) * 100),
      });
      setMessage('Сохранено');
      setEditing(null);
      setForm(empty);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }
  async function action(item: Product, remove = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await mutate(
        remove ? 'DELETE' : 'PATCH',
        item.id,
        remove ? undefined : { active: !item.active },
      );
      setConfirm(null);
      if (editing === item.id) {
        setEditing(null);
        setForm(empty);
      }
      await load();
      setMessage(remove ? 'Товар удалён' : 'Публикация обновлена');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Услуги и товары</h2>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={busy || loading}
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Обновить
          </Button>
        </div>
        {loading ? (
          <output>Загружаем…</output>
        ) : !items.length ? (
          <p className="rounded-xl border border-site-line p-5 text-site-muted">
            Добавьте первое предложение с помощью формы
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-5"
            >
              <p className="text-sm text-site-muted">
                {item.active ? 'Опубликовано' : 'Скрыто'}
              </p>
              <h3 className="mt-2 break-words text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-3">{money(item.price, item.currency)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => {
                    setEditing(item.id);
                    setForm({
                      title: item.title,
                      slug: item.slug,
                      shortDescription: item.shortDescription,
                      description: item.description,
                      kind: item.kind,
                      price: String(item.price / 100),
                      currency: item.currency,
                      aiInstructions: item.aiInstructions,
                    });
                    setError('');
                    setMessage('');
                  }}
                >
                  Изменить
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => void action(item)}
                >
                  {item.active ? 'Скрыть' : 'Опубликовать'}
                </Button>
                {item.active && (
                  <a
                    className="inline-flex min-h-11 items-center px-2 text-sm text-site-accent-ink underline"
                    href={`/catalog/${encodeURIComponent(item.slug)}`}
                  >
                    Карточка ↗
                  </a>
                )}
                <Button
                  variant="ghost"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => setConfirm(item.id)}
                >
                  Удалить
                </Button>
              </div>
              {confirm === item.id && (
                <div className="mt-4 space-y-3 border-t border-site-line pt-4">
                  <p className="text-sm">
                    Удалить предложение безвозвратно? Если у него есть заказы,
                    доступно только скрытие.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="min-h-11"
                      disabled={busy}
                      onClick={() => void action(item, true)}
                    >
                      Подтвердить удаление
                    </Button>
                    <Button
                      className="min-h-11"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setConfirm(null)}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </section>
      <form
        onSubmit={save}
        className="min-w-0 self-start space-y-4 rounded-2xl border border-site-line bg-site-surface p-5 sm:p-6"
      >
        <h2 className="text-xl font-semibold">
          {editing ? 'Редактировать предложение' : 'Новое предложение'}
        </h2>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <label htmlFor="catalog-kind" className="block text-sm">
            Тип
            <NativeSelect
              id="catalog-kind"
              className="mt-2 w-full [&_select]:h-11 [&_select]:text-base"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <NativeSelectOption value="service">Услуга</NativeSelectOption>
              <NativeSelectOption value="product">Товар</NativeSelectOption>
            </NativeSelect>
          </label>
          {(
            [
              { key: 'title', label: 'Название', max: 180, required: true },
              {
                key: 'slug',
                label: 'Адрес карточки (slug)',
                max: 180,
                required: false,
              },
              {
                key: 'shortDescription',
                label: 'Краткое описание',
                max: 500,
                required: true,
              },
            ] as const
          ).map((field) => (
            <label
              key={field.key}
              htmlFor={`catalog-${field.key}`}
              className="block text-sm"
            >
              {field.label}
              <Input
                id={`catalog-${field.key}`}
                className="mt-2 h-11 text-base"
                value={form[field.key]}
                maxLength={field.max}
                required={field.required}
                onChange={(e) =>
                  setForm({ ...form, [field.key]: e.target.value })
                }
              />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="catalog-price" className="block text-sm">
              Цена (рубли / основные единицы)
              <Input
                id="catalog-price"
                className="mt-2 h-11 text-base"
                type="number"
                min="0"
                max="10000000"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label htmlFor="catalog-currency" className="block text-sm">
              Валюта
              <Input
                id="catalog-currency"
                className="mt-2 h-11 text-base"
                required
                maxLength={3}
                pattern="[A-Z]{3}"
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value.toUpperCase() })
                }
              />
            </label>
          </div>
          <label htmlFor="catalog-description" className="block text-sm">
            Описание для клиента
            <Textarea
              id="catalog-description"
              className="mt-2 min-h-32 text-base"
              maxLength={20000}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label htmlFor="catalog-aiInstructions" className="block text-sm">
            Инструкции AI-консультанту
            <Textarea
              id="catalog-aiInstructions"
              className="mt-2 min-h-28 text-base"
              maxLength={12000}
              value={form.aiInstructions}
              onChange={(e) =>
                setForm({ ...form, aiInstructions: e.target.value })
              }
            />
            <span className="mt-2 block leading-6 text-site-muted">
              Не публикуются в карточке. Не сохраняйте здесь пароли, ключи и
              персональные секреты.
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="min-h-11">
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                }}
              >
                Отменить редактирование
              </Button>
            )}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="break-words text-sm">
            {error}
          </p>
        )}
        {message && (
          <output className="text-sm text-site-success">{message}</output>
        )}
      </form>
    </div>
  );
}
