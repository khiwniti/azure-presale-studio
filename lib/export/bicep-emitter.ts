/**
 * Bicep Emitter Module.
 * Generates Bicep IaC from canonical DiagramJson.
 * Spec §4 (Export Pipeline - IaC).
 */

import type { DiagramJson, DiagramNode, DiagramEdge, DiagramGroup } from "@/mcp/azure-diagram/validator";
import { lookupAzureService } from "@/mcp/azure-diagram/registry";

interface BicepExportOptions {
  targetScope?: "resourceGroup" | "subscription" | "managementGroup" | "tenant";
  paramDefaults?: Record<string, unknown>;
}

interface BicepResource {
  name: string;
  type: string;
  apiVersion: string;
  properties: Record<string, unknown>;
  dependsOn?: string[];
  condition?: boolean;
}

/**
 * Maps Azure service to Bicep resource type and API version.
 */
const BICEP_RESOURCE_MAP: Record<string, { type: string; apiVersion: string; paramKeys: string[] }> = {
  "Microsoft.Web/sites": { 
    type: "Microsoft.Web/sites", 
    apiVersion: "2022-09-01",
    paramKeys: ["name", "location", "sku", "kind"]
  },
  "Microsoft.App/containerApps": { 
    type: "Microsoft.App/containerApps", 
    apiVersion: "2023-05-01",
    paramKeys: ["name", "location", "managedEnvironmentId", "configuration"]
  },
  "Microsoft.ContainerService/managedClusters": { 
    type: "Microsoft.ContainerService/managedClusters", 
    apiVersion: "2023-10-01",
    paramKeys: ["name", "location", "sku", "agentPoolProfiles", "dnsPrefix"]
  },
  "Microsoft.Compute/virtualMachines": { 
    type: "Microsoft.Compute/virtualMachines", 
    apiVersion: "2023-03-01",
    paramKeys: ["name", "location", "vmSize", "storageProfile", "osProfile", "networkProfile"]
  },
  "Microsoft.DocumentDB/databaseAccounts": { 
    type: "Microsoft.DocumentDB/databaseAccounts", 
    apiVersion: "2023-04-15",
    paramKeys: ["name", "location", "databaseAccountOfferType", "locations"]
  },
  "Microsoft.Sql/servers/databases": { 
    type: "Microsoft.Sql/servers/databases", 
    apiVersion: "2022-05-01-preview",
    paramKeys: ["name", "location", "sku", "maxSizeBytes"]
  },
  "Microsoft.DBforPostgreSQL/flexibleServers": { 
    type: "Microsoft.DBforPostgreSQL/flexibleServers", 
    apiVersion: "2022-12-01",
    paramKeys: ["name", "location", "sku", "administratorLogin", "administratorLoginPassword"]
  },
  "Microsoft.Cache/Redis": { 
    type: "Microsoft.Cache/Redis", 
    apiVersion: "2023-04-01",
    paramKeys: ["name", "location", "sku", "redisConfiguration"]
  },
  "Microsoft.Storage/storageAccounts": { 
    type: "Microsoft.Storage/storageAccounts", 
    apiVersion: "2023-01-01",
    paramKeys: ["name", "location", "sku", "kind", "accessTier"]
  },
  "Microsoft.Network/virtualNetworks": { 
    type: "Microsoft.Network/virtualNetworks", 
    apiVersion: "2023-05-01",
    paramKeys: ["name", "location", "addressSpace", "subnets"]
  },
  "Microsoft.Network/applicationGateways": { 
    type: "Microsoft.Network/applicationGateways", 
    apiVersion: "2023-05-01",
    paramKeys: ["name", "location", "sku", "gatewayIPConfigurations", "frontendIPConfigurations", "frontendPorts", "backendAddressPools", "backendHttpSettingsCollection", "httpListeners", "requestRoutingRules"]
  },
  "Microsoft.Cdn/profiles": { 
    type: "Microsoft.Cdn/profiles", 
    apiVersion: "2023-05-01",
    paramKeys: ["name", "location", "sku", "profileType"]
  },
  "Microsoft.KeyVault/vaults": { 
    type: "Microsoft.KeyVault/vaults", 
    apiVersion: "2023-02-01",
    paramKeys: ["name", "location", "sku", "tenantId", "enableRbacAuthorization"]
  },
  "Microsoft.ServiceBus/namespaces": { 
    type: "Microsoft.ServiceBus/namespaces", 
    apiVersion: "2022-10-01-preview",
    paramKeys: ["name", "location", "sku", "enableAutoInflate"]
  },
  "Microsoft.ApiManagement/service": { 
    type: "Microsoft.ApiManagement/service", 
    apiVersion: "2022-08-01",
    paramKeys: ["name", "location", "sku", "publisherEmail", "publisherName"]
  },
  "Microsoft.CognitiveServices/accounts": { 
    type: "Microsoft.CognitiveServices/accounts", 
    apiVersion: "2023-05-01",
    paramKeys: ["name", "location", "sku", "kind", "properties"]
  },
  "Microsoft.OperationalInsights/workspaces": { 
    type: "Microsoft.OperationalInsights/workspaces", 
    apiVersion: "2022-10-01",
    paramKeys: ["name", "location", "sku"]
  },
};

