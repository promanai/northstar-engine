'use client';
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Ranking = { label: string; count: number };
type Report = {
  settings: {
    revision: number;
    value: { enabled: boolean; retentionDays: number };
  };
  range: { from: number; to: number; effectiveFrom: number; bucketMs: number };
  summary: {
    events: number;
    visits: number;
    customers: number;
    pageViews: number | null;
    clicks: number | null;
    activeSeconds: number | null;
    chattingVisits: number;
  };
  chatTotals: { prompts: number; conversations: number };
  timeline: { time: number; views: number; clicks: number; visits: number }[];
  pages: Ranking[];
  sources: Ranking[];
  devices: Ranking[];
  targets: { path: string; target: string; count: number }[];
  visits: {
    id: string;
    startedAt: number;
    lastAt: number;
    events: number;
    userId: string | null;
  }[];
  visitsNext: string | null;
  chats: { id: string; lastAt: number; prompts: number }[];
  chatsNext: string | null;
};
type VisitEvent = {
  id: string;
  kind: string;
  path: string;
  target: string;
  referrer: string;
  device: string;
  value: number;
  userId: string | null;
  conversationId: string | null;
  createdAt: number;
};
type Thread = {
  conversation: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  messages: {
    id: string;
    role: string;
    content: string;
    model: string | null;
    createdAt: number;
  }[];
  nextBefore: string | null;
};
const date = (value: number) => new Date(value).toLocaleString('ru-RU');
const snapshotQuery = (data: Report) =>
  `?period=custom&from=${encodeURIComponent(new Date(data.range.from).toISOString())}&to=${encodeURIComponent(new Date(data.range.to).toISOString())}`;
