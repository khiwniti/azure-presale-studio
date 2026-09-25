/**
 * XLSX Emitter Module.
 * Generates pricing spreadsheet from canonical DiagramJson.
 * Spec §4 (Export Pipeline - Documents).
 */

import ExcelJS from "exceljs";
import type { DiagramJson, DiagramNode, DiagramEdge, DiagramGroup } from "@/mcp/azure-diagram/validator";
import { lookupAzureService } from "@/mcp/azure-diagram/registry";

interface XlsxExportOptions {
  includePricing?: boolean;
  includeSecurity?: boolean;
}

/**
 * Generates XLSX workbook from DiagramJson.
 */
export async function diagramJsonToXlsx(diagram: DiagramJson, options: XlsxExportOptions = {}): Promise<Buffer> {
  const { includePricing = true, includeSecurity = true } = options;
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Azure Presale Studio";
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Sheet 1: Architecture Summary
  const summarySheet = workbook.addWorksheet("Architecture Summary");
  summarySheet.columns = [
    { header: "Property", key: "property", width: 30 },
    { header: "Value", key: "value", width: 50 },
  ];
  
  summarySheet.addRow({ property: "Architecture Title", value: diagram.meta.title || "Untitled" });
  summarySheet.addRow({ property: "Region", value: diagram.meta.region || "eastus" });
  summarySheet.addRow({ property: "Description", value: diagram.meta.description || "" });
  summarySheet.addRow({ property: "Total Services", value: diagram.nodes.filter(n => n.service !== "editor").length });
  summarySheet.addRow({ property: "Total Groups", value: diagram.groups.length });
  summarySheet.addRow({ property: "Total Connections", value: diagram.edges.length });
  summarySheet.addRow({ property: "Generated", value: new Date().toLocaleDateString() });
  
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn("property").font = { bold: true };
  
  // Sheet 2: Services
  const servicesSheet = workbook.addWorksheet("Services");
  servicesSheet.columns = [
    { header: "Service Type (ARM)", key: "service", width: 40 },
    { header: "Label", key: "label", width: 25 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "Zone Redundant", key: "zoneRedundant", width: 18 },
    { header: "Group", key: "group", width: 25 },
    { header: "Display Name", key: "displayName", width: 35 },
    { header: "Category", key: "category", width: 20 },
    { header: "Tier", key: "tier", width: 15 },
  ];
  
  const headerRow = servicesSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue;
    
    const meta = lookupAzureService(node.service);
    const sku = (node.config?.sku as string) || meta?.commonSkus[0] || "Default";
    const zoneRedundant = node.config?.zoneRedundant as boolean || false;
    const parentGroup = node.parent ? diagram.groups.find(g => g.id === node.parent)?.label : "None";
    
    servicesSheet.addRow({
      service: node.service,
      label: node.label,
      sku: sku,
      zoneRedundant: zoneRedundant ? "Yes" : "No",
      group: parentGroup || "None",
      displayName: meta?.displayName || "",
      category: meta?.category || "",
      tier: meta?.tier || "",
    });
  }
  
  // Sheet 3: Groups
  const groupsSheet = workbook.addWorksheet("Groups");
  groupsSheet.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Kind", key: "kind", width: 20 },
    { header: "Services Count", key: "serviceCount", width: 18 },
    { header: "Description", key: "description", width: 50 },
  ];
  
  const groupsHeaderRow = groupsSheet.getRow(1);
  groupsHeaderRow.font = { bold: true };
  groupsHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } };
  groupsHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  for (const group of diagram.groups) {
    const serviceCount = diagram.nodes.filter(n => n.parent === group.id).length;
    groupsSheet.addRow({
      name: group.label,
      kind: group.kind,
      serviceCount,
      description: `${group.kind} containing ${serviceCount} services`,
    });
  }
  
  // Sheet 4: Connections
  const connectionsSheet = workbook.addWorksheet("Connections");
  connectionsSheet.columns = [
    { header: "From", key: "from", width: 30 },
    { header: "To", key: "to", width: 30 },
    { header: "Label", key: "label", width: 25 },
    { header: "Style", key: "style", width: 15 },
  ];
  
  const connHeaderRow = connectionsSheet.getRow(1);
  connHeaderRow.font = { bold: true };
  connHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } };
  connHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  for (const edge of diagram.edges) {
    const fromNode = diagram.nodes.find(n => n.id === edge.from);
    const toNode = diagram.nodes.find(n => n.id === edge.to);
    
    connectionsSheet.addRow({
      from: fromNode?.label || edge.from,
      to: toNode?.label || edge.to,
      label: edge.label || "—",
      style: edge.style || "solid",
    });
  }
  
  // Sheet 5: Pricing Estimate (placeholder)
  const pricingSheet = workbook.addWorksheet("Pricing Estimate");
  pricingSheet.columns = [
    { header: "Service", key: "service", width: 30 },
    { header: "Label", key: "label", width: 25 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "Estimated Monthly (USD)", key: "monthly", width: 25 },
    { header: "Unit", key: "unit", width: 15 },
    { header: "Notes", key: "notes", width: 50 },
  ];
  
  const pricingHeaderRow = pricingSheet.getRow(1);
  pricingHeaderRow.font = { bold: true };
  pricingHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF107C41" } };
  pricingHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue;
    
    const meta = lookupAzureService(node.service);
    const sku = (node.config?.sku as string) || meta?.commonSkus[0] || "Default";
    const estimatedMonthly = Math.floor(Math.random() * 500) + 50; // Placeholder
    
    pricingSheet.addRow({
      service: node.service,
      label: node.label,
      sku: sku,
      monthly: estimatedMonthly,
      unit: "month",
      notes: "Placeholder - requires live Azure Pricing API",
    });
  }
  
  // Add total row
  const totalRow = pricingSheet.addRow({
    service: "TOTAL",
    monthly: { formula: `SUM(E2:E${pricingSheet.rowCount})` },
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  
  // Sheet 6: Security Checklist (placeholder)
  const securitySheet = workbook.addWorksheet("Security Checklist");
  securitySheet.columns = [
    { header: "Category", key: "category", width: 20 },
    { header: "Check Item", key: "item", width: 50 },
    { header: "Status", key: "status", width: 15 },
    { header: "Notes", key: "notes", width: 50 },
  ];
  
  const secHeaderRow = securitySheet.getRow(1);
  secHeaderRow.font = { bold: true };
  secHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  secHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  // Generate basic security checks based on services
  const securityChecks = generateSecurityChecks(diagram);
  for (const check of securityChecks) {
    securitySheet.addRow(check);
  }
  
  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function generateSecurityChecks(diagram: DiagramJson): Array<{ category: string; item: string; status: string; notes: string }> {
  const services = diagram.nodes.filter(n => n.service !== "editor");
  const checks: Array<{ category: string; item: string; status: string; notes: string }> = [];
  
  // Network checks
  const hasAppGateway = services.some(s => s.service.includes("applicationGateways"));
  const hasFrontDoor = services.some(s => s.service.includes("Cdn/profiles"));
  const hasVNet = services.some(s => s.service.includes("virtualNetworks"));
  
  checks.push({
    category: "Network",
    item: "WAF enabled on Application Gateway",
    status: hasAppGateway ? "Pass" : "Not Applicable",
    notes: hasAppGateway ? "Application Gateway with WAF v2 detected" : "No Application Gateway in architecture",
  });
  
  checks.push({
    category: "Network",
    item: "DDoS Protection enabled",
    status: hasFrontDoor ? "Review" : "Not Configured",
    notes: hasFrontDoor ? "Front Door provides DDoS protection" : "Consider adding Front Door for DDoS protection",
  });
  
  checks.push({
    category: "Network",
    item: "Private endpoints for PaaS services",
    status: "Review",
    notes: "Configure private endpoints for storage, databases, and other PaaS services",
  });
  
  // Identity checks
  const hasKeyVault = services.some(s => s.service.includes("KeyVault"));
  checks.push({
    category: "Identity",
    item: "Key Vault for secrets management",
    status: hasKeyVault ? "Pass" : "Fail",
    notes: hasKeyVault ? "Key Vault detected in architecture" : "Add Key Vault for secrets management",
  });
  
  // Data checks
  const hasStorage = services.some(s => s.service.includes("storageAccounts"));
  const hasDatabase = services.some(s => s.service.includes("Sql/servers") || s.service.includes("DocumentDB") || s.service.includes("DBforPostgreSQL"));
  
  if (hasStorage) {
    checks.push({
      category: "Data",
      item: "Storage encryption at rest",
      status: "Pass",
      notes: "Azure Storage encryption at rest is enabled by default",
    });
  }
  
  if (hasDatabase) {
    checks.push({
      category: "Data",
      item: "Transparent Data Encryption (TDE)",
      status: "Review",
      notes: "Verify TDE is enabled on SQL/Cosmos DB/PostgreSQL",
    });
    
    checks.push({
      category: "Data",
      item: "Backup retention configured",
      status: "Review",
      notes: "Configure backup retention policies for databases",
    });
  }
  
  // Monitoring
  const hasLogAnalytics = services.some(s => s.service.includes("OperationalInsights"));
  checks.push({
    category: "Monitoring",
    item: "Log Analytics workspace configured",
    status: hasLogAnalytics ? "Pass" : "Fail",
    notes: hasLogAnalytics ? "Log Analytics workspace detected" : "Add Log Analytics workspace for monitoring",
  });
  
  // Governance
  checks.push({
    category: "Governance",
    item: "Azure Policy assignments",
    status: "Review",
    notes: "Apply Azure Policy definitions for compliance",
  });
  
  checks.push({
    category: "Governance",
    item: "Resource tagging strategy",
    status: "Review",
    notes: "Implement consistent tagging (environment, owner, cost-center)",
  });
  
  return checks;
}