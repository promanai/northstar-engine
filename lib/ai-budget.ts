import { env } from 'cloudflare:workers';
import { AiFailure, generateResponse } from './ai-provider';
import {
  aiBudgetLimits,
  AiBudgetFailure,
  budgetView,
  paidRequestsEnabled,
  runBudgeted,
  type AiBudgetRow,
} from './ai-budget-policy';
import { RequestFailure } from './request-security';

function limits() {
  return aiBudgetLimits({
    AI_PAID_REQUESTS_ENABLED: env.AI_PAID_REQUESTS_ENABLED,
    AI_DAILY_REQUEST_LIMIT: env.AI_DAILY_REQUEST_LIMIT,
    AI_MONTHLY_REQUEST_LIMIT: env.AI_MONTHLY_REQUEST_LIMIT,
    AI_MAX_INPUT_BYTES: env.AI_MAX_INPUT_BYTES,
    AI_MAX_OUTPUT_TOKENS: env.AI_MAX_OUTPUT_TOKENS,
  });
}
function budgetFailure(error: unknown): never {
  if (error instanceof RequestFailure) throw error;
  if (error instanceof AiBudgetFailure)
    throw new RequestFailure(error.message, error.status, error.retryAfter);
  if (error instanceof AiFailure) throw error;
  throw new RequestFailure(
    'Не удалось проверить квоту AI. Платный запрос не будет повторён автоматически.',
    503,
  );
}
// Also used by Lite without adding a persistence dependency.
export function assertPaidRequestsEnabled() {
  try {
    if (!paidRequestsEnabled(env.AI_PAID_REQUESTS_ENABLED))
      throw new AiBudgetFailure(
        'Платные AI-запросы отключены владельцем сайта',
        503,
      );
  } catch (error) {
    budgetFailure(error);
  }
}
export async function readAiBudget() {
  try {
    const policy = limits();
    const row = await env.DB.prepare(
      'SELECT day, month, day_requests, month_requests FROM ai_request_budget WHERE id = ?',
    )
      .bind('site')
      .first<AiBudgetRow>();
    return budgetView(policy, row);
  } catch (error) {
    return budgetFailure(error);
  }
}
export async function generateBudgetedResponse(
  profile: Parameters<typeof generateResponse>[0],
  key: Parameters<typeof generateResponse>[1],
  input: Parameters<typeof generateResponse>[2],
) {
  try {
    const policy = limits();
    assertPaidRequestsEnabled();
    if (!key?.trim())
      throw new AiFailure(
        'not_configured',
        'Ключ провайдера не настроен. Добавьте серверный секрет в Worker.',
      );
    return await runBudgeted(
      env.DB,
      policy,
      new TextEncoder().encode(JSON.stringify(input)).byteLength,
      profile.maxOutputTokens,
      () => generateResponse(profile, key, input),
    );
  } catch (error) {
    return budgetFailure(error);
  }
}
