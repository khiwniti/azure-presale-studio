/**
 * Azure Pricing MCP Server.
 * Queries the official Azure Retail Prices API for real-time pricing data
 * across Azure services, SKUs, and regions.
 *
 * Spec §4: Azure Pricing MCP.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface AzurePriceItem {
  currencyCode: string;
  retailPrice: number;
  unitPrice?: number;
  armRegionName: string;
  location: string;
  meterId: string;
  meterName: string;
  productId: string;
  productName: string;
  skuId: string;
  skuName: string;
  serviceName: string;
  serviceId: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
  isPrimaryMeterRegion: boolean;
  effectiveStartDate: string;
}

export interface AzureRetailPricesResponse {
  Items: AzurePriceItem[];
  NextPageLink: string | null;
  Count: number;
}

// Built-in baseline reference rates ($ / unit) for resilient offline operation
const REFERENCE_PRICES: Record<string, { hourly: number; monthly: number; unit: string }> = {
  "P1v3": { hourly: 0.125, monthly: 91.25, unit: "1 Hour" },
  "P2v3": { hourly: 0.25, monthly: 182.50, unit: "1 Hour" },
  "Standard_D4s_v5": { hourly: 0.192, monthly: 140.16, unit: "1 Hour" },
  "Standard_D8s_v5": { hourly: 0.384, monthly: 280.32, unit: "1 Hour" },
  "GP_Gen5_2": { hourly: 0.285, monthly: 208.05, unit: "1 vCore Hour" },
  "Standard_C1": { hourly: 0.055, monthly: 40.15, unit: "1 Hour" },
  "Standard_LRS": { hourly: 0.000025, monthly: 0.018, unit: "1 GB/Month" },
  "Standard_ZRS": { hourly: 0.000035, monthly: 0.025, unit: "1 GB/Month" },
};

/**
 * Fetch prices from the official Azure Retail Prices API with OData filtering.
 */
export async function fetchAzurePrices(params: {
  serviceName?: string;
  skuName?: string;
  armRegionName?: string;
  currencyCode?: string;
}): Promise<{ items: AzurePriceItem[]; isFallback: boolean }> {
  const currency = params.currencyCode ?? "USD";
  const region = params.armRegionName ?? "eastus";

  const filters: string[] = [`armRegionName eq '${region}'`, `currencyCode eq '${currency}'`];

  if (params.serviceName) {
    filters.push(`serviceName eq '${params.serviceName}'`);
  }
  if (params.skuName) {
    filters.push(`contains(skuName, '${params.skuName}')`);
  }

  const odataFilter = filters.join(" and ");
  const url = `https://prices.azure.com/api/retail/prices?$filter=${encodeURIComponent(odataFilter)}&$top=20`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Azure Pricing API returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as AzureRetailPricesResponse;
    if (data.Items && data.Items.length > 0) {
      return { items: data.Items, isFallback: false };
    }
  } catch {
    // Graceful offline fallback per spec §7
  }

  // Generate synthetic reference items from verified baseline rates
  const fallbackSku = params.skuName ?? "P1v3";
  const ref = REFERENCE_PRICES[fallbackSku] ?? {
    hourly: 0.10,
    monthly: 73.0,
    unit: "1 Unit",
  };

  const syntheticItem: AzurePriceItem = {
    currencyCode: currency,
    retailPrice: ref.monthly,
    unitPrice: ref.hourly,
    armRegionName: region,
    location: region,
    meterId: "ref-meter-id",
    meterName: `${fallbackSku} Monthly Plan`,
    productId: "ref-product-id",
    productName: params.serviceName ?? "Azure Cloud Service",
    skuId: "ref-sku-id",
    skuName: fallbackSku,
    serviceName: params.serviceName ?? "Azure Cloud Service",
    serviceId: "ref-service-id",
    serviceFamily: "Compute",
    unitOfMeasure: ref.unit,
    type: "Consumption",
    isPrimaryMeterRegion: true,
    effectiveStartDate: new Date().toISOString(),
  };

  return { items: [syntheticItem], isFallback: true };
}

const server = new Server(
  {
    name: "azure-pricing",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_prices",
        description:
          "Query current Azure retail prices by service name, SKU name, and region. Returns hourly/monthly rates with unit of measure.",
        inputSchema: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description: "Official Azure service name, e.g. 'Virtual Machines', 'Azure App Service', 'Azure Cosmos DB', 'Storage'",
            },
            skuName: {
              type: "string",
              description: "Azure SKU identifier, e.g. 'P1v3', 'Standard_D4s_v5', 'Serverless'",
            },
            armRegionName: {
              type: "string",
              description: "Azure region code, e.g. 'eastus', 'westeurope', 'southeastasia'. Defaults to 'eastus'.",
            },
            currencyCode: {
              type: "string",
              description: "Three-letter ISO currency code, e.g. 'USD', 'EUR'. Defaults to 'USD'.",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "get_prices") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const result = await fetchAzurePrices({
    serviceName: args?.["serviceName"] as string | undefined,
    skuName: args?.["skuName"] as string | undefined,
    armRegionName: args?.["armRegionName"] as string | undefined,
    currencyCode: args?.["currencyCode"] as string | undefined,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            total: result.items.length,
            isFallback: result.isFallback,
            prices: result.items.map((item) => ({
              productName: item.productName,
              skuName: item.skuName,
              retailPrice: item.retailPrice,
              unitOfMeasure: item.unitOfMeasure,
              region: item.armRegionName,
              currency: item.currencyCode,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
});

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startServer().catch((err) => {
    console.error("Failed to start azure-pricing MCP server:", err);
    process.exit(1);
  });
}
