"use client";

/**
 * Layers Panel Component.
 * Displays a hierarchical tree view of groups and nodes in the diagram.
 * Spec §5.
 */

import type { Node, Edge } from "@xyflow/react";
import type { AzureNodeData, GroupNodeData } from "./diagram-converter";

interface LayersPanelProps {
  nodes: Node[];
  edges: Edge[];
}

export function LayersPanel({ nodes, edges }: LayersPanelProps) {
  // Group nodes by parent
  const groups = nodes.filter((n) => n.type === "azureGroup");
  const serviceNodes = nodes.filter((n) => n.type === "azureNode");

  return (
    <div className="absolute top-4 right-4 w-64 max-h-[calc(100vh-100px)] bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60">
        <h3 className="text-xs font-semibold text-slate-200">Layers</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Groups Section */}
        {groups.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase px-2 py-1">
              Groups ({groups.length})
            </div>
            {groups.map((g) => {
              const data = g.data as GroupNodeData;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-azure-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-xs text-slate-200 truncate">{data.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Service Nodes Section */}
        {serviceNodes.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase px-2 py-1">
              Services ({serviceNodes.length})
            </div>
            {serviceNodes.map((n) => {
              const data = n.data as AzureNodeData;
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" />
                  </svg>
                  <span className="text-xs text-slate-300 truncate">{data.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Edges Count */}
        <div className="text-[10px] font-mono text-slate-500 uppercase px-2 py-1">
          Connections ({edges.length})
        </div>
      </div>
    </div>
  );
}
