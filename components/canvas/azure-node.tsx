"use client";

/**
 * Custom Azure Service Node Component for React Flow.
 * Displays official Azure SVG architecture icon, service label, SKU,
 * zone-redundancy chip, and input/output connection handles.
 * Spec §3 & §5.
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { AzureNodeData } from "./diagram-converter";

export function AzureNode({ data, selected }: NodeProps) {
  const nodeData = data as AzureNodeData;

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900/95 border transition-all shadow-lg ${
        selected
          ? "border-azure-500 ring-2 ring-azure-500/30 shadow-azure-950/50"
          : "border-slate-700/80 hover:border-slate-600 hover:shadow-xl"
      }`}
    >
      {/* Target Connection Handle (Incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-azure-500 !border-2 !border-slate-900 !-left-1.5 transition-transform hover:scale-125"
      />

      {/* Main Node Body */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Azure SVG Icon Box */}
          <div
            className="w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/60 p-1.5 flex items-center justify-center shrink-0 shadow-inner"
            dangerouslySetInnerHTML={{ __html: nodeData.svgIcon }}
          />

          {/* Node Titles */}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-100 truncate tracking-tight">
              {nodeData.label}
            </h4>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
              {nodeData.displayName}
            </p>
          </div>
        </div>

        {/* Badges / Chips */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5 text-[10px]">
          {nodeData.sku && (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-azure-300 font-mono font-medium border border-slate-700/50">
              {nodeData.sku}
            </span>
          )}

          {nodeData.zoneRedundant && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-mono text-[9px] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              ZRS
            </span>
          )}

          {nodeData.isFallbackIcon && (
            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 font-mono text-[9px]">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Source Connection Handle (Outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-azure-500 !border-2 !border-slate-900 !-right-1.5 transition-transform hover:scale-125"
      />
    </div>
  );
}
