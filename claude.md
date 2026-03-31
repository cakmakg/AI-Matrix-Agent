# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Development Commands

### Backend (server/)
```bash
# Start the server (no npm start script — run directly)
cd server && node src/index.js

# Install dependencies
cd server && npm install
```
Server runs on `http://localhost:3000` (configurable via `PORT` in `.env`).

### Frontend (frontend/)
```bash
cd frontend && npm run dev    # Runs on http://localhost:3002
cd frontend && npm run build
cd frontend && npm run lint   # ESLint
```

### Environment Setup
Copy `server/.env.example` → `server/.env` and fill in:
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — AWS Bedrock LLM
- `MONGODB` — MongoDB Atlas connection string
- `TAVILY_API_KEY` — Web search
- `GEMINI_API_KEY` — Vector embeddings (Gemini `gemini-embedding-001`, 1536-dim)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Telegram bot
- `TWILIO_SID`, `TWILIO_TOKEN` — WhatsApp
- `DISCORD_WEBHOOK_URL` — Discord
- `GOOGLE_*` — Gmail OAuth2
- `N8N_PUBLISH_WEBHOOK` — n8n Social Media Publisher webhook URL (outbound posts)
- `N8N_WEBHOOK_SECRET` — Shared secret for n8n → AI Brain request verification (`X-Webhook-Secret` header)

---

## Architecture Overview

### Monorepo Structure
```
Agent-Matrix/
├── server/          # Node.js + Express + LangGraph (ES Modules, type: "module")
│   └── src/
│       ├── index.js                   # Entry: Express + MongoDB + cron + Telegram startup
│       ├── agents/                    # 16 AI agent node functions (LangGraph nodes + standalone)
│       ├── workflows/
│       │   ├── graph.js               # StateGraph definition (nodes + edges)
│       │   └── runner.js              # Workflow runners + SSE event bus + snapshot emitter
│       ├── state/graphState.js        # Zod-based LangGraph state schema
│       ├── controllers/               # 18 Express route handlers
│       ├── routes/                    # 18 route modules (all mounted under /api)
│       ├── models/                    # 16 Mongoose schemas
│       ├── services/                  # 11 utility services
│       ├── middleware/                # tenant.js, rateLimiter.js, webhook.js, admin.js
│       ├── scripts/create-admin.js    # One-time admin account bootstrap
│       ├── skills/index.js            # Dynamic skill tools for agents
│       └── tools/scraperTool.js       # Tavily web scraping integration
├── n8n-workflows/   # 7 production n8n workflow JSONs (inbound listeners + outbound publishers)
└── frontend/        # Next.js 14 App Router (TypeScript)
    └── src/
        ├── app/page.tsx               # Root layout: Sidebar + main view + RightPanel
        ├── components/                # 42 TSX components organized by feature
        │   └── admin/                 # 10 God Mode admin panel components
        └── store/
            ├── agent-store.ts         # Zustand store (single source of truth)
            ├── slices/adminSlice.ts   # Admin panel state + SSE connections
            └── types.ts               # All TypeScript interfaces
```

---

### LangGraph Workflow (Hub-and-Spoke with MOAT Guard)
Defined in [server/src/workflows/graph.js](server/src/workflows/graph.js):
```
START → guardrail (🛡️ threat detection + input sanitization)
           ↓
        orchestrator (🧠 routing engine: sets state.nextAgent)
           ↑
           ├← scraper       → orchestrator
           ├← analyzer      → orchestrator
           ├← innovator     → orchestrator
           ├← writer    ↔ critic (revision loop, max 5 iterations)
           ├← architect     → orchestrator
           ├← fileSaver     → orchestrator
           ⛔ [interruptBefore: human_approval] ← graph pauses here
           ↳ publisher      → orchestrator → END
```
- Routing decisions live entirely in `orchestratorNode` (sets `state.nextAgent`)
- `interruptBefore: ["human_approval"]` pauses execution; `/api/approve` resumes it
- After approval, `runPublishWorkflow` calls `publisherNode` directly (bypasses graph)
- `guardrailNode` is the first checkpoint — blocks high-threat inputs before they reach orchestrator

