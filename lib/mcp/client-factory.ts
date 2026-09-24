/**
 * MCP Client Factory & Tool Provider.
 * Connects the LangGraph agent nodes (researcher, architect, diagram_builder)
 * to the three in-process MCP servers:
 * - azure-diagram: icon lookup, layout coordinates, diagram schema validation
 * - azure-pricing: Azure Retail Prices API queries
 * - azure-docs: Microsoft Learn search and document fetching
 *
 * Spec §2 & §4: MCP clients & tools.
 */

import { AZURE_SERVICE_REGISTRY, calculateTierLayout, getServiceIcon, lookupAzureService } from "@/mcp/azure-diagram/registry";
import { type DiagramJson, validateDiagram } from "@/mcp/azure-diagram/validator";
import { fetchDocPage, searchDocs } from "@/mcp/azure-docs/server";
import { fetchAzurePrices } from "@/mcp/azure-pricing/server";

export interface McpClient {
  diagram: {
    lookupIcon: (armType: string) => { armType: string; displayName: string; svg: string; isFallback: boolean };
    getLayoutHints: (armType: string, indexInTier?: number) => { armType: string; tier: string; position: { x: number; y: number } };
    validate: (diagram: unknown) => { valid: boolean; errors: unknown[]; unknownArmTypes: string[] };
    listServices: (category?: string) => Array<{ armType: string; displayName: string; category: string; tier: string; commonSkus: string[] }>;
  };
  pricing: {
    getPrices: (params: { serviceName?: string; skuName?: string; armRegionName?: string }) => Promise<{
      total: number;
      isFallback: boolean;
      prices: Array<{ productName: string; skuName: string; retailPrice: number; unitOfMeasure: string; region: string }>;
    }>;
  };
  docs: {
    search: (query: string, top?: number) => Promise<Array<{ title: string; url: string; snippet: string; category: string }>>;
    fetchPage: (url: string) => Promise<{ title: string; url: string; content: string }>;
  };
}

/**
 * Creates the unified MCP client used by LangGraph agent nodes.
 */
export function createMcpClient(): McpClient {
  return {
    diagram: {
      lookupIcon: (armType: string) => {
        const iconData = getServiceIcon(armType);
        const meta = lookupAzureService(armType);
        return {
          armType,
          displayName: meta?.displayName ?? "Azure Resource",
          svg: iconData.svg,
          isFallback: iconData.isFallback,
        };
      },

      getLayoutHints: (armType: string, indexInTier: number = 0) => {
        const meta = lookupAzureService(armType);
        return {
          armType,
          tier: meta?.tier ?? "app",
          position: calculateTierLayout(armType, indexInTier),
        };
      },

      validate: (diagram: unknown) => {
        const result = validateDiagram(diagram as DiagramJson);
        return {
          valid: result.valid,
          errors: result.errors,
          unknownArmTypes: result.unknownArmTypes,
        };
      },

      listServices: (category?: string) => {
        return Object.values(AZURE_SERVICE_REGISTRY)
          .filter((s) => !category || s.category === category)
          .map((s) => ({
            armType: s.armType,
            displayName: s.displayName,
            category: s.category,
            tier: s.tier,
            commonSkus: s.commonSkus,
          }));
      },
    },

    pricing: {
      getPrices: async (params) => {
        const res = await fetchAzurePrices(params);
        return {
          total: res.items.length,
          isFallback: res.isFallback,
          prices: res.items.map((i) => ({
            productName: i.productName,
            skuName: i.skuName,
            retailPrice: i.retailPrice,
            unitOfMeasure: i.unitOfMeasure,
            region: i.armRegionName,
          })),
        };
      },
    },

    docs: {
      search: async (query, top = 3) => {
        return searchDocs(query, top);
      },
      fetchPage: async (url) => {
        return fetchDocPage(url);
      },
    },
  };
}
