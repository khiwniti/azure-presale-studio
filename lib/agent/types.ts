/**
 * LangGraph Agent State Types.
 * Spec §2 (Checkpointing) & §4 (Agent Graph, MCP Tools & Skills).
 */

import type { DiagramJson, ValidationError } from "@/mcp/azure-diagram/validator";

export interface Citation {
  title: string;
  url: string;
}

export interface ResearchBrief {
  summary: string;
  citations: Citation[];
  recommendedPatterns: string[];
  pricingEstimates: Array<{
    serviceName: string;
    sku: string;
    estimatedMonthly: number;
    unitOfMeasure: string;
  }>;
}

export interface PlannedService {
  armType: string;
  label: string;
  sku: string;
  tier: "frontend" | "gateway" | "app" | "data" | "security" | "management" | "messaging";
  parentGroup?: string;
  zoneRedundant: boolean;
  notes?: string;
}

export interface ArchitectureDecisionRecord {
  title: string;
  region: string;
  topologySummary: string;
  services: PlannedService[];
  connections: Array<{ from: string; to: string; label: string }>;
  groups: Array<{ id: string; kind: "resource-group" | "vnet" | "subnet"; label: string }>;
  redundancyStrategy: string;
  securityControls: string[];
}

export interface TimelineEvent {
  node: "supervisor" | "researcher" | "architect" | "diagram_builder" | "reviewer" | "editor";
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  findings?: string;
  citations?: Citation[];
  error?: string;
}

export interface AgentGraphState {
  runId: string;
  canvasId: string;
  sessionId: string;
  prompt: string;
  intent: "generate" | "edit" | "clarify";
  model: string;

  // Agent artifacts across node handoffs
  researchBrief?: ResearchBrief;
  adr?: ArchitectureDecisionRecord;
  diagram?: DiagramJson;

  // Validation & Review gates
  validationErrors: ValidationError[];
  builderRetryCount: number;
  reviewFindings: string[];
  reviewLoopCount: number;

  // Timeline & overall status
  timeline: TimelineEvent[];
  status: "running" | "completed" | "failed";
  error?: string;
}