### SSE Real-time Streaming
`runner.js` exports `agentEventBus` (EventEmitter) and `emitToThread(threadId, event)`. Events are **buffered** in `eventBuffers` Map if the frontend SSE connection (`GET /api/events/:threadId`) hasn't opened yet, preventing lost updates. The frontend `agent-store.ts` opens the SSE connection on workflow start and processes `agent_activation` / `workflow_complete` / `workflow_error` events.

### HITL (Human-in-the-Loop) Flow
1. `fileSaver` saves artifact → sets `state.fileSaved = true`
2. Graph hits `interruptBefore: ["human_approval"]` → pauses
3. `runner.js` emits `workflow_complete` SSE event with report content
4. Frontend opens right panel with `ReportViewer`; user clicks Authorize or Override
5. `POST /api/approve` → `approvalController` resumes the graph thread

### Two-Layer Report Content Delivery
- **Live workflow**: `pendingContent` set in Zustand store from SSE `workflow_complete` event
- **After state reset / page reload**: `ReportViewer` auto-fetches from `GET /api/artifact/:threadId` when `pendingContent` is empty; syncs `threadId` + `workflowPhase` back to store

### LLM Model (AWS Bedrock Cross-Region EU)
All agents use: `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`
Vector embeddings: Google Gemini `gemini-embedding-001` (1536-dim, free tier)

---

## SaaS Products & Plans

Defined in `server/src/config/plans.js`. Each tenant has a `plan` and a `product` stored in `Client.js`.

### Plans
| Plan | Price | Allowed Agents | Max Revisions |
|------|-------|---------------|---------------|
| `free` | $99/mo | fileSaver, human_approval, publisher | 1 |
| `pro` | $299/mo | + scraper, writer, critic | 3 |
| `enterprise` | $999/mo | All agents | 5 |
| `holding` | $3,000+/mo | All agents + salesRep, auditor, supplyChain | 999 |

### Products & Routing Tracks — 6 Mega-Departments

**Refactored 2026-03-30** (Seçim Paradoksu strategy): 12 granular products consolidated into 6 departments. Each tenant has a single `product` field; multi-track departments expose **sub-tabs** in the UI — the active sub-tab prepends the task prefix before dispatch, enabling existing FREN routing to work without backend changes.

| Product (Dept.) | Sub-Tab | Task Prefix | Input | Agent Flow | Required Plan |
|----------------|---------|-------------|-------|-----------|---------------|
| `cx` | — | — | text | customerBot (standalone) | free |
| `growth` | Sosyal Medya | `TWITTER:`/`LINKEDIN:` | text | scraper → writer | pro |
| `growth` | Soğuk Satış | `COLD_OUTREACH: ` | url | scraper → writer | pro |
| `growth` | İhale Yanıtla | `RFP_RESPONSE: ` | file | writer → critic → fileSaver | pro |
| `strategy` | Rakip Radar | `INNOVATION_RADAR: ` | text | scraper → analyzer → innovator → writer | pro |
| `strategy` | Trend Radar | `TREND_RADAR: ` | text | scraper → analyzer → innovator → writer | pro |
| `strategy` | Stres Testi | `BUSINESS_STRESS_TEST: ` | file | analyzer → innovator → writer | pro |
| `backoffice` | Finans Denetim | `INVOICE_PROCESSING: ` | text | auditor → fileSaver | enterprise |
| `backoffice` | Stok Kontrolü | `STOCK_CHECK: ` | text | supplyChain → fileSaver | enterprise |
| `engineering` | — | — | text | architect → fileSaver | pro |
| `holding` | — | — | text | all agents | holding |

**SubTabs architecture** (`server/src/config/plans.js`): Products with multiple tracks define a `subTabs: [{ key, label, icon, inputType, taskPrefix }]` array in `PRODUCT_CONFIGS`. The frontend `job-queue.tsx` renders a tab bar and derives input type + task prefix from the active sub-tab. `orchestrator.js` is unaffected — it still routes on raw task string prefixes (FREN system).

**SaaSProduct TypeScript type** (`frontend/src/store/types.ts`): `"cx" | "growth" | "strategy" | "backoffice" | "engineering" | "holding"`

