# Azure Presale Studio — Design

Date: 2026-09-23
Status: Approved (brainstorming complete)

## 1. Overview & Goals

Azure Presale Studio is an AI-powered, full-stack web application that turns a natural-language
requirements prompt into a professional Azure solution architecture diagram, then lets the user
refine it conversationally and export presales deliverables.

**Primary user:** presales / solution architects preparing customer-facing Azure designs.

**Core user flow:**

1. **Landing page** (bolt.new/lovable.dev styled) — large prompt input, model picker, "Generate
   Architecture" button.
2. **Deep research + deep think** — the agent plans the best-fit architecture, grounded in
   official Azure documentation and live Azure pricing.
3. **Infinite canvas studio** — stunning diagram canvas with headless-style chat, agent state
   visualization, Notion-style in-diagram editing.
4. **Export** — report configuration wizard producing diagram image, IaC, proposal document,
   and cost estimate.

**Success criteria:**

- A requirements prompt produces a valid Azure architecture diagram (official icons, real ARM
  service types) without user correction in the golden path.
- Every element of the canvas is editable inline (Notion-style) and via natural-language chat.
- All four export artifacts generate from a single diagram JSON source of truth.
- Anonymous users get persistent, resumable chat session records with no sign-in gate.

## 2. Architecture & Deployment

**Single Next.js 15 app (App Router, TypeScript) deployed as a standalone Node server** — not
Vercel serverless. Agent runs execute in background worker threads inside the same Node runtime;
clients subscribe via SSE. No function timeouts because no serverless functions.

```
┌──────────────────────────────────────────────────────┐
│ Next.js 15 standalone (Node, single deploy)          │
│                                                      │
│  Web (React 19)          API layer                   │
│  ├ Landing /             ├ REST: canvases, diagram   │
│  ├ Canvas studio         │  ops, exports             │
│  │  (React Flow)         ├ SSE: /api/runs/:id/stream │
│  └ Chat + agent state    └ Worker (worker_threads):  │
│                             LangGraph.js run engine  │
│                                                      │
│  LangGraph.js graph: supervisor → researcher →       │
│  architect → diagram_builder → reviewer → done       │
│  MCP clients (TS SDK): azure-diagram, azure-docs,    │
│  azure-pricing   |   NIM client (OpenAI-compat)      │
│                                                      │
│  Postgres (Prisma): workspaces, canvases, runs,      │
│  messages, artifacts, exports                        │
└──────────────────────────────────────────────────────┘
```

**Why not a separate agent service:** one runtime, one deploy, shared TS diagram types
end-to-end, no cross-service SSE proxying.

**Checkpointing (mitigating LangGraph.js maturity risk):** every run's state (graph state,
messages, diagram JSON) persists to Postgres at each node transition via a **custom
Prisma-backed checkpointer** — not LangGraph.js's built-in saver. Resume-on-reload and
run-history replay read from this table, which also powers the agent-state visualization UI.
LangGraph.js maturity risk is contained to the graph orchestration layer only.

**Access model — anonymous sessions (no sign-in):**

- No authentication required. On first visit the server issues an httpOnly, secure,
  SameSite=Lax cookie containing a UUID session ID.
- All records (canvases, runs, messages, artifacts) are scoped by session ID in Postgres.
  Chat session records are durable and resumable across visits — same cookie, same history.
- NextAuth/Auth.js is **not** used. If optional sign-in is added later, it upgrades a session
  to a named workspace via a single additive migration (session row gains nullable identity
  fields).
- Session isolation enforced at the API layer: every query filters by the cookie's session ID.
- The NIM API key is stored per-session workspace, encrypted at rest (AES-256-GCM).

## 3. Diagram Model & Canvas

**Diagram JSON** is the single source of truth — every export derives from it.

```jsonc
{
  "version": 1,
  "meta": { "title": "Contoso E-commerce", "region": "eastus" },
  "nodes": [{
    "id": "node_1",
    "service": "Microsoft.Web/sites",     // Azure ARM type → icon lookup
    "label": "Frontend App Service",
    "parent": "rg_1",                     // grouping: resource group / VNet / subnet
    "config": { "sku": "P1v3", "instances": 2 },
    "position": { "x": 120, "y": 80 },
    "annotations": [{ "id": "a1", "type": "note", "text": "auto-scale on CPU>70%" }]
  }],
  "edges": [{ "id": "e1", "from": "node_1", "to": "node_2", "label": "HTTPS", "style": "solid" }],
  "groups": [{ "id": "rg_1", "kind": "resource-group", "label": "rg-frontend-prod" }]
}
```

**Canvas:** React Flow (@xyflow/react) — infinite canvas with zoom, pan, minimap, multi-select.
Custom node = React component rendering an **official Azure icon** (SVG set from the Azure Icons
repo, keyed by ARM type) + label + status chip. React Flow parent/child nodes give native
grouping for subscriptions/resource groups/VNets.

**Notion-style in-diagram editing:**

- Click a label → inline `contentEditable` with slash-command (`/note`, `/tag`, `/config`) to
  attach annotations.
- A block-style side panel opens for rich config (SKU pickers, instance counts) written straight
  into `config` in the JSON.
- Node drag = position update, debounced autosave.

**Mutation channel:** agent mutations arrive over SSE as patch ops (add/remove/update
node/edge/group), applied to the same JSON store (Zustand + immer patches) that user edits use.
One mutation channel — user and agent edits never fork.

## 4. Agent Graph, MCP Tools & Skills

**LangGraph.js graph:**

```
supervisor ──▶ researcher ──▶ architect ──▶ diagram_builder ──▶ reviewer ──▶ END
     ▲              │                                        │
     └──────────────┴──────── editor (chat mutations) ◀──────┘
```

