import type { AiProfile, AiProvider } from './ai-policy';
import type {
  AiProviderAdapter,
  AiResponse,
  ConnectionTestResult,
  Message,
  ProviderCapabilities,
} from './ai-provider-registry.ts';
import type { InputPart } from './attachment-policy';
export { AiProviderError } from './ai-provider-registry.ts';

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

export class AiFailure extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AiFailure';
    this.code = code;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeUrl(base: string, path: string): string {
  const cleanBase = base.trim().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

async function streamResponseToRecord(response: Response, maxBytes = 2_000_000): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new AiFailure('invalid_response', 'Провайдер вернул пустой ответ.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AiFailure('invalid_response', 'Ответ провайдера слишком большой.');
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
}

// ---------------------------------------------------------------------------
// PromanOS Adapter (OpenAI-compatible /chat/completions + /models)
// ---------------------------------------------------------------------------
export class PromanOSAdapter implements AiProviderAdapter {
  readonly id: AiProvider = 'promanos';
  readonly name = 'PromanOS';
  readonly defaultBaseUrl = 'https://api.promanos.com/v1';

  getBaseUrl(override?: string): string {
    return override?.trim() || this.defaultBaseUrl;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      text: 'supported',
      streaming: 'supported',
      vision: 'supported',
      audio_input: 'supported',
      files: 'supported',
      realtime_voice: 'supported',
      models: 'supported',
    };
  }

  async listModels(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<string[]> {
    if (!key?.trim()) {
      throw new AiFailure(
        'not_configured',
        'Ключ PromanOS не настроен. Добавьте PROMANOS_API_KEY в секреты Worker.',
      );
    }
    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/models');
    try {
      const res = await transport(url, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${key.trim()}`,
          'user-agent': 'Northstar-Engine/0.5.0 (promanos-adapter)',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 401 || res.status === 403) {
          throw new AiFailure('credentials', 'PromanOS отклонил токен доступа.');
        }
        if (res.status === 402) {
          throw new AiFailure('balance', 'Недостаточно средств на балансе PromanOS API.');
        }
        if (res.status === 429) {
          throw new AiFailure('quota', 'PromanOS ограничил запросы (429 Rate limit).');
        }
        if (res.status === 501) {
          throw new AiFailure('capability_unavailable', 'PromanOS ещё не поддерживает эту функцию (501).');
        }
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          throw new AiFailure('configuration', `PromanOS отклонил запрос (${res.status}).`);
        }
        throw new AiFailure('unavailable', `PromanOS вернул ошибку (${res.status}).`);
      }
      const data = await streamResponseToRecord(res);
      if (!Array.isArray(data.data)) {
        throw new AiFailure('invalid_response', 'PromanOS вернул некорректный список моделей.');
      }
      return [
        ...new Set(
          data.data
            .map((row) => record(row).id)
            .filter(
              (id): id is string =>
                typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id),
            ),
        ),
      ].sort();
    } catch (err) {
      if (err instanceof AiFailure) throw err;
      throw new AiFailure('unavailable', 'Не удалось связаться с PromanOS API.');
    }
  }

  async testConnection(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<ConnectionTestResult> {
    if (!key?.trim()) {
      return {
        ok: false,
        status: 'not_configured',
        message: 'PROMANOS_API_KEY не настроен в секретах Worker',
      };
    }
    const start = Date.now();
    try {
      const models = await this.listModels(key, baseUrl, transport);
      return {
        ok: true,
        status: 'connected',
        message: `Подключение успешно. Доступно моделей: ${models.length}`,
        modelsCount: models.length,
        models: models.slice(0, 50),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ok: false,
        status: 'error',
        message: err instanceof Error ? err.message : 'Ошибка подключения к PromanOS',
        latencyMs: Date.now() - start,
      };
    }
  }

  async generateResponse(
    profile: AiProfile,
    key?: string,
    input: Message[] = [],
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<AiResponse> {
    if (!key?.trim()) {
      throw new AiFailure(
        'not_configured',
        'Ключ PromanOS не настроен. Добавьте PROMANOS_API_KEY в секреты Worker.',
      );
    }

    const messagesPayload = input.map((m) => {
      if (typeof m.content === 'string') return { role: m.role, content: m.content };
      const parts = m.content as InputPart[];
      const textParts = parts
        .filter((part: InputPart): part is { type: 'input_text'; text: string } => part.type === 'input_text')
        .map((p: { type: 'input_text'; text: string }) => p.text)
        .join('\n');
      return { role: m.role, content: textParts };
    });

    const bodyPayload = {
      model: profile.model || 'pro-1',
      messages: messagesPayload,
      max_tokens: profile.maxOutputTokens,
      ...(profile.temperature !== null ? { temperature: profile.temperature } : {}),
      stream: false,
    };

    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/chat/completions');
    try {
      const res = await transport(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key.trim()}`,
          'content-type': 'application/json',
          'user-agent': 'Northstar-Engine/0.5.0 (promanos-adapter)',
        },
        body: JSON.stringify(bodyPayload),
        redirect: 'manual',
        signal: AbortSignal.timeout(profile.timeoutSeconds * 1000),
      });

      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 401 || res.status === 403) {
          throw new AiFailure('credentials', 'PromanOS отклонил токен доступа (401/403).');
        }
        if (res.status === 402) {
          throw new AiFailure('balance', 'Недостаточно средств на балансе PromanOS API (402).');
        }
        if (res.status === 429) {
          throw new AiFailure('quota', 'Превышен лимит запросов PromanOS (429).');
        }
        if (res.status === 501) {
          throw new AiFailure('capability_unavailable', 'PromanOS ещё не поддерживает запрашиваемую возможность (501).');
        }
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          throw new AiFailure('configuration', `PromanOS отклонил запрос (${res.status}).`);
        }
        throw new AiFailure('unavailable', `Сервис PromanOS временно недоступен (${res.status}).`);
      }

      const data = await streamResponseToRecord(res);
      const choices = Array.isArray(data.choices) ? data.choices : [];
      const firstChoice = record(choices[0]);
      const choiceMessage = record(firstChoice.message);
      const text = typeof choiceMessage.content === 'string' ? choiceMessage.content.trim() : '';

      if (!text) {
        throw new AiFailure('invalid_response', 'PromanOS вернул пустой текст ответа.');
      }

      const u = record(data.usage);
      const costObj = record(data.cost);
      const numberOrNull = (v: unknown) =>
        typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;

      return {
        text,
        model: (typeof data.model === 'string' ? data.model : profile.model) || 'pro-1',
        provider: 'promanos',
        usage: {
          inputTokens: numberOrNull(u.prompt_tokens),
          outputTokens: numberOrNull(u.completion_tokens),
          cachedTokens: numberOrNull(record(u.prompt_tokens_details).cached_tokens),
          reasoningTokens: numberOrNull(record(u.completion_tokens_details).reasoning_tokens),
        },
        providerMetadata: {
          requestId: typeof data.id === 'string' ? data.id : undefined,
          cost:
            typeof costObj.total === 'number'
              ? {
                  currency: typeof costObj.currency === 'string' ? costObj.currency : 'USD',
                  total: costObj.total,
                }
              : undefined,
          rawModel: typeof data.model === 'string' ? data.model : profile.model,
        },
      };
    } catch (err) {
      if (err instanceof AiFailure) throw err;
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new AiFailure('timeout', 'Превышено время ожидания ответа PromanOS.');
      }
      throw new AiFailure('unavailable', 'Не удалось получить ответ от PromanOS API.');
    }
  }
}