**FREN system** (deterministic pre-LLM guards in `orchestrator.js`): FREN S (sales), FREN A (audit), FREN B (supply), FREN R (RFP), FREN C (outreach), **FREN T (business stress test)**, FREN 0–6 (loop breakers). Routes on task string prefixes — unchanged by the mega-department refactor. See AGENTS.md for full table.

---

## Models (16 Collections)

| File | Key Fields | Purpose |
|------|-----------|---------|
| **ActionQueue.js** | `threadId, agentId, actionType, payload, status, result, attempts` | 🛡️ MOAT Layer 4: Agent action isolation buffer. Agents write; ActionWorker reads & executes. |
| **BannedIP.js** | `ip, reason, bannedBy, expiresAt` | Admin-banned IP addresses. Loaded into `bannedIPCacheService` Map on startup; checked in `rateLimiter.js` middleware. |
| **CampaignDraft.js** | `threadId, reportTitle, campaignContent, status, clientId` | CMO workflow output — multi-channel marketing campaigns awaiting approval. |
| **Client.js** | `name, slug, apiKey, plan, product, email, passwordHash, isAdmin` | Multi-tenant client registry. `isAdmin: true` unlocks `/api/admin/*` routes. `product` enum: `cx \| growth \| strategy \| backoffice \| engineering \| holding` (default `cx`). |
| **Feedback.js** | `threadId, clientId, vote (up/down), reason, agentName` | User feedback on published reports. Index: `(clientId, vote, createdAt)` for fast negative retrieval. Used by `writerAgent` to inject learning rules. |
| **Knowledge.js** | `clientId, title, content, embedding[1536], metadata` | RAG vector store. Requires Atlas vector search index `vector_index` (3072 dims). |
| **Report.js** | `threadId (unique), task, content, status, humanFeedback, clientId, confidenceScore` | Main artifact storage. Linked to workflow thread. |
| **ScheduledPost.js** | `platforms, content, mediaUrls, scheduledAt, status, threadId, campaignId, recurringCron` | Social media post queue. Index: `(status, scheduledAt)`. |
| **SecurityEvent.js** | `eventType, severity, clientId, threatScore, details, rawInput` | 🛡️ MOAT security audit log. TTL: 7 days. |
| **Skill.js** | `id (unique), name, sector[], description, configSchema` | Dynamic agent tool registry (swappable skills per tenant). |
| **SocialAccount.js** | `platform, username, accountId, accessToken, isConnected, followerCount` | OAuth credentials for Twitter, LinkedIn, Instagram, Facebook, Google Ads. |
| **SupportTicket.js** | `platform, from, subject, category, draftResponse, ragSources, aiSummary` | n8n webhook integration: incoming support tickets from email, YouTube, Slack, etc. |
| **SystemPrompt.js** | `agentName (ANALYZER/CRITIC/WRITER), promptText, clientId` | Per-tenant customizable agent instructions. Unique index: `(agentName, clientId)`. Cached in-memory with 60s TTL. |
| **TenantConfig.js** | `clientId, configObject` | Multi-tenant configuration overrides (skills, feature flags, persona). `configObject.throttled` disables LLM calls for that tenant. `configObject.socialAuto` enables social autopilot: `{ enabled, platform, topics[], postCount, requireHITL, integrations: { telegramBotToken, telegramChatId } }`. |
| **Transaction.js** | `clientId, agentId, inputTokens, outputTokens, costUsd, model` | LLM token cost tracking for Bedrock. |
| **WorkflowSnapshot.js** | `threadId, step, nodeName, clientId, tenantSlug, output (truncated), keyState` | Zaman Makinesi: per-node LangGraph state snapshot. Unique index: `(threadId, step)`. TTL: 7 days. |

---

## Agents (15 Node Functions)

