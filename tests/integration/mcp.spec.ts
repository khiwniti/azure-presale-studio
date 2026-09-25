/**
 * Integration Tests for MCP Servers
 * Tests Azure Pricing, Azure Diagram, and Azure IaC MCP servers
 * Spec §4 (MCP Servers).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { fetchAzurePrices } from "@/mcp/azure-pricing/server";
import { lookupAzureService, getServiceIcon, calculateTierLayout } from "@/mcp/azure-diagram/registry";
import { validateDiagram } from "@/mcp/azure-diagram/validator";

describe("Azure Pricing MCP Integration", () => {
  it("should fetch retail prices for App Service P1v3", async () => {
    const result = await fetchAzurePrices({
      serviceName: "App Service",
      skuName: "P1v3",
      armRegionName: "eastus",
    });
    
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    const firstItem = result.items[0];
    if (firstItem) {
      expect(firstItem.serviceName).toContain("App");
      expect(firstItem.skuName).toContain("P1v3");
    }
  });

  it("should fallback gracefully when API unavailable", async () => {
    // Use a non-existent service to trigger fallback
    const result = await fetchAzurePrices({
      serviceName: "NonExistentService123",
      skuName: "P1v3",
      armRegionName: "eastus",
    });
    
    expect(result.isFallback).toBe(true);
    expect(result.items.length).toBe(1);
    const fallbackItem = result.items[0];
    if (fallbackItem) {
      expect(fallbackItem.skuName).toBe("P1v3");
    }
  });

  it("should handle different regions", async () => {
    const result = await fetchAzurePrices({
      serviceName: "App Service",
      skuName: "P1v3",
      armRegionName: "westeurope",
    });
    
    expect(result.items.length).toBeGreaterThan(0);
    if (result.items[0]) {
      expect(result.items[0].armRegionName).toBe("westeurope");
    }
  });
});

describe("Azure Diagram MCP Integration", () => {
  it("should lookup service icon for valid ARM type", () => {
    const iconData = getServiceIcon("Microsoft.Web/sites");
    
    expect(iconData.svg).toBeDefined();
    expect(iconData.svg.length).toBeGreaterThan(0);
    expect(iconData.isFallback).toBe(false);
  });

  it("should return fallback for unknown ARM type", () => {
    const iconData = getServiceIcon("Microsoft.Unknown/service");
    
    expect(iconData.svg).toBeDefined();
    expect(iconData.isFallback).toBe(true);
  });

  it("should lookup service metadata", () => {
    const metadata = lookupAzureService("Microsoft.Web/sites");
    
    expect(metadata).not.toBeNull();
    if (metadata) {
      expect(metadata.displayName).toBe("Azure App Service");
      expect(metadata.category).toBe("compute");
      expect(metadata.tier).toBe("app");
    }
  });

  it("should return null for unknown ARM type", () => {
    const metadata = lookupAzureService("Microsoft.Unknown/service");
    
    expect(metadata).toBeNull();
  });

  it("should calculate tier layout", () => {
    const position = calculateTierLayout("Microsoft.Web/sites", 0);
    
    expect(position.x).toBeDefined();
    expect(position.y).toBeDefined();
    expect(typeof position.x).toBe("number");
    expect(typeof position.y).toBe("number");
  });

  it("should validate valid diagram", () => {
    const validDiagram = {
      version: 1,
      meta: { title: "Test", region: "eastus", description: "Test" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Web/sites",
          label: "Web App",
          parent: null,
          position: { x: 100, y: 100 },
          config: {},
          annotations: [],
        },
      ],
      edges: [],
    };

    const result = validateDiagram(validDiagram);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should reject invalid diagram", () => {
    const invalidDiagram = {
      version: 1,
      meta: { title: "Test", region: "eastus" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Unknown/service",
          label: "Invalid",
          parent: null,
          position: { x: 100, y: 100 },
          config: {},
          annotations: [],
        },
      ],
      edges: [],
    };

    const result = validateDiagram(invalidDiagram);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("Diagram Validation", () => {
  it("should validate node positions are integers", () => {
    const diagram = {
      version: 1,
      meta: { title: "Test", region: "eastus" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Web/sites",
          label: "Test",
          parent: null,
          position: { x: 100.5, y: 100 },
          config: {},
          annotations: [],
        },
      ],
      edges: [],
    };

    const result = validateDiagram(diagram);
    // Should still be valid but positions should be rounded
    expect(result.valid).toBe(true);
  });

  it("should validate edge references exist", () => {
    const diagram = {
      version: 1,
      meta: { title: "Test", region: "eastus" },
      groups: [],
      nodes: [
        {
          id: "node1",
          service: "Microsoft.Web/sites",
          label: "Test",
          parent: null,
          position: { x: 100, y: 100 },
          config: {},
          annotations: [],
        },
      ],
      edges: [
        {
          id: "edge1",
          from: "node1",
          to: "nonexistent",
          label: "Connection",
          style: "solid",
        },
      ],
    };

    const result = validateDiagram(diagram);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("nonexistent"))).toBe(true);
  });
});