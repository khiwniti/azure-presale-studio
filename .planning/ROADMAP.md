# Roadmap: Azure Presale Studio

**Created:** 2026-09-24  
**Granularity:** Fine (15 phases)  
**Source:** docs/superpowers/specs/2026-09-23-azure-presale-studio-design.md

---

## Spec Phase 1 — Core MVP

---

## Phase 1: Project Scaffold

**Goal:** Stand up the Next.js 15 standalone Node app with TypeScript, Prisma schema, Postgres connection, and anonymous-session middleware so every subsequent phase builds on a working runtime foundation.

**Success Criteria:**
- `next build` produces a standalone Node bundle that starts without errors
- Prisma schema defines `Session`, `Canvas`, `Run`, `Message`, `Artifact` tables with correct relations
- `prisma migrate dev` applies cleanly against a local Postgres instance
- Anonymous session middleware issues an httpOnly `sid` cookie on first request and reads it on subsequent requests
- Session record is created in Postgres on first visit and `lastSeenAt` is updated on each request
- NIM key field is present as `nimKeyEncrypted` (nullable, AES-256-GCM envelope) in the `Session` row
- Environment variables (`DATABASE_URL`, `SESSION_SECRET`, `NIM_ENCRYPTION_KEY`) are validated at startup with clear error messages

**Dependencies:** None

**Plans:**
- [ ] Init Next.js 15 App Router project with TypeScript and Tailwind CSS
- [ ] Define Prisma schema (Session, Canvas, Run, Message, Artifact) and run initial migration
- [ ] Implement AES-256-GCM encrypt/decrypt utility for NIM key storage
- [ ] Write anonymous-session middleware (cookie issue + Postgres upsert + lastSeenAt refresh)
- [ ] Wire session middleware into Next.js middleware chain; validate env on startup
- [ ] Add health-check route `GET /api/health` returning DB connectivity status

---

## Phase 2: MCP Servers

**Goal:** Implement the three in-process MCP servers (`azure-docs`, `azure-pricing`, `azure-diagram`) as stdio-transport servers with full tool handlers, so the agent graph has grounded, validated tool access from day one.

**Success Criteria:**
- `azure-docs` MCP exposes `search_docs` and `fetch_page` tools that query Microsoft Learn and return official Azure documentation only
- `azure-pricing` MCP exposes `get_prices` tool that calls the Azure Retail Prices API and returns per-service, per-SKU, per-region pricing
- `azure-diagram` MCP exposes `lookup_icon`, `get_layout_hints`, and `validate_diagram` tools backed by the vendored ARM type registry
- `validate_diagram` rejects nodes with unknown ARM types and returns structured error with the offending node IDs
- All three servers start as child processes via `@modelcontextprotocol/sdk` stdio transport and respond to `initialize` + `tools/list` correctly
- Unit tests cover icon lookup, ARM type validation rejection, and pricing API response parsing

**Dependencies:** Phase 1

**Plans:**
- [ ] Vendor Azure Icons SVG set; build ARM-type-to-icon index keyed by `Microsoft.*/` type strings
- [ ] Implement `azure-diagram` MCP server (icon lookup, layout hints, ARM registry validation)
- [ ] Implement `azure-docs` MCP server (Microsoft Learn search + page fetch, domain-filter to learn.microsoft.com)
- [ ] Implement `azure-pricing` MCP server (Azure Retail Prices API wrapper with region + SKU filtering)
- [ ] Write MCP client factory that spawns each server as stdio child process and exposes typed tool callers
- [ ] Vitest unit tests: ARM type validation, icon lookup, pricing response parse

---

## Phase 3: LangGraph.js Agent Graph

**Goal:** Build the core LangGraph.js agent graph (`supervisor → researcher → architect → diagram_builder → reviewer`) with Prisma-backed checkpointer and SSE state streaming, so the full generation pipeline runs end-to-end.

