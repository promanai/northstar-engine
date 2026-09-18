export const analyticsDefaults = { enabled: false, retentionDays: 30 };
export const analyticsCleanupCron = '17 * * * *';
export const analyticsCleanupBatchSize = 2000;
export const analyticsCleanupMaxBatches = 5;

// Shared by scheduled, lazy and administrator-triggered cleanup. Only behavior
// events expire here; original conversations and business records are untouched.
export async function cleanupAnalyticsBatch(db: D1Database, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now <= 0)
    throw new Error('Invalid cleanup clock');
  const row = await db
    .prepare("SELECT value FROM site_documents WHERE key='analytics'")
    .first<{ value: string }>();
  const value = row
    ? analyticsSettings(JSON.parse(row.value))
    : analyticsDefaults;
  const cutoff = now - value.retentionDays * 86400000;
  const result = await db
    .prepare(
      `DELETE FROM analytics_events WHERE id IN (
      SELECT id FROM analytics_events WHERE created_at<? ORDER BY created_at,id LIMIT ${analyticsCleanupBatchSize}
    ) AND (SELECT value FROM site_documents WHERE key='analytics') IS ?`,
    )
    .bind(cutoff, row?.value ?? null)
    .run();
  // Guard the settings snapshot within the DELETE, so a concurrent increase in
  // retention cannot delete rows using an obsolete, shorter retention window.
  return { deleted: result.meta.changes, cutoff };
}

export async function cleanupAnalyticsScheduled(
  db: D1Database,
  now = Date.now(),
) {
  let deleted = 0,
    batches = 0;
  for (; batches < analyticsCleanupMaxBatches;) {
    const result = await cleanupAnalyticsBatch(db, now);
    deleted += result.deleted;
    batches++;
    if (result.deleted < analyticsCleanupBatchSize) break;
  }
  return {
    deleted,
    batches,
    limitReached:
      deleted === analyticsCleanupBatchSize * analyticsCleanupMaxBatches,
  };
}
export const analyticsActions = [
  'chat-send',
  'chat-new',
  'file-picker',
  'voice-open',
  'voice-start',
  'voice-end',
  'menu-open',
  'tab:chat',
  'tab:quick',
  'tab:modules',
  'tab:page',
  'account',
  'login',
];
export const analyticsCookie = 'northstar_analytics';
export const analyticsPreference = 'northstar.analytics.consent.v1';
export function analyticsSettings(value: Record<string, unknown>) {
  if (
    Object.keys(value).some((k) => !['enabled', 'retentionDays'].includes(k)) ||
    typeof value.enabled !== 'boolean' ||
    ![7, 30, 90].includes(Number(value.retentionDays)) ||
    typeof value.retentionDays !== 'number'
  )
    throw new Error('Ожидаются enabled и retentionDays (7, 30 или 90)');
  return { enabled: value.enabled, retentionDays: value.retentionDays };
}
export function analyticsPath(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value)
  )
    return null;
  let path: string;
  try {
    path = decodeURIComponent(value.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (path.startsWith('//')) return null;
  if (/^\/(?:admin|account|login|api|\.well-known)(?:\/|$)/i.test(path))
    return null;
  if (!/^\/[\p{L}\p{N}/_-]*$/u.test(path) || path.length > 200) return null;
  return path;
}
export function analyticsHost(value: unknown) {
  if (value === '' || value === undefined) return '';
  if (typeof value !== 'string' || value.length > 2048)
    throw new Error('Некорректный источник');
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password
      ? url.hostname.slice(0, 200)
      : '';
  } catch {
    return '';
  }
}
export function analyticsEvent(value: Record<string, unknown>) {
  if (
    Object.keys(value).some(
      (k) =>
        ![
          'id',
          'kind',
          'path',
          'target',
          'referrer',
          'device',
          'value',
        ].includes(k),
    )
  )
    throw new Error('Неизвестные поля события');
  if (typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id))
    throw new Error('Некорректный id');
  if (
    !['page_view', 'click', 'scroll', 'engagement'].includes(
      String(value.kind),
    ) ||
    typeof value.kind !== 'string'
  )
    throw new Error('Некорректное событие');
  const path = analyticsPath(value.path);
  if (!path) throw new Error('Страница не подлежит аналитике');
  if (
    !['mobile', 'tablet', 'desktop'].includes(String(value.device)) ||
    typeof value.device !== 'string'
  )
    throw new Error('Некорректный тип устройства');
  const target = value.target ?? '';
  if (
    typeof target !== 'string' ||
    target.length > 2048 ||
    (value.kind !== 'click' && target !== '')
  )
    throw new Error('Некорректная цель');
  if (
    value.kind === 'scroll'
      ? ![25, 50, 75, 100].includes(Number(value.value))
      : value.kind === 'engagement'
        ? value.value !== 15
        : value.value !== undefined
  )
    throw new Error('Некорректное значение');
  if (value.value !== undefined && typeof value.value !== 'number')
    throw new Error('Ожидается число');
  return {
    id: value.id,
    kind: value.kind,
    path,
    target,
    referrer: analyticsHost(value.referrer),
    device: value.device,
    value: Number(value.value ?? 0),
  };
}
export function analyticsRange(query: URLSearchParams, now = Date.now()) {
  const period = query.get('period') ?? '24h';
  let from: number,
    to = now;
  if (period === 'custom') {
    const parse = (value: string | null) => {
      if (
        !value ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(value)
      )
        return NaN;
      const time = Date.parse(value);
      const canonical =
        value.slice(0, -1) +
        (value.length === 17 ? ':00.000' : value.length === 20 ? '.000' : '') +
        'Z';
      return Number.isFinite(time) && new Date(time).toISOString() === canonical
        ? time
        : NaN;
    };
    from = parse(query.get('from'));
    to = parse(query.get('to'));
  } else {
    if (
      !['24h', '7d', '30d', '90d'].includes(period) ||
      query.has('from') ||
      query.has('to')
    )
      throw new Error('Некорректный период');
    from =
      now - { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[period]! * 86400000;
  }
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from < 0 ||
    from >= to ||
    to > now + 60000 ||
    to - from > 90 * 86400000
  )
    throw new Error('Период должен быть в прошлом и не более 90 дней');
  return { from, to, bucketMs: to - from <= 2 * 86400000 ? 3600000 : 86400000 };
}