| File | Node Name | Responsibility |
|------|-----------|---------------|
| **guardrailAgent.js** | `guardrail` | 🛡️ Threat detection via regex + heuristics. Blocks prompt injection, sanitizes inputs. |
| **orchestrator.js** | `orchestrator` | Routing engine: structured-output decision on `nextAgent`. Enforces revision counter guard. |
| **scraperAgent.js** | `scraper` | Web scraping via Tavily API. Returns raw data (news, competitors, market info). |
| **analyzerAgent.js** | `analyzer` | Strategic analysis → 3-point action plan. Supports **custom prompts** via `promptRepository`. |
| **innovatorAgent.js** | `innovator` | Ideation/R&D: creative suggestions, unorthodox solutions. |
| **writerAgent.js** | `writer` | Markdown reports & business content. Supports **custom prompts** + **feedback injection** (KRITISCHE LERNREGEL prefix). Tracks `revisionCount`. |
| **criticAgent.js** | `critic` | QA & revision feedback. Supports **custom prompts**. Max 5 revision loops. |
| **architectAgent.js** | `architect` | Technical blueprint generation: system design, API specs, infrastructure. |
| **fileAgent.js** | `fileSaver` | Artifact persistence to MongoDB. Does NOT save `clientId` — see gotchas. |
| **publisherAgent.js** | `publisher` | Notification dispatch: Telegram, Discord, webhooks, social media. |
| **humanNode** | `human_approval` | 🛑 Placeholder node — graph pauses here for HITL authorization. |
| **cmoAgent.js** | (async) | Marketing campaign generation from approved reports (`runCMOWorkflow`). |
| **customerBotAgent.js** | (async) | AI-generated customer service responses for support tickets. |
| **auditorAgent.js** | `auditor` | Invoice/document analysis (FREN A). Reads invoices via RAG, flags anomalies, returns `invoiceAnalysis`. |
| **supplyChainAgent.js** | `supplyChain` | Stock level monitoring (FREN B). Checks inventory, generates supplier order emails, returns `stockAlerts`. |
| **salesAgent.js** | `salesRep` | B2B sales negotiation (FREN S). Runs up to 3 negotiation rounds, tracks `negotiationRound`. |
| **socialContentAgent.js** | (async) | Multi-tenant social autopilot: reads `TenantConfig.socialAuto`, generates posts via Tavily + LLM, saves as `ScheduledPost` (`AWAITING_APPROVAL` when `requireHITL: true`), sends Telegram HITL notification per-tenant. Replaces `twitterContentAgent.js`. |

---

## Services (11 Utility Modules)

| File | Purpose |
|------|---------|
| **actionWorkerService.js** | 🛡️ MOAT Layer 4: Polls `ActionQueue` every 5s. Validates schema, whitelists action types, executes external API calls (Telegram, Discord, social). |
| **bannedIPCacheService.js** | In-memory `Map<string, BannedIPEntry>` for O(1) IP ban lookups. Loaded from MongoDB on startup; updated on ban/unban. Imported by `rateLimiter.js` — avoids circular dependency with `adminController.js`. |
| **costEventBus.js** | Shared `EventEmitter` for real-time LLM cost events. `costTracker.js` emits `"cost"` after each `Transaction.create`; `adminController.js` listens for FinOps SSE stream. Standalone module to avoid circular import. |
| **costTracker.js** | Tracks LLM token usage → USD cost. Logs to `Transaction` collection. Emits `cost_tick` event on `costEventBus` after each successful write. |
| **cronService.js** | Schedules recurring tasks via `node-cron`: proactive R&D jobs (daily 11pm), and `runDailySocialScheduler()` — iterates all tenants with `socialAuto.enabled: true` and calls `generateAndScheduleContent()` per topic per platform. |
| **gmailService.js** | OAuth2 Gmail integration: reads incoming emails, sends AI-drafted replies. |
| **googleSheetsService.js** | Appends workflow results to Google Sheets for audit trails. |
| **promptRepository.js** | Manages custom agent prompts. Exports `DEFAULT_PROMPTS`, `getPrompt`, `savePrompt`, `deletePrompt`. In-memory Map cache with 60s TTL. `savePrompt`/`deletePrompt` invalidate cache immediately. |
| **ragService.js** | RAG pipeline: chunks documents → Gemini embeddings (1536-dim) → stores in `Knowledge` collection for vector search. |
| **socialMediaService.js** | Platform-specific post publishers: Twitter/X, LinkedIn, Instagram, Facebook, Google Ads (via official SDKs). |
| **telegramBotService.js** | Telegram bot listening for `/start workflow_name` commands → triggers `runHotLeadWorkflow`. |

---

## Controllers & Routes (18 Modules)