**Success Criteria:**
- Graph executes all five nodes in correct order for a sample prompt
- Each node transition writes a checkpoint row (`Run.graphState`) to Postgres before proceeding
- SSE endpoint `GET /api/runs/:id/stream` emits `{node, status, startedAt, findings, citations}` events in real time
- `reviewer` node loops back to `architect` on best-practice violations (max 2 loops), then passes to END
- `diagram_builder` rejects unknown ARM types and loops back to `architect` once before surfacing error
- Worker thread isolation: graph runs in `worker_threads`; SSE bridge connects worker ↔ main thread without shared mutable state
- NIM client uses OpenAI-compatible SDK pointed at `build.nvidia.com` with BYO key from session

**Dependencies:** Phase 2

**Plans:**
- [ ] Implement Prisma-backed custom checkpointer (save/load graph state per run transition)
- [ ] Build NIM client wrapper (OpenAI-compat, reads encrypted key from session, model-selectable)
- [ ] Implement `supervisor` node (route: generate vs edit vs clarification)
- [ ] Implement `researcher` node (azure-docs + azure-pricing MCP calls, emit research brief with citations)
- [ ] Implement `architect` node (NIM reasoning model, extended token budget, emit architecture decision record)
- [ ] Implement `diagram_builder` node (convert ADR → diagram JSON via azure-diagram MCP, validation retry)
- [ ] Implement `reviewer` node (best-practice rules: naming, redundancy, region pairing, cost outliers; max 2 loops)
- [ ] Wire worker_threads runner: graph runs in worker, SSE bridge posts events to main thread
- [ ] SSE route `GET /api/runs/:id/stream` — replay from checkpoint then stream live events
- [ ] Integration test with NIM mock replay: full prompt → diagram JSON output deterministic

---

## Phase 4: Landing Page

**Goal:** Deliver the bolt.new/lovable.dev-styled landing page — hero prompt input, model picker, session-aware canvas creation — so users can initiate their first architecture generation.

**Success Criteria:**
- Large prompt textarea with placeholder examples renders correctly on desktop and mobile viewports
- Model picker lists available NIM models and persists selection to `Session.defaultModel`
- Submitting the form creates a `Canvas` row and a `Run` row in Postgres, then redirects to `/canvas/:id`
- NIM key prompt appears (workspace settings modal) when no `nimKeyEncrypted` is present on the session
- "Recent canvases" section lists the current session's canvases from the cookie-scoped query
- Example gallery renders static example cards below the fold
- Page renders as a React Server Component; form submission is a Server Action

**Dependencies:** Phase 3

**Plans:**
- [ ] Build landing page layout (hero section, centered prompt textarea, model picker, CTA button)
- [ ] Implement Server Action: validate prompt, create Canvas + Run, redirect to `/canvas/:id`
- [ ] Build NIM key entry modal (workspace settings) with AES-256-GCM encrypt-on-save
- [ ] Build recent-canvases section (RSC, session-scoped Prisma query)
- [ ] Build static example gallery cards (below fold)
- [ ] Responsive polish: mobile viewport, Tailwind breakpoints

---

## Phase 5: React Flow Canvas + Diagram Rendering

**Goal:** Render the agent-produced diagram JSON on an infinite React Flow canvas with official Azure ARM icons, correct parent/child grouping (subscriptions → resource groups → nodes), and basic zoom/pan/minimap.

**Success Criteria:**
- Diagram JSON from Phase 3 renders as React Flow nodes and edges with correct positions
- Custom node component displays the official Azure SVG icon (keyed by `node.service` ARM type) and label
- Resource group and VNet groups render as React Flow parent containers enclosing their children
- Edges render with correct labels and solid/dashed style from `edge.style`
- Zoom, pan, minimap, and multi-select work out of the box
- Layers panel (left rail) shows group tree with visibility toggles that hide/show node groups
- Canvas title (top bar) is inline-editable and persists to `Canvas.title` via debounced Server Action
- Unknown ARM type falls back to a generic Azure icon with a warning chip on the node