// ---------------------------------------------------------------------------
// OpenAI Adapter
// ---------------------------------------------------------------------------
export class OpenAiAdapter implements AiProviderAdapter {
  readonly id: AiProvider = 'openai';
  readonly name = 'OpenAI';
  readonly defaultBaseUrl = 'https://api.openai.com/v1';

  getBaseUrl(override?: string): string {
    return override?.trim() || this.defaultBaseUrl;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      text: 'supported',
      streaming: 'supported',
      vision: 'supported',
      audio_input: 'supported',
      files: 'supported',
      realtime_voice: 'supported',
      models: 'supported',
    };
  }

  async listModels(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<string[]> {
    if (!key?.trim()) throw new AiFailure('not_configured', 'Ключ OpenAI не настроен.');
    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/models');
    const res = await transport(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${key.trim()}` },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      await res.body?.cancel();
      if (res.status === 401 || res.status === 403) throw new AiFailure('credentials', 'OpenAI отклонил ключ.');
      if (res.status === 429) throw new AiFailure('quota', 'OpenAI ограничил запросы (429).');
      if (res.status === 400 || res.status === 404 || res.status === 422) {
        throw new AiFailure('configuration', 'OpenAI отклонил запрос.');
      }
      throw new AiFailure('unavailable', 'OpenAI временно недоступен.');
    }
    const data = await streamResponseToRecord(res);
    if (!Array.isArray(data.data)) throw new AiFailure('invalid_response', 'OpenAI вернул некорректный список.');
    return [
      ...new Set(
        data.data
          .map((r) => record(r).id)
          .filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id)),
      ),
    ].sort();
  }

  async testConnection(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<ConnectionTestResult> {
    if (!key?.trim()) return { ok: false, status: 'not_configured', message: 'OPENAI_API_KEY не настроен' };
    const start = Date.now();
    try {
      const models = await this.listModels(key, baseUrl, transport);
      return {
        ok: true,
        status: 'connected',
        message: `Подключение успешно. Доступно моделей: ${models.length}`,
        modelsCount: models.length,
        models: models.slice(0, 50),
        latencyMs: Date.now() - start,
      };
    } catch (e) {
      return {
        ok: false,
        status: 'error',
        message: e instanceof Error ? e.message : 'Ошибка подключения OpenAI',
        latencyMs: Date.now() - start,
      };
    }
  }

  async generateResponse(
    profile: AiProfile,
    key?: string,
    input: Message[] = [],
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<AiResponse> {
    if (!key?.trim()) throw new AiFailure('not_configured', 'Ключ OpenAI не настроен.');
    const payload = {
      model: profile.model,
      input,
      store: false,
      max_output_tokens: profile.maxOutputTokens,
      ...(profile.reasoning !== 'auto' ? { reasoning: { effort: profile.reasoning } } : {}),
      ...(profile.temperature !== null ? { temperature: profile.temperature } : {}),
    };
    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/responses');
    try {
      const res = await transport(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${key.trim()}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'manual',
        signal: AbortSignal.timeout(profile.timeoutSeconds * 1000),
      });
      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 401 || res.status === 403) throw new AiFailure('credentials', 'OpenAI отклонил ключ.');
        if (res.status === 429) throw new AiFailure('quota', 'OpenAI ограничил запросы (429).');
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          throw new AiFailure('configuration', 'OpenAI отклонил запрос.');
        }
        throw new AiFailure('unavailable', 'OpenAI временно недоступен.');
      }
      const data = await streamResponseToRecord(res);
      if (data.status === 'incomplete') throw new AiFailure('incomplete', 'Ответ не завершён.');
      if (data.error || data.status !== 'completed' || !Array.isArray(data.output)) {
        throw new AiFailure('invalid_response', 'OpenAI не вернул завершённый ответ.');
      }
      const text = data.output
        .flatMap((item) => {
          const msg = record(item);
          return msg.type === 'message' && msg.role === 'assistant' && Array.isArray(msg.content) ? msg.content : [];
        })
        .map(record)
        .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
        .map((part) => part.text as string)
        .join('\n')
        .trim();

      if (!text) throw new AiFailure('invalid_response', 'OpenAI вернул пустой текст.');
      const u = record(data.usage);
      const num = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null);
      return {
        text,
        model: profile.model,
        provider: 'openai',
        usage: {
          inputTokens: num(u.input_tokens),
          outputTokens: num(u.output_tokens),
          reasoningTokens: num(record(u.output_tokens_details).reasoning_tokens),
        },
      };
    } catch (err) {
      if (err instanceof AiFailure) throw err;
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new AiFailure('timeout', 'Превышено время ожидания OpenAI.');
      }
      throw new AiFailure('unavailable', 'Не удалось получить ответ OpenAI.');
    }
  }
}

// ---------------------------------------------------------------------------
// xAI Adapter
// ---------------------------------------------------------------------------
export class XaiAdapter implements AiProviderAdapter {
  readonly id: AiProvider = 'xai';
  readonly name = 'xAI';
  readonly defaultBaseUrl = 'https://api.x.ai/v1';

  getBaseUrl(override?: string): string {
    return override?.trim() || this.defaultBaseUrl;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      text: 'supported',
      streaming: 'supported',
      vision: 'supported',
      audio_input: 'pending',
      files: 'pending',
      realtime_voice: 'pending',
      models: 'supported',
    };
  }

  async listModels(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<string[]> {
    if (!key?.trim()) throw new AiFailure('not_configured', 'Ключ xAI не настроен.');
    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/models');
    const res = await transport(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${key.trim()}` },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      await res.body?.cancel();
      if (res.status === 401 || res.status === 403) throw new AiFailure('credentials', 'xAI отклонил ключ.');
      if (res.status === 429) throw new AiFailure('quota', 'xAI ограничил запросы (429).');
      if (res.status === 400 || res.status === 404 || res.status === 422) {
        throw new AiFailure('configuration', 'xAI отклонил запрос.');
      }
      throw new AiFailure('unavailable', 'xAI временно недоступен.');
    }
    const data = await streamResponseToRecord(res);
    if (!Array.isArray(data.data)) throw new AiFailure('invalid_response', 'xAI вернул некорректный список.');
    return [
      ...new Set(
        data.data
          .map((r) => record(r).id)
          .filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id)),
      ),
    ].sort();
  }

  async testConnection(
    key?: string,
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<ConnectionTestResult> {
    if (!key?.trim()) return { ok: false, status: 'not_configured', message: 'XAI_API_KEY не настроен' };
    const start = Date.now();
    try {
      const models = await this.listModels(key, baseUrl, transport);
      return {
        ok: true,
        status: 'connected',
        message: `Подключение успешно. Доступно моделей: ${models.length}`,
        modelsCount: models.length,
        models: models.slice(0, 50),
        latencyMs: Date.now() - start,
      };
    } catch (e) {
      return {
        ok: false,
        status: 'error',
        message: e instanceof Error ? e.message : 'Ошибка подключения xAI',
        latencyMs: Date.now() - start,
      };
    }
  }

  async generateResponse(
    profile: AiProfile,
    key?: string,
    input: Message[] = [],
    baseUrl?: string,
    transport: typeof fetch = fetch,
  ): Promise<AiResponse> {
    if (!key?.trim()) throw new AiFailure('not_configured', 'Ключ xAI не настроен.');
    const payload = {
      model: profile.model,
      input,
      store: false,
      max_output_tokens: profile.maxOutputTokens,
      ...(profile.reasoning !== 'auto' ? { reasoning: { effort: profile.reasoning } } : {}),
      ...(profile.temperature !== null ? { temperature: profile.temperature } : {}),
    };
    const url = normalizeUrl(this.getBaseUrl(baseUrl), '/responses');
    try {
      const res = await transport(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${key.trim()}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'manual',
        signal: AbortSignal.timeout(profile.timeoutSeconds * 1000),
      });
      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 401 || res.status === 403) throw new AiFailure('credentials', 'xAI отклонил ключ.');
        if (res.status === 429) throw new AiFailure('quota', 'xAI ограничил запросы (429).');
        if (res.status === 400 || res.status === 404 || res.status === 422) {
          throw new AiFailure('configuration', 'xAI отклонил запрос.');
        }
        throw new AiFailure('unavailable', 'xAI временно недоступен.');
      }
      const data = await streamResponseToRecord(res);
      if (data.status === 'incomplete') throw new AiFailure('incomplete', 'Ответ не завершён.');
      if (data.error || data.status !== 'completed' || !Array.isArray(data.output)) {
        throw new AiFailure('invalid_response', 'xAI не вернул завершённый ответ.');
      }
      const text = data.output
        .flatMap((item) => {
          const msg = record(item);
          return msg.type === 'message' && msg.role === 'assistant' && Array.isArray(msg.content) ? msg.content : [];
        })
        .map(record)
        .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
        .map((part) => part.text as string)
        .join('\n')
        .trim();

      if (!text) throw new AiFailure('invalid_response', 'xAI вернул пустой текст.');
      const u = record(data.usage);
      const num = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null);
      return {
        text,
        model: profile.model,
        provider: 'xai',
        usage: {
          inputTokens: num(u.input_tokens),
          outputTokens: num(u.output_tokens),
          reasoningTokens: num(record(u.output_tokens_details).reasoning_tokens),
        },
      };
    } catch (err) {
      if (err instanceof AiFailure) throw err;
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new AiFailure('timeout', 'Превышено время ожидания xAI.');
      }
      throw new AiFailure('unavailable', 'Не удалось получить ответ xAI.');
    }
  }
}

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------
const registry = new Map<AiProvider, AiProviderAdapter>([
  ['promanos', new PromanOSAdapter()],
  ['openai', new OpenAiAdapter()],
  ['xai', new XaiAdapter()],
]);

