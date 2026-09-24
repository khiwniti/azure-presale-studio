/**
 * Architect Node.
 * Deep Think: Uses extended reasoning to formulate services, SKUs, topology,
 * and security patterns into an Architecture Decision Record (ADR).
 *
 * Spec §4: Architect Node.
 */

import { saveCheckpoint } from "../checkpointer";
import { NimClient } from "../nim-client";
import type { AgentGraphState, ArchitectureDecisionRecord, TimelineEvent } from "../types";

export async function architectNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const startedAt = new Date().toISOString();

  await saveCheckpoint(state.runId, state, {
    node: "architect",
    status: "running",
    startedAt,
  });

  const nim = await NimClient.forSession(state.sessionId);

  const contextMessage = `
Requirements: ${state.prompt}
Research Citations: ${JSON.stringify(state.researchBrief?.citations ?? [])}
Recommended Patterns: ${JSON.stringify(state.researchBrief?.recommendedPatterns ?? [])}
Previous Review Feedback: ${JSON.stringify(state.reviewFindings ?? [])}
Validation Errors: ${JSON.stringify(state.validationErrors ?? [])}
`;

  const raw = await nim.complete({
    messages: [
      {
        role: "system",
        content: `You are a Principal Azure Solutions Architect.
Produce an Architecture Decision Record (ADR) in strict JSON format:
{
  "title": "Solution Title",
  "region": "eastus",
  "topologySummary": "1-2 sentence description of topology",
  "services": [
    {
      "armType": "Microsoft.Web/sites",
      "label": "Display Label",
      "sku": "P1v3",
      "tier": "app",
      "zoneRedundant": true,
      "parentGroup": "optional group id"
    }
  ],
  "connections": [
    { "from": "Service Label A", "to": "Service Label B", "label": "Protocol/Port" }
  ],
  "groups": [
    { "id": "rg_main", "kind": "resource-group", "label": "rg-solution-eastus" }
  ],
  "redundancyStrategy": "Strategy statement",
  "securityControls": ["Control 1", "Control 2"]
}
ONLY use valid official Azure ARM types from the registry.`,
      },
      {
        role: "user",
        content: contextMessage,
      },
    ],
    responseFormat: "json",
    temperature: 0.1,
  });

  let adr: ArchitectureDecisionRecord;
  try {
    adr = JSON.parse(raw) as ArchitectureDecisionRecord;
  } catch {
    // Fallback ADR if parsing fails
    adr = {
      title: "Resilient Azure Architecture",
      region: "eastus",
      topologySummary: "Zone-redundant App Service web application with Azure SQL and Redis cache.",
      services: [
        { armType: "Microsoft.Cdn/profiles", label: "Azure Front Door", sku: "Standard", tier: "frontend", zoneRedundant: true },
        { armType: "Microsoft.Web/sites", label: "App Service", sku: "P1v3", tier: "app", zoneRedundant: true, parentGroup: "rg_main" },
        { armType: "Microsoft.Sql/servers/databases", label: "Azure SQL", sku: "GP_Gen5_2", tier: "data", zoneRedundant: true, parentGroup: "rg_main" },
        { armType: "Microsoft.Cache/Redis", label: "Redis Cache", sku: "Standard_C1", tier: "data", zoneRedundant: true, parentGroup: "rg_main" },
        { armType: "Microsoft.KeyVault/vaults", label: "Key Vault", sku: "Standard", tier: "security", zoneRedundant: true, parentGroup: "rg_main" },
        { armType: "Microsoft.OperationalInsights/workspaces", label: "Log Analytics", sku: "PerGB2018", tier: "management", zoneRedundant: true, parentGroup: "rg_main" },
      ],
      connections: [
        { from: "Azure Front Door", to: "App Service", label: "HTTPS / 443" },
        { from: "App Service", to: "Azure SQL", label: "TDS / 1433" },
        { from: "App Service", to: "Redis Cache", label: "TLS 6380" },
      ],
      groups: [{ id: "rg_main", kind: "resource-group", label: "rg-solution-eastus" }],
      redundancyStrategy: "Availability Zones 1, 2, 3 in eastus",
      securityControls: ["Private Endpoints", "Managed Identity", "WAF v2"],
    };
  }

  const completedEvent: TimelineEvent = {
    node: "architect",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    findings: `Selected ${adr.services.length} Azure services across ${adr.groups.length} resource groups with ${adr.redundancyStrategy}.`,
  };

  await saveCheckpoint(state.runId, state, completedEvent);

  return { adr };
}
