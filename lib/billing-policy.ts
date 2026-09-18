export const demoPlans = [
  { id: 'demo-start', name: 'Start' },
  { id: 'demo-basic', name: 'Basic' },
  { id: 'demo-plus', name: 'Plus' },
  { id: 'demo-pro', name: 'Pro' },
  { id: 'demo-business', name: 'Business' },
  { id: 'demo-enterprise', name: 'Enterprise' },
] as const;
export const billingKinds = {
  promanos: 'PromanOS AI',
  cloudflare: 'Cloudflare',
  domain: 'Домен',
  other: 'Другой сервис',
};
export const billingStatuses = {
  unknown: 'Не указано',
  active: 'Активна',
  trial: 'Пробный период',
  paused: 'Приостановлена',
  cancelled: 'Отменена',
};
export type BillingEntry = {
  id: string;
  kind: keyof typeof billingKinds;
  name: string;
  resource: string;
  plan: string;
  status: keyof typeof billingStatuses;
  currency: 'USD' | 'EUR' | 'RUB';
  fee: number | null;
  cycle: 'monthly' | 'yearly' | 'once';
  renewal: string;
  autoRenew: 'unknown' | 'on' | 'off';
  period: string;
  spent: number | null;
  budget: number | null;
  requests: number | null;
  requestLimit: number | null;
  notes: string;
};
export type BillingDocument = { entries: BillingEntry[] };
export function newBillingEntry(
  kind: BillingEntry['kind'],
  id: string,
): BillingEntry {
  return {
    id,
    kind,
    name: billingKinds[kind],
    resource: '',
    plan: '',
    status: 'unknown',
    currency: 'USD',
    fee: null,
    cycle: kind === 'domain' ? 'yearly' : 'monthly',
    renewal: '',
    autoRenew: 'unknown',
    period: '',
    spent: null,
    budget: null,
    requests: null,
    requestLimit: null,
    notes: '',
  };
}
export const defaultBilling: BillingDocument = {
  entries: [
    newBillingEntry('promanos', 'promanos'),
    newBillingEntry('cloudflare', 'cloudflare'),
    newBillingEntry('domain', 'domain'),
  ],
};
function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Ожидается объект');
  return raw as Record<string, unknown>;
}
function text(raw: unknown, max: number) {
  if (
    typeof raw !== 'string' ||
    raw.length > max ||
    /[\u0000-\u0008\u000b-\u001f\u007f]/.test(raw)
  )
    throw new Error('Некорректное текстовое поле');
  return raw.trim();
}
export function validateBilling(raw: unknown): BillingDocument {
  const doc = record(raw);
  if (
    Object.keys(doc).some((k) => k !== 'entries') ||
    !Array.isArray(doc.entries) ||
    doc.entries.length > 30
  )
    throw new Error('Можно сохранить до 30 подписок');
  const ids = new Set<string>();
  const entries = doc.entries.map((item) => {
    const row = record(item);
    if (
      Object.keys(row).some(
        (k) => !Object.hasOwn(defaultBilling.entries[0], k),
      ) ||
      Object.keys(defaultBilling.entries[0]).some((k) => !Object.hasOwn(row, k))
    )
      throw new Error('Неизвестные или пропущенные поля подписки');
    const id = text(row.id, 80);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id))
      throw new Error('Некорректный или повторный ID');
    ids.add(id);
    if (
      typeof row.kind !== 'string' ||
      !Object.hasOwn(billingKinds, row.kind) ||
      typeof row.status !== 'string' ||
      !Object.hasOwn(billingStatuses, row.status) ||
      !['USD', 'EUR', 'RUB'].includes(String(row.currency)) ||
      !['monthly', 'yearly', 'once'].includes(String(row.cycle)) ||
      !['unknown', 'on', 'off'].includes(String(row.autoRenew))
    )
      throw new Error('Некорректный тип, статус или период');
    const name = text(row.name, 100),
      resource = text(row.resource, 200),
      plan = text(row.plan, 100);
    if (!name) throw new Error('Укажите название');
    if (
      row.kind === 'promanos' &&
      plan &&
      !demoPlans.some((p) => p.id === plan)
    )
      throw new Error('Неизвестный демо-тариф');
    const renewal = text(row.renewal, 10),
      period = text(row.period, 7);
    if (
      renewal &&
      (!/^20\d{2}-\d{2}-\d{2}$/.test(renewal) ||
        !Number.isFinite(Date.parse(renewal + 'T00:00:00Z')) ||
        new Date(renewal + 'T00:00:00Z').toISOString().slice(0, 10) !== renewal)
    )
      throw new Error('Некорректная дата продления');
    if (period && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(period))
      throw new Error('Период расходов: YYYY-MM');
    const number = (key: string) => {
      const value = row[key];
      if (value === null) return null;
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 100000000000
      )
        throw new Error(
          'Суммы и счётчики должны быть неотрицательными целыми числами',
        );
      return value;
    };
    const spent = number('spent'),
      requests = number('requests');
    if ((spent !== null || requests !== null) && !period)
      throw new Error('Укажите месяц для расходов и запросов');
    return {
      id,
      kind: row.kind,
      name,
      resource,
      plan,
      status: row.status,
      currency: row.currency,
      fee: number('fee'),
      cycle: row.cycle,
      renewal,
      autoRenew: row.autoRenew,
      period,
      spent,
      budget: number('budget'),
      requests,
      requestLimit: number('requestLimit'),
      notes: text(row.notes, 1000),
    } as BillingEntry;
  });
  return { entries };
}
export function billingAlerts(entry: BillingEntry, today: string) {
  if (entry.status === 'cancelled' || entry.status === 'paused') return [];
  const alerts: string[] = [];
  if (entry.renewal) {
    const days = Math.round(
      (Date.parse(entry.renewal + 'T00:00:00Z') -
        Date.parse(today + 'T00:00:00Z')) /
        86400000,
    );
    if (days < 0) alerts.push('Дата продления прошла — проверьте статус');
    else if (days === 0) alerts.push('Продление сегодня');
    else if (days <= 30) alerts.push('Продление через ' + days + ' дн.');
  } else alerts.push('Дата продления не указана');
  if (entry.period === today.slice(0, 7)) {
    if (
      entry.budget !== null &&
      entry.spent !== null &&
      entry.spent >= entry.budget
    )
      alerts.push('Достигнут бюджет расходов');
    if (
      entry.requestLimit !== null &&
      entry.requests !== null &&
      entry.requests >= entry.requestLimit
    )
      alerts.push('Достигнут лимит запросов');
  } else if (entry.spent !== null || entry.requests !== null)
    alerts.push('Данные расхода за другой месяц');
  return alerts;
}
export function monthlyFees(entries: BillingEntry[]) {
  const totals: Partial<Record<BillingEntry['currency'], number>> = {};
  for (const e of entries) {
    if (e.status !== 'active' || e.fee === null || e.cycle === 'once') continue;
    totals[e.currency] =
      (totals[e.currency] ?? 0) + (e.cycle === 'yearly' ? e.fee / 12 : e.fee);
  }
  return totals;
}
