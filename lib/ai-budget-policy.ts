// Server-authoritative request quotas, NOT token accounting or a billing limit.
export type AiBudgetLimits = {
  enabled: boolean;
  dailyRequests: number;
  monthlyRequests: number;
  maxInputBytes: number;
  maxOutputTokens: number;
};
export class AiBudgetFailure extends Error {
  status: number;
  retryAfter?: number;
  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function paidRequestsEnabled(value: string | undefined) {
  if (value === undefined || value === 'true') return true;
  if (value === 'false') return false;
  throw new AiBudgetFailure(
    'Некорректная настройка включения платных AI-запросов',
    503,
  );
}
export function aiBudgetLimits(
  values: Record<string, string | undefined>,
): AiBudgetLimits {
  function integer(key: string, fallback: number, min: number, max: number) {
    const raw = values[key];
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    )
      throw new AiBudgetFailure(`Некорректная настройка ${key}`, 503);
    return value;
  }
  return {
    enabled: paidRequestsEnabled(values.AI_PAID_REQUESTS_ENABLED),
    dailyRequests: integer('AI_DAILY_REQUEST_LIMIT', 100, 0, 1_000_000),
    monthlyRequests: integer('AI_MONTHLY_REQUEST_LIMIT', 1000, 0, 10_000_000),
    maxInputBytes: integer('AI_MAX_INPUT_BYTES', 131072, 1024, 4_000_000),
    maxOutputTokens: integer('AI_MAX_OUTPUT_TOKENS', 4096, 128, 32768),
  };
}
export function budgetWindows(now = new Date()) {
  const iso = now.toISOString();
  return {
    day: iso.slice(0, 10),
    month: iso.slice(0, 7),
    dayReset: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    ).toISOString(),
    monthReset: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString(),
  };
}
export type AiBudgetRow = {
  day: string;
  month: string;
  day_requests: number;
  month_requests: number;
};
export function budgetView(
  limits: AiBudgetLimits,
  row: AiBudgetRow | null,
  now = new Date(),
) {
  const window = budgetWindows(now);
  const dailyUsed = row && row.day >= window.day ? row.day_requests : 0;
  const monthlyUsed = row && row.month >= window.month ? row.month_requests : 0;
  return {
    ...limits,
    scope: 'site' as const,
    accounting: 'reserved_attempts' as const,
    daily: {
      period: window.day,
      used: dailyUsed,
      remaining: Math.max(0, limits.dailyRequests - dailyUsed),
      resetsAt: window.dayReset,
    },
    monthly: {
      period: window.month,
      used: monthlyUsed,
      remaining: Math.max(0, limits.monthlyRequests - monthlyUsed),
      resetsAt: window.monthReset,
    },
  };
}
export type AiBudgetView = ReturnType<typeof budgetView>;

// One row and one atomic statement: neither parallel requests nor separate
// provider/task settings can spend the last slot twice. No cron/reset job.
export const reserveBudgetSql = `INSERT INTO ai_request_budget
  (id, day, month, day_requests, month_requests) VALUES ('site', ?, ?, 1, 1)
  ON CONFLICT(id) DO UPDATE SET
    day = excluded.day, month = excluded.month,
    day_requests = CASE WHEN day = excluded.day THEN day_requests + 1 ELSE 1 END,
    month_requests = CASE WHEN month = excluded.month THEN month_requests + 1 ELSE 1 END
  WHERE day <= excluded.day AND month <= excluded.month
    AND (day < excluded.day OR day_requests < ?)
    AND (month < excluded.month OR month_requests < ?)
  RETURNING day, month, day_requests, month_requests`;

export async function runBudgeted<T>(
  db: Pick<D1Database, 'prepare'>,
  limits: AiBudgetLimits,
  inputBytes: number,
  outputTokens: number,
  run: () => Promise<T>,
  now = new Date(),
): Promise<T> {
  if (!limits.enabled)
    throw new AiBudgetFailure(
      'Платные AI-запросы отключены владельцем сайта',
      503,
    );
  if (
    !Number.isSafeInteger(inputBytes) ||
    inputBytes < 0 ||
    inputBytes > limits.maxInputBytes
  )
    throw new AiBudgetFailure(
      'Контекст AI слишком большой. Начните новый диалог или сократите контекст сайта.',
      413,
    );
  if (
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 128 ||
    outputTokens > limits.maxOutputTokens
  )
    throw new AiBudgetFailure(
      'Лимит ответа модели превышает общий потолок сайта. Уменьшите его в настройках AI.',
      400,
    );
  const window = budgetWindows(now);
  const retry = (reset: string) =>
    Math.max(1, Math.ceil((Date.parse(reset) - now.getTime()) / 1000));
  if (!limits.monthlyRequests || !limits.dailyRequests)
    throw new AiBudgetFailure(
      'Квота AI-запросов сайта исчерпана',
      429,
      retry(!limits.monthlyRequests ? window.monthReset : window.dayReset),
    );
  const row = await db
    .prepare(reserveBudgetSql)
    .bind(
      window.day,
      window.month,
      limits.dailyRequests,
      limits.monthlyRequests,
    )
    .first<AiBudgetRow>();
  if (!row) {
    const current = await db
      .prepare(
        'SELECT day, month, day_requests, month_requests FROM ai_request_budget WHERE id = ?',
      )
      .bind('site')
      .first<AiBudgetRow>();
    const monthly =
      current &&
      current.month >= window.month &&
      current.month_requests >= limits.monthlyRequests;
    throw new AiBudgetFailure(
      'Квота AI-запросов сайта исчерпана. Попробуйте после её обновления.',
      429,
      retry(monthly ? window.monthReset : window.dayReset),
    );
  }
  // Never refund: a timeout/connection failure may still have been billed.
  // A crash after reservation conservatively consumes the attempt as well.
  return run();
}
