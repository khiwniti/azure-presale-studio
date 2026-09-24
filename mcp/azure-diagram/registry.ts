/**
 * Official Azure ARM Type Registry & Icon Index.
 * Maps ARM resource provider types (e.g. "Microsoft.Web/sites") to service metadata,
 * layout tier hints, and official Azure SVG icons.
 *
 * Spec §3 & §4: Diagram Builder and Diagram Model.
 */

export interface AzureServiceMetadata {
  armType: string;
  category: "compute" | "networking" | "storage" | "database" | "security" | "integration" | "ai" | "monitoring";
  displayName: string;
  tier: "frontend" | "gateway" | "app" | "data" | "security" | "management" | "messaging";
  typicalGrouping: "resource-group" | "vnet" | "subnet" | "subscription";
  supportsZoneRedundancy: boolean;
  commonSkus: string[];
  svgIcon: string;
}

// Crisp official Azure SVG vector shapes for standard architectural visualization
const ICONS: Record<string, string> = {
  appService: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5S13.14 1.5 9 1.5zm0 13.5c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="#0078D4"/><path d="M5.5 8h7v2h-7z" fill="#50E6FF"/></svg>`,
  containerApp: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2" fill="#0078D4"/><path d="M5 6h8v2H5zm0 4h5v2H5z" fill="#FFFFFF"/></svg>`,
  aks: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" fill="#0078D4"/><path d="M9 4.5l3.5 2v4.5L9 13.5 5.5 11V6.5z" stroke="#FFFFFF" stroke-width="1.2" fill="none"/><circle cx="9" cy="9" r="1.5" fill="#50E6FF"/></svg>`,
  vm: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3.5" width="13" height="9" rx="1" fill="#0078D4"/><path d="M6 14.5h6v1H6zM9 12.5v2" stroke="#0078D4" stroke-width="1.5"/><circle cx="9" cy="8" r="2" fill="#50E6FF"/></svg>`,
  cosmosDb: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="9" cy="5" rx="6.5" ry="2.5" fill="#50E6FF"/><path d="M2.5 5v8c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5V5" stroke="#0078D4" stroke-width="1.5" fill="none"/><path d="M2.5 9c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5" stroke="#0078D4" stroke-width="1.5" fill="none"/></svg>`,
  sqlDb: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2.5" width="12" height="13" rx="1.5" fill="#0078D4"/><path d="M3 6.5h12M3 10.5h12" stroke="#FFFFFF" stroke-width="1"/><ellipse cx="9" cy="4.5" rx="3.5" ry="1" fill="#50E6FF"/></svg>`,
  postgresFlex: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2" width="12" height="14" rx="2" fill="#0078D4"/><path d="M6 7c0-1.66 1.34-3 3-3s3 1.34 3 3v4c0 1.66-1.34 3-3 3" stroke="#50E6FF" stroke-width="1.5" fill="none"/></svg>`,
  redisCache: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="9,2 16,6 16,12 9,16 2,12 2,6" fill="#D83B01"/><polygon points="9,5 13,7.5 13,10.5 9,13 5,10.5 5,7.5" fill="#FF8C00"/></svg>`,
  storageAccount: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3" width="13" height="4" rx="1" fill="#0078D4"/><rect x="2.5" y="8" width="13" height="4" rx="1" fill="#0078D4"/><rect x="2.5" y="13" width="13" height="4" rx="1" fill="#50E6FF"/></svg>`,
  vnet: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2" stroke="#0078D4" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/><circle cx="5" cy="5" r="1.5" fill="#0078D4"/><circle cx="13" cy="5" r="1.5" fill="#0078D4"/><circle cx="9" cy="13" r="1.5" fill="#0078D4"/><path d="M5 5l4 8 4-8" stroke="#0078D4" stroke-width="1"/></svg>`,
  appGateway: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2" fill="#0078D4"/><path d="M4 9h10M9 4v10" stroke="#FFFFFF" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" fill="#50E6FF"/></svg>`,
  frontDoor: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" fill="#0078D4"/><path d="M2 9h14M9 2a10 10 0 0 1 0 14M9 2a10 10 0 0 0 0 14" stroke="#50E6FF" stroke-width="1"/></svg>`,
  keyVault: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="12" height="10" rx="2" fill="#0078D4"/><path d="M6 6V4a3 3 0 0 1 6 0v2" stroke="#0078D4" stroke-width="2" fill="none"/><circle cx="9" cy="10.5" r="1.5" fill="#FFB900"/></svg>`,
  serviceBus: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="14" height="10" rx="1.5" fill="#0078D4"/><circle cx="6" cy="9" r="1.5" fill="#FFFFFF"/><circle cx="9" cy="9" r="1.5" fill="#FFFFFF"/><circle cx="12" cy="9" r="1.5" fill="#FFFFFF"/></svg>`,
  apiManagement: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="3" width="13" height="12" rx="2" fill="#0078D4"/><path d="M5 7h8M5 10h8M5 13h5" stroke="#FFFFFF" stroke-width="1.2"/></svg>`,
  openAi: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" fill="#107C41"/><path d="M9 4.5a4.5 4.5 0 0 1 4.5 4.5c0 1.8-1 3.3-2.5 4l-2-3.5 2-1" stroke="#FFFFFF" stroke-width="1.2" fill="none"/><circle cx="9" cy="9" r="1.5" fill="#FFFFFF"/></svg>`,
  logAnalytics: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="2.5" width="13" height="13" rx="2" fill="#0078D4"/><path d="M5 12l2.5-3 2 1.5 3.5-4.5" stroke="#50E6FF" stroke-width="1.5" fill="none"/></svg>`,
  generic: `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2" fill="#0078D4"/><text x="9" y="12" font-size="9" font-family="sans-serif" fill="#FFFFFF" text-anchor="middle">Az</text></svg>`,
};

