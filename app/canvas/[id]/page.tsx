"use client";

/**
 * Main Canvas Page for Architecture Diagram Editor.
 * Renders React Flow canvas with Azure nodes, layers panel, minimap, and zoom controls.
 * Uses Zustand store for centralized state management.
 * Spec §3 & §5.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { diagramJsonToReactFlow, reactFlowToDiagramJson, type AzureNodeData } from "@/components/canvas/diagram-converter";
import { AzureNode } from "@/components/canvas/azure-node";
import { GroupNode } from "@/components/canvas/group-node";
import { LayersPanel } from "@/components/canvas/layers-panel";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";

const nodeTypes = {
  azureNode: AzureNode,
  azureGroup: GroupNode,
};

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canvasId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const diagramJson = useDiagramStore((s) => s.diagramJson);
  const setDiagramJson = useDiagramStore((s) => s.setDiagramJson);
  const saveCheckpoint = useDiagramStore((s) => s.saveCheckpoint);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Load initial diagram from database
  useEffect(() => {
    async function loadCanvas() {
      try {
        const id = typeof canvasId === "string" ? canvasId : await (canvasId as Promise<string>);
        const res = await fetch(`/api/canvases/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load canvas");
        }

        const data = (await res.json()) as { diagramJson: string };
        const parsed = JSON.parse(data.diagramJson) as DiagramJson;

        setDiagramJson(parsed);
        const { nodes: initialNodes, edges: initialEdges } = diagramJsonToReactFlow(parsed);
        setNodes(initialNodes);
        setEdges(initialEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load canvas");
      } finally {
        setLoading(false);
      }
    }

    void loadCanvas();
  }, [canvasId, router, setDiagramJson, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleSave = useCallback(async () => {
    if (!diagramJson) return;

    try {
      const id = typeof canvasId === "string" ? canvasId : await (canvasId as Promise<string>);
      const updatedDiagram = reactFlowToDiagramJson(diagramJson, nodes, edges);
      const res = await fetch(`/api/canvases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagramJson: JSON.stringify(updatedDiagram) }),
      });

      if (!res.ok) throw new Error("Failed to save canvas");
      setDiagramJson(updatedDiagram);
      saveCheckpoint();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }, [canvasId, diagramJson, nodes, edges, setDiagramJson, saveCheckpoint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading canvas…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-rose-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-slate-100 truncate max-w-md">
            {diagramJson?.meta.title ?? "Untitled Architecture"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            style: { stroke: "#38bdf8", strokeWidth: 1.5 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
          <Controls className="!bg-slate-900 !border !border-slate-700 !shadow-xl" />
          <MiniMap
            className="!bg-slate-900 !border !border-slate-700"
            nodeColor={(node) => {
              const data = node.data as AzureNodeData;
              return data.service ? "#0078D4" : "#334155";
            }}
            maskColor="rgba(15, 23, 42, 0.8)"
          />
        </ReactFlow>

        {/* Layers Panel */}
        <LayersPanel nodes={nodes} edges={edges} />
      </div>
    </div>
  );
}