**Dependencies:** Phase 4

**Plans:**
- [ ] Install and configure `@xyflow/react`; scaffold canvas route `/canvas/[id]`
- [ ] Build custom React Flow node component (ARM icon + label + status chip)
- [ ] Build group/parent node component (resource group, VNet, subscription containers)
- [ ] Implement diagram-JSON-to-ReactFlow converter (nodes, edges, groups with parent references)
- [ ] Build layers panel (left rail): group tree, visibility toggles
- [ ] Build top bar (canvas title inline edit, zoom controls, export button placeholder, Done CTA placeholder)
- [ ] Wire diagram load: fetch `Canvas.diagramJson` on page load, hydrate React Flow state

---

## Spec Phase 2 — Canvas Editing

---

## Phase 6: Diagram State Store

**Goal:** Implement the Zustand + immer diagram state store as the single mutation channel for both user edits and incoming agent SSE patch ops, with debounced autosave to Postgres.

**Success Criteria:**
- Zustand store holds the full diagram JSON and exposes typed actions: `addNode`, `removeNode`, `updateNode`, `addEdge`, `removeEdge`, `updateEdge`, `addGroup`, `removeGroup`, `applyPatch`
- Immer patches are used for all mutations; patch ops from SSE (`add/remove/update node/edge/group`) apply through the same `applyPatch` action — no separate agent state fork
- Node drag in React Flow triggers `updateNode.position` and debounces a `PATCH /api/canvases/:id/diagram` autosave at 500 ms
- Autosave writes the full diagram JSON to `Canvas.diagramJson` in Postgres
- SSE consumer in the canvas page subscribes to `GET /api/runs/:id/stream` and dispatches patch ops to the store
- Vitest unit tests: each patch op type applies correctly; concurrent user + agent patches produce consistent state

**Dependencies:** Phase 5

**Plans:**
- [ ] Scaffold Zustand store with immer middleware; define DiagramState type mirroring diagram JSON schema
- [ ] Implement all mutation actions (addNode, removeNode, updateNode, addEdge, removeEdge, updateEdge, addGroup, removeGroup)
- [ ] Implement `applyPatch` action consuming SSE patch-op envelopes
- [ ] Build SSE client hook in canvas page (EventSource, reconnect on close, dispatch to store)
- [ ] Implement debounced autosave (500 ms, PATCH `/api/canvases/:id/diagram`)
- [ ] Vitest unit tests for all patch op types and idempotency

---

## Phase 7: Inline Editing

**Goal:** Add Notion-style inline editing to the canvas: contentEditable labels on nodes, slash commands (`/note`, `/tag`, `/config`) for annotations, and a rich side panel for SKU/instance config.

**Success Criteria:**
- Clicking a node label activates `contentEditable` with focus; Enter/blur commits the label change to the store
- Typing `/note`, `/tag`, or `/config` in an active label opens a slash-command popup with the correct annotation form
- `/note` attaches a text annotation to `node.annotations`; `/tag` adds a tag string; `/config` opens the side panel
- Side panel renders SKU picker and instance-count input pre-populated from `node.config`; saving writes back to the store and triggers autosave
- All edits flow through the same Zustand store mutations as Phase 6 (no separate state path)
- Keyboard navigation: Escape cancels edit; Tab moves between config fields

**Dependencies:** Phase 6

**Plans:**
- [ ] Build inline-editable label component with contentEditable and commit-on-blur/Enter
- [ ] Implement slash-command parser and popup menu (triggered by `/` keypress)
- [ ] Build `/note` annotation form and store integration
- [ ] Build `/tag` annotation form and store integration
- [ ] Build `/config` side panel (SKU picker, instance count, free-form config fields)
- [ ] Wire side panel open/close to node selection and slash command; persist config via store + autosave

---

## Phase 8: Chat Panel + Agent State Visualization

