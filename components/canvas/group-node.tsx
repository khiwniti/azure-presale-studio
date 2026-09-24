"use client";

/**
 * Custom Group/Container Node for React Flow.
 * Visual container for Resource Groups, Virtual Networks, Subnets, and Subscriptions.
 * Spec §3 & §5.
 */

import type { NodeProps } from "@xyflow/react";
import type { GroupNodeData } from "./diagram-converter";

const KIND_LABELS: Record<string, { label: string; border: string; bg: string }> = {
  "resource-group": {
    label: "Resource Group",
    border: "border-slate-700/80 border-dashed",
    bg: "bg-slate-950/40",
  },
  vnet: {
    label: "Virtual Network",
    border: "border-azure-600/50 border-dashed",
    bg: "bg-azure-950/10",
  },
  subnet: {
    label: "Subnet",
    border: "border-cyan-600/40 border-dotted",
    bg: "bg-cyan-950/10",
  },
  subscription: {
    label: "Subscription",
    border: "border-indigo-600/50 border-solid",
    bg: "bg-indigo-950/10",
  },
};

export function GroupNode({ data, selected }: NodeProps) {
  const groupData = data as GroupNodeData;
  const kindConfig = KIND_LABELS[groupData.kind] ?? KIND_LABELS["resource-group"]!;

  return (
    <div
      className={`w-full h-full rounded-2xl p-4 transition-all ${kindConfig.bg} ${kindConfig.border} ${
        selected ? "ring-2 ring-azure-500/40 border-azure-500" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase font-mono font-bold text-azure-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60">
          {kindConfig.label}
        </span>
        <span className="text-xs font-semibold text-slate-300 truncate">
          {groupData.label}
        </span>
      </div>
    </div>
  );
}
