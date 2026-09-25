/**
 * Terraform Emitter Module.
 * Generates Terraform HCL from canonical DiagramJson.
 * Spec §4 (Export Pipeline - IaC).
 */

import type { DiagramJson, DiagramNode, DiagramEdge, DiagramGroup } from "@/mcp/azure-diagram/validator";
import { lookupAzureService } from "@/mcp/azure-diagram/registry";

interface TerraformExportOptions {
  providerVersion?: string;
  resourceGroupName?: string;
}

interface TerraformResource {
  type: string;
  name: string;
  config: Record<string, unknown>;
}

/**
 * Generates Terraform HCL from DiagramJson.
 */
export function diagramJsonToTerraform(diagram: DiagramJson, options: TerraformExportOptions = {}): string {
  const { providerVersion = "~> 3.0", resourceGroupName } = options;
  
  const lines: string[] = [];
  
  // Terraform block
  lines.push('terraform {');
  lines.push('  required_version = ">= 1.0"');
  lines.push('  required_providers {');
  lines.push('    azurerm = {');
  lines.push(`      source  = "hashicorp/azurerm"`);
  lines.push(`      version = "${providerVersion}"`);
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  
  // Provider
  lines.push('provider "azurerm" {');
  lines.push('  features {}');
  lines.push('}');
  lines.push('');
  
  // Variables
  lines.push('variable "location" {');
  lines.push('  type        = string');
  lines.push('  description = "Azure region for resources"');
  lines.push('  default     = "eastus"');
  lines.push('}');
  lines.push('');
  lines.push('variable "environment" {');
  lines.push('  type        = string');
  lines.push('  description = "Environment name (dev, staging, prod)"');
  lines.push('  default     = "dev"');
  lines.push('}');
  lines.push('');
  lines.push('variable "resource_group_name" {');
  lines.push('  type        = string');
  lines.push('  description = "Name of the resource group"');
  if (resourceGroupName) {
    lines.push(`  default     = "${resourceGroupName}"`);
  } else {
    lines.push(`  default     = "rg-${diagram.meta.title?.toLowerCase().replace(/\s+/g, '-') || 'architecture'}"`);
  }
  lines.push('}');
  lines.push('');
  
  // Data source for resource group
  lines.push('data "azurerm_resource_group" "main" {');
  lines.push('  name = var.resource_group_name');
  lines.push('}');
  lines.push('');
  
  // Resource group
  lines.push('resource "azurerm_resource_group" "main" {');
  lines.push('  name     = var.resource_group_name');
  lines.push('  location = var.location');
  lines.push('  tags = { environment = var.environment }');
  lines.push('}');
  lines.push('');
  
  // Service resources
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue;
    
    const resourceDef = generateTerraformResource(node, diagram);
    if (resourceDef) {
      lines.push(resourceDef);
      lines.push('');
    }
  }
  
  // Outputs
  lines.push('# Outputs');
  lines.push('output "resource_group_name" {');
  lines.push('  value = azurerm_resource_group.main.name');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

function generateTerraformResource(node: DiagramNode, diagram: DiagramJson): string | null {
  const mapping = TERRAFORM_RESOURCE_MAP[node.service];
  if (!mapping) return null;
  
  const name = sanitizeName(node.label);
  const resourceName = name;
  
  let lines: string[] = [];
  lines.push(`resource "${mapping.type}" "${resourceName}" {`);
  lines.push(`  name                = "${node.label}"`);
  lines.push(`  location            = var.location`);
  lines.push(`  resource_group_name = azurerm_resource_group.main.name`);
  
  // SKU
  const sku = node.config?.sku as string;
  if (sku && mapping.skuField) {
    lines.push(`  ${mapping.skuField} = "${sku}"`);
  }
  
  // Zone redundancy
  const zoneRedundant = node.config?.zoneRedundant as boolean;
  if (zoneRedundant && mapping.zoneField) {
    lines.push(`  ${mapping.zoneField} = true`);
  }
  
  // Kind
  const kind = node.config?.kind as string;
  if (kind && mapping.kindField) {
    lines.push(`  ${mapping.kindField} = "${kind}"`);
  }
  
  // Tags
  lines.push(`  tags = { environment = var.environment }`);
  
  // Dependencies
  const deps = getTerraformDependencies(node, diagram);
  if (deps.length > 0) {
    lines.push(`  depends_on = [`);
    for (const dep of deps) {
      lines.push(`    ${dep}`);
    }
    lines.push(`  ]`);
  }
  
  lines.push(`}`);
  
  return lines.join("\n");
}