**Goal:** Build the right-rail chat panel with real-time message streaming, the horizontal agent-state timeline, and slash command invocations (`/cost`, `/proposal`, `/explain <node>`).

**Success Criteria:**
- Chat panel renders existing `Message` rows for the current run on load (from Prisma)
- New assistant messages stream in token-by-token via SSE and append to the chat list
- Agent-state timeline shows node chips (queued / running / done) derived from SSE timeline events; chips are expandable to show research brief and doc links
- `/cost` slash command triggers a cost-estimator skill run and streams the result into chat
- `/proposal` slash command triggers a proposal-writer skill run and streams the result
- `/explain <node>` asks the architect about the selected node and streams the explanation
- Input box is pinned to the panel bottom; sending a message creates a new `Message` row and a new `Run` of type `edit`

**Dependencies:** Phase 6

**Plans:**
- [ ] Build chat panel layout (message list, agent-state timeline strip, pinned input box)
- [ ] Implement message streaming renderer (SSE token chunks → append to message bubble)
- [ ] Build agent-state timeline chip component (queued/running/done, expandable detail drawer)
- [ ] Implement slash-command parser in chat input (`/cost`, `/proposal`, `/explain`)
- [ ] Wire `/cost` and `/proposal` to on-demand skill run API routes
- [ ] Wire `/explain <node>` to a targeted architect query run
- [ ] Implement send-message flow (POST `/api/runs`, SSE subscribe, message persistence)

---

## Phase 9: Editor Node

**Goal:** Add the `editor` branch to the LangGraph.js graph to handle in-chat natural-language mutations, running validation through the same `azure-diagram` MCP gate before emitting patch ops.

**Success Criteria:**
- `supervisor` routes edit-intent messages to the `editor` node (not the full generate path)
- `editor` interprets natural-language mutation ("add a Redis cache in front of the API") and emits typed patch ops
- Patch ops pass through `azure-diagram` MCP validation; unknown ARM types are rejected with an error message in chat, not applied to the diagram
- Validated patch ops are emitted as SSE events and consumed by the Phase 6 `applyPatch` action
- Editor run creates a `Run` row (type `edit`) and checkpoints state at each step
- Integration test: "make the DB zone-redundant" → patch op `updateNode` with `config.zoneRedundant: true` applied correctly

**Dependencies:** Phase 8

**Plans:**
- [ ] Implement `editor` node (NIM call: parse mutation intent → structured patch op list)
- [ ] Wire `editor` validation through `azure-diagram` MCP `validate_diagram` tool
- [ ] Emit validated patch ops as SSE events from worker thread
- [ ] Update `supervisor` routing logic to distinguish generate vs edit intent
- [ ] Integration test: NIM mock replay for an edit request → correct patch ops

---

## Spec Phase 3 — Export Suite

---

## Phase 10: Report Wizard

**Goal:** Build the export-flow report-configuration wizard — section picker, audience tone, branding — and wire it to on-demand cost-estimator and proposal-writer agent skill runs that produce the content for all export artifacts.

**Success Criteria:**
- "Done — Configure Report" CTA opens a multi-step wizard modal
- Wizard step 1: section picker (architecture overview, cost table, assumptions, recommendations) with checkboxes
- Wizard step 2: audience tone selector (executive / technical / mixed)
- Wizard step 3: branding color picker (hex, applied to diagram header and DOCX cover)
- Submitting the wizard triggers cost-estimator and proposal-writer skill runs (type `cost` and `proposal` Run rows)
- Progress streams via SSE into the wizard's status panel; wizard advances to download step on completion
- All four artifact types are enqueued for generation (SVG/PNG, Bicep/Terraform, DOCX, XLSX)

**Dependencies:** Phase 9

