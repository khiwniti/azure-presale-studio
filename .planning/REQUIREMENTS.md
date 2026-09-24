# REQUIREMENTS — Azure Presale Studio

> GSD planning artifact — do **not** edit manually; update via ADRs or backlog grooming.

- **Status legend:** `[ ]` Pending · `[x]` Done · `[~]` Partial · `[-]` Deferred
- **Phase refs:** Phase 1 = Core MVP · Phase 2 = Canvas Editing · Phase 3 = Export Suite · Phase 4 = Polish
- **Out of Scope (v1):** Vercel serverless deploy, separate agent microservice, authentication gate, headless-browser export, optional sign-in, MCP packaging docs, reviewer loop auto-tuning
- **Deferred to v2:** Optional sign-in / named workspaces, MCP packaging docs, reviewer loop tuning UI

---

## SESS — Anonymous Sessions

| ID | Requirement | Status |
|----|-------------|--------|
| SESS-01 | On first visit the server issues an `httpOnly`, `Secure`, `SameSite=Lax` cookie containing a randomly generated UUID session ID; no sign-in is required. | [ ] |
| SESS-02 | Every Postgres record (Canvas, Run, Message, Artifact) is scoped to the session ID so that two sessions never share or see each other's data. | [ ] |
| SESS-03 | Returning to the application with the same cookie restores all prior canvases, runs, and chat history (durable, resumable across browser restarts). | [ ] |
| SESS-04 | The NIM API key entered by the user is encrypted with AES-256-GCM before persistence in the `Session.nimKeyEncrypted` column; the plaintext key never touches the database. | [ ] |
| SESS-05 | The session record stores a `defaultModel` field; the model picker on the landing page reads and updates this field per session. | [ ] |
| SESS-06 | Every API route enforces session isolation: all Prisma queries include a `WHERE sessionId = <cookie>` filter so a crafted request cannot access another session's data. | [ ] |

---

## LAND — Landing Page

| ID | Requirement | Status |
|----|-------------|--------|
| LAND-01 | The landing page presents a centered hero with a large multi-line prompt textarea; placeholder text shows an example prompt ("Design a highly available e-commerce platform on Azure…"). | [ ] |
| LAND-02 | A model picker allows the user to select a NIM model for the session; the selection persists as `Session.defaultModel`. | [ ] |
| LAND-03 | A "Generate Architecture" button is present; clicking it creates a Canvas and Run record, then redirects the browser to `/canvas/:id`. | [ ] |
| LAND-04 | An example gallery below the fold displays curated prompt/thumbnail pairs; clicking an example pre-fills the prompt textarea. | [ ] |
| LAND-05 | A recent-canvases list below the fold shows the last N canvases belonging to the current session cookie, each linking back to `/canvas/:id`. | [ ] |
| LAND-06 | The landing page is responsive and aesthetically consistent with a bolt.new / lovable.dev design style: clean, dark-or-light theme, prominent CTA. | [ ] |

---

## AGENT — Agent Graph

