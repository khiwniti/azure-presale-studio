"use client";

/**
 * Main Canvas Page for Architecture Diagram Editor.
 * Renders React Flow canvas with Azure nodes, layers panel, minimap, zoom controls,
 * configuration panel, chat panel, agent timeline, and report wizard.
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
  type NodeChange,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { diagramJsonToReactFlow, reactFlowToDiagramJson, type AzureNodeData } from "@/components/canvas/diagram-converter";
import { AzureNode } from "@/components/canvas/azure-node";
import { GroupNode } from "@/components/canvas/group-node";
import { EditorNode } from "@/components/canvas/editor-node";
import { LayersPanel } from "@/components/canvas/layers-panel";
import { ConfigPanel } from "@/components/canvas/config-panel";
import { ChatPanel, type ChatMessage } from "@/components/canvas/chat-panel";
import { AgentTimeline } from "@/components/canvas/agent-timeline";
import { ReportWizard } from "@/components/canvas/report-wizard";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";
import type { TimelineEvent } from "@/lib/agent/types";

const nodeTypes = {
  azureNode: AzureNode,
  azureGroup: GroupNode,
  editorNode: EditorNode,
};

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canvasId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showReportWizard, setShowReportWizard] = useState(false);

  // Chat and agent state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [agentStatus, setAgentStatus] = useState<"running" | "completed" | "failed">("completed");
  const [runId, setRunId] = useState<string | null>(null);

  const diagramJson = useDiagramStore((s) => s.diagramJson);
  const setDiagramJson = useDiagramStore((s) => s.setDiagramJson);
  const saveCheckpoint = useDiagramStore((s) => s.saveCheckpoint);
  const applySSEPatch = useDiagramStore((s) => s.applySSEPatch);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AzureNodeData | import("@/components/canvas/diagram-converter").EditorNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Handle node selection
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<AzureNodeData | import("@/components/canvas/diagram-converter").EditorNodeData>>[]) => {
      onNodesChange(changes);
      // Track selection changes
      for (const change of changes) {
        if (change.type === "select" && change.selected) {
          setSelectedNodeId(change.id);
        } else if (change.type === "select" && !change.selected) {
          if (selectedNodeId === change.id) {
            setSelectedNodeId(null);
          }
        }
      }
    },
    [onNodesChange, selectedNodeId]
  );

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
        setNodes(initialNodes as Node<AzureNodeData | import("@/components/canvas/diagram-converter").EditorNodeData>[]);
        setEdges(initialEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load canvas");
      } finally {
        setLoading(false);
      }
    }

    void loadCanvas();
  }, [canvasId, router, setDiagramJson, setNodes, setEdges]);

  // SSE connection for real-time agent updates
  useEffect(() => {
    if (!canvasId) return;

    const id = typeof canvasId === "string" ? canvasId : canvasId;
    // For now, we'll use a placeholder runId - in production this would come from the current run
    const currentRunId = id;
    
    setRunId(currentRunId);
    
    const eventSource = new EventSource(`/api/runs/${currentRunId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "replay") {
          // Initial replay of existing state
          setTimeline(data.timeline || []);
          setAgentStatus(data.status || "completed");
          if (data.diagram) {
            setDiagramJson(data.diagram);
            const { nodes: replayNodes, edges: replayEdges } = diagramJsonToReactFlow(data.diagram);
            setNodes(replayNodes as Node<AzureNodeData | import("@/components/canvas/diagram-converter").EditorNodeData>[]);
            setEdges(replayEdges);
          }
        } else if (data.type === "timeline") {
          // Live timeline update
          setTimeline((prev) => [...prev, data.event]);
        } else if (data.type === "patch") {
          // SSE patch for diagram updates
          applySSEPatch(data.patch);
        } else if (data.type === "message") {
          // Agent message
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            role: "agent",
            content: data.content,
            timestamp: new Date().toISOString(),
          }]);
        } else if (data.status) {
          // Overall status update
          setAgentStatus(data.status);
          if (data.status === "completed" || data.status === "failed") {
            eventSource.close();
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [canvasId, setDiagramJson, setNodes, setEdges, applySSEPatch]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleAddNote = useCallback(() => {
    const newEditorNode: Node<import("@/components/canvas/diagram-converter").EditorNodeData> = {
      id: `editor_${Date.now()}`,
      type: "editorNode",
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 50 },
      data: {
        id: `editor_${Date.now()}`,
        annotations: [],
        onAnnotationChange: (newAnnotations) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === newEditorNode.id
                ? { ...n, data: { ...n.data, annotations: newAnnotations } }
                : n
            )
          );
        },
      },
    };
    setNodes((nds) => [...nds, newEditorNode]);
  }, [nodes, setNodes]);

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to agent (this would create a new run or append to existing)
    // For now, this is a placeholder - the actual API endpoint needs to be implemented
    try {
      const id = typeof canvasId === "string" ? canvasId : await (canvasId as Promise<string>);
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId: id, prompt: content, intent: "edit" }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      if (data.runId) {
        setRunId(data.runId);
        setAgentStatus("running");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "agent",
        content: "Sorry, I couldn't process your message. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [canvasId]);

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

  const selectedNode = (nodes.find((n) => n.id === selectedNodeId) as import("@xyflow/react").Node<import("@/components/canvas/diagram-converter").AzureNodeData> | null) ?? null;

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
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-slate-100 truncate max-w-md">
            {diagramJson?.meta.title ?? "Untitled Architecture"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Status Badge */}
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              agentStatus === "running"
                ? "bg-cyan-500/20 text-cyan-300"
                : agentStatus === "completed"
                ? "bg-green-500/20 text-green-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            Agent {agentStatus}
          </span>
          <button
            type="button"
            onClick={handleAddNote}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm"
          >
            Add Note
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 transition-colors shadow-sm"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowReportWizard(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
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

        {/* Right Sidebar: Config Panel + Agent Timeline + Chat Panel */}
        <div className="flex flex-col h-full w-80 border-l border-slate-800">
          {/* Config Panel */}
          <ConfigPanel selectedNode={selectedNode} />
          
          {/* Agent Timeline */}
          <div className="h-64">
            <AgentTimeline timeline={timeline} overallStatus={agentStatus} />
          </div>

          {/* Chat Panel */}
          <div className="h-64">
            <ChatPanel 
              messages={messages} 
              onSendMessage={handleSendMessage}
              disabled={agentStatus === "running"}
            />
          </div>
        </div>
      </div>

      {showReportWizard && diagramJson && (
        <ReportWizard
          diagramJson={diagramJson}
          onClose={() => setShowReportWizard(false)}
          onGenerateReport={(format) => {
            // Handle report generation
            console.log("Generate report:", format);
          }}
        />
      )}
    </div>
  );
}