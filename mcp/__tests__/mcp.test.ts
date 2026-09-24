import { describe, it, expect } from "vitest";
import { getServiceIcon, lookupAzureService, calculateTierLayout } from "../azure-diagram/registry";
import { validateDiagram, type DiagramJson } from "../azure-diagram/validator";
import { fetchAzurePrices } from "../azure-pricing/server";
import { searchDocs, fetchDocPage } from "../azure-docs/server";
import { createMcpClient } from "@/lib/mcp/client-factory";

describe("Azure Diagram MCP", () => {
  describe("Icon Lookup & Registry", () => {
    it("looks up official icon for valid ARM type", () => {
      const icon = getServiceIcon("Microsoft.Web/sites");
      expect(icon.isFallback).toBe(false);
      expect(icon.svg).toContain("<svg");
      expect(icon.svg).toContain("#0078D4");
    });

    it("falls back to generic icon for unknown ARM type", () => {
      const icon = getServiceIcon("Microsoft.Invented/fakeService");
      expect(icon.isFallback).toBe(true);
      expect(icon.svg).toContain("<svg");
    });

    it("returns correct metadata and tiers for services", () => {
      const appService = lookupAzureService("Microsoft.Web/sites");
      expect(appService).not.toBeNull();
      expect(appService!.category).toBe("compute");
      expect(appService!.tier).toBe("app");
      expect(appService!.supportsZoneRedundancy).toBe(true);

      const cosmos = lookupAzureService("Microsoft.DocumentDB/databaseAccounts");
      expect(cosmos).not.toBeNull();
      expect(cosmos!.category).toBe("database");
      expect(cosmos!.tier).toBe("data");
    });

    it("calculates horizontal tiered canvas positions", () => {
      const frontendPos = calculateTierLayout("Microsoft.Cdn/profiles", 0);
      const appPos = calculateTierLayout("Microsoft.Web/sites", 0);
      const dataPos = calculateTierLayout("Microsoft.DocumentDB/databaseAccounts", 0);

      // Frontend -> App -> Data flows left to right
      expect(frontendPos.x).toBeLessThan(appPos.x);
      expect(appPos.x).toBeLessThan(dataPos.x);
    });
  });

  describe("Diagram Validation Gate", () => {
    const validDiagram: DiagramJson = {
      version: 1,
      meta: {
        title: "Valid E-Commerce Architecture",
        region: "eastus",
      },
      groups: [
        { id: "rg_prod", kind: "resource-group", label: "rg-ecommerce-prod" },
        { id: "vnet_main", kind: "vnet", label: "vnet-main" },
      ],
      nodes: [
        {
          id: "web_app",
          service: "Microsoft.Web/sites",
          label: "Frontend Web App",
          parent: "rg_prod",
          position: { x: 100, y: 100 },
        },
        {
          id: "sql_db",
          service: "Microsoft.Sql/servers/databases",
          label: "Product Catalog DB",
          parent: "rg_prod",
          position: { x: 500, y: 100 },
        },
      ],
      edges: [
        {
          id: "e1",
          from: "web_app",
          to: "sql_db",
          label: "SQL Connection",
        },
      ],
    };

    it("accepts a fully valid diagram", () => {
      const result = validateDiagram(validDiagram);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.unknownArmTypes).toHaveLength(0);
    });

    it("rejects unknown or hallucinated ARM types with exact node ID", () => {
      const invalid = JSON.parse(JSON.stringify(validDiagram)) as DiagramJson;
      invalid.nodes[0]!.service = "Microsoft.AI/hallucinatedModel";

      const result = validateDiagram(invalid);
      expect(result.valid).toBe(false);
      expect(result.unknownArmTypes).toContain("Microsoft.AI/hallucinatedModel");

      const armError = result.errors.find((e) => e.code === "UNKNOWN_ARM_TYPE");
      expect(armError).toBeDefined();
      expect(armError!.nodeId).toBe("web_app");
    });

    it("rejects invalid referential integrity (missing parent group)", () => {
      const invalid = JSON.parse(JSON.stringify(validDiagram)) as DiagramJson;
      invalid.nodes[0]!.parent = "non_existent_group";

      const result = validateDiagram(invalid);
      expect(result.valid).toBe(false);
      const refError = result.errors.find((e) => e.code === "INVALID_REFERENCE");
      expect(refError).toBeDefined();
      expect(refError!.message).toContain("non_existent_group");
    });

    it("rejects edges connecting non-existent nodes", () => {
      const invalid = JSON.parse(JSON.stringify(validDiagram)) as DiagramJson;
      invalid.edges[0]!.to = "ghost_node";

      const result = validateDiagram(invalid);
      expect(result.valid).toBe(false);
      const edgeError = result.errors.find((e) => e.edgeId === "e1");
      expect(edgeError).toBeDefined();
      expect(edgeError!.message).toContain("ghost_node");
    });

    it("rejects invalid version number", () => {
      const invalid = JSON.parse(JSON.stringify(validDiagram)) as DiagramJson;
      invalid.version = 2;

      const result = validateDiagram(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "version")).toBe(true);
    });
  });
});

describe("Azure Pricing MCP", () => {
  it("queries retail prices for App Service P1v3", async () => {
    const res = await fetchAzurePrices({
      serviceName: "Azure App Service",
      skuName: "P1v3",
      armRegionName: "eastus",
    });

    expect(res.items.length).toBeGreaterThan(0);
    const item = res.items[0]!;
    expect(item.retailPrice).toBeGreaterThan(0);
    expect(item.currencyCode).toBe("USD");
  });

  it("handles pricing query returning valid retail prices", async () => {
    const res = await fetchAzurePrices({
      skuName: "Standard_D4s_v5",
      armRegionName: "eastus",
    });

    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0]!.retailPrice).toBeGreaterThan(0);
    expect(res.items[0]!.skuName).toBeDefined();
  });
});

describe("Azure Docs MCP", () => {
  it("searches official Microsoft Learn architecture documentation", async () => {
    const results = await searchDocs("e-commerce web app", 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.url).toContain("learn.microsoft.com");
    expect(results[0]!.title).toBeDefined();
  });

  it("fetches page text for valid learn.microsoft.com URL", async () => {
    const page = await fetchDocPage(
      "https://learn.microsoft.com/en-us/azure/architecture/solution-ideas/articles/ecommerce-front-office"
    );
    expect(page.title).toBeDefined();
    expect(page.content.length).toBeGreaterThan(50);
  });

  it("strictly enforces domain gate and rejects external URLs", async () => {
    await expect(fetchDocPage("https://example.com/untrusted")).rejects.toThrow(
      "Security error: Only 'learn.microsoft.com' URLs are permitted"
    );
  });
});

describe("Unified MCP Client", () => {
  it("provides integrated access across all three MCP tools", async () => {
    const client = createMcpClient();

    // Diagram tool
    const icon = client.diagram.lookupIcon("Microsoft.Storage/storageAccounts");
    expect(icon.isFallback).toBe(false);

    // Pricing tool
    const pricing = await client.pricing.getPrices({ skuName: "P1v3" });
    expect(pricing.prices.length).toBeGreaterThan(0);

    // Docs tool
    const docs = await client.docs.search("microservices-aks", 1);
    expect(docs.length).toBe(1);
    expect(docs[0]!.title).toContain("AKS");
  });
});
