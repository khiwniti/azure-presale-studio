# Azure Presale Studio

## What This Is

Azure Presale Studio is an AI-powered full-stack web application that turns a natural-language requirements prompt into a professional Azure solution architecture diagram. It lets presales engineers and solution architects refine the design conversationally through a headless-style chat panel and export a complete presales package — diagram image, IaC templates, proposal document, and cost estimate — all from a single diagram JSON source of truth.

## Core Value

A requirements prompt produces a valid Azure architecture diagram (official icons, real ARM service types) on the golden path with no user correction required, and all four export artifacts derive deterministically from that same diagram JSON.

## Requirements

### Validated
(None yet — ship to validate)

### Active

**Phase 1 — Core MVP**
- [ ] Postgres schema + Prisma migrations for Session, Canvas, Run, Message, Artifact
- [ ] Anonymous session issuance: httpOnly UUID cookie, session isolation at API layer
- [ ] NIM API key storage per session with AES-256-GCM encryption
- [ ] Landing page (bolt.new/lovable.dev style): hero prompt textarea, model picker, Generate button
- [ ] LangGraph.js worker_threads graph: supervisor → researcher → architect → diagram_builder
- [ ] MCP client integration: azure-docs (Microsoft Learn), azure-pricing (Retail Prices API)
- [ ] azure-diagram MCP: ARM type registry, icon lookup, diagram JSON validation
- [ ] Diagram JSON schema v1: nodes with ARM service types, edges, groups (RG/VNet/subnet)
- [ ] React Flow canvas: renders diagram JSON with official Azure SVG icons keyed by ARM type
- [ ] SSE endpoint `/api/runs/:id/stream` delivering agent state transitions and patch ops
- [ ] Custom Prisma-backed checkpointer: persists graph state + diagram JSON at every node transition
- [ ] Canvas route `/canvas/:id`: redirect from landing after run creation

**Phase 2 — Canvas Editing**
- [ ] Notion-style inline label editing with slash-command palette (`/note`, `/tag`, `/config`)
- [ ] Block-style side panel for SKU pickers and instance count config written into diagram JSON
- [ ] Node drag with debounced autosave to Postgres
- [ ] Agent state timeline: horizontal chip strip (queued/running/done) expandable to research brief + citations
- [ ] Chat panel: streaming message display, input box, slash commands (`/cost`, `/proposal`, `/explain <node>`)
- [ ] Editor node in LangGraph graph: natural-language patch ops through same validation gate
- [ ] Zustand + immer patch store: single mutation channel for user edits and agent SSE patches
- [ ] Layers panel (left rail): group tree with visibility toggles

**Phase 3 — Export Suite**
- [ ] Report configuration wizard: section picker, audience tone, branding color
- [ ] SVG/PNG export via `@resvg/resvg` (server-side, no headless browser)
- [ ] Bicep/Terraform deterministic template emitter: one module per resource group from diagram JSON
- [ ] DOCX export via `docx` npm package from proposal content
- [ ] XLSX cost estimate via `exceljs`: one sheet per service category with SKU/pricing data
- [ ] Zip bundle download + individual artifact download
- [ ] Cost-estimator and proposal-writer skills as versioned prompt + tool-allowlist bundles

**Phase 4 — Polish**
- [ ] Reviewer node: best-practice checks (naming, redundancy, region pairing, cost outliers), max 2 loops
- [ ] MCP degradation: azure-docs/pricing failures flag "ungrounded" and continue; azure-diagram validation loops back to architect (max 1 retry)
- [ ] SSE reconnect replay from run record on client disconnect
- [ ] Agent-run failure retry affordance: resume from last checkpoint in chat panel
- [ ] NIM key invalid → immediate workspace-settings prompt
- [ ] Example gallery + recent canvases on landing page (session-scoped)

**Testing**
- [ ] Vitest unit tests: diagram validation, patch ops, Bicep/Terraform/XLSX emitters, icon lookup
- [ ] Integration tests: full graph run with recorded-replay NIM mock (no live API)
- [ ] Playwright E2E: prompt → canvas renders → inline edit → export zip golden path

### Out of Scope