**Plans:**
- [ ] Build report wizard modal (multi-step: section picker → tone → branding → generating → download)
- [ ] Implement cost-estimator skill (system-prompt + azure-pricing MCP data → structured cost table)
- [ ] Implement proposal-writer skill (system-prompt + ADR + cost table → proposal sections)
- [ ] Wire wizard submit to parallel Run creation for cost + proposal skills
- [ ] Build wizard SSE status panel (stream progress from both runs)
- [ ] Connect wizard completion to artifact generation triggers (Phases 11–13)

---

## Phase 11: SVG/PNG Export

**Goal:** Implement server-side SVG and PNG rendering of the diagram JSON using `@resvg/resvg` — no headless browser — so exported images are pixel-perfect and reproducible.

**Success Criteria:**
- `POST /api/exports/svg` accepts a canvas ID, renders the diagram JSON to SVG using ARM icons and branding color, returns the SVG blob
- `POST /api/exports/png` renders to SVG then rasterizes via `@resvg/resvg` at 2× resolution, returns PNG blob
- All nodes, edges, group boundaries, labels, and icons render faithfully to the React Flow layout positions stored in diagram JSON
- Artifacts are persisted to `Artifact` table (kind `svg`/`png`) with storage key on local disk
- Rendering is deterministic: same diagram JSON + branding → byte-identical SVG (PNG within platform tolerance)
- Vitest unit test: known diagram JSON → SVG contains expected node labels and ARM icon references

**Dependencies:** Phase 10

**Plans:**
- [ ] Build server-side SVG renderer (layout positions → SVG elements, ARM icons inlined, edge paths drawn)
- [ ] Integrate `@resvg/resvg` for SVG → PNG rasterization at 2× resolution
- [ ] Implement export API routes (`POST /api/exports/svg`, `POST /api/exports/png`)
- [ ] Persist artifacts to disk and record in `Artifact` table
- [ ] Vitest unit test: deterministic SVG output for known diagram JSON

---

## Phase 12: IaC Export

**Goal:** Implement the deterministic Bicep and Terraform emitters that convert diagram JSON into one module per resource group — no LLM involvement in the emitter.

**Success Criteria:**
- Bicep emitter produces one `.bicep` file per resource group with correct Azure resource declarations for every node's ARM type and `config` values
- Terraform emitter produces one `main.tf` per resource group with correct `azurerm` provider resource blocks
- Both emitters are deterministic: same diagram JSON → byte-identical output (node ordering is stable)
- Unknown ARM types that have no emitter template produce a commented placeholder block, not a crash
- Artifacts are persisted to `Artifact` table (kind `bicep`/`tf`)
- Vitest unit tests: known diagram JSON → expected Bicep/Terraform output strings for at least 5 ARM types

**Dependencies:** Phase 10

**Plans:**
- [ ] Design ARM-type-to-template registry for Bicep (resource block templates keyed by ARM type)
- [ ] Implement Bicep emitter (per-resource-group file, stable node ordering, config → property mapping)
- [ ] Design ARM-type-to-template registry for Terraform (`azurerm` provider resources)
- [ ] Implement Terraform emitter (per-resource-group `main.tf`, provider block, stable ordering)
- [ ] Implement export API routes (`POST /api/exports/bicep`, `POST /api/exports/terraform`)
- [ ] Vitest unit tests: deterministic output for 5+ ARM types in each emitter

---

## Phase 13: Document Exports (DOCX + XLSX + Zip)

**Goal:** Generate the DOCX proposal document and XLSX cost-estimate spreadsheet from proposal-skill output and azure-pricing data, then bundle all four artifact types into a downloadable zip.

**Success Criteria:**
- DOCX export produces a Word document with cover page (branding color), section headings matching wizard selections, and proposal content from the proposal-writer skill
- XLSX export produces a workbook with one sheet per service category, columns: service name, SKU, region, unit price, quantity, monthly estimate — populated from `azure-pricing` MCP data
- Zip bundler (`archiver`) collects all requested artifact files (SVG/PNG + Bicep/Terraform + DOCX + XLSX) into a single download
- `POST /api/exports/bundle` returns a zip stream with `Content-Disposition: attachment`
- Individual artifact download routes also work (`/api/exports/:artifactId`)
- Artifacts are persisted to `Artifact` table (kind `docx`/`xlsx`)

