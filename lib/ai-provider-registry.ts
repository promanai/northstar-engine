import type { AiProvider, AiProfile } from './ai-policy';
import type { InputPart } from './attachment-policy';

export type ProviderCapability =
  | 'text'
  | 'streaming'
  | 'vision'
  | 'audio_input'
  | 'files'
  | 'realtime_voice'
  | 'models';

export type ProviderCapabilityStatus = 'supported' | 'pending' | 'unavailable';

export type ProviderCapabilities = Record<ProviderCapability, ProviderCapabilityStatus>;

export type ProviderStatus = 'connected' | 'not_configured' | 'error';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string | InputPart[];
};

export type AiResponse = {
  text: string;
  model: string;
  provider: AiProvider;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedTokens?: number | null;
    reasoningTokens?: number | null;
  };
  providerMetadata?: {
    requestId?: string;
    cost?: {
      currency: string;
      total: number;
    };
    rawModel?: string;
  };
};

export type ConnectionTestResult = {
  ok: boolean;
  status: ProviderStatus;
  message: string;
  modelsCount?: number;
  models?: string[];
  latencyMs?: number;
};

export class AiProviderError extends Error {
  code: string;
  statusCode?: number;
  provider: AiProvider;
  isTransient: boolean;

  constructor(
    provider: AiProvider,
    code: string,
    message: string,
    statusCode?: number,
    isTransient = false,
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.provider = provider;
    this.code = code;
    this.statusCode = statusCode;
    this.isTransient = isTransient;
  }
}

export interface AiProviderAdapter {
  readonly id: AiProvider;
  readonly name: string;
  readonly defaultBaseUrl: string;
  getCapabilities(): ProviderCapabilities;
  getBaseUrl(override?: string): string;
  listModels(key?: string, baseUrl?: string, transport?: typeof fetch): Promise<string[]>;
  testConnection(key?: string, baseUrl?: string, transport?: typeof fetch): Promise<ConnectionTestResult>;
  generateResponse(
    profile: AiProfile,
    key?: string,
    input?: Message[],
    baseUrl?: string,
    transport?: typeof fetch,
  ): Promise<AiResponse>;
}