- **User authentication / sign-in** — anonymous cookie sessions cover all v1 requirements; auth is an additive migration when needed (session row gains nullable identity fields)
- **Serverless / Vercel deployment** — agent runs exceed function timeout limits; standalone Node is required
- **Separate agent microservice** — co-located worker_threads share TS diagram types end-to-end and avoid cross-service SSE proxying
- **LangGraph.js built-in checkpointer** — replaced by custom Prisma-backed checkpointer to contain maturity risk and power run-history replay
- **Non-Azure cloud providers** — ARM type registry and icon set are Azure-specific; multi-cloud support is out of scope for v1
- **Real-time multi-user collaboration** — single-session model is intentional; collaboration requires auth and conflict resolution not designed here

## Context

The tool targets presales and solution architects who currently produce Azure architecture diagrams and proposal decks manually. The deep-research approach — grounding the architect agent in live Microsoft Learn documentation and Azure Retail Prices API data — is the primary differentiator over generic AI diagram tools. Official Azure SVG icons keyed by ARM service type give diagrams immediate credibility in customer conversations.

The agent graph is intentionally linear (supervisor → researcher → architect → diagram_builder → reviewer) with a single editor branch for chat mutations, keeping the control flow auditable. All agent state is persisted to Postgres at every node transition so the UI can replay history and the run can resume after failure without re-querying the LLM.

The diagram JSON is the system's single source of truth. Every output — canvas rendering, IaC templates, DOCX proposal, XLSX cost table — derives from it deterministically. This prevents drift between what the customer sees on screen and what they receive in the export package.

NVIDIA NIM supplies the LLM backend via an OpenAI-compatible API. The user brings their own API key (BYO key), stored encrypted per session. Model choice is configurable per session, allowing the user to pick between reasoning models (for the architect node) and faster models (for the supervisor/reviewer nodes).

## Constraints

- **Tech Stack**: Next.js 15, React 19, TypeScript — per spec
- **Deploy**: Standalone Node server, not serverless — agent runs exceed function timeout limits
- **Auth**: Anonymous cookie sessions only in v1 — sign-in is additive migration
- **Agent**: LangGraph.js in worker_threads — maturity risk contained to orchestration layer
- **Data**: All state in Postgres/Prisma — no in-memory-only state
- **Canvas**: React Flow (@xyflow/react) — chosen for native parent/child grouping (RG/VNet/subnet) and mature ecosystem
- **Icons**: Official Azure Icons SVG set vendored and keyed by ARM type — LLM cannot invent node types; diagram_builder validates against the registry
- **Exports**: All four artifact types (SVG/PNG, Bicep/Terraform, DOCX, XLSX) derived from diagram JSON — no separate data source
- **NIM key**: AES-256-GCM encrypted at rest per session — never stored in plaintext

## Key Decisions

**Standalone Node over serverless:** LangGraph.js agent runs involve multi-step graph traversal with MCP tool calls that take seconds per node. Serverless function timeouts (10–60 s on most platforms) are incompatible. One always-on Node process with worker_threads is the correct shape.

**Custom Prisma checkpointer over LangGraph.js built-in:** LangGraph.js is relatively new; its built-in persistence layer carries uncertainty. A custom checkpointer backed by Prisma means the same schema that powers UI features (agent-state timeline, run history, SSE replay) also safeguards agent progress — no dependency on an opaque saver.

**Diagram JSON as single source of truth:** Generating IaC from LLM prose (or asking a second LLM to produce Bicep) is non-deterministic and unverifiable. Generating it from a validated, structured diagram JSON is deterministic and testable. The same JSON also drives the canvas render, so what the user sees is exactly what exports.

**ARM type validation loop:** diagram_builder cannot accept arbitrary service names from the architect because there is no such thing as a made-up ARM type. Validation against the ARM registry catches hallucinated types immediately and loops back once before surfacing to the user — preventing silent errors in downstream IaC.

**No auth in v1:** An anonymous session model covers the full user journey and ships faster. The schema is designed (session row with nullable identity fields) so adding optional sign-in later is a single additive migration with no data loss.

**MCP for grounding:** External tool calls to azure-docs and azure-pricing MCP servers separate live-data retrieval from reasoning, making the researcher node's outputs auditable (citations) and the system robust to LLM knowledge cutoff.

---
*Last updated: 2026-09-24 after initial project setup*