| ID | Requirement | Status |
|----|-------------|--------|
| AGENT-01 | The agent graph is implemented with LangGraph.js and runs in a Node.js `worker_thread` inside the same Next.js standalone process; no separate agent service is deployed. | [ ] |
| AGENT-02 | The graph topology is `supervisor → researcher → architect → diagram_builder → reviewer → END`, with the `editor` node reachable from `supervisor` for in-chat mutations. | [ ] |
| AGENT-03 | The **supervisor** node routes each invocation to: initial generation, in-chat edit (editor path), or clarification question; it uses a small/fast NIM model to minimise latency. | [ ] |
| AGENT-04 | The **researcher** node queries the `azure-docs` MCP and `azure-pricing` MCP to ground the design; it emits a structured research brief with document citations and pricing data. | [ ] |
| AGENT-05 | The **architect** node uses a NIM reasoning model with an extended token budget to produce a structured architecture decision record (services, SKUs, topology, redundancy). | [ ] |
| AGENT-06 | The **diagram_builder** node calls the `azure-diagram` MCP to convert the decision record into diagram JSON; it never invents ARM types — unknown types are rejected and loop back to the architect for one retry. | [ ] |
| AGENT-07 | The **reviewer** node checks best-practice rules (naming conventions, redundancy, region pairing, cost outliers); it either passes to END or loops back with findings; the maximum reviewer loop count is 2. | [ ] |
| AGENT-08 | The **editor** node accepts natural-language mutation requests ("add a Redis cache in front", "make the DB zone-redundant"), converts them to patch ops, and applies the same `azure-diagram` validation gate. | [ ] |
| AGENT-09 | Each graph node transition writes a `{node, status, startedAt, findings, citations}` event to the Run's `timelineEvents` column in Postgres via a custom Prisma-backed checkpointer; the built-in LangGraph.js saver is not used. | [ ] |
| AGENT-10 | The entire graph state (including messages and diagram JSON) is checkpointed at every node transition so that a crashed or interrupted run can resume from the last checkpoint without re-running completed nodes. | [ ] |
| AGENT-11 | Clients receive agent progress over a Server-Sent Events endpoint `GET /api/runs/:id/stream`; each SSE event carries a timeline event payload sufficient for the UI to update without polling. | [ ] |

---

## DIAG — Diagram Model

| ID | Requirement | Status |
|----|-------------|--------|
| DIAG-01 | The diagram is stored as a versioned JSON document (`version: 1`) with top-level keys `meta`, `nodes`, `edges`, and `groups`; this JSON is the single source of truth for all exports. | [ ] |
| DIAG-02 | Each node carries an `id`, `service` (Azure ARM type, e.g. `Microsoft.Web/sites`), `label`, optional `parent` (group ID), `config` object, `position`, and `annotations` array. | [ ] |
| DIAG-03 | Each edge carries `id`, `from`, `to`, `label`, and `style`; groups carry `id`, `kind` (resource-group / VNet / subnet), and `label`. | [ ] |
| DIAG-04 | The canvas is rendered with React Flow (`@xyflow/react`) as an infinite canvas supporting zoom, pan, minimap, and multi-select. | [ ] |
| DIAG-05 | Each canvas node renders the official Azure SVG icon for its ARM type (sourced from the vendored Azure Icons set, keyed by ARM type); an unknown ARM type shows a fallback generic icon. | [ ] |
| DIAG-06 | React Flow parent/child nodes implement native grouping for subscriptions, resource groups, and VNets. | [ ] |
| DIAG-07 | Canvas state is managed in a Zustand + immer store; both user edits and agent patch ops are applied to the same store through a unified mutation function — the two sources never fork state. | [ ] |
| DIAG-08 | Agent mutations arrive as SSE patch ops (`add` / `remove` / `update` for node / edge / group) and are applied to the Zustand store immediately on receipt. | [ ] |

---

## EDIT — In-Diagram Editing

