import type { AiProfile, AiProvider } from './ai-policy';
import type { InputPart } from './attachment-policy';

// Workers support manual/follow redirects, not redirect:error. Reject non-2xx
// responses below, so credentials never follow a redirect to another host.
const origins: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1',
  xai: 'https://api.x.ai/v1',
};
export class AiFailure extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AiFailure';
    this.code = code;
  }
}
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string | InputPart[];
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function responsePayload(profile: AiProfile, input: Message[]) {
  return {
    model: profile.model,
    input,
    store: false,
    max_output_tokens: profile.maxOutputTokens,
    ...(profile.reasoning !== 'auto'
      ? { reasoning: { effort: profile.reasoning } }
      : {}),
    ...(profile.temperature !== null
      ? { temperature: profile.temperature }
      : {}),
  };
}
async function providerRequest(
  provider: AiProvider,
  key: string | undefined,
  path: '/models' | '/responses',
  timeout: number,
  payload: unknown,
  transport: typeof fetch,
) {
  if (!key?.trim())
    throw new AiFailure(
      'not_configured',
      'Ключ провайдера не настроен. Добавьте серверный секрет в Worker.',
    );
  try {
    const response = await transport(origins[provider] + path, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        ...(payload === undefined
          ? {}
          : { 'content-type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout * 1000),
    });
    if (!response.ok) {
      // Never return or log upstream bodies: they can echo keys or private input.
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403)
        throw new AiFailure(
          'credentials',
          'Провайдер отклонил ключ или доступ к модели. Проверьте секрет и разрешения.',
        );
      if (response.status === 429)
        throw new AiFailure(
          'quota',
          'Провайдер ограничил запросы. Проверьте квоту и баланс или повторите позже.',
        );
      if (
        response.status === 400 ||
        response.status === 404 ||
        response.status === 422
      )
        throw new AiFailure(
          'configuration',
          'Провайдер не принял модель или параметры. Проверьте ID модели, доступ и выберите параметры по умолчанию.',
        );
      throw new AiFailure('unavailable', 'AI-провайдер временно недоступен.');
    }
    // Bound the body, including model lists, to protect the Worker memory budget.
    const reader = response.body?.getReader();
    if (!reader)
      throw new AiFailure('invalid_response', 'Провайдер вернул пустой ответ.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new AiFailure(
            'invalid_response',
            'Ответ провайдера слишком большой.',
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return record(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof AiFailure) throw error;
    if (
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    )
      throw new AiFailure(
        'timeout',
        'Превышено время ожидания AI. Уменьшите уровень рассуждения или увеличьте таймаут.',
      );
    throw new AiFailure(
      'unavailable',
      'Не удалось получить ответ AI-провайдера. Проверьте соединение и настройки.',
    );
  }
}
export async function listProviderModels(
  provider: AiProvider,
  key: string | undefined,
  transport: typeof fetch = fetch,
) {
  const data = await providerRequest(
    provider,
    key,
    '/models',
    15,
    undefined,
    transport,
  );
  if (!Array.isArray(data.data))
    throw new AiFailure(
      'invalid_response',
      'Провайдер вернул некорректный список моделей.',
    );
  return [
    ...new Set(
      data.data
        .map((row) => record(row).id)
        .filter(
          (id): id is string =>
            typeof id === 'string' &&
            /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id),
        ),
    ),
  ]
    .sort()
    .slice(0, 500);
}
export async function generateResponse(
  profile: AiProfile,
  key: string | undefined,
  input: Message[],
  transport: typeof fetch = fetch,
) {
  const data = await providerRequest(
    profile.provider,
    key,
    '/responses',
    profile.timeoutSeconds,
    responsePayload(profile, input),
    transport,
  );
  if (data.status === 'incomplete')
    throw new AiFailure(
      'incomplete',
      'Ответ не завершён. Увеличьте лимит токенов или снизьте уровень рассуждения.',
    );
  if (data.error || data.status !== 'completed' || !Array.isArray(data.output))
    throw new AiFailure(
      'invalid_response',
      'Провайдер не вернул завершённый ответ.',
    );
  // Only assistant output_text is customer-visible. Never expose reasoning/tool output.
  const text = data.output
    .flatMap((item) => {
      const message = record(item);
      return message.type === 'message' &&
        message.role === 'assistant' &&
        Array.isArray(message.content)
        ? message.content
        : [];
    })
    .map(record)
    .filter(
      (part) => part.type === 'output_text' && typeof part.text === 'string',
    )
    .map((part) => part.text as string)
    .join('\n')
    .trim();
  if (!text || text.length > 100_000)
    throw new AiFailure(
      'invalid_response',
      'Провайдер вернул пустой или слишком большой текст.',
    );
  const u = record(data.usage);
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : null;
  return {
    text,
    model: profile.model,
    provider: profile.provider,
    usage: {
      inputTokens: number(u.input_tokens),
      outputTokens: number(u.output_tokens),
      reasoningTokens: number(record(u.output_tokens_details).reasoning_tokens),
    },
  };
}
