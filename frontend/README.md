# AI Orchestra — Cyber-Nexus UI

> OSINT-style futuristic command center for the AI Orchestra multi-agent SaaS platform.

Built with **Next.js 14 App Router**, **TypeScript**, **Zustand**, **Framer Motion**, and **TailwindCSS**.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev        # http://localhost:3002
```

> Backend must be running at `http://localhost:3000` before the frontend can connect.
> See `../server/README.md` for backend setup.

---

## UI Panels

### Command Center (Default)
The main operator view. Submit tasks via the chat input, watch agents activate in real-time via SSE, and review reports through the right-panel HITL gate.

```
[Sidebar] → [Agent Grid + Chat] → [Right Panel: ReportViewer / BlueprintViewer]
```

- Real-time agent status updates (IDLE → THINKING → ACTIVE → SUCCESS)
- Awaiting approval → **AUTHORIZE** (publish) or **OVERRIDE** (revise with feedback)
- 👍/👎 feedback buttons on delivered reports (injects `KRITISCHE LERNREGEL` into future writer prompts)

### Inbox
Unified message hub with 3 tabs:
- **HITL** — Reports awaiting human approval
- **Support** — Customer service tickets from n8n webhooks
- **Campaigns** — CMO-generated marketing drafts (LinkedIn, Twitter, Meta Ads)

### CFO Dashboard
Token spend analytics and P&L per agent. Connects to `GET /api/finance/summary`.

### Knowledge Base
RAG vector store management. Upload PDFs, embed URLs, or add raw text. Powers the customer bot and RFP responder.

### Settings
- Agent Persona & Tone (multi-tenant config)
- Custom Prompts for ANALYZER / CRITIC / WRITER agents
- Skill Store toggle

### Social Media
Manage OAuth-connected social accounts (Twitter, LinkedIn, Instagram, Facebook, Google Ads).

### Security
MOAT guardrail event log. View blocked requests, threat scores, and injection attempts.

### Auditor / Supply Chain
Enterprise-tier dashboards for invoice auditing (FREN A) and inventory monitoring (FREN B).

### GOD MODE (Admin Only)
Full-system oversight panel. Only visible when logged in with `isAdmin: true`.

```
[Fleet Radar] │ [Operating Room / Ghost Viewer] │ [SOC Panel]
──────────────────────────────────────────────────────────────
              [FinOps Panel — Burn Rate + P&L + Throttle]
```

| Panel | Description |
|-------|-------------|
| **Fleet Radar** | All tenants — plan, product, live agent badge, suspend/unsuspend |
| **Ghost Mode** | Click a tenant → watch their real-time SSE stream as admin |
| **Operating Room** | Recent workflow list + Time Machine (per-node state snapshots) |
| **SOC Panel** | Security events, IP banning, admin audit logs |
| **FinOps** | Live burn rate sparkline (SSE), per-tenant P&L, throttle control |

**Access:** `node ../server/scripts/create-admin.js` → login with `admin@agentmatrix.io` / `Admin1234!`

---

## State Management

Single Zustand store at [src/store/agent-store.ts](src/store/agent-store.ts), split into slices:

| Slice | File | Responsibility |
|-------|------|---------------|
| Auth | `slices/authSlice.ts` | API key, login, workspace switching, `isAdmin` |
| Admin | `slices/adminSlice.ts` | God Mode panels, 3 SSE connections (global, ghost, finance) |
| Core | `agent-store.ts` | Workflow state, agent statuses, SSE events, reports |

Key state fields:
```typescript
workflowPhase: "IDLE" | "DISPATCHING" | "RUNNING" | "AWAITING_APPROVAL" | "PUBLISHING" | "DELIVERED" | "REVISING"
activeView:    "control" | "cfo" | "knowledge" | "settings" | "skills" | "social" | "security" | "auditor" | "supply" | "admin"
isAdmin:       boolean   // controls GOD MODE sidebar button visibility
```

---

## Real-time Architecture

```
Backend runner.js
    ├── agentEventBus   → GET /api/events/:threadId      → Workflow SSE (per-tenant)
    ├── systemEventBus  → GET /api/admin/events/global   → God Mode global SSE
    ├── systemEventBus  → GET /api/admin/tenants/:s/live → Ghost Mode SSE
    └── costEventBus    → GET /api/admin/finance/live    → FinOps burn rate SSE
```

All SSE connections are opened/closed via Zustand actions and managed in `useEffect` hooks.

---

## Component Structure

```
src/components/
├── admin/           # God Mode (10 components)
│   ├── admin-layout.tsx
│   ├── fleet-radar.tsx
│   ├── ghost-viewer.tsx
│   ├── operating-room.tsx
│   ├── time-machine.tsx
│   ├── state-inspector.tsx
│   ├── soc-panel.tsx
│   ├── finops-panel.tsx
│   ├── burn-rate-chart.tsx
│   └── ip-manager.tsx
├── auth/            # Login / Register modal
├── context/         # ReportViewer, right-panel
├── layout/          # Sidebar, RightPanel shell
├── settings/        # Agent prompts, tenant config
├── knowledge/       # RAG upload UI
├── social/          # Social account management
├── supply/          # Supply chain dashboard
└── ...
```

---

## Scripts

```bash
npm run dev      # Development server (port 3002)
npm run build    # Production build
npm run lint     # ESLint
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#070c14` / `bg-black` | Vantablack base |
| Neon Green | `#00ff88` / `#39ff14` | Active agents, success states |
| Cyan | `#00f0ff` | Primary accents, links |
| Amber | `#ffb000` | Warnings, elevated status |
| Red | `#ff2d55` | Alerts, GOD MODE, errors |

Animations via **Framer Motion**. Glassmorphism modals with `backdrop-blur`.