All routes mount under `/api/*` via [server/src/routes/index.js](server/src/routes/index.js).

| Route Prefix | Controller | Key Endpoints |
|-------------|-----------|--------------|
| `/` | agentController | `GET /events/:threadId` (SSE), `POST /analyze`, `POST /rnd` |
| `/admin` | adminController | See God Mode Admin Routes table below. Protected by `requireAdmin` middleware. |
| `/approve` | approvalController | `POST /approve` — resume paused HITL workflow |
| `/artifact` | artifactController | `GET /:threadId`, `GET /list` |
| `/auth` | authController | `POST /register`, `POST /login` — login response includes `isAdmin` flag |
| `/campaign` | campaignController | `GET /:threadId`, `GET /list`, `POST /approve/:id` |
| `/feedback` | feedbackController | `POST /` — submit vote (up/down) + reason; `GET /negative` — last N negatives for ML retraining |
| `/finance` | financeController | `GET /costs`, `GET /transactions` |
| `/inbox` | inboxController | `GET /` — tickets + campaigns; `GET /:threadId` |
| `/knowledge` | knowledgeController | `POST /upload`, `GET /search` |
| `/missions` | missionController | `GET /` — history; `GET /:threadId` |
| `/prompts` | promptController | `GET /` — all agents; `PUT /:agent` — update; `DELETE /:agent` — reset to default |
| `/security` | securityController | `GET /events`, `GET /summary` |
| `/skills` | skillController | `GET /`, `PUT /:id`, `POST /:id/config` |
| `/social` | socialController | `GET /accounts`, `POST /connect`, `POST /schedule`, `DELETE /:id` |
| `/support` | supportController | `GET /tickets`, `POST /response/:ticketId` |
| `/tenant` | tenantController | `GET /config`, `POST /config` |

### God Mode Admin Routes (`/api/admin/*`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tenants` | All tenants + plan + live status + monthly workflow count |
| `GET` | `/tenants/:slug` | Single tenant detail + config |
| `POST` | `/tenants/:slug/suspend` | Suspend tenant (non-admin only) |
| `POST` | `/tenants/:slug/unsuspend` | Restore suspended tenant |
| `GET` | `/tenants/:slug/live` | SSE — Ghost Mode stream for selected tenant |
| `GET` | `/events/global` | SSE — All tenants global event stream |
| `GET` | `/workflows/active` | In-memory `activeWorkflows` Map snapshot |
| `GET` | `/workflows/recent` | MongoDB aggregated recent workflows (must be before `/:threadId`) |
| `GET` | `/workflows/:threadId/snapshots` | All Zaman Makinesi snapshots for a thread |
| `GET` | `/security` | Global security metrics + recent SecurityEvents |
| `GET` | `/logs` | AdminLog entries |
| `GET` | `/finance` | Global P&L, per-tenant margins, finance alerts |
| `GET` | `/finance/live` | SSE — Real-time cost_tick stream (FinOps burn rate) |
| `POST` | `/tenants/:slug/throttle` | Enable/disable throttle for tenant |
| `GET` | `/ips` | List banned IPs |
| `POST` | `/ips/ban` | Ban an IP address |
| `DELETE` | `/ips/:ip` | Unban an IP address |

---

## Feature: Multi-Tenant Social Autopilot

Per-tenant social media content generation with HITL approval gate.

**Files:** `socialContentAgent.js` (agent), `cronService.js` (scheduler), `TenantConfig.js` (config store), `ScheduledPost.js` (queue)

**How it works:**
1. Admin sets `configObject.socialAuto = { enabled: true, platform: "twitter", topics: [...], postCount: 3, requireHITL: true, integrations: {...} }` via `POST /api/tenant/config`
2. `cronService.js` runs `runDailySocialScheduler()` daily — queries all `TenantConfig` docs where `configObject.socialAuto.enabled === true`
3. For each tenant × topic, `generateAndScheduleContent(topic, platform, socialAutoCfg, clientId, integrations)` scrapes Tavily + generates posts via LLM
4. Posts saved as `ScheduledPost` with `status: "AWAITING_APPROVAL"` (when `requireHITL: true`) or `status: "SCHEDULED"`
5. If `requireHITL === true` and posts created: `sendHITLNotification()` fires a Telegram message to the tenant's bot (falls back to global `TELEGRAM_BOT_TOKEN`)

