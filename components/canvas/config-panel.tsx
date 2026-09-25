"use client";

/**
 * Config Panel Component for Azure Node Configuration.
 * Displays ARM-specific form fields (size, tier, capacity, etc.) for the selected node.
 * Spec §3 (node.config schema) & §5 (inline editing affordances).
 */

import { useEffect, useState } from "react";
import type { Node } from "@xyflow/react";
import type { AzureNodeData } from "./diagram-converter";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { lookupAzureService } from "@/mcp/azure-diagram/registry";

interface ConfigPanelProps {
  selectedNode: Node<AzureNodeData> | null;
}

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  options?: string[];
  defaultValue?: string | number | boolean;
}

export function ConfigPanel({ selectedNode }: ConfigPanelProps) {
  const updateNodeConfig = useDiagramStore((s) => s.updateNodeConfig);
  const [localConfig, setLocalConfig] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    if (selectedNode) {
      const config: Record<string, string | number | boolean> = {};
      const nodeConfig = selectedNode.data.config ?? {};
      for (const [key, value] of Object.entries(nodeConfig)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          config[key] = value;
        }
      }
      setLocalConfig(config);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="w-72 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full">
        <div className="p-3 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-200">Configuration</h3>
          <p className="text-[10px] text-slate-500 mt-1">Select a node to edit configuration</p>
        </div>
      </div>
    );
  }

  const nodeData = selectedNode.data as AzureNodeData;
  const serviceMetadata = lookupAzureService(nodeData.service);

  // Define ARM-specific config fields based on service category
  const getConfigFields = (): ConfigField[] => {
    const fields: ConfigField[] = [];
    const category = serviceMetadata?.category;

    // Common fields for all services
    fields.push({
      key: "location",
      label: "Location",
      type: "select",
      options: ["eastus", "westus2", "centralus", "northeurope", "westeurope", "southeastasia", "uksouth"],
      defaultValue: "eastus",
    });

    // Category-specific fields
    switch (category) {
      case "compute":
        fields.push(
          { key: "instanceSize", label: "Instance Size", type: "select", options: ["B1", "B2", "B3", "D2s_v5", "D4s_v5", "D8s_v5", "E2s_v5", "E4s_v5", "E8s_v5"], defaultValue: "B1" },
          { key: "instanceCount", label: "Instance Count", type: "number", defaultValue: 1 },
          { key: "osType", label: "OS Type", type: "select", options: ["Linux", "Windows"], defaultValue: "Linux" }
        );
        break;
      case "database":
        fields.push(
          { key: "skuName", label: "SKU Name", type: "select", options: serviceMetadata?.commonSkus ?? ["Standard", "Premium"], defaultValue: serviceMetadata?.commonSkus[0] ?? "Standard" },
          { key: "capacity", label: "Capacity (RUs/vCores)", type: "number", defaultValue: 400 },
          { key: "backupRetentionDays", label: "Backup Retention (Days)", type: "number", defaultValue: 7 }
        );
        break;
      case "storage":
        fields.push(
          { key: "skuName", label: "Redundancy", type: "select", options: ["Standard_LRS", "Standard_ZRS", "Standard_GRS", "Standard_RAGRS", "Premium_LRS", "Premium_ZRS"], defaultValue: "Standard_ZRS" },
          { key: "accessTier", label: "Access Tier", type: "select", options: ["Hot", "Cool", "Cold"], defaultValue: "Hot" },
          { key: "hierarchicalNamespace", label: "Hierarchical Namespace (Data Lake)", type: "boolean", defaultValue: false }
        );
        break;
      case "networking":
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["Standard_v2", "WAF_v2"], defaultValue: serviceMetadata?.commonSkus[0] ?? "Standard_v2" },
          { key: "capacity", label: "Capacity (Units)", type: "number", defaultValue: 2 },
          { key: "enableHttp2", label: "Enable HTTP/2", type: "boolean", defaultValue: true },
          { key: "enableWaf", label: "Enable WAF", type: "boolean", defaultValue: true }
        );
        break;
      case "security":
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["Standard", "Premium"], defaultValue: serviceMetadata?.commonSkus[0] ?? "Standard" },
          { key: "enablePurgeProtection", label: "Enable Purge Protection", type: "boolean", defaultValue: true },
          { key: "enableSoftDelete", label: "Enable Soft Delete", type: "boolean", defaultValue: true }
        );
        break;
      case "integration":
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["Standard", "Premium"], defaultValue: serviceMetadata?.commonSkus[0] ?? "Standard" },
          { key: "maxMessageSize", label: "Max Message Size (KB)", type: "number", defaultValue: 256 },
          { key: "enablePartitioning", label: "Enable Partitioning", type: "boolean", defaultValue: true }
        );
        break;
      case "ai":
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["S0"], defaultValue: "S0" },
          { key: "deploymentType", label: "Deployment Type", type: "select", options: ["Global", "Regional"], defaultValue: "Global" }
        );
        break;
      case "monitoring":
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["PerGB2018"], defaultValue: "PerGB2018" },
          { key: "retentionDays", label: "Retention (Days)", type: "number", defaultValue: 30 }
        );
        break;
      default:
        fields.push(
          { key: "skuName", label: "SKU", type: "select", options: serviceMetadata?.commonSkus ?? ["Standard"], defaultValue: serviceMetadata?.commonSkus[0] ?? "Standard" }
        );
    }

    return fields;
  };

  const configFields = getConfigFields();

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    updateNodeConfig(selectedNode.id, newConfig);
  };

  const getValue = (field: ConfigField): string | number | boolean => {
    const localValue = localConfig[field.key];
    if (localValue !== undefined) return localValue;
    return field.defaultValue ?? (field.type === "boolean" ? false : field.type === "number" ? 0 : "");
  };

  return (
    <div className="w-72 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">Configuration</h3>
          <span className="text-[10px] font-mono text-azure-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
            {serviceMetadata?.displayName ?? nodeData.service}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 truncate">{nodeData.label}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {configFields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-[10px] font-medium text-slate-300 uppercase tracking-wide">{field.label}</label>
            {field.type === "select" && (
              <select
                value={getValue(field) as string}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-azure-500 focus:outline-none focus:ring-1 focus:ring-azure-500"
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {field.type === "number" && (
              <input
                type="number"
                value={getValue(field) as number}
                onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-azure-500 focus:outline-none focus:ring-1 focus:ring-azure-500"
                min={0}
              />
            )}
            {field.type === "text" && (
              <input
                type="text"
                value={getValue(field) as string}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-azure-500 focus:outline-none focus:ring-1 focus:ring-azure-500"
              />
            )}
            {field.type === "boolean" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={getValue(field) as boolean}
                  onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                  className="w-4 h-4 text-azure-500 border-slate-600 rounded focus:ring-azure-500"
                />
                <span className="text-xs text-slate-300">Enable</span>
              </label>
            )}
          </div>
        ))}

        {configFields.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No configuration fields available for this service</p>
        )}
      </div>
    </div>
  );
}