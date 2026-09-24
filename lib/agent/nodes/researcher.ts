/**
 * Researcher Node.
 * Deep Research: Queries azure-docs MCP and azure-pricing MCP.
 * Grounded in official Microsoft Learn architectures and Azure Retail Prices.
 *
 * Spec §4: Researcher Node.
 */

import { createMcpClient } from "@/lib/mcp/client-factory";
import { saveCheckpoint } from "../checkpointer";
import type { AgentGraphState, ResearchBrief, TimelineEvent } from "../types";

export async function researcherNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const startedAt = new Date().toISOString();

  await saveCheckpoint(state.runId, state, {
    node: "researcher",
    status: "running",
    startedAt,
  });

  const mcp = createMcpClient();

  // 1. Query official Microsoft Learn documentation
  const docResults = await mcp.docs.search(state.prompt, 3);
  const citations = docResults.map((d) => ({
    title: d.title,
    url: d.url,
  }));

  // 2. Query Azure Retail Prices for core candidate services
  const pricingPromises = [
    mcp.pricing.getPrices({ serviceName: "Azure App Service", skuName: "P1v3", armRegionName: "eastus" }),
    mcp.pricing.getPrices({ serviceName: "Azure Cosmos DB", skuName: "Serverless", armRegionName: "eastus" }),
    mcp.pricing.getPrices({ serviceName: "Virtual Machines", skuName: "Standard_D4s_v5", armRegionName: "eastus" }),
  ];
  const pricingResults = await Promise.all(pricingPromises);

  const pricingEstimates = pricingResults.flatMap((r) =>
    r.prices.slice(0, 1).map((p) => ({
      serviceName: p.productName,
      sku: p.skuName,
      estimatedMonthly: p.retailPrice,
      unitOfMeasure: p.unitOfMeasure,
    }))
  );

  const researchBrief: ResearchBrief = {
    summary: `Identified official Azure reference architectures from Microsoft Learn for: "${state.prompt}". Grounded in Azure Well-Architected Framework pillars.`,
    citations,
    recommendedPatterns: [
      "Availability Zones 1, 2, 3 in primary region for zero-downtime resiliency",
      "Managed Identities for credential-free service-to-service communication",
      "Azure Application Gateway or Front Door with Web Application Firewall (WAF)",
      "Private Endpoints for internal databases and cache isolation",
    ],
    pricingEstimates,
  };

  const completedEvent: TimelineEvent = {
    node: "researcher",
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    findings: `Gathered ${citations.length} Microsoft Learn citations and ${pricingEstimates.length} live SKU price baselines.`,
    citations,
  };

  await saveCheckpoint(state.runId, state, completedEvent);

  return { researchBrief };
}
