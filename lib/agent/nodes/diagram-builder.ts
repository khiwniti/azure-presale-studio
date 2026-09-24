/**
 * Diagram Builder Node.
 * Deterministically transforms the ArchitectureDecisionRecord into canonical DiagramJson.
 * Enforces layout hints and executes the azure-diagram validation gate.
 * Spec §3 & §4: Diagram Builder.
 */

import { calculateTierLayout } from "@/mcp/azure-diagram/registry";
import { type DiagramEdge, type DiagramJson, type DiagramNode, validateDiagram } from "@/mcp/azure-diagram/validator";
import { saveCheckpoint } from "../checkpointer";
import type { AgentGraphState, TimelineEvent } from "../types";

export async function diagramBuilderNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const startedAt = new Date().toISOString();

  await saveCheckpoint(state.runId, state, {
    node: "diagram_builder",
    status: "running",
    startedAt,
  });

  const adr = state.adr;
  if (!adr) {
    throw new Error("Cannot build diagram: missing Architecture Decision Record (ADR)");
  }

  // Count items per tier for vertical offset spacing
  const tierIndexMap: Record<string, number> = {};
  const nodes: DiagramNode[] = [];
  const labelToIdMap: Record<string, string> = {};

  for (let i = 0; i < adr.services.length; i++) {
    const s = adr.services[i]!;
    const nodeId = `node_${i + 1}`;
    labelToIdMap[s.label.toLowerCase()] = nodeId;
    labelToIdMap[s.armType.toLowerCase()] = nodeId;

    const tierCount = tierIndexMap[s.tier] ?? 0;
    tierIndexMap[s.tier] = tierCount + 1;

    const position = calculateTierLayout(s.armType, tierCount);

    nodes.push({
      id: nodeId,
      service: s.armType,
      label: s.label,
      parent: s.parentGroup,
      config: {
        sku: s.sku,
        zoneRedundant: s.zoneRedundant,
      },
      position,
      annotations: s.zoneRedundant
        ? [{ id: `ann_${nodeId}`, type: "tag", text: "Zone-Redundant" }]
        : [],
    });
  }

  // Map ADR connections to diagram edges
  const edges: DiagramEdge[] = [];
  for (let i = 0; i < adr.connections.length; i++) {
    const conn = adr.connections[i]!;
    const fromId = labelToIdMap[conn.from.toLowerCase()] ?? nodes[0]?.id;
    const toId = labelToIdMap[conn.to.toLowerCase()] ?? nodes[1]?.id;

    if (fromId && toId && fromId !== toId) {
      edges.push({
        id: `e_${i + 1}`,
        from: fromId,
        to: toId,
        label: conn.label,
        style: "solid",
      });
    }
  }

  const diagram: DiagramJson = {
    version: 1,
    meta: {
      title: adr.title,
      region: adr.region,
      description: adr.topologySummary,
    },
    groups: adr.groups.map((g) => ({
      id: g.id,
      kind: g.kind,
      label: g.label,
    })),
    nodes,
    edges,
  };

  // Execute validation gate
  const validation = validateDiagram(diagram);

  if (!validation.valid) {
    const retryCount = state.builderRetryCount + 1;
    const failureEvent: TimelineEvent = {
      node: "diagram_builder",
      status: "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      findings: `Validation failed with ${validation.errors.length} errors: ${validation.errors.map((e) => e.message).join("; ")}`,
      error: `ARM validation failed: ${validation.unknownArmTypes.join(", ")}`,
    };

    await saveCheckpoint(state.runId, state, failureEvent);

    return {
      validationErrors: validation.errors,
      builderRetryCount: retryCount,
    };
  }

  const completedEvent: TimelineEvent = {
    node: "diagram_builder",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    findings: `Constructed diagram with ${nodes.length} nodes, ${edges.length} edges, and ${diagram.groups.length} groups. All ARM types validated successfully.`,
  };

  await saveCheckpoint(state.runId, state, completedEvent);

  return {
    diagram,
    validationErrors: [],
  };
}