**Dependencies:** Phase 12

**Plans:**
- [ ] Implement DOCX builder using `docx` npm package (cover page, TOC, section bodies from proposal content)
- [ ] Implement XLSX builder using `exceljs` (one sheet per service category, pricing rows from MCP data)
- [ ] Implement `POST /api/exports/bundle` zip route using `archiver`
- [ ] Implement individual artifact download route (`GET /api/exports/:artifactId`)
- [ ] Wire wizard download step to bundle route; surface individual download links
- [ ] Smoke test: full wizard flow produces a valid zip containing all four artifact types

---

## Spec Phase 4 — Polish

---

## Phase 14: Error Handling + Degradation UX

**Goal:** Harden every failure path — agent-run retry, MCP graceful degradation, SSE reconnect, and NIM key prompt — so the user always knows what failed and how to recover.

**Success Criteria:**
- Failed Run shows retry affordance in chat panel; retrying resumes from the last Prisma checkpoint (no full restart)
- `azure-docs` / `azure-pricing` MCP failures are caught and flagged; architect proceeds with model knowledge and appends an "ungrounded" warning citation chip in the timeline
- `azure-diagram` validation failure after max retries surfaces a user-readable error message in chat with the offending node types listed
- SSE disconnect triggers automatic client reconnect with exponential back-off (max 5 attempts); on reconnect, replay from Run checkpoint fills in missed events
- Missing/invalid NIM key triggers immediate workspace-settings modal with inline error, not an opaque 500
- All error states have explicit UX copy (no raw error messages or stack traces exposed to the UI)

**Dependencies:** Phase 13

**Plans:**
- [ ] Implement run-retry endpoint (`POST /api/runs/:id/retry`) that resumes from last checkpoint
- [ ] Add MCP failure catch + ungrounded flag in researcher and architect nodes
- [ ] Build SSE reconnect logic in canvas client hook (exponential back-off, checkpoint replay)
- [ ] Implement NIM key validation on run start; trigger settings modal on auth error
- [ ] Audit all API routes: replace raw error responses with structured `{code, message}` JSON
- [ ] Add user-readable error copy for each failure mode in chat panel and wizard

---

## Phase 15: Testing Suite

**Goal:** Deliver the full automated test suite — Vitest unit, NIM-mock integration, and Playwright E2E golden path — giving the team a reliable regression baseline before any production release.

**Success Criteria:**
- Vitest unit tests cover: diagram patch ops, Bicep emitter, Terraform emitter, XLSX emitter, icon lookup, ARM type validation, AES-256-GCM encrypt/decrypt — all deterministic, no network calls
- NIM mock-replay integration tests run the full LangGraph.js graph against a recorded cassette for a sample prompt and assert the output diagram JSON matches a golden fixture
- Playwright E2E test exercises the golden path: land → enter prompt + NIM key → canvas renders with nodes → inline edit a label → open wizard → download zip — all assertions against visible UI
- All tests run in CI (`next build && vitest run && playwright test`) without live API keys
- Test suite is isolated: each test file cleans up its Postgres rows; Playwright uses a dedicated test session cookie
- `vitest run` completes in under 60 seconds; Playwright suite in under 5 minutes

**Dependencies:** Phase 14

**Plans:**
- [ ] Consolidate and expand Vitest unit tests from Phases 2, 6, 11, 12 into a unified test suite
- [ ] Record NIM mock cassette for the golden-path prompt; build cassette replay harness
- [ ] Write NIM mock-replay integration test asserting diagram JSON golden fixture
- [ ] Write Playwright E2E test: full golden path from landing to zip download
- [ ] Configure CI pipeline: build → unit → integration → E2E with env secrets for NIM key (test cassette only)
- [ ] Document test running instructions in README (local Postgres setup, cassette refresh procedure)
