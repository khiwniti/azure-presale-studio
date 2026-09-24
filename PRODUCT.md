# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router, standalone Node server), React 19, TypeScript, Tailwind CSS, Prisma (PostgreSQL), @xyflow/react, LangGraph.js, MCP SDK, @resvg/resvg-js, docx, exceljs.

## Users

Primary users are Azure Solution Architects and Presales Engineers preparing customer-facing architecture proposals under tight deadlines. They need accurate, production-valid designs with official Azure iconography and grounded pricing without manually assembling Visio diagrams or hunting across Microsoft Learn.

## Product Purpose

Azure Presale Studio turns a natural-language requirements prompt into a professional, validated Azure solution architecture diagram on an infinite canvas, allows conversational and Notion-style inline refinement, and generates four client-ready export deliverables (diagram image, IaC templates, proposal doc, cost spreadsheet).

## Positioning

Unlike generic AI diagramming tools that invent arbitrary cloud icons and fictional topologies, Azure Presale Studio enforces strict Azure ARM type validation, grounds designs in official Microsoft Learn documentation and live Azure Retail Prices via in-process MCP servers, and maintains a single versioned diagram JSON document as the immutable source of truth across user edits, agent mutations, and all export formats.

## Operating Context

- Used in web browsers on desktop displays (primary: solution design canvas) and mobile devices (landing and preview).
- Operates with zero friction: anonymous sessions via secure httpOnly cookies — no sign-in or account registration required for v1.
- Self-hosted or deployed as a standalone Node.js server with no serverless function timeouts.

## Capabilities and Constraints

- **Single Diagram Source of Truth:** Validated JSON with `meta`, `nodes`, `edges`, `groups`.
- **ARM Type Integrity:** Official Azure ARM types (e.g. `Microsoft.Web/sites`, `Microsoft.DocumentDB/databaseAccounts`); LLM cannot invent non-existent services.
- **In-process MCP Tools:** `azure-docs` (Microsoft Learn search/fetch), `azure-pricing` (Azure Retail Prices API), `azure-diagram` (ARM type registry, validation, icon lookup).
- **Infinite Studio Canvas:** React Flow with custom ARM icon nodes, native parent-child grouping for subscriptions/resource groups/VNets, zoom/pan/minimap.
- **Unified Mutation Channel:** User drags/edits and agent SSE patch ops flow through the same Zustand + Immer store.
- **Four Multi-Format Exports:** High-res SVG/PNG via `@resvg/resvg-js`, deterministic Bicep/Terraform modules, DOCX proposal, XLSX cost breakdown.
- **Secure Key Storage:** User-provided NVIDIA NIM API keys encrypted at rest with AES-256-GCM.

## Brand Commitments

- **Tone & Voice:** Authoritative, technical, crisp, enterprise-grade.
- **Visual Aesthetic:** Bolt.new / Lovable.dev inspired dark studio theme. Deep slate surfaces (`#020817`, `#0f172a`), vibrant Azure blue accents (`#0078D4`, `#0063B1`), glowing cyan highlights (`#38bdf8`), high-contrast typography, crisp border radii, zero clutter.
- **Iconography:** Official Microsoft Azure SVG architecture icons mapped directly to ARM resource providers.

## Product Principles

1. **Grounding over Hallucination:** Every resource, SKU, and price must trace back to official Microsoft documentation or the Azure Retail Prices API.
2. **Deterministic Outputs from Canonical JSON:** The diagram JSON is the single source of truth; all exports are pure deterministic projections of this schema.
3. **No Login Wall:** Instant utility from the first keystroke via durable anonymous cookie sessions.
4. **Seamless Co-Design:** Natural-language agent modifications and Notion-style inline canvas edits must operate without divergence or state conflicts.
