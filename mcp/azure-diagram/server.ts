/**
 * Azure Diagram MCP Server.
 * Exposes official Azure ARM icon lookup, layout hint generation,
 * diagram validation, and supported service queries over stdio MCP transport.
 *
 * Spec §4: MCP Tools & Skills.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  AZURE_SERVICE_REGISTRY,
  calculateTierLayout,
  getServiceIcon,
  lookupAzureService,
} from "./registry";
import { validateDiagram } from "./validator";

const server = new Server(
  {
    name: "azure-diagram",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Tool List ───────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "lookup_icon",
        description:
          "Lookup the official Azure SVG architecture icon for a given ARM service type (e.g. 'Microsoft.Web/sites').",
        inputSchema: {
          type: "object",
          properties: {
            armType: {
              type: "string",
              description: "Full Azure ARM resource type e.g. Microsoft.Web/sites",
            },
          },
          required: ["armType"],
        },
      },
      {
        name: "get_layout_hints",
        description:
          "Get recommended 2D canvas coordinates (tier-based layout) for placing an Azure node on the architecture diagram.",
        inputSchema: {
          type: "object",
          properties: {
            armType: {
              type: "string",
              description: "Full Azure ARM resource type",
            },
            indexInTier: {
              type: "number",
              description: "Zero-based vertical index among nodes in the same architectural tier",
            },
          },
          required: ["armType"],
        },
      },
      {
        name: "validate_diagram",
        description:
          "Validate a complete Azure architecture diagram JSON document. Enforces official ARM types, schema integrity, and referential validity.",
        inputSchema: {
          type: "object",
          properties: {
            diagram: {
              type: "object",
              description: "The diagram JSON document matching version 1 schema",
            },
          },
          required: ["diagram"],
        },
      },
      {
        name: "list_services",
        description:
          "List all official Azure services supported in the diagram studio, optionally filtered by category.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Optional category filter: compute | networking | storage | database | security | integration | ai | monitoring",
            },
          },
        },
      },
    ],
  };
});

// ── Tool Execution Handler ──────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "lookup_icon": {
        const armType = String(args?.["armType"] ?? "");
        const iconData = getServiceIcon(armType);
        const metadata = lookupAzureService(armType);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                armType,
                displayName: metadata?.displayName ?? "Unknown Azure Resource",
                isFallback: iconData.isFallback,
                svg: iconData.svg,
              }),
            },
          ],
        };
      }

      case "get_layout_hints": {
        const armType = String(args?.["armType"] ?? "");
        const indexInTier = Number(args?.["indexInTier"] ?? 0);
        const position = calculateTierLayout(armType, indexInTier);
        const service = lookupAzureService(armType);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                armType,
                tier: service?.tier ?? "app",
                typicalGrouping: service?.typicalGrouping ?? "resource-group",
                position,
              }),
            },
          ],
        };
      }

      case "validate_diagram": {
        const diagramDoc = args?.["diagram"];
        const result = validateDiagram(diagramDoc);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.valid,
        };
      }

      case "list_services": {
        const categoryFilter = args?.["category"] as string | undefined;
        const services = Object.values(AZURE_SERVICE_REGISTRY)
          .filter((s) => !categoryFilter || s.category === categoryFilter)
          .map((s) => ({
            armType: s.armType,
            displayName: s.displayName,
            category: s.category,
            tier: s.tier,
            commonSkus: s.commonSkus,
            supportsZoneRedundancy: s.supportsZoneRedundancy,
          }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ total: services.length, services }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error executing tool '${name}': ${message}` }],
      isError: true,
    };
  }
});

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// When executed directly via node CLI
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startServer().catch((err) => {
    console.error("Failed to start azure-diagram MCP server:", err);
    process.exit(1);
  });
}