export const AZURE_SERVICE_REGISTRY: Record<string, AzureServiceMetadata> = {
  "Microsoft.Web/sites": {
    armType: "Microsoft.Web/sites",
    category: "compute",
    displayName: "Azure App Service",
    tier: "app",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["B1", "P1v3", "P2v3", "P3v3", "S1", "S2"],
    svgIcon: ICONS.appService!,
  },
  "Microsoft.App/containerApps": {
    armType: "Microsoft.App/containerApps",
    category: "compute",
    displayName: "Azure Container Apps",
    tier: "app",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Consumption", "Dedicated-D4", "Dedicated-D8"],
    svgIcon: ICONS.containerApp!,
  },
  "Microsoft.ContainerService/managedClusters": {
    armType: "Microsoft.ContainerService/managedClusters",
    category: "compute",
    displayName: "Azure Kubernetes Service (AKS)",
    tier: "app",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_D4s_v5", "Standard_D8s_v5", "Standard_E4s_v5"],
    svgIcon: ICONS.aks!,
  },
  "Microsoft.Compute/virtualMachines": {
    armType: "Microsoft.Compute/virtualMachines",
    category: "compute",
    displayName: "Azure Virtual Machine",
    tier: "app",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_D2s_v5", "Standard_D4s_v5", "Standard_E2s_v5"],
    svgIcon: ICONS.vm!,
  },
  "Microsoft.DocumentDB/databaseAccounts": {
    armType: "Microsoft.DocumentDB/databaseAccounts",
    category: "database",
    displayName: "Azure Cosmos DB",
    tier: "data",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Serverless", "Provisioned-400RU", "Provisioned-1000RU"],
    svgIcon: ICONS.cosmosDb!,
  },
  "Microsoft.Sql/servers/databases": {
    armType: "Microsoft.Sql/servers/databases",
    category: "database",
    displayName: "Azure SQL Database",
    tier: "data",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["GP_Gen5_2", "GP_Gen5_4", "BC_Gen5_2", "BC_Gen5_4"],
    svgIcon: ICONS.sqlDb!,
  },
  "Microsoft.DBforPostgreSQL/flexibleServers": {
    armType: "Microsoft.DBforPostgreSQL/flexibleServers",
    category: "database",
    displayName: "Azure Database for PostgreSQL Flexible Server",
    tier: "data",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_D2ds_v5", "Standard_D4ds_v5", "Standard_E2ds_v5"],
    svgIcon: ICONS.postgresFlex!,
  },
  "Microsoft.Cache/Redis": {
    armType: "Microsoft.Cache/Redis",
    category: "database",
    displayName: "Azure Cache for Redis",
    tier: "data",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_C1", "Standard_C2", "Premium_P1", "Premium_P2"],
    svgIcon: ICONS.redisCache!,
  },
  "Microsoft.Storage/storageAccounts": {
    armType: "Microsoft.Storage/storageAccounts",
    category: "storage",
    displayName: "Azure Storage Account (Blob / Data Lake)",
    tier: "data",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_LRS", "Standard_ZRS", "Standard_GRS", "Premium_LRS"],
    svgIcon: ICONS.storageAccount!,
  },
  "Microsoft.Network/virtualNetworks": {
    armType: "Microsoft.Network/virtualNetworks",
    category: "networking",
    displayName: "Virtual Network (VNet)",
    tier: "gateway",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard"],
    svgIcon: ICONS.vnet!,
  },
  "Microsoft.Network/applicationGateways": {
    armType: "Microsoft.Network/applicationGateways",
    category: "networking",
    displayName: "Azure Application Gateway (WAF v2)",
    tier: "gateway",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["WAF_v2", "Standard_v2"],
    svgIcon: ICONS.appGateway!,
  },
  "Microsoft.Cdn/profiles": {
    armType: "Microsoft.Cdn/profiles",
    category: "networking",
    displayName: "Azure Front Door & CDN",
    tier: "frontend",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard_AzureFrontDoor", "Premium_AzureFrontDoor"],
    svgIcon: ICONS.frontDoor!,
  },
  "Microsoft.KeyVault/vaults": {
    armType: "Microsoft.KeyVault/vaults",
    category: "security",
    displayName: "Azure Key Vault",
    tier: "security",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard", "Premium"],
    svgIcon: ICONS.keyVault!,
  },
  "Microsoft.ServiceBus/namespaces": {
    armType: "Microsoft.ServiceBus/namespaces",
    category: "integration",
    displayName: "Azure Service Bus",
    tier: "messaging",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["Standard", "Premium_1MU", "Premium_2MU"],
    svgIcon: ICONS.serviceBus!,
  },
  "Microsoft.ApiManagement/service": {
    armType: "Microsoft.ApiManagement/service",
    category: "integration",
    displayName: "Azure API Management",
    tier: "gateway",
    typicalGrouping: "subnet",
    supportsZoneRedundancy: true,
    commonSkus: ["Consumption", "Developer", "Standard_v2", "Premium"],
    svgIcon: ICONS.apiManagement!,
  },
  "Microsoft.CognitiveServices/accounts": {
    armType: "Microsoft.CognitiveServices/accounts",
    category: "ai",
    displayName: "Azure OpenAI & AI Services",
    tier: "app",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["S0"],
    svgIcon: ICONS.openAi!,
  },
  "Microsoft.OperationalInsights/workspaces": {
    armType: "Microsoft.OperationalInsights/workspaces",
    category: "monitoring",
    displayName: "Log Analytics Workspace & Azure Monitor",
    tier: "management",
    typicalGrouping: "resource-group",
    supportsZoneRedundancy: true,
    commonSkus: ["PerGB2018"],
    svgIcon: ICONS.logAnalytics!,
  },
};