const labels: Record<string, string> = {
  page_view: 'Просмотр',
  click: 'Клик',
  scroll: 'Прокрутка',
  engagement: 'Видимая вкладка',
  chat_turn: 'Сообщение в чат',
  'chat-send': 'Отправить в чат',
  'chat-new': 'Новый диалог',
  'file-picker': 'Выбрать файл',
  'voice-open': 'Открыть звонок',
  'voice-start': 'Начать звонок',
  'voice-end': 'Завершить звонок',
  'menu-open': 'Меню',
  'tab:chat': 'Вкладка «Чат»',
  'tab:quick': 'Вкладка «О сервисе»',
  'tab:modules': 'Вкладка «Возможности»',
  'tab:page': 'Вкладка страницы',
  account: 'Личный кабинет',
  login: 'Вход',
  'other-link': 'Другая ссылка',
  mobile: 'Узкое окно (<768px)',
  tablet: 'Среднее окно (768–1023px)',
  desktop: 'Широкое окно (от 1024px)',
};
async function api<T>(query: string, body?: object): Promise<T> {
  const response = await fetch(`/api/analytics${query}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    ...(body
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? 'Не удалось загрузить аналитику');
  return data as T;
}
function RankingCard({ title, rows }: { title: string; rows: Ranking[] }) {
  return (
    <section className="min-w-0 rounded-2xl border border-site-line p-4">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {!rows.length && <p className="text-sm text-site-muted">Нет данных</p>}
      <ol className="max-h-72 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex min-w-0 justify-between gap-3 text-sm"
          >
            <span className="break-all">
              {labels[row.label] ?? (row.label || 'Прямой / не указан')}
            </span>
            <span className="shrink-0 tabular-nums">{row.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function exportCsv(report: Report) {
  const lines: string[] = [];
  const addLine = (...cells: (string | number)[]) => {
    lines.push(
      cells
        .map((cell) => {
          const s = String(cell ?? '');
          return s.includes(';') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(';'),
    );
  };

  addLine('ОТЧЁТ АНАЛИТИКИ САЙТА');
  addLine('Период с', new Date(report.range.from).toLocaleString('ru-RU'));
  addLine('Период по', new Date(report.range.to).toLocaleString('ru-RU'));
  addLine('Статус сбора', report.settings.value.enabled ? 'Включён' : 'Выключен');
  addLine('');

  addLine('СВОДНЫЕ ПОКАЗАТЕЛИ');
  addLine('Показатель', 'Значение');
  addLine('Сеансы браузера', report.summary.visits);
  addLine('Просмотры страниц', report.summary.pageViews ?? 0);
  addLine('Клики', report.summary.clicks ?? 0);
  addLine('Клиенты с входом', report.summary.customers);
  addLine('Сохранённые диалоги', report.chatTotals.conversations);
  addLine('Сообщения пользователей', report.chatTotals.prompts);
  addLine('Сеансы с ответом чата', report.summary.chattingVisits);
  addLine('Минуты активной вкладки', Math.round((report.summary.activeSeconds ?? 0) / 60));
  addLine('');

  const visits = report.summary.visits || 0;
  const pageViews = report.summary.pageViews ?? 0;
  const chatVisits = report.summary.chattingVisits || 0;
  const clicks = report.summary.clicks ?? 0;
  addLine('ВОРОНКА КОНВЕРСИЙ');
  addLine('Этап', 'Количество', '% от визитов');
  addLine('1. Все визиты', visits, '100%');
  addLine('2. Просмотры страниц', pageViews, visits ? `${Math.min(100, Math.round((pageViews / visits) * 100))}%` : '0%');
  addLine('3. Диалог с AI', chatVisits, visits ? `${Math.round((chatVisits / visits) * 100)}%` : '0%');
  addLine('4. Целевые клики', clicks, visits ? `${Math.round((clicks / visits) * 100)}%` : '0%');
  addLine('');

  if (report.timeline.length > 0) {
    addLine('ДИНАМИКА ПО ВРЕМЕНИ');
    addLine('Время', 'Сеансы', 'Просмотры', 'Клики');
    for (const t of report.timeline) {
      addLine(new Date(t.time).toLocaleString('ru-RU'), t.visits, t.views, t.clicks);
    }
    addLine('');
  }

  if (report.pages.length > 0) {
    addLine('ПОПУЛЯРНЫЕ СТРАНИЦЫ');
    addLine('Страница', 'Просмотры');
    for (const p of report.pages) {
      addLine(p.label, p.count);
    }
    addLine('');
  }

  if (report.sources.length > 0) {
    addLine('ИСТОЧНИКИ ПЕРЕХОДОВ');
    addLine('Источник', 'Переходы');
    for (const s of report.sources) {
      addLine(labels[s.label] ?? s.label, s.count);
    }
    addLine('');
  }

  if (report.devices.length > 0) {
    addLine('УСТРОЙСТВА');
    addLine('Устройство', 'Количество');
    for (const d of report.devices) {
      addLine(labels[d.label] ?? d.label, d.count);
    }
    addLine('');
  }

  if (report.targets.length > 0) {
    addLine('ЦЕЛЕВЫЕ ДЕЙСТВИЯ И КЛИКИ');
    addLine('Страница', 'Элемент', 'Клики');
    for (const tg of report.targets) {
      addLine(tg.path, labels[tg.target] ?? tg.target, tg.count);
    }
  }

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fromStr = new Date(report.range.from).toISOString().slice(0, 10);
  const toStr = new Date(report.range.to).toISOString().slice(0, 10);
  a.download = `analytics-${fromStr}_${toStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ConversionFunnel({ report }: { report: Report }) {
  const visits = report.summary.visits || 0;
  const pageViews = report.summary.pageViews ?? 0;
  const chatVisits = report.summary.chattingVisits || 0;
  const clicks = report.summary.clicks ?? 0;

  const steps = [
    {
      title: '1. Все визиты',
      desc: 'Посетители, зашедшие на сайт',
      count: visits,
      pctOfBase: 100,
      pctOfPrev: 100,
      color: 'bg-blue-500',
    },
    {
      title: '2. Просмотры страниц',
      desc: 'Изучение услуг и каталога',
      count: pageViews,
      pctOfBase: visits > 0 ? Math.min(100, Math.round((pageViews / visits) * 100)) : 0,
      pctOfPrev: visits > 0 ? Math.min(100, Math.round((pageViews / visits) * 100)) : 0,
      color: 'bg-indigo-500',
    },
    {
      title: '3. Диалог с AI',
      desc: 'Вопросы в чате и консультации',
      count: chatVisits,
      pctOfBase: visits > 0 ? Math.round((chatVisits / visits) * 100) : 0,
      pctOfPrev:
        pageViews > 0
          ? Math.min(100, Math.round((chatVisits / pageViews) * 100))
          : visits > 0
            ? Math.round((chatVisits / visits) * 100)
            : 0,
      color: 'bg-violet-500',
    },
    {
      title: '4. Целевые клики',
      desc: 'Запись на приём, заказ, телефон',
      count: clicks,
      pctOfBase: visits > 0 ? Math.round((clicks / visits) * 100) : 0,
      pctOfPrev:
        chatVisits > 0
          ? Math.min(100, Math.round((clicks / chatVisits) * 100))
          : visits > 0
            ? Math.round((clicks / visits) * 100)
            : 0,
      color: 'bg-emerald-500',
    },
  ];

  return (
    <section className="rounded-2xl border border-site-line bg-site-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Воронка конверсий</h3>
        <span className="text-xs text-site-muted">Конверсия от первого касания к целевому действию</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, idx) => (
          <div
            key={step.title}
            className="flex flex-col justify-between rounded-xl border border-site-line bg-site-page p-3.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-site-muted">{step.title}</span>
                {idx > 0 && (
                  <span className="rounded bg-site-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-site-muted">
                    {step.pctOfPrev}% от пред.
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{step.count}</p>
              <p className="mt-1 text-xs text-site-muted">{step.desc}</p>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-site-muted">
                <span>Доля от всех визитов</span>
                <span className="font-semibold text-site-primary">{step.pctOfBase}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-site-surface">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${step.color}`}
                  style={{ width: `${Math.max(2, Math.min(100, step.pctOfBase))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsDashboard() {
  const [report, setReport] = useState<Report | null>(null),
    [period, setPeriod] = useState('24h');
  const [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [query, setQuery] = useState('?period=24h');
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [days, setDays] = useState(30);
  const [visit, setVisit] = useState<{
    id: string;
    events: VisitEvent[];
    nextBefore: string | null;
  } | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    void api<Report>('?period=24h')
      .then((data) => {
        if (active) {
          setReport(data);
          setQuery(snapshotQuery(data));
          setDays(data.settings.value.retentionDays);
        }
      })
      .catch((cause) => {
        if (active) setError(String(cause.message));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Операция не выполнена',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reload() {
    void run(async () => {
      let next = `?period=${period}`;
      if (period === 'custom') {
        const start = new Date(from),
          end = new Date(to);
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime())
        )
          throw new Error('Укажите начало и конец периода');
        next += `&from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`;
      }
      const data = await api<Report>(next);
      setReport(data);
      setDays(data.settings.value.retentionDays);
      setQuery(snapshotQuery(data));
      setVisit(null);
      setThread(null);
    });
  }
  function openVisit(id: string, older = false) {
    void run(async () => {
      const data = await api<{
        events: VisitEvent[];
        nextBefore: string | null;
      }>(
        `${query}&visitor=${id}${older && visit?.nextBefore ? `&before=${visit.nextBefore}` : ''}`,
      );
      setVisit((old) => ({
        id,
        ...data,
        events:
          older && old?.id === id
            ? [...data.events, ...old.events]
            : data.events,
      }));
      setThread(null);
    });
  }
  function openThread(id: string, older = false) {
    void run(async () => {
      const data = await api<Thread>(
        `${query}&conversation=${id}${older && thread?.nextBefore ? `&before=${thread.nextBefore}` : ''}`,
      );
      setThread((old) => ({
        ...data,
        messages:
          older && old?.conversation.id === id
            ? [...data.messages, ...old.messages]
            : data.messages,
      }));
    });
  }
  function more(kind: 'visits' | 'chats') {
    void run(async () => {
      const cursor = report?.[kind === 'visits' ? 'visitsNext' : 'chatsNext'];
      if (!cursor) return;
      const data = await api<Report>(`${query}&${kind}Before=${cursor}`);
      setReport((old) =>
        old
          ? {
              ...old,
              [kind]: [...old[kind], ...data[kind]],
              [kind === 'visits' ? 'visitsNext' : 'chatsNext']:
                data[kind === 'visits' ? 'visitsNext' : 'chatsNext'],
            }
          : data,
      );
    });
  }
  function settings(enabled: boolean) {
    void run(async () => {
      if (!report) return;
      const saved = await api<Report['settings']>('', {
        revision: report.settings.revision,
        value: { enabled, retentionDays: days },
        confirm: true,
      });
      setReport((old) => (old ? { ...old, settings: saved } : old));
      setNotice(
        'Настройки сохранены. Посетитель должен отдельно разрешить сбор.',
      );
    });
  }
  return (
    <div className="mt-6 min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            reload();
          }}
        >
          <div>
            <p id="analytics-period-label" className="mb-2 text-sm">
              Период
            </p>
            <Select
              value={period}
              onValueChange={(value) => {
                if (value) setPeriod(value);
              }}
              disabled={busy}
            >
              <SelectTrigger
                aria-labelledby="analytics-period-label"
                className="min-h-11 min-w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  ['24h', '24 часа'],
                  ['7d', '7 дней'],
                  ['30d', '30 дней'],
                  ['90d', '90 дней'],
                  ['custom', 'Свой период'],
                ].map(([id, title]) => (
                  <SelectItem key={id} value={id}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {period === 'custom' && (
            <>
              <label htmlFor="analytics-from" className="min-w-0 text-sm">
                С
                <Input
                  id="analytics-from"
                  type="datetime-local"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-2 min-h-11"
                  required
                />
              </label>
              <label htmlFor="analytics-to" className="min-w-0 text-sm">
                По
                <Input
                  id="analytics-to"
                  type="datetime-local"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-2 min-h-11"
                  required
                />
              </label>
            </>
          )}
          <Button type="submit" disabled={busy} className="min-h-11">
            {busy ? 'Загрузка…' : 'Показать'}
          </Button>
        </form>

        {report && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                report.settings.value.enabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  report.settings.value.enabled ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {report.settings.value.enabled ? 'Сбор активен' : 'Сбор выключен'}
            </div>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => exportCsv(report)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Экспорт в CSV
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-site-line p-4 text-base"
        >
          {error}
        </p>
      )}
      {notice && <output className="block text-sm">{notice}</output>}
      {report && (
        <>
          <p className="text-sm text-site-muted">
            {date(report.range.from)} — {date(report.range.to)} · Часовой пояс:{' '}
            {new Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
          <section className="rounded-2xl border border-site-line bg-site-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Сбор поведения{' '}
                {report.settings.value.enabled ? 'включён' : 'выключен'}
              </h2>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => settings(!report.settings.value.enabled)}
              >
                {report.settings.value.enabled
                  ? 'Отключить сбор'
                  : 'Включить сбор'}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <p id="analytics-retention-label" className="mb-2 text-sm">
                  Хранить события
                </p>
                <Select
                  value={String(days)}
                  onValueChange={(value) => setDays(Number(value))}
                  disabled={busy}
                >
                  <SelectTrigger
                    aria-labelledby="analytics-retention-label"
                    className="min-h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[7, 30, 90].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} дней
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={busy || days === report.settings.value.retentionDays}
                className="min-h-11"
                onClick={() => settings(report.settings.value.enabled)}
              >
                Применить срок хранения
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                className="min-h-11"
                onClick={() =>
                  void run(async () => {
                    const result = await api<{ deleted: number }>('', {
                      action: 'cleanup',
                      confirm: true,
                    });
                    setNotice(
                      `Удалено просроченных событий: ${result.deleted}. При большом архиве повторите очистку.`,
                    );
                  })
                }
              >
                Удалить просроченные события
              </Button>
            </div>
            <p className="mt-3 text-sm leading-6 text-site-muted">
              Только согласившиеся посетители, без администратора, приватных
              страниц, паролей и полей форм. DNT/GPC отключают сбор. До 10 000
              событий в сутки на сайт. Снижение срока безвозвратно удаляет
              старые события при следующем сборе или открытии отчёта; диалоги
              чата хранятся отдельно.
            </p>
          </section>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ['Сеансы браузера', report.summary.visits],
              ['Просмотры страниц', report.summary.pageViews ?? 0],
              ['Клики', report.summary.clicks ?? 0],
              ['Клиенты с входом', report.summary.customers],
              ['Сохранённые диалоги', report.chatTotals.conversations],
              ['Сообщения пользователей', report.chatTotals.prompts],
              ['Сеансы с ответом чата', report.summary.chattingVisits],
              [
                'Минуты видимой вкладки',
                Math.round((report.summary.activeSeconds ?? 0) / 60),
              ],
            ].map(([title, value]) => (
              <div
                key={title}
                className="min-w-0 rounded-2xl border border-site-line bg-site-surface p-4"
              >
                <p className="text-sm leading-6 text-site-muted">{title}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-6 text-site-muted">
            Сеанс — браузерная cookie с 30 минутами без событий, не уникальный
            человек. Метрики чата включают сохранённые сообщения независимо от
            согласия на аналитику, включая демо. События поведения доступны с{' '}
            {date(report.range.effectiveFrom)}; за более раннее время они могут
            быть уже удалены.
          </p>
          <ConversionFunnel report={report} />
          <section className="rounded-2xl border border-site-line p-4">
            <h3 className="mb-3 text-lg font-semibold">
              Динамика{' '}
              {report.range.bucketMs === 3600000 ? 'по часам' : 'по дням'}
            </h3>
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead>Сеансы</TableHead>
                    <TableHead>Просмотры</TableHead>
                    <TableHead>Клики</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.timeline.map((row) => (
                    <TableRow key={row.time}>
                      <TableCell>{date(row.time)}</TableCell>
                      <TableCell>{row.visits}</TableCell>
                      <TableCell>{row.views}</TableCell>
                      <TableCell>{row.clicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!report.timeline.length && (
              <p className="text-sm text-site-muted">За период нет событий</p>
            )}
            <p className="mt-2 text-sm text-site-muted">
              Пустые интервалы не показаны. Один сеанс может присутствовать в
              нескольких интервалах.
            </p>
          </section>
          <div className="grid gap-4 md:grid-cols-3">
            <RankingCard
              title="Страницы · топ-20 просмотров"
              rows={report.pages}
            />
            <RankingCard
              title="Источники · топ-20 сеансов"
              rows={report.sources}
            />
            <RankingCard title="Размер окна · сеансы" rows={report.devices} />
          </div>
          <section className="rounded-2xl border border-site-line p-4">
            <h3 className="mb-3 text-lg font-semibold">
              Откуда и куда кликают · топ-30
            </h3>
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Страница</TableHead>
                    <TableHead>Цель</TableHead>
                    <TableHead>Клики</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.targets.map((row) => (
                    <TableRow key={`${row.path}:${row.target}`}>
                      <TableCell className="break-all whitespace-normal">
                        {row.path}
                      </TableCell>
                      <TableCell className="break-all whitespace-normal">
                        {labels[row.target] ?? row.target}
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-site-line p-4">
              <h3 className="mb-3 text-lg font-semibold">Посещения</h3>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {report.visits.map((row) => (
                  <Button
                    key={row.id}
                    variant="outline"
                    disabled={busy}
                    className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal text-left"
                    onClick={() => openVisit(row.id)}
                  >
                    <span>
                      {date(row.startedAt)} · {row.userId ? 'Клиент' : 'Гость'}
                      <span className="block text-xs text-site-muted">
                        {row.id.slice(0, 10)}
                      </span>
                    </span>
                    <span>{row.events} событий</span>
                  </Button>
                ))}
              </div>
              {!report.visits.length && (
                <p className="text-sm text-site-muted">
                  Нет записанных посещений
                </p>
              )}
              {report.visitsNext && (
                <Button
                  className="mt-3 min-h-11"
                  disabled={busy}
                  onClick={() => more('visits')}
                >
                  Ещё посещения
                </Button>
              )}
            </section>
            <section className="min-w-0 rounded-2xl border border-site-line p-4">
              <h3 className="mb-3 text-lg font-semibold">
                Что писали ассистенту
              </h3>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {report.chats.map((row) => (
                  <Button
                    key={row.id}
                    variant="outline"
                    disabled={busy}
                    className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal text-left"
                    onClick={() => openThread(row.id)}
                  >
                    <span>
                      {date(row.lastAt * 1000)}
                      <span className="block text-xs text-site-muted">
                        {row.id.slice(0, 10)}
                      </span>
                    </span>
                    <span>{row.prompts} сообщений</span>
                  </Button>
                ))}
              </div>
              {!report.chats.length && (
                <p className="text-sm text-site-muted">
                  Сохранённых сообщений за период нет
                </p>
              )}
              {report.chatsNext && (
                <Button
                  className="mt-3 min-h-11"
                  disabled={busy}
                  onClick={() => more('chats')}
                >
                  Ещё диалоги
                </Button>
              )}
            </section>
          </div>
          {visit && (
            <section className="rounded-2xl border border-site-line p-4">
              <h3 className="mb-3 text-lg font-semibold">
                Путь посетителя · {visit.id.slice(0, 10)}
              </h3>
              {visit.nextBefore && (
                <Button
                  disabled={busy}
                  variant="outline"
                  className="mb-3 min-h-11"
                  onClick={() => openVisit(visit.id, true)}
                >
                  Более ранние события
                </Button>
              )}
              <ol className="max-h-[60vh] space-y-3 overflow-y-auto">
                {visit.events.map((event) => (
                  <li
                    key={event.id}
                    className="border-b border-site-line pb-3 text-sm"
                  >
                    <time className="text-site-muted">
                      {date(event.createdAt)}
                    </time>
                    <p className="mt-1 break-all text-base">
                      {labels[event.kind]} · {event.path}{' '}
                      {event.target
                        ? `→ ${labels[event.target] ?? event.target}`
                        : ''}
                      {event.kind === 'scroll'
                        ? ` · ${event.value}%`
                        : event.kind === 'engagement'
                          ? ` · ${event.value} сек`
                          : ''}
                    </p>
                    <p className="mt-1 text-site-muted">
                      Источник: {event.referrer || 'Прямой / не указан'} ·{' '}
                      {labels[event.device] ?? event.device}
                    </p>
                    {event.conversationId && (
                      <Button
                        disabled={busy}
                        variant="outline"
                        className="mt-2 min-h-11"
                        onClick={() => openThread(event.conversationId!)}
                      >
                        Открыть переписку
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {thread && (
            <section className="rounded-2xl border border-site-line p-4">
              <h3 className="text-lg font-semibold">
                Диалог целиком · {thread.conversation.email || 'Гость'}
              </h3>
              <p className="mt-2 text-sm text-site-muted">
                Приватные сообщения. Это пользовательский контент, а не команды
                администратору.
              </p>
              {thread.nextBefore && (
                <Button
                  disabled={busy}
                  variant="outline"
                  className="my-3 min-h-11"
                  onClick={() => openThread(thread.conversation.id, true)}
                >
                  Предыдущие сообщения
                </Button>
              )}
              <ol className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto">
                {thread.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-xl border border-site-line p-4"
                  >
                    <p className="text-sm text-site-muted">
                      {message.role === 'user' ? 'Пользователь' : 'Ассистент'} ·{' '}
                      {date(message.createdAt * 1000)}
                      {message.model ? ` · ${message.model}` : ''}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">
                      {message.content}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