| ID | Requirement | Status |
|----|-------------|--------|
| EDIT-01 | Clicking a node label switches it to an inline `contentEditable` field; the user can type a new label and commit with Enter or blur. | [ ] |
| EDIT-02 | Within the inline editor, typing `/` opens a slash-command menu offering at minimum `/note`, `/tag`, and `/config` commands to attach annotations. | [ ] |
| EDIT-03 | The `/config` slash command (or clicking the node's config button) opens a block-style side panel with SKU pickers and instance-count inputs; saving the panel writes the values directly into the node's `config` object in the diagram JSON. | [ ] |
| EDIT-04 | Dragging a node updates its `position` in the diagram JSON; the save is debounced (≤ 1 s) and persisted to Postgres via `PATCH /api/canvases/:id/diagram`. | [ ] |
| EDIT-05 | The left rail shows a group tree (subscriptions → resource groups → nodes) with visibility toggles; toggling a group hides or shows its children on the canvas. | [ ] |
| EDIT-06 | The canvas top bar shows the canvas title as an inline-editable field; edits persist to the `Canvas.title` column. | [ ] |

---

## CHAT — Chat Panel

| ID | Requirement | Status |
|----|-------------|--------|
| CHAT-01 | The right-side chat panel streams assistant message tokens as they are generated; partial tokens render incrementally without waiting for the full response. | [ ] |
| CHAT-02 | The top of the chat panel shows a horizontal agent-state timeline with one chip per graph node; each chip displays queued / running / done state and expands to show research brief text and doc citation links. | [ ] |
| CHAT-03 | The `/cost` slash command in the chat input invokes the cost-estimator skill and streams a cost breakdown into the chat. | [ ] |
| CHAT-04 | The `/proposal` slash command invokes the proposal-writer skill and streams proposal content into the chat. | [ ] |
| CHAT-05 | The `/explain <node>` slash command invokes the solution-architect skill targeted at the referenced node and streams an explanation into the chat. | [ ] |
| CHAT-06 | Any natural-language message that is not a slash command and that refers to modifying the diagram is routed to the editor node; the resulting patch ops update the canvas in real time. | [ ] |
| CHAT-07 | Chat history (all messages for a run) is persisted to the `Message` table and restored in full when the user returns to `/canvas/:id`. | [ ] |

---

## MCP — MCP Servers

| ID | Requirement | Status |
|----|-------------|--------|
| MCP-01 | The `azure-docs` MCP server provides tools to search Microsoft Learn and fetch individual documentation pages; it returns only content from official Azure documentation sources. | [ ] |
| MCP-02 | The `azure-pricing` MCP server provides tools to query the Azure Retail Prices API by service, SKU, and region, returning structured pricing data. | [ ] |
| MCP-03 | The `azure-diagram` MCP server provides tools for ARM-type registry lookup, official icon resolution, layout hints, and diagram JSON validation. | [ ] |
| MCP-04 | All three MCP servers are consumed via the `@modelcontextprotocol/sdk` TypeScript client within the LangGraph.js worker thread. | [ ] |
| MCP-05 | Skills (solution-architect, cost-estimator, proposal-writer) are implemented as versioned system-prompt + tool-allowlist bundles injected into the relevant graph nodes; they are not separate services. | [ ] |

---

## EXPRT — Export Suite

| ID | Requirement | Status |
|----|-------------|--------|
| EXPRT-01 | Clicking "Done — Configure Report" on the canvas opens a report-configuration wizard; the wizard lets the user pick sections (architecture overview, cost table, assumptions, recommendations), audience tone, and branding color. | [ ] |
| EXPRT-02 | The SVG export renders the diagram JSON server-side using `@resvg/resvg` (no headless browser); the output faithfully represents the current diagram including official icons, labels, and groups. | [ ] |
| EXPRT-03 | The PNG export is derived from the SVG render via `@resvg/resvg` rasterisation and stored as an `Artifact` with `kind = "svg"` / `"png"`. | [ ] |
| EXPRT-04 | The Bicep export is a deterministic template emitted from diagram JSON: one Bicep module per resource group, using real ARM resource types from the node `service` field. | [ ] |
| EXPRT-05 | The Terraform export is a deterministic HCL template emitted from the same diagram JSON, also producing one module per resource group. | [ ] |
| EXPRT-06 | The DOCX export is generated with the `docx` npm package from the proposal content produced by the proposal-writer skill. | [ ] |
| EXPRT-07 | The XLSX export is generated with `exceljs` and contains one sheet per service category, populated with SKU and pricing detail sourced from `azure-pricing` MCP data. | [ ] |
| EXPRT-08 | All four artifacts (SVG/PNG, Bicep, Terraform, DOCX, XLSX) are downloadable individually or as a single ZIP archive via the export menu. | [ ] |
| EXPRT-09 | Each generated artifact is stored as an `Artifact` record in Postgres with `kind`, `storage key` (local disk path or blob reference), and `metadata`; re-downloading uses the stored artifact without regenerating. | [ ] |

---

## ERR — Error Handling

| ID | Requirement | Status |
|----|-------------|--------|
| ERR-01 | When a run fails mid-graph, the error and final status are persisted to the `Run.error` / `Run.status` columns; the chat panel shows a retry affordance that resumes the run from its last checkpoint. | [ ] |
| ERR-02 | If the `azure-docs` or `azure-pricing` MCP server fails, the architect node proceeds using model knowledge, marks the research brief as "ungrounded", and surfaces a visible warning in the agent-state timeline. | [ ] |
| ERR-03 | If `azure-diagram` validation fails, the diagram_builder loops back to the architect for one retry; if validation fails again, the error is surfaced to the user with an explanation. | [ ] |
| ERR-04 | If the NIM API key is missing or returns an authentication error, the application immediately prompts the user to enter a valid key in workspace settings without crashing the session. | [ ] |
| ERR-05 | SSE disconnects are handled on the client by reconnecting to `GET /api/runs/:id/stream` and replaying missed events from the run's persisted timeline; no state is lost on reconnect. | [ ] |

---

## TEST — Testing

| ID | Requirement | Status |
|----|-------------|--------|
| TEST-01 | Vitest unit tests cover diagram JSON validation (valid nodes accepted, unknown ARM types rejected, schema version checked). | [ ] |
| TEST-02 | Vitest unit tests cover patch-op application: add / remove / update node, edge, and group operations on the Zustand store. | [ ] |
| TEST-03 | Vitest unit tests cover the Bicep emitter: for a known diagram JSON fixture, the emitted Bicep matches the expected template deterministically. | [ ] |
| TEST-04 | Vitest unit tests cover the Terraform emitter: for a known diagram JSON fixture, the emitted HCL matches the expected template deterministically. | [ ] |
| TEST-05 | Vitest unit tests cover the XLSX emitter: output contains the correct sheet names and at least the expected service rows from a fixture. | [ ] |
| TEST-06 | Vitest unit tests cover icon lookup: every ARM type in the registry resolves to a non-null SVG path; an unrecognised type returns the fallback. | [ ] |
| TEST-07 | Integration tests run the full LangGraph.js graph against a recorded-replay NIM mock (no live API calls); the mock replays deterministic responses for researcher, architect, diagram_builder, and reviewer nodes. | [ ] |
| TEST-08 | The integration test suite verifies that a recorded prompt produces a diagram JSON matching the stored fixture (round-trip correctness). | [ ] |
| TEST-09 | Playwright E2E covers the golden path: load landing page → enter prompt → click Generate → wait for canvas to render with ≥ 1 node → perform an inline label edit → open export wizard → download ZIP. | [ ] |
| TEST-10 | Playwright E2E verifies session persistence: navigate away from the canvas, navigate back via the browser history, and confirm chat history and diagram are restored. | [ ] |

---

## Traceability Table

| ID | Description (abbreviated) | Phase |
|----|--------------------------|-------|
| SESS-01 | Issue httpOnly UUID session cookie | 1 |
| SESS-02 | Scope all records by session ID | 1 |
| SESS-03 | Durable resumable session across visits | 1 |
| SESS-04 | AES-256-GCM NIM key encryption | 1 |
| SESS-05 | Per-session defaultModel field | 1 |
| SESS-06 | API route session isolation enforcement | 1 |
| LAND-01 | Hero prompt textarea with placeholder | 1 |
| LAND-02 | Model picker persisted to session | 1 |
| LAND-03 | Generate Architecture → canvas redirect | 1 |
| LAND-04 | Example gallery prefills prompt | 1 |
| LAND-05 | Recent canvases list | 1 |
| LAND-06 | Responsive landing page visual design | 1 |
| AGENT-01 | LangGraph.js in worker_thread, same process | 1 |
| AGENT-02 | Graph topology: supervisor → … → END | 1 |
| AGENT-03 | Supervisor routing logic | 1 |
| AGENT-04 | Researcher node: azure-docs + azure-pricing | 1 |
| AGENT-05 | Architect node: reasoning model, ADR output | 1 |
| AGENT-06 | Diagram_builder: azure-diagram MCP, no invented types | 1 |
| AGENT-07 | Reviewer: best-practice rules, max 2 loops | 4 |
| AGENT-08 | Editor node: NL mutations → patch ops | 2 |
| AGENT-09 | Prisma-backed checkpointer per node transition | 1 |
| AGENT-10 | Full graph state checkpoint for resume | 1 |
| AGENT-11 | SSE endpoint `/api/runs/:id/stream` | 1 |
| DIAG-01 | Versioned diagram JSON schema v1 | 1 |
| DIAG-02 | Node schema: id, service, label, parent, config, position, annotations | 1 |
| DIAG-03 | Edge and group schemas | 1 |
| DIAG-04 | React Flow infinite canvas | 1 |
| DIAG-05 | Official Azure SVG icons by ARM type | 1 |
| DIAG-06 | React Flow parent/child grouping | 1 |
| DIAG-07 | Zustand + immer unified mutation store | 1 |
| DIAG-08 | SSE patch ops applied to Zustand store | 1 |
| EDIT-01 | Inline contentEditable label editing | 2 |
| EDIT-02 | Slash-command menu in inline editor | 2 |
| EDIT-03 | /config opens side panel; writes to config JSON | 2 |
| EDIT-04 | Drag updates position; debounced autosave | 2 |
| EDIT-05 | Left rail group tree with visibility toggles | 2 |
| EDIT-06 | Canvas title inline edit | 2 |
| CHAT-01 | Streaming assistant message tokens | 2 |
| CHAT-02 | Horizontal agent-state timeline with expandable chips | 2 |
| CHAT-03 | /cost slash command → cost breakdown | 2 |
| CHAT-04 | /proposal slash command → proposal content | 2 |
| CHAT-05 | /explain <node> slash command | 2 |
| CHAT-06 | NL mutations routed to editor node | 2 |
| CHAT-07 | Chat history persisted and restored | 2 |
| MCP-01 | azure-docs MCP: Learn search + page fetch | 1 |
| MCP-02 | azure-pricing MCP: Retail Prices API | 1 |
| MCP-03 | azure-diagram MCP: registry, icons, validation | 1 |
| MCP-04 | MCP clients via @modelcontextprotocol/sdk | 1 |
| MCP-05 | Skills as prompt-module bundles | 1 |
| EXPRT-01 | Report-configuration wizard | 3 |
| EXPRT-02 | SVG export via @resvg/resvg, server-side | 3 |
| EXPRT-03 | PNG export via resvg rasterisation | 3 |
| EXPRT-04 | Bicep deterministic template per RG | 3 |
| EXPRT-05 | Terraform deterministic HCL per RG | 3 |
| EXPRT-06 | DOCX export via docx npm package | 3 |
| EXPRT-07 | XLSX export via exceljs, per-category sheets | 3 |
| EXPRT-08 | Individual + ZIP download | 3 |
| EXPRT-09 | Artifact persistence and re-download | 3 |
| ERR-01 | Run failure persistence + retry affordance | 1 |
| ERR-02 | azure-docs/pricing degradation: ungrounded flag | 4 |
| ERR-03 | azure-diagram validation failure retry + user surface | 1 |
| ERR-04 | Invalid NIM key → workspace settings prompt | 1 |
| ERR-05 | SSE reconnect with event replay | 1 |
| TEST-01 | Vitest: diagram JSON validation | 1 |
| TEST-02 | Vitest: patch-op application | 2 |
| TEST-03 | Vitest: Bicep emitter determinism | 3 |
| TEST-04 | Vitest: Terraform emitter determinism | 3 |
| TEST-05 | Vitest: XLSX emitter correctness | 3 |
| TEST-06 | Vitest: icon lookup / fallback | 1 |
| TEST-07 | Integration: LangGraph.js + NIM mock replay | 1 |
| TEST-08 | Integration: round-trip diagram JSON fixture | 1 |
| TEST-09 | Playwright E2E: golden path prompt → export ZIP | 3 |
| TEST-10 | Playwright E2E: session persistence on return | 1 |