/**
 * Lookup Azure service metadata by exact ARM type.
 * Returns null if ARM type is not registered.
 */
export function lookupAzureService(armType: string): AzureServiceMetadata | null {
  return AZURE_SERVICE_REGISTRY[armType] ?? null;
}

/**
 * Returns the SVG icon string for an ARM type.
 * Falls back to generic Azure icon with warning status if unregistered.
 */
export function getServiceIcon(armType: string): { svg: string; isFallback: boolean } {
  const service = lookupAzureService(armType);
  if (service) {
    return { svg: service.svgIcon, isFallback: false };
  }
  return { svg: ICONS.generic!, isFallback: true };
}

/**
 * Returns layout coordinates and canvas hints for a set of nodes.
 * Orders nodes into logical horizontal tiers:
 *   frontend (x: 100) -> gateway (x: 350) -> app (x: 600) -> messaging (x: 850) -> data (x: 1100)
 */
export function calculateTierLayout(armType: string, indexInTier: number = 0): { x: number; y: number } {
  const service = lookupAzureService(armType);
  const tier = service?.tier ?? "app";

  const tierXMap: Record<string, number> = {
    frontend: 100,
    gateway: 360,
    app: 620,
    messaging: 880,
    data: 1140,
    security: 620,
    management: 880,
  };

  const baseX = tierXMap[tier] ?? 620;
  // Offset security and management to lower canvas rows
  const baseY = tier === "security" ? 500 : tier === "management" ? 500 : 120;
  const spacingY = 160;

  return {
    x: baseX,
    y: baseY + indexInTier * spacingY,
  };
}
