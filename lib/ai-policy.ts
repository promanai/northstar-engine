// Shared, credential-free validation for the admin UI and Worker adapters.
import type { AiBudgetView } from './ai-budget-policy';
export type AiProvider = 'openai' | 'xai';
export type AiTask = 'chat' | 'text';
export type AiProfile = {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  reasoning: string;
  temperature: number | null;
  maxOutputTokens: number;
  timeoutSeconds: number;
};
export type AiConfig = Record<AiTask, AiProfile>;
export type AiView = {
  budget?: AiBudgetView;
  config: AiConfig;
  revision: number;
  source: 'saved' | 'environment';
  credentials: Record<AiProvider, boolean>;
};
export const providerNames = { openai: 'OpenAI', xai: 'xAI' };
export const taskNames = { chat: 'Консультант', text: 'Генерация текстов' };
export const suggestedModels: Record<AiProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5.6-luna', 'gpt-6-astra'],
  xai: ['grok-4.6', 'grok-4.5'],
};
export function isProvider(value: unknown): value is AiProvider {
  return value === 'openai' || value === 'xai';
}
export function isTask(value: unknown): value is AiTask {
  return value === 'chat' || value === 'text';
}
export function defaultProfile(provider: AiProvider = 'openai'): AiProfile {
  return {
    enabled: false,
    provider,
    model: suggestedModels[provider][0],
    reasoning: 'auto',
    temperature: null,
    maxOutputTokens: 4096,
    timeoutSeconds: 60,
  };
}
// Intentionally conservative: unknown/special-purpose models use API defaults.
// Update this matrix when adding a documented model family, not from untrusted /models metadata.
export function modelCapabilities(provider: AiProvider, model: string) {
  let efforts: string[] = [];
  let temperature = false;
  if (provider === 'openai') {
    if (/^gpt-6-astra(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
      efforts = ['low', 'medium', 'high', 'xhigh', 'max'];
    if (/^gpt-5\.6-luna(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
      efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
    if (
      /^gpt-4(?:o(?:-mini)?|\.1(?:-mini|-nano)?)(?:-\d{4}-\d{2}-\d{2})?$/.test(
        model,
      )
    )
      temperature = true;
  } else {
    if (/^grok-4\.6(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
      efforts = ['low', 'medium', 'high', 'xhigh'];
    if (/^grok-4\.5(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
      efforts = ['low', 'medium', 'high'];
  }
  return { efforts: ['auto', ...efforts], temperature };
}
export function validateProfile(value: unknown): AiProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Требуются настройки модели');
  const p = value as Record<string, unknown>;
  const keys = Object.keys(defaultProfile());
  if (Object.keys(p).some((key) => !keys.includes(key)))
    throw new Error(
      'Неизвестное поле настроек. Ключи API задаются только в секретах Worker.',
    );
  if (typeof p.enabled !== 'boolean' || !isProvider(p.provider))
    throw new Error('Некорректный провайдер или состояние');
  if (
    typeof p.model !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(p.model)
  )
    throw new Error('Укажите ID модели (до 128 символов)');
  const caps = modelCapabilities(p.provider, p.model);
  if (typeof p.reasoning !== 'string' || !caps.efforts.includes(p.reasoning))
    throw new Error(
      'Этот уровень рассуждения не поддерживается выбранной моделью',
    );
  if (
    p.temperature !== null &&
    (typeof p.temperature !== 'number' ||
      !Number.isFinite(p.temperature) ||
      p.temperature < 0 ||
      p.temperature > 2 ||
      !caps.temperature)
  )
    throw new Error(
      'Для этой модели оставьте температуру по умолчанию либо укажите допустимое значение 0–2',
    );
  if (
    typeof p.maxOutputTokens !== 'number' ||
    !Number.isInteger(p.maxOutputTokens) ||
    p.maxOutputTokens < 128 ||
    p.maxOutputTokens > 32768
  )
    throw new Error('Лимит ответа должен быть от 128 до 32768 токенов');
  if (
    typeof p.timeoutSeconds !== 'number' ||
    !Number.isInteger(p.timeoutSeconds) ||
    p.timeoutSeconds < 10 ||
    p.timeoutSeconds > 120
  )
    throw new Error('Время ожидания должно быть от 10 до 120 секунд');
  return {
    enabled: p.enabled,
    provider: p.provider,
    model: p.model,
    reasoning: p.reasoning,
    temperature: p.temperature as number | null,
    maxOutputTokens: p.maxOutputTokens,
    timeoutSeconds: p.timeoutSeconds,
  };
}
export function validateConfig(value: unknown): AiConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Требуется конфигурация AI');
  const c = value as Record<string, unknown>;
  if (Object.keys(c).some((key) => !isTask(key)))
    throw new Error('Неизвестная задача AI');
  return { chat: validateProfile(c.chat), text: validateProfile(c.text) };
}
