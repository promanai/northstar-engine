import { env } from 'cloudflare:workers';
import {
  defaultProfile,
  validateConfig,
  type AiConfig,
  type AiProvider,
  type AiView,
} from './ai-policy';
import { RequestFailure } from './request-security';

export function providerKey(provider: AiProvider) {
  return provider === 'openai' ? env.OPENAI_API_KEY : env.XAI_API_KEY;
}
export async function readAiSettings(): Promise<AiView> {
  const row = await env.DB.prepare(
    'SELECT revision, config FROM ai_settings WHERE id = ?',
  )
    .bind('main')
    .first<{ revision: number; config: string }>();
  const credentials = {
    openai: !!env.OPENAI_API_KEY?.trim(),
    xai: !!env.XAI_API_KEY?.trim(),
  };
  if (row)
    return {
      config: validateConfig(JSON.parse(row.config)),
      revision: row.revision,
      source: 'saved',
      credentials,
    };
  // Preserve pre-upgrade OpenAI routing until the owner explicitly saves settings.
  const assistant = await env.DB.prepare(
    'SELECT active_model FROM assistant_profiles ORDER BY updated_at DESC LIMIT 1',
  ).first<{ active_model: string }>();
  const model =
    assistant?.active_model && assistant.active_model !== 'demo'
      ? assistant.active_model
      : env.OPENAI_MODEL || 'gpt-4o-mini';
  const chat = { ...defaultProfile(), model, enabled: credentials.openai };
  return {
    config: { chat, text: defaultProfile() },
    revision: 0,
    source: 'environment',
    credentials,
  };
}
export async function saveAiSettings(config: AiConfig, revision: unknown) {
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  )
    throw new RequestFailure('Требуется версия настроек');
  for (const profile of Object.values(config))
    if (profile.enabled && !providerKey(profile.provider)?.trim())
      throw new RequestFailure(
        'Перед включением добавьте ключ выбранного провайдера в секреты Worker',
      );
  // Atomic optimistic concurrency, including the very first save.
  const statement =
    revision === 0
      ? env.DB.prepare(
          'INSERT INTO ai_settings (id, revision, config) VALUES (?, 1, ?) ON CONFLICT(id) DO NOTHING RETURNING revision',
        ).bind('main', JSON.stringify(config))
      : env.DB.prepare(
          'UPDATE ai_settings SET config = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING revision',
        ).bind(JSON.stringify(config), 'main', revision);
  const row = await statement.first<{ revision: number }>();
  if (!row)
    throw new RequestFailure(
      'Настройки уже изменены в другой вкладке. Перезагрузите их перед сохранением.',
      409,
    );
  return { config, revision: row.revision };
}
