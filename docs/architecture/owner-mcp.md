# Northstar Owner MCP Architecture

## 1. Vision & Overview

Northstar Owner MCP provides a secure, first-class management interface allowing AI agents (such as OpenAI Codex, Google Antigravity, and Claude) to inspect, diagnose, and update a Northstar-powered website on behalf of its owner.

Unlike traditional CMS backends or public AI interfaces, Northstar Owner MCP adopts a **Git-first, safe-by-default architecture**:
- **Separation of Runtime Plane and Management Plane**: Public visitors interact with the high-performance site runtime; owner agents manage the site via a dedicated, authenticated management interface.
- **Git as the Source of Truth in Lite Mode**: In Lite mode (zero D1 / zero R2), mutations are not written to an ad-hoc runtime database. Instead, Git provides versioning, history, diffing, and auditability.
- **Safe Mutation Workflow**: Direct production mutations are prohibited by default. Changes are proposed as **Change Sets**, previewed on Cloudflare non-production builds, reviewed via diffs, and published only upon explicit owner approval.
- **Modern Stateless Protocol**: Built on the modern Model Context Protocol (MCP) Streamable HTTP transport with stateless request-response mechanics and an evolution path toward OAuth.

```
┌─────────────────────────────────────────────────────────────┐
│                       AI Agent (Codex / Antigravity)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Streamable HTTP (JSON-RPC)
                               │ Authorization: Bearer nsk_owner_...
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Northstar Owner MCP (/api/mcp/owner)            │
├─────────────────────────────────────────────────────────────┤
│  1. Token & Scope Authentication (HMAC / Signed in Lite)    │
│  2. Capability & Engine Mode Discovery                      │
│  3. Read Tools (Stateless inspection of site & config)      │
│  4. Safe Mutation Engine (Git-backed Change Sets)           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Lite Mode)                  ▼ (Standard Mode)
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Git-Backed Plane        │ │     D1 Runtime Plane       │
│  - site.config.json          │ │  - bookings, leads         │
│  - pages/*.md / content      │ │  - customers, analytics    │
│  - branch: agent/<change-id> │ │  - transactional state     │
│  - Cloudflare Preview Build  │ │  - D1 audit records        │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. Plane Separation: Runtime Plane vs. Management Plane

| Aspect | Site Runtime Plane | Owner Management Plane |
|---|---|---|
| **Endpoint** | `/`, `/:slug`, `/api/*`, `/api/mcp` (Public) | `/api/mcp/owner`, `/api/mcp/system` |
| **Audience** | End visitors, prospective clients, public agents | Site owner and authorized owner agents |
| **Authentication** | Public, guest session, or customer bearer token | Scoped Owner Agent token (`nsk_owner_...`) |
| **State Storage (Lite)**| In-memory / build artifacts (`dist/`) | Git repository (`main`, `agent/*` branches) |
| **State Storage (Std)** | D1 database (`site_settings`, `pages`, etc.) | Git (source/content) + D1 (business data) |
| **Mutation Target** | Ephemeral or customer orders/bookings | Git branches, Change Sets, previews |

---

## 3. Persistence Architecture for Credentials in Lite vs. Standard

A fundamental design constraint of Northstar Lite is that it **must not require Cloudflare D1 or R2**.

### In Lite Mode: Cryptographic Signed Capability Tokens
- **Mechanism**: The owner token is an **HMAC-SHA256 signed capability ticket**:
  `nsk_owner_<payload_base64>.<signature_base64>`
- **Payload**:
  ```json
  {
    "jti": "tkn_c7f8a910",
    "siteId": "aisites",
    "ownerId": "owner_default",
    "agentName": "Codex",
    "scopes": ["site:read", "content:read", "content:write", "publish:preview"],
    "iat": 1773820800,
    "exp": 1776412800
  }
  ```
- **Verification**: The Lite Worker verifies the cryptographic signature using `env.OWNER_MCP_SECRET` (or falling back to `env.INITIAL_ADMIN_TOKEN`).
- **Zero Database Requirement**:
  - Verification requires 0 SQL queries, 0 D1 bindings, and 0 network roundtrips.
  - Expiration (`exp`) and site binding (`siteId`) are enforced directly from the cryptographically verified payload.
- **Revocation in Lite**:
  - Instant global revocation via rotating `OWNER_MCP_SECRET` or incrementing `OWNER_MCP_TOKEN_EPOCH`.
  - Specific token revocation via an allowlist/denylist of revoked `jti` IDs in `site.config.json` or `env.OWNER_MCP_REVOKED_IDS`.

### In Standard Mode: D1-Backed Persistent Tokens
- Standard mode additionally persists credentials in the D1 table `api_tokens` (`audience = 'owner_mcp'`).
- Provides database-backed `last_used_at` timestamps, per-token revocation flags (`revoked_at`), and rich UI token management in Admin.

---

## 4. Git-Backed Change Sets & Safe Mutation Workflow (Lite Mode)

Direct production writes via MCP are prohibited by default.

### The 5-Step Workflow: Propose → Branch → Preview → Approve → Publish

```
1. READ        Codex calls site.get_config, site.get_page
               └── Worker returns live configuration and text
2. PROPOSE     Codex calls content.update_text({ page: "home", section: "hero", text: "..." })
               └── Server creates Change Set (cs_91b2c4)
               └── Creates branch: agent/aisites/cs_91b2c4
               └── Pushes commit with the patch
3. PREVIEW     Cloudflare Workers Builds compiles the agent branch
               └── Generates non-production preview URL: https://cs_91b2c4.aisites.workers.dev
               └── Server returns: diff, previewUrl, changeId
4. APPROVE     Owner inspects the visual diff and preview URL
               └── Owner confirms approval via Admin UI or confirmation flag
5. PUBLISH     Codex calls site.publish({ changeId: "cs_91b2c4" })
               └── Server merges agent/aisites/cs_91b2c4 into production branch (main)
               └── Cloudflare Workers Builds automatically deploys to production
```

### Risk Classification
- **Low-Risk Changes** (Typo corrections, translation updates, text copy):
  Can be configured for `Auto-Approve Low Risk` if explicitly enabled by the owner.
- **High-Risk Changes** (Structural page deletions, pricing/currency changes, booking/payment settings, domain configuration, production rollbacks):
  **Always** require explicit owner approval before merging into `main`.

---

## 5. Transport & MCP Protocol Compliance (2026-07-28 Spec)

- **Transport**: Modern **Streamable HTTP**.
  - All communication happens via `POST /api/mcp/owner`.
  - JSON-RPC 2.0 payloads with stateless headers.
  - Streaming responses supported where progress reporting or large diffs are transmitted.
  - Deprecated legacy HTTP+SSE is avoided entirely.
- **OAuth Evolution Path**:
  - Phase 1 MVP utilizes scoped Bearer tokens (`Authorization: Bearer nsk_owner_...`).
  - The authentication middleware parses credentials into a generic `OwnerPrincipal` interface (`{ id, name, scopes, siteId, expiresAt }`).
  - When migrating to full OAuth 2.1 authorization servers, the token extraction step can be swapped without touching individual MCP tool handlers.

---

## 6. Phased Implementation Roadmap

### Phase 1 — Owner MCP Connection (Read-Only MVP)
Establish a rock-solid, live connection between real external AI agents (Codex / Antigravity) and the deployed Northstar site.
- Endpoint: `/api/mcp/owner`
- Tools:
  1. `northstar.capabilities`: Returns engine version, mode (`lite`/`standard`), protocol capabilities, source repo, and active modules.
  2. `site.get_status`: Returns deployment status, active commit SHA, engine mode, and environment health.
  3. `site.get_config`: Returns current site configuration (`site.config.json` or preset).
  4. `site.list_pages`: Lists all published and draft pages.
  5. `site.get_page`: Reads full content, layout, blocks, and SEO metadata of a specified page.
  6. `content.get_locales`: Returns supported languages, active language, and translation status.
- Admin UI:
  - Agent Access tab in `/admin` with one-time credential generator and connection templates for Codex and Antigravity.

### Phase 2 — Safe Write (Git-Backed Change Sets & Previews)
Enable drafting without touching production.
- Tools:
  1. `content.update_text`
  2. `site.update_section`
  3. `content.update_translation`
  4. `site.get_diff`
  5. `site.preview_changes`
- Creates Git branch `agent/<change-id>` and returns Cloudflare preview build URL + diff.

### Phase 3 — Approval & Publishing
Close the loop from preview to production.
- Tools:
  1. `site.approve_changes`
  2. `site.publish`
  3. `site.list_versions`
  4. `site.rollback`
- Merges to `main` for deployment; rollback creates a revert commit.

### Phase 4 — Business Modules (Standard Mode Only)
Extend capabilities for database-backed transactional features:
- Services & Pricing: `services.list`, `services.update`, `prices.update`
- Bookings: `booking.get_config`, `booking.list`, `booking.update_settings`
- Leads: `leads.list`, `leads.get`
- Analytics: `analytics.summary`, `analytics.top_pages`, `analytics.conversions`
- AI Assistant: `assistant.get_config`, `assistant.update_config`

---

## 7. Capability Discovery Contract (`northstar.capabilities`)

When an agent connects, calling `northstar.capabilities` returns:
```json
{
  "engine": {
    "name": "northstar-engine",
    "version": "0.4.0",
    "mode": "lite",
    "repository": "promanai/northstar-engine",
    "productionBranch": "main"
  },
  "protocol": {
    "mcpVersion": "2026-07-28",
    "transport": "streamable-http"
  },
  "capabilities": {
    "readOnly": true,
    "gitBackedDrafts": true,
    "previewBuilds": true,
    "directProductionWrite": false,
    "d1Database": false
  },
  "availableTools": [
    "northstar.capabilities",
    "site.get_status",
    "site.get_config",
    "site.list_pages",
    "site.get_page",
    "content.get_locales"
  ],
  "policy": {
    "mutationWorkflow": "propose -> preview -> approve -> publish",
    "highRiskRequiresApproval": true
  }
}
```

---

## 8. Real End-to-End Acceptance Plan

To confirm true interoperability, testing must not rely solely on unit tests:

### 1. Codex Real E2E Test
1. Configure OpenAI Codex / CLI with Northstar Owner MCP endpoint:
   ```json
   {
     "mcpServers": {
       "northstar": {
         "url": "https://aisites.aisites.workers.dev/api/mcp/owner",
         "headers": {
           "Authorization": "Bearer nsk_owner_..."
         }
       }
     }
   }
   ```
2. Command in Codex:
   `"Connect to my Northstar site, inspect site capabilities, and tell me the title and sections of the homepage."`
3. Verify Codex invokes `northstar.capabilities`, `site.get_status`, and `site.get_page`, outputting accurate site structure.

### 2. Antigravity Real E2E Test
1. Connect Google Antigravity MCP runner to `/api/mcp/owner` with the Bearer token.
2. Execute tool discovery (`tools/list`) and run `site.get_config`.
3. Verify that zero D1 errors occur in Lite mode, all scopes are respected, and tool responses conform strictly to JSON-RPC 2.0.
