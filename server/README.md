# AI Orchestra — Backend (The Brain)

![Version](https://img.shields.io/badge/version-5.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![LangGraph](https://img.shields.io/badge/LangGraph-StateGraph-orange.svg)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-success.svg)

> Node.js + Express + LangGraph **16-agent swarm**. Operates as a complete autonomous digital company — research, analysis, writing, review, publishing, auditing, supply chain, sales, and multi-tenant social autopilot.

**ES Modules throughout.** `"type": "module"` in `package.json`. Use `import`/`export` everywhere — `require()` will throw.

---

## Quick Start

```bash
cd server
cp .env.example .env   # fill in all required keys
npm install
node src/index.js      # http://localhost:3000
```

### First-time Admin Setup

```bash
node scripts/create-admin.js
# Creates: admin@agentmatrix.io / Admin1234!
# Login in the frontend → red GOD MODE button appears in sidebar
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB` | ✅ | MongoDB Atlas connection string |
| `AWS_REGION` | ✅ | AWS region for Bedrock (e.g. `eu-central-1`) |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS credentials |
| `TAVILY_API_KEY` | ✅ | Web search for Scraper agent |
| `GEMINI_API_KEY` | ✅ | Vector embeddings (`gemini-embedding-001`, 1536-dim) |
| `TELEGRAM_BOT_TOKEN` | optional | 2-way Telegram bot |
| `TELEGRAM_CHAT_ID` | optional | Telegram notification target |
| `TWILIO_SID` | optional | WhatsApp via Twilio |
| `TWILIO_TOKEN` | optional | WhatsApp via Twilio |
| `DISCORD_WEBHOOK_URL` | optional | Discord webhook notifications |
| `GOOGLE_CLIENT_ID` | optional | Gmail OAuth2 |
| `GOOGLE_CLIENT_SECRET` | optional | Gmail OAuth2 |
| `N8N_PUBLISH_WEBHOOK` | optional | n8n Social Media Publisher webhook URL (outbound posts) |
| `N8N_WEBHOOK_SECRET` | optional | Shared secret for n8n → AI Brain request verification (`X-Webhook-Secret` header) |
| `PORT` | optional | Default: `3000` |

---

## Architecture

### LangGraph Workflow (Hub-and-Spoke + MOAT Guard)

```
START → [guardrail] → [orchestrator] ←──────────────────────┐
                           │                                  │
                           ├→ [scraper]       ───────────────┤
                           ├→ [analyzer]      ───────────────┤
                           ├→ [innovator]     ───────────────┤
                           ├→ [writer] ↔ [critic] ───────────┤
                           ├→ [architect]     ───────────────┤
                           ├→ [fileSaver]     ───────────────┘
                           │
                      ⛔ [human_approval]  ← interruptBefore (HITL)
                           │
                           └→ [publisher] → END
```

All routing decisions live in `orchestratorNode` (sets `state.nextAgent`). The graph pauses at `human_approval`; `POST /api/approve` resumes it.

### Dual Engine System

**Reactive Engine** (on demand): incoming message → `customerBotAgent` triage → `runHotLeadWorkflow`

**Proactive Engine** (daily cron): `cronService.js` fires `INNOVATION_RADAR` every night at 23:00 — no human trigger needed.

---

## MOAT Security (4 Layers)

| Layer | Location | Mechanism |
|-------|----------|-----------|
| **1 — Input Guard** | `guardrailNode` | Regex threat detection, injection blocking, sanitization |
| **2 — Rate Limiting** | `rateLimiter.js` | Per-tenant request windows + banned IP check |
| **3 — Authentication** | `tenant.js` | API key → `req.clientId` injection |
| **4 — Action Isolation** | `actionWorkerService.js` + `ActionQueue` | Agents write to queue; worker validates schema + whitelist before executing |

---

## Agents (16)

| Node | Responsibility |
|------|---------------|
| `guardrail` | Threat scoring (0–10), regex injection blocking, input sanitization |
| `orchestrator` | Hub router — FREN deterministic guards + LLM structured output |
| `scraper` | Tavily web search (max 3 sources), content sanitization |
| `analyzer` | Strategic 3-point analysis. Supports custom prompts via `promptRepository` |
| `innovator` | Devil's advocate — contrarian "4th path" insight |
| `writer` | Markdown B2B reports + social content. Custom prompts + `KRITISCHE LERNREGEL` feedback injection |
| `critic` | QA loop — max 5 revisions before circuit breaker forces `human_approval` |
| `architect` | Technical Master Blueprints for software/CTO track |
| `fileSaver` | MongoDB `Report` upsert via `threadId` |
| `human_approval` | HITL interrupt point — graph pauses here |
| `publisher` | ActionQueue dispatch (Telegram, Discord, webhooks, social media) |
| `auditor` | Invoice analysis — FREN A track |
| `supplyChain` | Stock monitoring + supplier emails — FREN B track |
| `salesRep` | B2B negotiation — FREN S track (max 3 rounds) |
| `cmoAgent` *(async)* | Marketing campaign from approved reports (`runCMOWorkflow`) |
| `customerBotAgent` *(async)* | Incoming message triage + RAG response generation |
| `socialContentAgent` *(async)* | Multi-tenant social autopilot: reads `TenantConfig.socialAuto`, generates posts via Tavily + LLM, saves as `ScheduledPost` (`AWAITING_APPROVAL` + Telegram notification when `requireHITL: true`) |

---

## Routing Tracks (FREN System)

Deterministic pre-LLM guards in `orchestrator.js`. Zero LLM cost, always run first:

| Keyword / Prefix | Track | Agent Flow |
|-----------------|-------|-----------|
| `RFP_RESPONSE` | RFP Responder | writer → critic → fileSaver |
| `INNOVATION_RADAR` | Innovation | scraper → architect → fileSaver |
| `COLD_OUTREACH` | B2B Outreach | scraper → writer → critic → fileSaver |
| `BUSINESS_STRESS_TEST` | Stress Test | analyzer → innovator → writer → critic |
| `INVOICE_PROCESSING` | Finance Audit | auditor → fileSaver |
| `STOCK_CHECK` | Supply Chain | supplyChain → fileSaver |
| `HOT_LEAD_FOLLOWUP` | Sales | salesRep (×3 max) → fileSaver |
| `TWITTER` / `LINKEDIN` | Social Media | scraper → writer → critic → fileSaver |
| *(default)* | Research | scraper → analyzer → innovator → writer → critic → fileSaver |

---

## API Routes (18 Modules)

All under `/api/*`.

| Prefix | Key Endpoints |
|--------|--------------|
| `/` | `GET /events/:threadId` (SSE), `POST /analyze`, `POST /rnd` |
| `/admin` | 17 God Mode endpoints — requires `isAdmin: true` |
| `/approve` | `POST /approve` — HITL resume |
| `/artifact` | `GET /:threadId`, `GET /list` |
| `/auth` | `POST /register`, `POST /login` |
| `/campaign` | `GET /list`, `POST /approve/:id` |
| `/feedback` | `POST /`, `GET /negative` |
| `/finance` | `GET /costs`, `GET /transactions` |
| `/inbox` | `GET /`, `GET /:threadId` |
| `/knowledge` | `POST /upload`, `GET /search` |
| `/missions` | `GET /`, `GET /:threadId` |
| `/prompts` | `GET /`, `PUT /:agent`, `DELETE /:agent` |
| `/security` | `GET /events`, `GET /summary` |
| `/skills` | `GET /`, `PUT /:id` |
| `/social` | `GET /accounts`, `POST /connect`, `POST /schedule` |
| `/support` | `GET /tickets`, `POST /response/:ticketId` |
| `/tenant` | `GET /config`, `PUT /config` |

### God Mode Admin Routes (`/api/admin/*`)

Protected by `requireAdmin` middleware — `Client.isAdmin === true` required.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tenants` | All tenants + plan + live status + monthly workflow count |
| `GET` | `/tenants/:slug` | Tenant detail + config |
| `POST` | `/tenants/:slug/suspend` | Suspend tenant (non-admin only) |
| `POST` | `/tenants/:slug/unsuspend` | Restore suspended tenant |
| `GET` | `/tenants/:slug/live` | SSE — Ghost Mode stream |
| `GET` | `/events/global` | SSE — All-tenant global stream |
| `GET` | `/workflows/active` | In-memory `activeWorkflows` Map |
| `GET` | `/workflows/recent` | Aggregated recent workflows *(must be before `/:threadId`)* |
| `GET` | `/workflows/:threadId/snapshots` | Zaman Makinesi snapshots |
| `GET` | `/security` | Security metrics + recent events |
| `GET` | `/logs` | Admin audit log |
| `GET` | `/finance` | Global P&L + margin alerts |
| `GET` | `/finance/live` | SSE — Real-time `cost_tick` stream |
| `POST` | `/tenants/:slug/throttle` | Toggle tenant throttle |
| `GET` | `/ips` | Banned IP list |
| `POST` | `/ips/ban` | Ban an IP |
| `DELETE` | `/ips/:ip` | Unban an IP |

---

## SSE Event Buses

Three independent `EventEmitter` instances to avoid circular dependencies:

```
agentEventBus    — per-thread workflow events (agent_active, workflow_complete, error)
systemEventBus   — admin global + ghost mode + snapshot_saved signals
costEventBus     — LLM cost ticks for FinOps real-time chart
```

**Pattern:** `costTracker.js` → emits on `costEventBus` → `adminController.js` listens. Never import `adminController` from `costTracker`.

---

## Models (16 Collections)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `ActionQueue` | threadId, actionType, payload, status | MOAT Layer 4 buffer |
| `BannedIP` | ip, reason, bannedBy, expiresAt | Admin bans; loaded into `bannedIPCacheService` Map |
| `CampaignDraft` | threadId, campaignContent, status | CMO-generated marketing campaigns |
| `Client` | name, slug, apiKey, plan, isAdmin | Tenant registry. `isAdmin` unlocks admin routes |
| `Feedback` | threadId, vote, reason, agentName | 👍/👎 → `KRITISCHE LERNREGEL` injection |
| `Knowledge` | clientId, content, embedding[1536] | RAG vector store |
| `Report` | threadId (unique), content, status | Main artifact |
| `ScheduledPost` | platforms, content, scheduledAt | Social media queue |
| `SecurityEvent` | eventType, severity, threatScore | Guardrail audit log. TTL: 7d |
| `Skill` | id, name, configSchema | Dynamic tool registry |
| `SocialAccount` | platform, accessToken, isConnected | OAuth credentials |
| `SupportTicket` | platform, category, draftResponse | Incoming customer tickets |
| `SystemPrompt` | agentName, promptText, clientId | Per-tenant custom prompts. Unique: `(agentName, clientId)` |
| `TenantConfig` | clientId, configObject | Config overrides. `configObject.throttled` blocks LLM. `configObject.socialAuto` enables multi-tenant social autopilot: `{ enabled, platform, topics[], postCount, requireHITL, integrations: { telegramBotToken, telegramChatId } }` |
| `Transaction` | clientId, agentId, inputTokens, costUsd | LLM token cost tracking |
| `WorkflowSnapshot` | threadId, step, nodeName, keyState | Time Machine per-node snapshots. TTL: 7d |

---

## Services (11 Modules)

| Service | Purpose |
|---------|---------|
| `actionWorkerService.js` | Polls `ActionQueue` every 5s, validates + executes external calls |
| `bannedIPCacheService.js` | In-memory IP ban Map — O(1) lookup in middleware |
| `costEventBus.js` | Shared EventEmitter for LLM cost events (avoids circular imports) |
| `costTracker.js` | Token → USD cost + `cost_tick` emit |
| `cronService.js` | Daily R&D jobs (23:00 cron), `runDailySocialScheduler()` — iterates all tenants with `socialAuto.enabled: true`, calls `generateAndScheduleContent()` per topic per platform |
| `gmailService.js` | OAuth2 Gmail read/send |
| `googleSheetsService.js` | Audit trail append |
| `promptRepository.js` | Custom prompt CRUD with 60s in-memory cache |
| `ragService.js` | Gemini embeddings → MongoDB vector search |
| `socialMediaService.js` | Twitter/X, LinkedIn, Instagram, Facebook, Google Ads publishers |
| `telegramBotService.js` | 2-way Telegram bot → triggers `runHotLeadWorkflow` |

---

## Project Structure

```
server/
├── src/
│   ├── index.js                    # Express + MongoDB + cron + Telegram startup
│   ├── agents/                     # 16 agent node functions
│   ├── workflows/
│   │   ├── graph.js                # StateGraph definition
│   │   └── runner.js               # Workflow runners + SSE buses + snapshot emitter
│   ├── state/graphState.js         # Zod-based LangGraph state schema
│   ├── controllers/                # 18 route controllers
│   ├── routes/                     # 18 route modules
│   ├── models/                     # 16 Mongoose schemas
│   ├── services/                   # 11 utility services
│   ├── middleware/
│   │   ├── tenant.js               # API key auth → req.clientId
│   │   ├── rateLimiter.js          # Per-tenant rate limiting + banned IP check
│   │   ├── admin.js                # requireAdmin middleware
│   │   └── webhook.js              # n8n webhook validation
│   ├── config/plans.js             # SaaS plan definitions
│   ├── skills/index.js             # Dynamic skill tools
│   └── tools/scraperTool.js        # Tavily integration
├── scripts/
│   └── create-admin.js             # One-time admin account bootstrap
├── docs/
│   └── test.md                     # 18-test end-to-end test plan
├── .env.example
└── package.json
```

---

## Multi-Tenant Social Autopilot

Per-tenant social media content generation with HITL approval gate.

Configure via `POST /api/tenant/config`:
```json
{
  "socialAuto": {
    "enabled": true,
    "platform": "twitter",
    "topics": ["AI trends", "SaaS growth"],
    "postCount": 3,
    "requireHITL": true,
    "integrations": {
      "telegramBotToken": "...",
      "telegramChatId": "..."
    }
  }
}
```

Flow: `cronService` (daily) → `generateAndScheduleContent()` per tenant × topic → `ScheduledPost` (`AWAITING_APPROVAL`) → Telegram HITL notification → user approves in Social view → `actionWorkerService` → `N8N_PUBLISH_WEBHOOK` → platform.

Telegram token priority: `integrations.telegramBotToken` → `TELEGRAM_BOT_TOKEN` env.

---

## n8n Integration (7 Workflows)

n8n acts as a pure data pipeline — no LLM inside n8n. All classification stays in AI Brain.

Located in `../n8n-workflows/`. See `../n8n-workflows/README.md` for full setup.

| # | File | Direction | Trigger |
|---|------|-----------|---------|
| 1 | `email-classifier-workflow.json` | Inbound | Gmail Trigger |
| 2 | `twitter-listener.json` | Inbound | Polling every 5 min |
| 3 | `instagram-listener.json` | Inbound | Meta Webhook (real-time) |
| 4 | `youtube-listener.json` | Inbound | Polling every 15 min |
| 5 | `tiktok-listener.json` | Inbound | Polling every 30 min |
| 6 | `social-media-publisher.json` | Outbound | `N8N_PUBLISH_WEBHOOK` |
| 7 | `email-campaign-sender.json` | Outbound | Webhook |

**Inbound payload** sent to `POST /api/inbox`:
```json
{
  "platform":    "gmail|twitter|instagram|youtube|tiktok",
  "platform_id": "unique ID for idempotency",
  "author":      "@username or display name",
  "content":     "message content (max 3000 chars)"
}
```
Headers: `X-Api-Key` + `X-Webhook-Secret`

**Outbound:** `publisherAgent` → `ActionQueue` → `actionWorkerService` → `POST N8N_PUBLISH_WEBHOOK`  
TikTok / YouTube text posts return `MANUAL_REQUIRED` (no text-only API support).

---

## SaaS Plans

| Plan | Price | Agents | Max Revisions |
|------|-------|--------|---------------|
| `free` | $99/mo | fileSaver, publisher | 1 |
| `pro` | $299/mo | + scraper, writer, critic | 3 |
| `enterprise` | $999/mo | All agents | 5 |
| `holding` | $3,000+/mo | All + salesRep, auditor, supplyChain | unlimited |

---

## Critical Gotchas

- **Node signature:** Nodes that access `tenantConfig` or `clientId` MUST declare `(state, config)` — missing `config` causes `ReferenceError` at runtime
- **Report.clientId:** `fileAgent.js` does NOT save `clientId`. Always query `Report.exists({ threadId })`, never `{ threadId, clientId }`
- **Admin route ordering:** `/workflows/recent` MUST appear before `/workflows/:threadId/snapshots` in `adminRoutes.js`
- **Snapshot writes:** `.catch(() => {})` fire-and-forget — DB failures must never crash the workflow
- **Admin password hash:** Uses `crypto.scryptSync` — using any other algorithm silently creates an account that always fails login
- **Revision circuit breaker:** `revisionCount >= 5` → force `human_approval`. Never remove this guard
- **MongoDB vector index:** `Knowledge` requires Atlas vector search index `vector_index` with `numDimensions: 3072`
- **SSE event buffering:** `eventBuffers` Map holds events before frontend connects. Never remove this logic