- **supervisor** — routes: initial generation vs in-chat edit vs clarification question.
  Small/fast model calls.
- **researcher** — *deep research*: queries **azure-docs MCP** (Microsoft Learn search + fetch,
  official docs only) and **azure-pricing MCP** (retail price API) to ground the design. Emits a
  research brief with doc citations.
- **architect** — *deep think*: extended reasoning (NIM reasoning model, high token budget) →
  picks services, SKUs, topology, redundancy pattern from the brief. Emits a structured
  architecture decision record.
- **diagram_builder** — deterministic: converts the decision record into diagram JSON via the
  **azure-diagram MCP** (icon lookup, layout hints, validation against the ARM type registry).
  The LLM never invents node types — validation rejects unknown ARM types back to the architect
  for one retry.
- **reviewer** — checks best-practice rules (naming, redundancy, region pairing, cost outliers)
  → passes to END or loops back with findings (max 2 loops).
- **editor** — handles in-chat natural-language mutations ("add a Redis cache in front", "make
  the DB zone-redundant") → patch ops, same validation gate.

**Agent state visualization:** each node transition writes `{node, status, startedAt, findings,
citations}` to the run record → SSE → horizontal timeline in the chat panel (node chips:
queued/running/done, expandable to show the research brief and doc links live).

**Skills as prompt modules** (not separate services): solution-architect, cost-estimator,
proposal-writer are versioned system-prompt + tool-allowlist bundles injected into the relevant
nodes. Cost/proposal skills run on-demand in the export flow, not in the main graph.

**MCP servers:**

- `azure-docs` — Microsoft Learn search + page fetch (official Azure documentation only).
- `azure-pricing` — Azure Retail Prices API queries (per-service, per-SKU, per-region).
- `azure-diagram` — ARM type registry, icon lookup, layout hints, diagram JSON validation.

## 5. Frontend UX & Exports

**Landing page** (bolt.new/lovable.dev style): centered hero, large prompt textarea with
placeholder examples ("Design a highly available e-commerce platform on Azure…"), model picker
(NIM models, per-session default), "Generate Architecture" → creates canvas + run, redirects to
`/canvas/:id`. Below fold: example gallery + recent canvases (same session cookie).

**Canvas studio — three zones:**

- **Left rail:** layers panel (group tree: subscriptions → RGs → nodes, toggle visibility),
  export menu.
- **Center:** infinite canvas. Top bar: canvas title (inline editable), zoom/minimap, export
  button, "Done — Configure Report" CTA.
- **Right:** headless-style chat panel — messages stream in, agent-state timeline on top, input
  box pinned bottom. Slash commands in chat (`/cost`, `/proposal`, `/explain <node>`) invoke
  skills directly.

**Export flow:** "Done" opens a report-configuration wizard (pick sections: architecture
overview, cost table, assumptions, recommendations; audience tone; branding color) → agent
generates proposal content → all four artifacts render:

- **SVG/PNG** — server-side render of diagram JSON via `@resvg/resvg` (no headless browser).
- **Bicep/Terraform** — deterministic template emitter from diagram JSON (one module per
  resource group).
- **DOCX** — `docx` npm package from the proposal content.
- **XLSX** — `exceljs`, one sheet per service category with SKU/pricing detail from
  azure-pricing MCP data.

All downloadable as a zip or individually.

## 6. Data Model

**Prisma schema (core tables):**

- `Session` — id (UUID, cookie-bound), createdAt, lastSeenAt, nimKeyEncrypted (AES-256-GCM),
  defaultModel
- `Canvas` — sessionId, title, diagram JSON (jsonb), updatedAt
- `Run` — canvasId, type (generate/edit/cost/proposal), status, graph state snapshot (jsonb),
  timeline events (jsonb), error
- `Message` — runId, role, content (chat history)
- `Artifact` — runId, kind (svg/bicep/tf/docx/xlsx), storage key (local disk or blob), metadata

## 7. Error Handling

- **Agent-run failures** persist status + error to the run record → chat panel shows retry
  affordance; run resumes from last checkpoint.
- **MCP tool failures:** azure-docs/pricing degrade gracefully (architect proceeds with model
  knowledge, flags "ungrounded"); azure-diagram validation failure loops back to architect
  (max 1 retry, then surfaces to user).
- **NIM key invalid** → immediate workspace-settings prompt.
- **SSE disconnects:** client reattaches and replays from run record — no lost state.

## 8. Testing

- **Vitest unit tests** for the deterministic layers: diagram validation, patch ops,
  Bicep/Terraform/XLSX emitters, icon lookup.
- **Integration tests** for the graph using a recorded-replay NIM mock (deterministic, no live
  API).
- **Playwright E2E** for the golden path: prompt → canvas renders → inline edit → export zip.

## 9. Build Order (Phases)

1. **Core MVP** — schema + anonymous sessions + landing page + diagram generation (research →
   architect → builder → canvas renders).
2. **Canvas editing** — Notion-style inline editing + chat panel + agent state viz + editor node.
3. **Export suite** — report wizard + SVG/PNG + Bicep/Terraform + DOCX + XLSX.
4. **Polish** — MCP packaging docs, reviewer loop tuning, degradation UX.

## 10. Dependencies

- Next.js 15, React 19, @xyflow/react, Zustand + immer, Tailwind CSS
- @langchain/langgraph, @langchain/core, @langchain/openai (OpenAI-compatible client for NIM)
- @modelcontextprotocol/sdk (MCP clients)
- Prisma + PostgreSQL
- @resvg/resvg, docx, exceljs, archiver
- Azure Icons SVG set (vendored, keyed by ARM type)
- NIM API: build.nvidia.com OpenAI-compatible endpoints, BYO key, model selectable per session
