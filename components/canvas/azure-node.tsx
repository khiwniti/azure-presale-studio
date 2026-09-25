"use client";

/**
 * Custom Azure Service Node Component for React Flow.
 * Displays official Azure SVG architecture icon, service label, SKU,
 * zone-redundancy chip, and input/output connection handles.
 * Supports inline editing for label, SKU, and zone-redundancy.
 * Spec §3 & §5.
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";
import type { AzureNodeData } from "./diagram-converter";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { lookupAzureService } from "@/mcp/azure-diagram/registry";

export function AzureNode({ data, selected }: NodeProps) {
  const nodeData = data as AzureNodeData;
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const labelRef = useRef<HTMLHeadingElement>(null);
  const skuDropdownRef = useRef<HTMLButtonElement>(null);
  
  const serviceMetadata = lookupAzureService(nodeData.service);
  const commonSkus = serviceMetadata?.commonSkus ?? [];
  const supportsZoneRedundancy = serviceMetadata?.supportsZoneRedundancy ?? false;

  // Handle label edit on blur
  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    if (labelRef.current) {
      const newLabel = labelRef.current.textContent?.trim();
      if (newLabel && newLabel !== nodeData.label) {
        updateNodeData(nodeData.id, { label: newLabel });
      }
    }
  };

  // Handle label edit on Enter key
  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLabelBlur();
    } else if (e.key === "Escape") {
      setIsEditingLabel(false);
    }
  };

  // Handle SKU selection
  const handleSkuSelect = (sku: string) => {
    updateNodeData(nodeData.id, { sku });
    setIsSkuDropdownOpen(false);
  };

  // Handle zone-redundancy toggle
  const handleZoneRedundancyToggle = () => {
    updateNodeData(nodeData.id, { zoneRedundant: !nodeData.zoneRedundant });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skuDropdownRef.current && !skuDropdownRef.current.contains(e.target as Node)) {
        setIsSkuDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <h4
              ref={labelRef}
              className="text-xs font-bold text-slate-100 truncate tracking-tight"
              onClick={() => setIsEditingLabel(true)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              contentEditable={isEditingLabel}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: nodeData.label }}
            />
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
              {nodeData.displayName}
            </p>
          </div>
        </div>

        {/* Badges / Chips */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5 text-[10px]">
          {/* SKU Dropdown */}
          {commonSkus.length > 0 && (
            <div className="relative">
              <button
                ref={skuDropdownRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSkuDropdownOpen(!isSkuDropdownOpen);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-azure-300 font-mono font-medium border border-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                {nodeData.sku ?? commonSkus[0]}
              </button>
              {isSkuDropdownOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 min-w-[120px] bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden"
                >
                  {commonSkus.map((sku) => (
                    <button
                      key={sku}
                      type="button"
                      onClick={() => handleSkuSelect(sku)}
                      className={`w-full px-2 py-1.5 text-left text-xs font-mono ${
                        nodeData.sku === sku
                          ? "bg-azure-500/20 text-azure-300"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {sku}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zone Redundancy Toggle */}
          {supportsZoneRedundancy && (
            <button
              type="button"
              onClick={handleZoneRedundancyToggle}
              className={`px-1.5 py-0.5 rounded font-mono text-[9px] flex items-center gap-1 transition-colors ${
                nodeData.zoneRedundant
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-950"
                  : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"
              }`}
              title="Toggle zone redundancy"
            >
              <span className={`w-1 h-1 rounded-full ${nodeData.zoneRedundant ? "bg-emerald-400" : "bg-slate-500"}`} />
              ZRS
            </button>
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