/**
 * Diagram JSON to React Flow Converter.
 * Transforms between canonical DiagramJson (spec §3) and @xyflow/react models.
 * Spec §3 (Diagram Model) & §5 (Frontend UX).
 */

import type { Edge, Node } from "@xyflow/react";
import { getServiceIcon, lookupAzureService } from "@/mcp/azure-diagram/registry";
import type { DiagramEdge, DiagramGroup, DiagramJson, DiagramNode } from "@/mcp/azure-diagram/validator";

export interface AzureNodeData {
  id: string;
  service: string;
  label: string;
  displayName: string;
  sku?: string;
  zoneRedundant?: boolean;
  svgIcon: string;
  isFallbackIcon: boolean;
  annotations?: Array<{ id: string; type: "note" | "tag" | "warning"; text: string }>;
  config?: Record<string, unknown>;
  onLabelChange?: (newLabel: string) => void;
  onConfigChange?: (newConfig: Record<string, unknown>) => void;
  [key: string]: unknown;
}

export interface GroupNodeData {
  id: string;
  kind: "resource-group" | "vnet" | "subnet" | "subscription";
  label: string;
  [key: string]: unknown;
}

export interface EditorNodeData {
  id: string;
  annotations: Array<{ id: string; type: "note" | "tag" | "warning"; text: string }>;
  onAnnotationChange?: (newAnnotations: Array<{ id: string; type: "note" | "tag" | "warning"; text: string }>) => void;
  [key: string]: unknown;
}

export interface ConvertedReactFlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Converts canonical DiagramJson into React Flow nodes and edges.
 */
export function diagramJsonToReactFlow(diagram: DiagramJson): ConvertedReactFlowGraph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Group nodes (rendered as parent background containers)
  for (const group of diagram.groups) {
    nodes.push({
      id: group.id,
      type: "azureGroup",
      position: { x: 0, y: 0 },
      data: {
        id: group.id,
        kind: group.kind,
        label: group.label,
      } as GroupNodeData,
      style: {
        width: 320,
        height: 220,
        zIndex: -1,
      },
    });
  }

  // 2. Azure Service nodes
  for (const node of diagram.nodes) {
    const iconData = getServiceIcon(node.service);
    const meta = lookupAzureService(node.service);

    nodes.push({
      id: node.id,
      type: "azureNode",
      parentId: node.parent,
      position: { x: node.position.x, y: node.position.y },
      data: {
        id: node.id,
        service: node.service,
        label: node.label,
        displayName: meta?.displayName ?? node.service,
        sku: (node.config?.["sku"] as string | undefined) ?? meta?.commonSkus[0],
        zoneRedundant: (node.config?.["zoneRedundant"] as boolean | undefined) ?? false,
        svgIcon: iconData.svg,
        isFallbackIcon: iconData.isFallback,
        annotations: node.annotations ?? [],
        config: node.config ?? {},
      } as AzureNodeData,
    });
  }

  // 3. Editor nodes (annotations)
  for (const node of diagram.nodes) {
    if (node.service === "editor") {
      nodes.push({
        id: node.id,
        type: "editorNode",
        parentId: node.parent,
        position: { x: node.position.x, y: node.position.y },
        data: {
          id: node.id,
          annotations: node.annotations ?? [],
        } as EditorNodeData,
      });
    }
  }

  // 4. Edges
  for (const edge of diagram.edges) {
    edges.push({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: "smoothstep",
      animated: edge.style === "dashed",
      style: {
        stroke: "#38bdf8",
        strokeWidth: 1.5,
        strokeDasharray: edge.style === "dashed" ? "5 5" : undefined,
      },
      labelStyle: {
        fill: "#94a3b8",
        fontSize: 10,
        fontFamily: "monospace",
      },
      labelBgStyle: {
        fill: "#0f172a",
        fillOpacity: 0.85,
      },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
    });
  }

  return { nodes, edges };
}

/**
 * Serializes React Flow nodes and edges back to canonical DiagramJson.
 */
export function reactFlowToDiagramJson(
  currentDiagram: DiagramJson,
  nodes: Node[],
  edges: Edge[]
): DiagramJson {
  const updatedNodes: DiagramNode[] = [];
  const updatedGroups: DiagramGroup[] = [];

  for (const node of nodes) {
    if (node.type === "azureGroup") {
      const data = node.data as GroupNodeData;
      updatedGroups.push({
        id: node.id,
        kind: data.kind,
        label: data.label,
      });
    } else if (node.type === "editorNode") {
      const data = node.data as EditorNodeData;
      updatedNodes.push({
        id: node.id,
        service: "editor",
        label: "Annotation",
        parent: node.parentId,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
        config: {},
        annotations: data.annotations ?? [],
      });
    } else {
      const data = node.data as AzureNodeData;
      updatedNodes.push({
        id: node.id,
        service: data.service,
        label: data.label,
        parent: node.parentId,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
        config: data.config ?? {},
        annotations: data.annotations ?? [],
      });
    }
  }

  const updatedEdges: DiagramEdge[] = edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
    style: e.animated ? "dashed" : "solid",
  }));

  return {
    ...currentDiagram,
    groups: updatedGroups,
    nodes: updatedNodes,
    edges: updatedEdges,
  };
}