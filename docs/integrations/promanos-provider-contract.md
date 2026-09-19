# Northstar Engine ↔ PromanOS Provider Contract

**Status:** Canonical Interface Specification  
**Architecture Layer:** AI Provider Runtime  
**Consumer:** Northstar Engine (`lib/ai/`, `app/api/chat`, `lib/ai-provider-registry.ts`)  
**Provider:** PromanOS API Platform  

---

## 1. Overview & Architecture

Northstar Engine defines **PromanOS** (`promanos`) as an embedded, first-class AI provider alongside `openai` and `xai`.
The relationship is strictly decoupled:
1. **Northstar** supplies the provider registry, fallback orchestrator, capability negotiation, usage normalization, and administrative routing UI.
2. **PromanOS** supplies the standard endpoints, model discovery, execution runtime, multimodal processing, and streaming infrastructure.
3. If an endpoint or capability is pending implementation or temporarily unavailable on PromanOS, the Northstar adapter returns a normalized `capability_unavailable` without requiring architectural changes to Northstar or customer sites (e.g. OraVera).

---

## 2. Server Configuration & Endpoints

| Environment Variable | Required | Default Value | Description |
|---|---|---|---|
| `PROMANOS_API_KEY` | Optional at boot | `undefined` | Server-side Bearer token (never exposed to browser, git, or logs) |
| `PROMANOS_BASE_URL` | Optional | `https://api.promanos.com/v1` | Base URL of the PromanOS API without trailing slash |

> **URL Normalization Rule:** The adapter normalizes `PROMANOS_BASE_URL` to strip any trailing slashes and avoids double `/v1/v1` prefixes.

---

## 3. Mandatory Provider Capabilities

Northstar defines standard capability contracts for every provider:

| Capability ID | PromanOS Target Endpoint | Description | Phase |
|---|---|---|---|
| `text` | `POST /chat/completions` | Standard conversational generation | Phase 1 |
| `models` | `GET /models` | Dynamic catalog discovery | Phase 1 |
| `streaming` | `POST /chat/completions` (`stream: true`) | Server-Sent Events (SSE) token stream | Phase 2 |
| `vision` | `POST /chat/completions` | Multimodal input (`image_url` / base64) | Phase 2 |
| `audio_input` | `POST /audio/transcriptions` or multimodal | Speech-to-text input processing | Phase 2 |
| `files` | `POST /files` | Document attachment and contextual analysis | Phase 2 |
| `realtime_voice`| `POST /realtime/sessions` + `wss://...` | Low-latency bidirectional WebRTC / WebSocket voice | Phase 3 |

---

## 4. API Specification & Payloads

### 4.1. Authentication
All requests from Northstar to PromanOS include:
```http
Authorization: Bearer <PROMANOS_API_KEY>
Content-Type: application/json
User-Agent: Northstar-Engine/0.4.0 (promanos-adapter)
```

### 4.2. Model Discovery (`GET /models`)
Northstar does not maintain static assumptions about available models. It queries `GET /models` to populate administrative selectors:
**Response Envelope (OpenAI-compatible):**
```json
{
  "object": "list",
  "data": [
    {
      "id": "pro-1",
      "object": "model",
      "created": 1726000000,
      "owned_by": "promanos",
      "capabilities": ["text", "streaming", "vision", "files", "realtime_voice"]
    },
    {
      "id": "pro-1-2026-09-01",
      "object": "model",
      "created": 1725148800,
      "owned_by": "promanos"
    }
  ]
}
```

### 4.3. Chat Completions (`POST /chat/completions`)
**Request:**
```json
{
  "model": "pro-1",
  "messages": [
    { "role": "system", "content": "You are Ora, dental clinic assistant." },
    { "role": "user", "content": "What are your services?" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false
}
```
**Response Envelope:**
```json
{
  "id": "chatcmpl-promanos-12345",
  "object": "chat.completion",
  "created": 1726000100,
  "model": "pro-1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! We offer general exams, cleanings, implants, and cosmetic care."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 18,
    "total_tokens": 42,
    "prompt_tokens_details": { "cached_tokens": 0 },
    "completion_tokens_details": { "reasoning_tokens": 0 }
  },
  "cost": {
    "currency": "USD",
    "total": 0.001152
  }
}
```

---

## 5. Normalized Usage & Metadata Mapping

Northstar normalizes all responses into `AiResponse`:
```ts
export type AiResponse = {
  text: string;
  model: string;
  provider: 'promanos' | 'openai' | 'xai';
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
```

---

## 6. Error Normalization & Fallback Rules

PromanOS HTTP status codes are mapped to deterministic internal error categories:

| Status Code | Internal Code | Category | Failover Permitted? | Description |
|---|---|---|---|---|
| `400` | `bad_request` | Configuration Error | ❌ NO | Invalid parameters or payload |
| `401` | `unauthorized` | Credential Error | ❌ NO | Missing or invalid API key |
| `402` | `payment_required` | Balance Error | ❌ NO | Insufficient account funds (Pay-as-you-go) |
| `403` | `forbidden` | Access Error | ❌ NO | Tier limitation or feature not entitled |
| `404` | `model_unavailable` | Model Error | ❌ NO | Requested model ID does not exist |
| `408` | `timeout` | Transient | ✅ YES (if policy allows) | Upstream processing timeout |
| `429` | `rate_limit` | Quota/Throttled | ⚙️ Configurable | Rate limit exceeded |
| `500..504` | `upstream_unavailable` | Transient | ✅ YES (if policy allows) | PromanOS edge or server error |

> **Failover Rule:** Failover to secondary provider (e.g. OpenAI) only executes for transient errors (`timeout`, `500-504`, or policy-approved `429`). It **never** triggers on `401` or `402` to prevent masking missing credentials or depleting unexpected payment instruments.

---

## 7. Audit & Verification

All calls passing through the PromanOS adapter are tracked with:
- Target request ID
- Duration (ms)
- Normalized token consumption
- Fallback audit record if failover was executed.