export function getProviderAdapter(provider: AiProvider): AiProviderAdapter {
  const adapter = registry.get(provider);
  if (!adapter) {
    throw new AiFailure('configuration', `Неизвестный AI-провайдер: ${provider}`);
  }
  return adapter;
}

export function listSupportedProviders(): AiProvider[] {
  return Array.from(registry.keys());
}

// ---------------------------------------------------------------------------
// Backward-compatible router exports with explicit Fallback Support
// ---------------------------------------------------------------------------
export async function listProviderModels(
  provider: AiProvider,
  key: string | undefined,
  transport: typeof fetch = fetch,
): Promise<string[]> {
  const adapter = getProviderAdapter(provider);
  return adapter.listModels(key, undefined, transport);
}

export async function testProviderConnection(
  provider: AiProvider,
  key: string | undefined,
  transport: typeof fetch = fetch,
): Promise<ConnectionTestResult> {
  const adapter = getProviderAdapter(provider);
  return adapter.testConnection(key, undefined, transport);
}

export async function generateResponse(
  profile: AiProfile,
  key: string | undefined,
  input: Message[],
  transport: typeof fetch = fetch,
): Promise<AiResponse> {
  const primaryAdapter = getProviderAdapter(profile.provider);
  try {
    return await primaryAdapter.generateResponse(profile, key, input, undefined, transport);
  } catch (err) {
    const isTransient =
      err instanceof AiFailure &&
      (err.code === 'unavailable' || err.code === 'timeout');

    // Never fallback on auth (401/credentials), balance (402), or bad configuration
    if (
      profile.fallbackEnabled &&
      profile.fallbackProvider &&
      profile.fallbackProvider !== profile.provider &&
      isTransient
    ) {
      const fallbackProvider = profile.fallbackProvider;
      const fallbackKey = key; // Fallback will use supplied key or caller's provided fallback key

      if (fallbackKey?.trim()) {
        const fallbackAdapter = getProviderAdapter(fallbackProvider);
        const fallbackProfile: AiProfile = {
          ...profile,
          provider: fallbackProvider,
          model: profile.fallbackModel || (fallbackProvider === 'promanos' ? 'pro-1' : 'gpt-4o-mini'),
          fallbackEnabled: false, // Prevent infinite fallback loops
        };
        const fallbackRes = await fallbackAdapter.generateResponse(
          fallbackProfile,
          fallbackKey,
          input,
          undefined,
          transport,
        );
        return {
          ...fallbackRes,
          providerMetadata: {
            ...fallbackRes.providerMetadata,
            requestId: fallbackRes.providerMetadata?.requestId,
          },
        };
      }
    }
    throw err;
  }
}