**Telegram notification priority:** `tenantIntegrations.telegramBotToken` → `process.env.TELEGRAM_BOT_TOKEN`

**AWAITING_APPROVAL posts:** Visible in Social view; user approves → status becomes `SCHEDULED`; actionWorkerService picks up and posts via `N8N_PUBLISH_WEBHOOK`.

---

## Feature: n8n Workflow Integration

7 production-ready n8n workflow JSON files in `n8n-workflows/`. n8n acts as a pure data pipeline — no LLM inside n8n; all AI classification stays in AI Brain.

| # | File | Direction | Trigger |
|---|------|-----------|---------|
| 1 | `email-classifier-workflow.json` | Inbound | Gmail Trigger |
| 2 | `twitter-listener.json` | Inbound | Polling every 5 min |
| 3 | `instagram-listener.json` | Inbound | Meta Webhook (real-time) |
| 4 | `youtube-listener.json` | Inbound | Polling every 15 min |
| 5 | `tiktok-listener.json` | Inbound | Polling every 30 min |
| 6 | `social-media-publisher.json` | Outbound | Webhook (`N8N_PUBLISH_WEBHOOK`) |
| 7 | `email-campaign-sender.json` | Outbound | Webhook |

**Inbound flow:** Platform → n8n (normalize) → `POST /api/inbox` with `X-Api-Key` + `X-Webhook-Secret` → AI Brain classifies → HITL or auto-respond.

**Outbound flow:** AI Brain `publisherAgent` → `ActionQueue` → `actionWorkerService` → `POST N8N_PUBLISH_WEBHOOK` → `social-media-publisher.json` → platform.

**Instagram:** 2-step publish (create container → `media_publish`). **TikTok/YouTube:** Text-only posts not supported — return `MANUAL_REQUIRED`. **Email batching:** 50 recipients/batch with 2s delay (anti-spam).

See `n8n-workflows/README.md` for full setup instructions, ENV variables, and credentials.

---

## Feature: Editable Agent Prompts (Feature 2)

Custom per-tenant prompts for ANALYZER, CRITIC, WRITER agents.

**Files:** `SystemPrompt.js` (model), `promptRepository.js` (service), `promptController.js` + `promptRoutes.js`, [settings-view.tsx](frontend/src/components/settings/settings-view.tsx) ("Ajan Promptları" tab)

**How it works:**
1. `promptRepository.getPrompt(agentName, clientId)` checks 60s in-memory cache → MongoDB → returns `null` if no custom prompt
2. Each agent calls `getPrompt` at node entry; falls back to `DEFAULT_PROMPTS[agentName]` if null
3. Settings UI tab shows 3 agent cards (ANALYZER/CRITIC/WRITER) with per-card "Speichern" / "Reset" buttons
4. Header "SPEICHERN" button is hidden on the "prompts" tab (`style={{ display: "none" }}`)

**WRITER prompt priority:** DB custom prompt → `tenantConfig.agentPersona` → hardcoded default

---

## Feature: Feedback Loop (Feature 4)

User 👍/👎 buttons inject learning rules into the Writer agent's future prompts.

**Files:** `Feedback.js` (model), `feedbackController.js` + `feedbackRoutes.js`, [report-viewer.tsx](frontend/src/components/context/report-viewer.tsx), `writerAgent.js` (injection)

**How it works:**
1. After a report reaches `DELIVERED` / `PUBLISHED` / `APPROVED` status, `ReportViewer` shows "War dieser Bericht hilfreich?" with 👍/👎
2. 👎 opens a reason textarea; on submit → `POST /api/feedback` with `{ threadId, vote: "down", reason, agentName: "WRITER" }`
3. At the start of every `writerNode` invocation, `getRecentNegativeFeedbacks(clientId, 3)` fetches last 3 `vote: "down"` entries
4. If any exist, a `⚠️ KRITISCHE LERNREGEL` prefix is prepended to the writer's prompt before all branches (revision, social media, main report)
5. Feedback display logic in `report-viewer.tsx`:
   - `showFeedback = workflowPhase === "DELIVERED" || reportStatus === "PUBLISHED" || reportStatus === "APPROVED"`
   - Buttons hidden while `workflowPhase === "PUBLISHING"` or after `feedbackDone === true`

