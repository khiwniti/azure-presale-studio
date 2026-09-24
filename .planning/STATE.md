# State: Azure Presale Studio

**Version:** 1.0.0  
**Last Updated:** 2026-09-24

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-24)

**Core value:** A requirements prompt produces a valid Azure architecture diagram (official ARM icons, real service types) without user correction in the golden path.  
**Current focus:** Phase 1 — Project Scaffold

---

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Scaffold | Not Started |
| 2 | MCP Servers | Not Started |
| 3 | LangGraph.js Agent Graph | Not Started |
| 4 | Landing Page | Not Started |
| 5 | React Flow Canvas + Diagram Rendering | Not Started |
| 6 | Diagram State Store | Not Started |
| 7 | Inline Editing | Not Started |
| 8 | Chat Panel + Agent State Visualization | Not Started |
| 9 | Editor Node | Not Started |
| 10 | Report Wizard | Not Started |
| 11 | SVG/PNG Export | Not Started |
| 12 | IaC Export | Not Started |
| 13 | Document Exports (DOCX + XLSX + Zip) | Not Started |
| 14 | Error Handling + Degradation UX | Not Started |
| 15 | Testing Suite | Not Started |

---

## Active Work

None — project initialized, ready to begin Phase 1.

---

## Blockers

None.

---

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Standalone Node over serverless | ✓ Avoids function timeout for long agent runs; worker_threads run inside same process |
| LangGraph.js in worker_threads | — Pending validation; isolation boundary keeps maturity risk contained to graph orchestration only |
| Prisma custom checkpointer | ✓ Decouples checkpoint durability from LangGraph.js built-in saver maturity; enables resume-on-reload and run-history replay |
| Anonymous sessions via cookie | ✓ No sign-in gate for v1; httpOnly UUID cookie scopes all records; additive migration path for optional named workspaces later |
| NIM API key encrypted at rest | ✓ AES-256-GCM per-session; key never stored plaintext; prompted via UI when absent |
| Diagram JSON as single source of truth | ✓ All four export artifacts (SVG/PNG, Bicep, Terraform, DOCX, XLSX) derive from same JSON; no divergent state |
| MCP servers as in-process stdio children | ✓ One runtime, one deploy, shared TS diagram types end-to-end; no cross-service SSE proxying |
| One mutation channel (Zustand + immer) | ✓ User edits and agent SSE patch ops share the same store; diagram state never forks |
| SVG/PNG rendered server-side via @resvg/resvg | ✓ No headless browser dependency; deterministic, reproducible output |
| Bicep/Terraform emitters deterministic (no LLM) | ✓ Stable, auditable IaC; same diagram JSON → byte-identical output |
