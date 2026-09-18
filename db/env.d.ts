declare namespace Cloudflare {
  interface Env {
    SITE_PRESET?: string;
    LITE_SITE_PRESET?: string;
    LITE_HEALTH_DATA_ENABLED?: string;
    ENGINE_MODE?: 'lite' | 'standard';
    AI_PAID_REQUESTS_ENABLED?: string;
    AI_DAILY_REQUEST_LIMIT?: string;
    AI_MONTHLY_REQUEST_LIMIT?: string;
    AI_MAX_INPUT_BYTES?: string;
    AI_MAX_OUTPUT_TOKENS?: string;
    LITE_AI_ENABLED?: string;
    LITE_LEADS_ENABLED?: string;
    LITE_LEAD_WEBHOOK_URL?: string;
    LITE_LEAD_WEBHOOK_TOKEN?: string;
    LITE_LEAD_RECIPIENT?: string;
    LITE_LEAD_PRIVACY_PATH?: string;
    LITE_LEAD_LIMITER?: {
      limit(input: { key: string }): Promise<{ success: boolean }>;
    };
    LITE_VOICE_ENABLED?: string;
    LITE_VOICE_MODEL?: string;
    LITE_VOICE_VOICE?: string;
    LITE_VOICE_LIMITER?: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    LITE_AI_PROVIDER?: string;
    LITE_AI_MODEL?: string;
    LITE_AI_REASONING?: string;
    LITE_AI_MAX_TOKENS?: string;
    LITE_SYSTEM_PROMPT?: string;
    LITE_RATE_LIMITER?: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    DB: D1Database;
    FILES: R2Bucket;
    FILES_USER_MAX_BYTES?: string;
    FILES_SITE_MAX_BYTES?: string;
    FILES_USER_MAX_COUNT?: string;
    FILES_SITE_MAX_COUNT?: string;
    OPENAI_API_KEY?: string;
    XAI_API_KEY?: string;
    INITIAL_ADMIN_TOKEN?: string;
    OPENAI_MODEL?: string;
    PAYMENT_PROVIDER_URL?: string;
    PAYMENT_PROVIDER_TOKEN?: string;
    PAYMENT_WEBHOOK_SECRET?: string;
    BOOKING_PAYMENT_WEBHOOK_SECRET?: string;
    UPDATE_RUNNER_SECRET?: string;
    UPDATE_RUNNER_REPOSITORY?: string;
    GITHUB_RELEASE_TOKEN?: string;
    PAYMENT_PROVIDER?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    BOOKING_TELEGRAM_ENABLED?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
  }
}