function getTerraformDependencies(node: DiagramNode, diagram: DiagramJson): string[] {
  const deps: string[] = [];
  
  // Resource group dependency
  deps.push("azurerm_resource_group.main");
  
  // Parent group dependency
  if (node.parent) {
    const parentGroup = diagram.groups.find(g => g.id === node.parent);
    if (parentGroup) {
      if (parentGroup.kind === "resource-group") {
        deps.push(`azurerm_resource_group.${sanitizeName(parentGroup.label)}`);
      } else if (parentGroup.kind === "vnet") {
        deps.push(`azurerm_virtual_network.${sanitizeName(parentGroup.label)}`);
      }
    }
  }
  
  // Edge dependencies
  for (const edge of diagram.edges) {
    if (edge.to === node.id) {
      const fromNode = diagram.nodes.find(n => n.id === edge.from);
      if (fromNode && fromNode.service !== "editor") {
        deps.push(`${TERRAFORM_RESOURCE_MAP[fromNode.service]?.type || "azurerm_resource"}.${sanitizeName(fromNode.label)}`);
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

// Terraform resource type mappings
const TERRAFORM_RESOURCE_MAP: Record<string, { type: string; skuField?: string; zoneField?: string; kindField?: string }> = {
  "Microsoft.Web/sites": { type: "azurerm_linux_web_app", skuField: "service_plan_id", kindField: "kind" },
  "Microsoft.App/containerApps": { type: "azurerm_container_app", skuField: "managed_environment_id" },
  "Microsoft.ContainerService/managedClusters": { type: "azurerm_kubernetes_cluster", skuField: "default_node_pool" },
  "Microsoft.Compute/virtualMachines": { type: "azurerm_linux_virtual_machine", skuField: "size" },
  "Microsoft.DocumentDB/databaseAccounts": { type: "azurerm_cosmosdb_account", skuField: "offer_type" },
  "Microsoft.Sql/servers/databases": { type: "azurerm_mssql_database", skuField: "sku_name" },
  "Microsoft.DBforPostgreSQL/flexibleServers": { type: "azurerm_postgresql_flexible_server", skuField: "sku_name" },
  "Microsoft.Cache/Redis": { type: "azurerm_redis_cache", skuField: "sku_name" },
  "Microsoft.Storage/storageAccounts": { type: "azurerm_storage_account", skuField: "account_tier" },
  "Microsoft.Network/virtualNetworks": { type: "azurerm_virtual_network" },
  "Microsoft.Network/applicationGateways": { type: "azurerm_application_gateway", skuField: "sku_name" },
  "Microsoft.Cdn/profiles": { type: "azurerm_cdn_profile", skuField: "sku_name" },
  "Microsoft.KeyVault/vaults": { type: "azurerm_key_vault", skuField: "sku_name" },
  "Microsoft.ServiceBus/namespaces": { type: "azurerm_servicebus_namespace", skuField: "sku_name" },
  "Microsoft.ApiManagement/service": { type: "azurerm_api_management", skuField: "sku_name" },
  "Microsoft.CognitiveServices/accounts": { type: "azurerm_cognitive_account", skuField: "sku_name" },
  "Microsoft.OperationalInsights/workspaces": { type: "azurerm_log_analytics_workspace", skuField: "sku_name" },
};