---

## Frontend Store (agent-store.ts)

**Framework:** Zustand

### Key State Fields
```typescript
// Workflow
threadId: string;
task: string;
workflowPhase: "IDLE" | "DISPATCHING" | "RUNNING" | "AWAITING_APPROVAL" | "PUBLISHING" | "DELIVERED" | "REVISING";
agentStatuses: Record<AgentId, AgentStatus>;  // AgentStatus: "IDLE"|"THINKING"|"ACTIVE"|"SUCCESS"|"ERROR"
activeAgent: AgentId | null;

// Report content
pendingContent: string;       // from SSE workflow_complete event
reportStatus: "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED";

// Navigation
activeView: "control" | "cfo" | "knowledge" | "settings" | "skills" | "social" | "security" | "auditor" | "supply" | "admin";

// UI
alerts: SystemAlert[];
logs: LogEntry[];
```

---

## 🛡️ Security Architecture (MOAT — 4 Layers)

| Layer | Where | Mechanism |
|-------|-------|-----------|
| **1 — Input Guard** | `guardrailNode` (LangGraph) | Regex threat detection, prompt injection blocking, task sanitization |
| **2 — Rate Limiting** | `rateLimiter.js` (Express middleware) | Per-tenant requests/window limits |
| **3 — Authentication** | `tenant.js` (Express middleware) | API key validation → injects `req.clientId` |
| **4 — Action Isolation** | `actionWorkerService.js` + `ActionQueue` | Agents write to queue; worker validates schema + whitelist before executing external APIs |

---

## Critical Gotchas

**LangGraph node signature**: Nodes receive `(state, config)` — `config` must be explicitly declared as the second parameter if you reference `config?.configurable` inside the function. Missing `config` causes `ReferenceError: config is not defined` at runtime.

**Report model has no original `clientId`**: `fileAgent.js` saves `Report` documents without filtering by `clientId`. Never query `Report.exists({ threadId, clientId })` — use `Report.exists({ threadId })` only.

**ES Modules throughout server**: `server/package.json` has `"type": "module"`. Use `import`/`export` syntax everywhere — `require()` will fail.

**Revision loop guard**: `orchestrator.js` checks `state.revisionCount >= 5` as a hard circuit breaker. Always increment `revisionCount` in the writer node and check it in orchestrator to prevent infinite Writer ↔ Critic loops.

**MongoDB vector index**: The `Knowledge` collection requires a MongoDB Atlas vector search index named `vector_index` with `numDimensions: 3072` for Gemini embeddings. If RAG search fails, verify this index exists in Atlas.

**promptRepository cache invalidation**: `savePrompt` and `deletePrompt` both call `cache.delete(key)` immediately. The next `getPrompt` call after a save/reset always hits MongoDB for a fresh value — no stale cache issues.

**SystemPrompt unique index**: `(agentName, clientId)` is a compound unique index. Always use `findOneAndUpdate` with `upsert: true` when saving prompts — never plain `create`.

**Feedback requires reason on downvote**: `feedbackController.submitFeedback` requires a non-empty `reason` string when `vote === "down"`. Frontend textarea submit button is disabled if reason is empty.

**SSE event buffering**: `eventBuffers` Map caches SSE events emitted before the frontend opens the `/api/events/:threadId` connection. Events are delivered in order when the connection opens. Never remove buffering logic.

**Admin route ordering**: In `adminRoutes.js`, `/workflows/recent` MUST be declared before `/workflows/:threadId/snapshots`. Express matches routes top-down — the literal string `"recent"` would otherwise be captured as a `:threadId` param.

**Admin circular dependencies (two patterns)**: (1) `bannedIPCacheService.js` — standalone module imported by both `rateLimiter.js` and `adminController.js`. (2) `costEventBus.js` — standalone EventEmitter imported by `costTracker.js` (emitter) and `adminController.js` (listener). Never import `adminController` from either service module.

