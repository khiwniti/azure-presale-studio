/**
 * Diagram State Store (Zustand + immer).
 * Centralized mutation source for diagram JSON, React Flow nodes/edges,
 * SSE patch application, and undo/redo stack.
 * Spec §3 & §5.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { DiagramJson, DiagramNode, DiagramEdge, DiagramGroup } from "@/mcp/azure-diagram/validator";
import type { Node, Edge } from "@xyflow/react";

interface DiagramState {
  // Canonical diagram JSON
  diagramJson: DiagramJson | null;

  // React Flow models
  nodes: Node[];
  edges: Edge[];

  // Undo/redo stack
  history: DiagramJson[];
  historyIndex: number;

  // Actions
  setDiagramJson: (diagram: DiagramJson) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  applySSEPatch: (patch: { op: string; path: string; value?: unknown }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveCheckpoint: () => void;
}

export const useDiagramStore = create<DiagramState>()(
  immer((set, get) => ({
    diagramJson: null,
    nodes: [],
    edges: [],
    history: [],
    historyIndex: -1,

    setDiagramJson: (diagram) => {
      set((state) => {
        state.diagramJson = diagram;
        state.history = [diagram];
        state.historyIndex = 0;
      });
    },

    setNodes: (nodes) => {
      set((state) => {
        state.nodes = nodes;
      });
    },

    setEdges: (edges) => {
      set((state) => {
        state.edges = edges;
      });
    },

    applySSEPatch: (patch) => {
      set((state) => {
        if (!state.diagramJson) return;

        // Simple JSON patch application for common operations
        if (patch.op === "replace" && patch.path.startsWith("/meta/")) {
          const key = patch.path.split("/")[2]!;
          (state.diagramJson.meta as Record<string, unknown>)[key] = patch.value;
        } else if (patch.op === "replace" && patch.path.startsWith("/nodes/")) {
          const nodeIndex = parseInt(patch.path.split("/")[2]!, 10);
          if (state.diagramJson.nodes[nodeIndex]) {
            const key = patch.path.split("/")[3]!;
            (state.diagramJson.nodes[nodeIndex] as Record<string, unknown>)[key] = patch.value;
          }
        } else if (patch.op === "add" && patch.path.startsWith("/nodes/")) {
          if (patch.path === "/nodes/-") {
            state.diagramJson.nodes.push(patch.value as DiagramNode);
          }
        } else if (patch.op === "remove" && patch.path.startsWith("/nodes/")) {
          const nodeIndex = parseInt(patch.path.split("/")[2]!, 10);
          state.diagramJson.nodes.splice(nodeIndex, 1);
        } else if (patch.op === "replace" && patch.path.startsWith("/edges/")) {
          const edgeIndex = parseInt(patch.path.split("/")[2]!, 10);
          if (state.diagramJson.edges[edgeIndex]) {
            const key = patch.path.split("/")[3]!;
            (state.diagramJson.edges[edgeIndex] as Record<string, unknown>)[key] = patch.value;
          }
        } else if (patch.op === "add" && patch.path.startsWith("/edges/")) {
          if (patch.path === "/edges/-") {
            state.diagramJson.edges.push(patch.value as DiagramEdge);
          }
        } else if (patch.op === "remove" && patch.path.startsWith("/edges/")) {
          const edgeIndex = parseInt(patch.path.split("/")[2]!, 10);
          state.diagramJson.edges.splice(edgeIndex, 1);
        } else if (patch.op === "replace" && patch.path.startsWith("/groups/")) {
          const groupIndex = parseInt(patch.path.split("/")[2]!, 10);
          if (state.diagramJson.groups[groupIndex]) {
            const key = patch.path.split("/")[3]!;
            (state.diagramJson.groups[groupIndex] as Record<string, unknown>)[key] = patch.value;
          }
        } else if (patch.op === "add" && patch.path.startsWith("/groups/")) {
          if (patch.path === "/groups/-") {
            state.diagramJson.groups.push(patch.value as DiagramGroup);
          }
        } else if (patch.op === "remove" && patch.path.startsWith("/groups/")) {
          const groupIndex = parseInt(patch.path.split("/")[2]!, 10);
          state.diagramJson.groups.splice(groupIndex, 1);
        }
      });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          state.diagramJson = state.history[state.historyIndex];
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          state.diagramJson = state.history[state.historyIndex];
        }
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    saveCheckpoint: () => {
      set((state) => {
        if (!state.diagramJson) return;
        // Remove any history after current index
        state.history = state.history.slice(0, state.historyIndex + 1);
        // Add new checkpoint
        state.history.push(state.diagramJson);
        state.historyIndex = state.history.length - 1;
        // Limit history to 50 checkpoints
        if (state.history.length > 50) {
          state.history.shift();
          state.historyIndex -= 1;
        }
      });
    },
  }))
);
