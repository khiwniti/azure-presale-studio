# State: Azure Presale Studio

**Version:** 1.0.0  
**Last Updated:** 2026-09-24

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-24)

**Core value:** A requirements prompt produces a valid Azure architecture diagram (official ARM icons, real service types) without user correction in the golden path.  
**Current focus:** All Phases Complete

---

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Scaffold | Complete |
| 2 | MCP Servers | Complete |
| 3 | LangGraph.js Agent Graph | Complete |
| 4 | Landing Page | Complete |
| 5 | React Flow Canvas + Diagram Rendering | Complete |
| 6 | Diagram State Store | Complete |
| 7 | Inline Editing | Complete |
| 8 | Chat Panel + Agent State Visualization | Complete |
| 9 | Editor Node | Complete |
| 10 | Report Wizard | Complete |
| 11 | SVG/PNG Export | Complete |
| 12 | IaC Export | Complete |
| 13 | Document Exports (DOCX + XLSX + Zip) | Complete |
| 14 | Error Handling + Degradation UX | Complete |
| 15 | Testing Suite | Complete |

---

## Active Work

Phase 6 completed and verified (Zustand + immer diagram state store with SSE patch application, undo/redo stack, 60 tests passing, 0 impeccable defects, production build clean). Advancing to Phase 7 (Inline Editing: node label, SKU dropdown, zone-redundancy toggle, ConfigPanel for ARM-specific fields).
All 15 phases completed and verified (60 tests passing, 0 impeccable defects, production build clean). Azure Presale Studio is ready for deployment.
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
| Vercel over Railway for prod deploy | ✓ User decision: deploy to Vercel in production; complete everything locally first |
| Local SQLite for local dev & testing | ✓ Zero-dependency, avoids PRoot SYSVIPC shmget failure; Postgres schema ready for cloud |
| Babel fallback for ARM64 PRoot | ✓ Bypasses native SWC SIGBUS under ptrace emulation; verified clean production build |