**WorkflowSnapshot fire-and-forget**: In `runner.js`, snapshot writes use `.catch(() => {})`. DB failure must NEVER crash the workflow. The `snapshot_saved` systemEventBus emit fires after the `.catch()` so it always runs.

**Admin login `isAdmin` in response**: `authController.login` must include `isAdmin: client.isAdmin` in the response `client` object. `api-key-modal.tsx` passes it to `setWorkspaceInfo` → localStorage (`ai_orchestra_is_admin`). Missing this means GOD MODE button never appears.

**Admin account bootstrap**: `node scripts/create-admin.js` — uses `scryptSync` matching `authController.js`. Any other hash algorithm silently creates an account that always fails login.

---

## Project Overview

**Project Name:** AI Orchestra (Agent-Matrix) & Cyber-Nexus UI

A highly autonomous Multi-Agent AI System designed to operate as a complete digital company — not a simple chatbot.

1. **Backend (The Brain):** Node.js server running a 15-Agent Swarm orchestrated by LangGraph. Agents (Orchestrator, Scraper, Analyzer, Innovator, Writer, Critic, Architect, Publisher, Auditor, SupplyChain, SalesRep, etc.) search the web autonomously, write reports, manage campaigns, audit invoices, monitor supply chains, and trigger proactive R&D via cron jobs.

2. **Frontend (The Command Center):** Next.js 14 "Cyber-Nexus" UI — an OSINT-style futuristic dashboard where a Human-in-the-Loop monitors live agent status, reads generated artifacts (Markdown), provides Authorization or Rejection, and configures tenant-specific agent prompts.

## Tech Stack

**Backend:**
- Runtime & Framework: Node.js (v18+), Express.js
- AI Orchestration: LangGraph (StateGraph), LangChain
- LLM: Anthropic Claude 3.5 Sonnet via AWS Bedrock (EU cross-region)
- Embeddings: Google Gemini `gemini-embedding-001`
- Tools: Tavily Search API, node-cron
- Database: MongoDB Atlas

**Frontend:**
- Framework: Next.js 14 (App Router), React, TypeScript
- Styling: TailwindCSS, Framer Motion, Glassmorphism
- Data: `react-markdown`, `remark-gfm`, `react-syntax-highlighter`
- State: Zustand
- Real-time: SSE (Server-Sent Events)

---

## Coding Rules

**1. General Engineering Standards:**
- Write clean, modular, self-documenting code.
- **Strict TypeScript:** Never use the `any` type. Define clear interfaces for all AI responses and state objects.
- **Error Handling:** Always wrap API calls and AI invocations in `try/catch`. Fail gracefully and log to terminal.

**2. Backend & LangGraph Rules:**
- **NO INFINITE LOOPS:** All cyclic LangGraph routes MUST have a hardcoded `revisionCount` limit (currently 5). If limit is reached, force-route to END or human node.
- **Agent Modularity:** Each agent has a single responsibility. Do not combine scraping + analysis in one node.
- **HITL Gate:** System must pause at `human_approval` node. Never skip the interrupt gate.
- **Config parameter:** Always declare `(state, config)` for any node that reads `tenantConfig` or `clientId`.

**3. Frontend (UI/UX) Design Rules:**
- **Theme:** OSINT / Hacker Command Center / SpaceX Mission Control.
- **Colors:** Vantablack (`bg-black`) background. Accents: Neon Green (`#00ff88`), Cyan (`#00f0ff`), Alert Amber/Red. NO generic white SaaS cards.
- **Animations:** `framer-motion` + Tailwind pulse for active nodes. The UI must feel "alive" during processing.
- **Modals:** Heavy `backdrop-blur` (Glassmorphism) for the Authorization Gate.

## Memory

**LangGraph State (Backend):**
- Schema in `state/graphState.js` (Zod): `messages`, `activeAgent`, `scrapedData`, `finalContent`, `blueprint`, `revisionCount`, `fileSaved`, `nextAgent`, `confidenceScore`, `tenantConfig`
- Persistence: MongoDB + LangGraph `MemorySaver` checkpointer for pause/resume across threads

**Frontend State (Zustand):**
- `agent-store.ts` is the single source of truth for all UI state
- `threadId` links browser actions to backend workflow threads
- Live terminal logs and agent highlights driven by SSE events from backend