/**
 * Generates Bicep from DiagramJson.
 */
export function diagramJsonToBicep(diagram: DiagramJson, options: BicepExportOptions = {}): string {
  const { targetScope = "resourceGroup" } = options;
  
  const lines: string[] = [];
  
  // Target scope
  if (targetScope !== "resourceGroup") {
    lines.push(`targetScope = '${targetScope}'`);
    lines.push("");
  }
  
  // Parameters
  lines.push("// Parameters");
  lines.push('param location string = resourceGroup().location');
  lines.push('param environment string = "dev"');
  lines.push("");
  
  // Resource group for grouping
  const resourceGroups = diagram.groups.filter(g => g.kind === "resource-group");
  if (resourceGroups.length > 0) {
    lines.push("// Resource Groups");
    for (const rg of resourceGroups) {
      lines.push(`resource ${sanitizeName(rg.label)}_rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {`);
      lines.push(`  name: '${rg.label}'`);
      lines.push(`  location: location`);
      lines.push(`  tags: { environment: environment }`);
      lines.push(`}`);
      lines.push("");
    }
  }
  
  // VNets
  const vnetGroups = diagram.groups.filter(g => g.kind === "vnet");
  if (vnetGroups.length > 0) {
    lines.push("// Virtual Networks");
    for (const vnet of vnetGroups) {
      lines.push(`resource ${sanitizeName(vnet.label)}_vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {`);
      lines.push(`  name: '${vnet.label}'`);
      lines.push(`  location: location`);
      lines.push(`  properties: {`);
      lines.push(`    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }`);
      lines.push(`    subnets: []`);
      lines.push(`  }`);
      lines.push(`  tags: { environment: environment }`);
      lines.push(`}`);
      lines.push("");
    }
  }
  
  // Service resources
  lines.push("// Azure Services");
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue;
    
    const resourceDef = generateBicepResource(node, diagram);
    if (resourceDef) {
      lines.push(resourceDef);
      lines.push("");
    }
  }
  
  // Outputs
  lines.push("// Outputs");
  lines.push('output deploymentName string = deployment().name');
  lines.push('');
  
  return lines.join("\n");
}

function generateBicepResource(node: DiagramNode, diagram: DiagramJson): string | null {
  const mapping = BICEP_RESOURCE_MAP[node.service];
  if (!mapping) return null;
  
  const name = sanitizeName(node.label);
  const resourceName = name;
  
  let lines: string[] = [];
  lines.push(`resource ${resourceName} '${mapping.type}@${mapping.apiVersion}' = {`);
  lines.push(`  name: '${node.label}'`);
  lines.push(`  location: location`);
  
  // SKU
  const sku = node.config?.sku as string;
  if (sku) {
    lines.push(`  sku: {`);
    lines.push(`    name: '${sku}'`);
    lines.push(`  }`);
  }
  
  // Zone redundancy
  const zoneRedundant = node.config?.zoneRedundant as boolean;
  if (zoneRedundant) {
    lines.push(`  zones: [ '1', '2', '3' ]`);
  }
  
  // Kind
  const kind = node.config?.kind as string;
  if (kind) {
    lines.push(`  kind: '${kind}'`);
  }
  
  // Properties placeholder
  lines.push(`  properties: {}`);
  
  // Tags
  lines.push(`  tags: { environment: environment }`);
  
  // Dependencies
  const deps = getDependencies(node, diagram);
  if (deps.length > 0) {
    lines.push(`  dependsOn: [`);
    for (const dep of deps) {
      lines.push(`    ${dep}`);
    }
    lines.push(`  ]`);
  }
  
  lines.push(`}`);
  
  return lines.join("\n");
}

function getDependencies(node: DiagramNode, diagram: DiagramJson): string[] {
  const deps: string[] = [];
  
  // Parent group dependency
  if (node.parent) {
    const parentGroup = diagram.groups.find(g => g.id === node.parent);
    if (parentGroup) {
      deps.push(`${sanitizeName(parentGroup.label)}_rg`);
    }
  }
  
  // Edge dependencies
  for (const edge of diagram.edges) {
    if (edge.to === node.id) {
      const fromNode = diagram.nodes.find(n => n.id === edge.from);
      if (fromNode && fromNode.service !== "editor") {
        deps.push(sanitizeName(fromNode.label));
      }
    }
  }
  
  return [...new Set(deps)];
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}