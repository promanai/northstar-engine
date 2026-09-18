'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  demoPlans,
  billingKinds,
  billingStatuses,
  billingAlerts,
  monthlyFees,
  newBillingEntry,
  type BillingEntry,
  type BillingDocument,
} from '@/lib/billing-policy';
import type { AiBudgetView } from '@/lib/ai-budget-policy';

type View = {
  revision: number;
  value: BillingDocument;
  aiBudget: AiBudgetView | null;
  history: { revision: number; createdAt: number }[];
  checkedAt: string;
};
const money = (minor: number | null, currency: string) =>
  minor === null
    ? 'Не указано'
    : new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(
        minor / 100,
      );
const planName = (e: BillingEntry) =>
  e.kind === 'promanos'
    ? demoPlans.find((p) => p.id === e.plan)
      ? 'Демо · ' + demoPlans.find((p) => p.id === e.plan)!.name
      : 'Тариф не указан'
    : e.plan || 'Тариф не указан';
const fieldClass =
  'min-h-11 w-full min-w-0 bg-site-page text-site-ink border-site-line';
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 content-start gap-2 text-sm text-site-muted">
      {label}
      {children}
    </label>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full [&_select]:min-h-11"
      >
        {Object.entries(options).map(([key, name]) => (
          <NativeSelectOption key={key} value={key}>
            {name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
export function BillingConsole() {
  const [data, setData] = useState<View | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<BillingEntry | null>(null),
    [deleting, setDeleting] = useState(false);
  const [today, setToday] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const editor = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing', {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const body = (await response.json()) as View & { error?: string };
      if (!response.ok)
        throw new Error(body.error || 'Не удалось загрузить подписки');
      if (mounted.current) {
        setData(body);
        setToday(new Date().toISOString().slice(0, 10));
      }
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Не удалось загрузить подписки',
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (draft) editor.current?.focus();
  }, [draft?.id]);
  function edit(entry: BillingEntry) {
    setDraft({ ...entry });
    setDeleting(false);
    setError('');
    setNotice('');
  }
  function update<K extends keyof BillingEntry>(
    key: K,
    value: BillingEntry[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  }
  async function save(remove = false) {
    if (!data || !draft || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    const rest = data.value.entries.filter((e) => e.id !== draft.id);
    const entries = remove
      ? rest
      : data.value.entries.some((e) => e.id === draft.id)
        ? data.value.entries.map((e) => (e.id === draft.id ? draft : e))
        : [...rest, draft];
    try {
      const response = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision: data.revision, value: { entries } }),
        signal: AbortSignal.timeout(15000),
      });
      const body = (await response.json()) as Pick<
        View,
        'revision' | 'value'
      > & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Не удалось сохранить');
      if (!mounted.current) return;
      setData({ ...data, ...body });
      setDraft(null);
      setDeleting(false);
      setNotice(
        remove
          ? 'Запись удалена из учёта. Подписка у провайдера не отменена.'
          : 'Сохранено в учёте сайта. Тариф и автопродление у провайдера не изменены.',
      );
    } catch (cause) {
      if (mounted.current)
        setError(
          (cause instanceof Error ? cause.message : 'Не удалось сохранить') +
            ' Ваши поля сохранены на экране. При обрыве связи обновите список, чтобы проверить результат.',
        );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  const entries = data?.value.entries ?? [],
    totals = monthlyFees(entries);
  const alerts = entries.flatMap((e) =>
    billingAlerts(e, today).map((text) => ({ id: e.id, name: e.name, text })),
  );
  const textField = (
    key: 'name' | 'resource' | 'plan' | 'renewal' | 'period',
    label: string,
    type = 'text',
    maxLength = 200,
  ) => (
    <Field label={label}>
      <Input
        className={fieldClass}
        value={draft?.[key] ?? ''}
        type={type}
        maxLength={maxLength}
        required={key === 'name'}
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  );
  const numericField = (
    key: 'fee' | 'spent' | 'budget' | 'requests' | 'requestLimit',
    label: string,
    cents = true,
  ) => (
    <Field label={label}>
      <Input
        className={fieldClass}
        type="number"
        min="0"
        max={cents ? 1000000000 : 100000000000}
        step={cents ? '0.01' : '1'}
        placeholder="Не указано"
        value={draft?.[key] == null ? '' : draft[key]! / (cents ? 100 : 1)}
        onChange={(e) =>
          update(
            key,
            e.target.value === ''
              ? null
              : Math.round(Number(e.target.value) * (cents ? 100 : 1)),
          )
        }
      />
    </Field>
  );
  return (
    <section className="space-y-6" aria-label="Подписки и расходы">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-site-muted">
          Подписки, расходы и продления в одном месте. Внешние счета учитываются
          вручную — синхронизация с billing API не подключена.
        </p>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => void load()}
          disabled={loading || saving}
        >
          <RefreshCw className="size-4" />
          Обновить данные
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/50 p-4 text-sm"
        >
          {error}
        </div>
      )}
      {notice && (
        <output className="block rounded-xl border border-site-line p-4 text-sm">
          {notice}
        </output>
      )}
      {loading && (
        <output className="block text-sm text-site-muted">
          Загружаем учёт подписок…
        </output>
      )}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="gap-2 border border-site-line bg-site-surface p-5 ring-0">
              <p className="text-sm text-site-muted">
                Регулярные расходы / месяц
              </p>
              <div className="text-2xl font-medium">
                {Object.keys(totals).length
                  ? Object.entries(totals).map(([c, v]) => (
                      <p key={c}>{money(v!, c)}</p>
                    ))
                  : 'Нет указанных сумм'}
              </div>
              <p className="text-sm text-site-muted">
                Активные подписки; годовые суммы ÷ 12. Разовые платежи не
                включены.
              </p>
            </Card>
            <Card className="gap-2 border border-site-line bg-site-surface p-5 ring-0">
              <p className="text-sm text-site-muted">Сервисы в учёте</p>
              <p className="text-3xl">{entries.length}</p>
              <p className="text-sm text-site-muted">
                {entries.filter((e) => e.fee === null).length} без указанной
                стоимости
              </p>
            </Card>
            <Card className="gap-2 border border-site-line bg-site-surface p-5 ring-0">
              <p className="text-sm text-site-muted">Требуют проверки</p>
              <p className="text-3xl">
                {new Set(alerts.map((a) => a.id)).size}
              </p>
              <p className="text-sm text-site-muted">
                Продления в ближайшие 30 дней, лимиты и неполные данные
              </p>
            </Card>
          </div>
          <Card className="gap-4 border border-site-line bg-site-surface p-5 ring-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">AI-запросы этого сайта</h2>
              <a
                href="#models"
                className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
              >
                Настройки моделей
                <ArrowUpRight className="size-4" />
              </a>
            </div>
            {data.aiBudget ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-site-muted">Платные запросы</p>
                  <p>{data.aiBudget.enabled ? 'Разрешены' : 'Отключены'}</p>
                </div>
                <div>
                  <p className="text-sm text-site-muted">
                    Сутки · {data.aiBudget.daily.period} UTC
                  </p>
                  <p>
                    {data.aiBudget.daily.used} / {data.aiBudget.dailyRequests}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-site-muted">
                    Месяц · {data.aiBudget.monthly.period} UTC
                  </p>
                  <p>
                    {data.aiBudget.monthly.used} /{' '}
                    {data.aiBudget.monthlyRequests}
                  </p>
                </div>
              </div>
            ) : (
              <p role="alert">
                Не удалось получить счётчики AI. Это не означает нулевой расход.
              </p>
            )}
            <p className="text-sm text-site-muted">
              Зарезервированные попытки общей квоты движка (включая неудачные),
              не баланс PromanOS и не стоимость в деньгах. Ручные бюджеты ниже
              не блокируют запросы. Серверные лимиты задаются в конфигурации
              установки.
            </p>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Подписки и инфраструктура</h2>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!!draft || saving || entries.length >= 30}
              onClick={() =>
                edit(newBillingEntry('other', crypto.randomUUID()))
              }
            >
              <Plus className="size-4" />
              Добавить сервис
            </Button>
          </div>
          {!entries.length && (
            <p className="text-site-muted">
              Добавьте подписку, домен или другой регулярный расход.
            </p>
          )}
          <div className="grid gap-4 xl:grid-cols-3">
            {entries.map((e) => (
              <Card
                key={e.id}
                className="gap-4 border border-site-line bg-site-surface p-5 ring-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-medium">{e.name}</h3>
                  <CreditCard
                    aria-hidden="true"
                    className="size-5 shrink-0 text-site-muted"
                  />
                </div>
                <p className="text-sm text-site-muted">
                  {billingKinds[e.kind]} · {billingStatuses[e.status]}
                </p>
                <p>{planName(e)}</p>
                <p className="text-xl">
                  {money(e.fee, e.currency)}{' '}
                  <span className="text-sm text-site-muted">
                    {e.cycle === 'yearly'
                      ? '/ год'
                      : e.cycle === 'monthly'
                        ? '/ месяц'
                        : 'разово'}
                  </span>
                </p>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-site-muted">
                      {e.kind === 'domain'
                        ? 'Домен / регистратор'
                        : 'Аккаунт / ресурс'}
                    </dt>
                    <dd className="break-words">{e.resource || 'Не указан'}</dd>
                  </div>
                  <div>
                    <dt className="text-site-muted">Следующее продление</dt>
                    <dd>
                      {e.renewal || 'Не указано'} · Автопродление:{' '}
                      {e.autoRenew === 'on'
                        ? 'да'
                        : e.autoRenew === 'off'
                          ? 'нет'
                          : 'неизвестно'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-site-muted">
                      Расход / бюджет · {e.period || 'месяц не указан'}
                    </dt>
                    <dd>
                      {money(e.spent, e.currency)} /{' '}
                      {money(e.budget, e.currency)}
                    </dd>
                  </div>
                  {e.kind === 'promanos' && (
                    <div>
                      <dt className="text-site-muted">
                        Запросы / лимит · ручной учёт
                      </dt>
                      <dd>
                        {e.requests ?? 'Не указано'} /{' '}
                        {e.requestLimit ?? 'Не указано'}
                      </dd>
                    </div>
                  )}
                </dl>
                {billingAlerts(e, today).map((a) => (
                  <p
                    key={a}
                    className="flex items-start gap-2 text-sm text-amber-200"
                  >
                    <CalendarClock className="mt-0.5 size-4 shrink-0" />
                    {a}
                  </p>
                ))}
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    disabled={!!draft || saving}
                    onClick={() => edit(e)}
                  >
                    Изменить {e.name}
                  </Button>
                  {(e.kind === 'promanos' || e.kind === 'cloudflare') && (
                    <a
                      className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4"
                      href={
                        e.kind === 'promanos'
                          ? 'https://promanos.com/'
                          : 'https://dash.cloudflare.com/'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      У провайдера
                      <ArrowUpRight className="size-4" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {draft && (
            <Card className="gap-5 border border-site-line bg-site-surface p-5 sm:p-6 ring-0">
              <h2 ref={editor} tabIndex={-1} className="text-xl font-medium">
                Учёт: {draft.name || 'новый сервис'}
              </h2>
              <p className="text-sm text-site-muted">
                Сохранение меняет только запись в админке. Не указывайте пароли,
                API-ключи и данные банковской карты.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <fieldset disabled={saving} className="grid min-w-0 gap-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {textField('name', 'Название', 'text', 100)}
                    <Choice
                      label="Тип сервиса"
                      value={draft.kind}
                      options={billingKinds}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          kind: v as BillingEntry['kind'],
                          plan: '',
                        })
                      }
                    />
                    {draft.kind === 'promanos' ? (
                      <Choice
                        label="Тариф PromanOS (6 демонстрационных примеров)"
                        value={draft.plan}
                        options={{
                          '': 'Не выбран',
                          ...Object.fromEntries(
                            demoPlans.map((p) => [p.id, p.name + ' · демо']),
                          ),
                        }}
                        onChange={(v) => update('plan', v)}
                      />
                    ) : (
                      textField('plan', 'Тариф / продукт', 'text', 100)
                    )}
                    <Choice
                      label="Статус по данным владельца"
                      value={draft.status}
                      options={billingStatuses}
                      onChange={(v) =>
                        update('status', v as BillingEntry['status'])
                      }
                    />
                    {textField(
                      'resource',
                      draft.kind === 'domain'
                        ? 'Домен и регистратор'
                        : 'Название аккаунта / ресурса',
                    )}
                    <Choice
                      label="Валюта"
                      value={draft.currency}
                      options={{ USD: 'USD', EUR: 'EUR', RUB: 'RUB' }}
                      onChange={(v) =>
                        update('currency', v as BillingEntry['currency'])
                      }
                    />
                    {numericField('fee', 'Стоимость за платёжный период')}
                    <Choice
                      label="Платёжный период"
                      value={draft.cycle}
                      options={{
                        monthly: 'Месяц',
                        yearly: 'Год',
                        once: 'Разовый платёж',
                      }}
                      onChange={(v) =>
                        update('cycle', v as BillingEntry['cycle'])
                      }
                    />
                    {textField('renewal', 'Дата следующего продления', 'date')}
                    <Choice
                      label="Автопродление у провайдера"
                      value={draft.autoRenew}
                      options={{
                        unknown: 'Неизвестно',
                        on: 'Включено',
                        off: 'Выключено',
                      }}
                      onChange={(v) =>
                        update('autoRenew', v as BillingEntry['autoRenew'])
                      }
                    />
                  </div>
                  {draft.kind === 'promanos' && (
                    <p className="rounded-lg border border-site-line p-3 text-sm text-site-muted">
                      Start, Basic, Plus, Pro, Business и Enterprise — примеры,
                      не подтверждённые тарифы PromanOS. Цену и лимит внесите по
                      своему договору. Выбор не подключает модель и не покупает
                      подписку.
                    </p>
                  )}
                  <h3 className="border-t border-site-line pt-5 font-medium">
                    Контроль потребления · ручной ввод
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {textField('period', 'Месяц учёта расходов', 'month')}
                    {numericField('spent', 'Расход за указанный месяц')}
                    {numericField('budget', 'Месячный бюджет (предупреждение)')}
                    {draft.kind === 'promanos' && (
                      <>
                        {numericField(
                          'requests',
                          'Использовано запросов за месяц',
                          false,
                        )}
                        {numericField(
                          'requestLimit',
                          'Лимит запросов за месяц',
                          false,
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-site-muted">
                    Здесь хранится один актуальный месячный срез на сервис, а не
                    история счетов. При смене месяца внесите соответствующие ему
                    суммы и счётчики.
                  </p>
                  <Field label="Примечание">
                    <Textarea
                      className={fieldClass}
                      maxLength={1000}
                      value={draft.notes}
                      onChange={(e) => update('notes', e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="min-h-11">
                      {saving ? 'Сохраняем…' : 'Сохранить учёт'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => {
                        setDraft(null);
                        setDeleting(false);
                      }}
                    >
                      Отмена
                    </Button>
                    {entries.some((e) => e.id === draft.id) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => setDeleting(true)}
                      >
                        Удалить из учёта
                      </Button>
                    )}
                  </div>
                  <AlertDialog open={deleting} onOpenChange={setDeleting}>
                    <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Удалить запись «{draft.name}»?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Это не отменит подписку и не остановит списания у
                          провайдера.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>
                          Оставить запись
                        </AlertDialogCancel>
                        <Button
                          type="button"
                          disabled={saving}
                          className="min-h-11"
                          onClick={() => void save(true)}
                        >
                          Подтвердить удаление
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </fieldset>
              </form>
            </Card>
          )}
          <p className="text-sm text-site-muted">
            Редакция {data.revision} · Проверено на сайте:{' '}
            {new Date(data.checkedAt).toLocaleString('ru-RU')}. Напоминания
            отображаются здесь; email/SMS и автоматическое продление не
            подключены.
          </p>
        </>
      )}
    </section>
  );
}
