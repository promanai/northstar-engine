# PromanOS Provider GAP Report & Upstream Technical Specification

## Context & Purpose
This document constitutes the normative Technical Specification (ТЗ) and GAP audit for integrating **PromanOS** as a native first-class AI provider in **Northstar Engine v0.5.0**.

On the Northstar Engine side, the multi-provider abstraction layer, adapter registry, configuration schemas, fallback routing, and error handling are fully implemented and verified (`Northstar = READY`). This report details the upstream backend requirements for the PromanOS team to ensure end-to-end compatibility.

---

## 1. Capability & GAP Specification Matrix

| Capability | Northstar | PromanOS | Status | Required PromanOS work |
| :--- | :--- | :--- | :--- | :--- |
| **Models** | READY | Pending Verification | In Progress | Implement `GET /v1/models` returning `{ object: "list", data: [{ id: "pro-1", ... }] }`. Ensure alias `pro-1` routes to the active model. Support dated snapshot IDs (e.g. `pro-1-YYYY-MM-DD`). |
| **Chat** | READY | Supported | Ready for Test | Implement `POST /v1/chat/completions` accepting OpenAI-compatible JSON schema (`model`, `messages`, `temperature`, `max_tokens`, `stream: false`). Return choices array with message object. |
| **Streaming** | READY | Pending Verification | In Progress | Implement Server-Sent Events (SSE) streaming format (`stream: true`) returning `data: { choices: [{ delta: { content: "..." } }] }` terminated with `data: [DONE]`. |
| **Vision** | READY | Pending Implementation | GAP Task | Support multimodal content parts in user messages (`{ type: "image_url", image_url: { url: "data:image/...;base64,..." } }`). Enable image token processing in `pro-1`. |
| **Audio input** | READY | Pending Implementation | GAP Task | Support inline base64 audio chunks in chat completions or dedicated transcription endpoint (`/v1/audio/transcriptions`). |
| **Files** | READY | Pending Implementation | GAP Task | Support document attachments (PDF, plain text, markdown) via OpenAI-compatible file upload (`/v1/files`) or inline file parts. |
| **Realtime Voice** | READY | Pending Implementation | GAP Task | Implement WebRTC signaling gateway or ephemeral session minting (`/v1/realtime/sessions`) for low-latency bidirectional voice. |
| **Usage** | READY | Supported | Ready for Test | Return standard token metrics in `usage`: `prompt_tokens`, `completion_tokens`, `total_tokens`, and details: `prompt_tokens_details.cached_tokens`, `completion_tokens_details.reasoning_tokens`. |
| **Cost metadata** | READY | Pending Implementation | GAP Task | Return optional `cost` object in completion payload: `{ currency: "USD", total: number }` to allow clinics and sites to track actual spend per session. |
| **Request ID** | READY | Supported | Ready for Test | Include unique identifier `id: "chatcmpl-pm-..."` in every completion response for audit logs and tracing. |
| **Error contract** | READY | Supported | Ready for Test | Map errors to standard HTTP status codes with JSON body: `{ error: { message: string, type: string, code: string } }`. Avoid returning HTML error pages or redirects (302) on API endpoints. |
| **402 balance** | READY | Pending Implementation | GAP Task | Explicitly return HTTP `402 Payment Required` when user credits or active subscription balance is exhausted. (Northstar maps 402 directly to `AiFailure('balance')` and fails closed without retries). |
| **Rate limiting** | READY | Supported | Ready for Test | Return HTTP `429 Too Many Requests` with optional `Retry-After` header when RPM/TPM thresholds are exceeded. |

---

## 2. Upstream Implementation Checklist for PromanOS Backend

### Phase 1 (Blocker for Live Chat Production Traffic)
1. **API Key Authentication (`Authorization: Bearer <PROMANOS_API_KEY>`):**
   - Validate keys on all `/v1/*` requests.
   - Return HTTP `401 Unauthorized` for invalid or revoked keys.
   - Do NOT redirect (HTTP 301/302) unauthorized API requests to website login pages.

2. **Catalog Discovery (`GET /v1/models`):**
   - Provide clean list of active models.
   - Always include `pro-1`.

3. **Core Chat Completions (`POST /v1/chat/completions`):**
   - Adhere to OpenAI response schema.
   - Return assistant message content in `choices[0].message.content`.
   - Provide accurate `usage.prompt_tokens` and `usage.completion_tokens`.

4. **Account Balance Enforcement:**
   - On depleted account funds: return HTTP `402 Payment Required`.

### Phase 2 (Enhancements & Multimodal Features)
1. **Streaming Support:**
   - Validate SSE chunk delivery through Cloudflare edge network without buffering stalls.
2. **Cost Tracking Transparency:**
   - Surface exact dollar cost of each completion directly in response metadata.
3. **Multimodal Vision:**
   - Accept base64 image data in dental/clinical photo consultations.
4. **Realtime Voice Engine:**
   - Deploy WebRTC bridge for live assistant voice interaction.

---

## 3. Northstar Verification Baseline
- **Engine Version:** `0.5.0`
- **Adapter Class:** `PromanOSAdapter` (`lib/ai-provider.ts`)
- **Default Endpoint:** `https://api.promanos.com/v1`
- **User-Agent:** `Northstar-Engine/0.5.0 (promanos-adapter)`
- **Safety Policy:** Fail-closed on 401/402; automatic failover to secondary provider on transient 502/503/timeout when fallback is enabled.
