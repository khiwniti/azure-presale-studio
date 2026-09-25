/**
 * SVG Export Module.
 * Converts canonical DiagramJson to SVG string with embedded Azure icons.
 * Spec §4 (Export Pipeline) & §3 (Diagram Model).
 */

import type { DiagramJson, DiagramNode, DiagramEdge, DiagramGroup } from "@/mcp/azure-diagram/validator";
import { getServiceIcon, lookupAzureService, calculateTierLayout } from "@/mcp/azure-diagram/registry";

interface ExportOptions {
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: string;
  gridSize?: number;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  width: 1920,
  height: 1080,
  padding: 80,
  backgroundColor: "#020817",
  gridSize: 20,
};

export function diagramJsonToSvg(diagram: DiagramJson, options: ExportOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Calculate layout bounds
  const bounds = calculateLayoutBounds(diagram);
  const scale = Math.min(
    (opts.width - 2 * opts.padding) / bounds.width,
    (opts.height - 2 * opts.padding) / bounds.height
  );
  
  const contentWidth = bounds.width * scale;
  const contentHeight = bounds.height * scale;
  
  // Center content in canvas
  const offsetX = opts.padding + (opts.width - 2 * opts.padding - contentWidth) / 2;
  const offsetY = opts.padding + (opts.height - 2 * opts.padding - contentHeight) / 2;

  // Build SVG parts
  const parts: string[] = [];
  
  // SVG header
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">`);
  
  // Background
  parts.push(`  <rect width="${opts.width}" height="${opts.height}" fill="${opts.backgroundColor}"/>`);
  
  // Grid pattern
  parts.push(`  <defs>`);
  parts.push(`    <pattern id="grid" width="${opts.gridSize}" height="${opts.gridSize}" patternUnits="userSpaceOnUse">`);
  parts.push(`      <path d="M ${opts.gridSize} 0 L 0 0 0 ${opts.gridSize}" fill="none" stroke="#1e293b" stroke-width="0.5"/>`);
  parts.push(`    </pattern>`);
  parts.push(`  </defs>`);
  parts.push(`  <rect width="${opts.width}" height="${opts.height}" fill="url(#grid)" opacity="0.5"/>`);
  
  // Groups (background containers)
  for (const group of diagram.groups) {
    const groupBounds = calculateGroupBounds(group, diagram, scale, offsetX, offsetY);
    const groupColor = getGroupColor(group.kind);
    parts.push(`  <rect x="${groupBounds.x}" y="${groupBounds.y}" width="${groupBounds.width}" height="${groupBounds.height}" rx="12" fill="${groupColor.fill}" stroke="${groupColor.stroke}" stroke-width="2" stroke-dasharray="${groupColor.dashArray}" fill-opacity="0.15"/>`);
    parts.push(`  <text x="${groupBounds.x + 16}" y="${groupBounds.y + 24}" font-family="monospace" font-size="11" font-weight="bold" fill="${groupColor.text}" text-transform="uppercase">${group.kind}</text>`);
    parts.push(`  <text x="${groupBounds.x + 16}" y="${groupBounds.y + 42}" font-family="sans-serif" font-size="13" font-weight="600" fill="${groupColor.text}">${escapeXml(group.label)}</text>`);
  }
  
  // Edges (connections)
  for (const edge of diagram.edges) {
    const fromNode = diagram.nodes.find(n => n.id === edge.from);
    const toNode = diagram.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) continue;
    
    const fromX = offsetX + fromNode.position.x * scale;
    const fromY = offsetY + fromNode.position.y * scale;
    const toX = offsetX + toNode.position.x * scale;
    const toY = offsetY + toNode.position.y * scale;
    
    const strokeColor = "#38bdf8";
    const strokeWidth = 2;
    
    // Draw curved edge
    const cpX = (fromX + toX) / 2;
    const cpY = Math.min(fromY, toY) - 40 * scale;
    
    parts.push(`  <path d="M ${fromX} ${fromY} Q ${cpX} ${cpY} ${toX} ${toY}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.8"/>`);
    
    // Arrowhead
    const angle = Math.atan2(toY - cpY, toX - cpX);
    const arrowSize = 10 * scale;
    parts.push(`  <path d="M ${toX} ${toY} L ${toX - arrowSize * Math.cos(angle - Math.PI / 6)} ${toY - arrowSize * Math.sin(angle - Math.PI / 6)} M ${toX} ${toY} L ${toX - arrowSize * Math.cos(angle + Math.PI / 6)} ${toY - arrowSize * Math.sin(angle + Math.PI / 6)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
    
    // Edge label
    if (edge.label) {
      const labelX = (fromX + toX) / 2;
      const labelY = Math.min(fromY, toY) - 60 * scale;
      parts.push(`  <text x="${labelX}" y="${labelY}" font-family="monospace" font-size="${10 * scale}" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">${escapeXml(edge.label)}</text>`);
    }
  }
  
  // Nodes (Azure services)
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue; // Skip editor nodes
    
    const x = offsetX + node.position.x * scale;
    const y = offsetY + node.position.y * scale;
    const nodeWidth = 180 * scale;
    const nodeHeight = 100 * scale;
    const iconSize = 32 * scale;
    const padding = 12 * scale;
    
    const iconData = getServiceIcon(node.service);
    const meta = lookupAzureService(node.service);
    const isFallback = iconData.isFallback;
    
    // Node background
    parts.push(`  <g transform="translate(${x}, ${y})">`);
    parts.push(`    <rect x="0" y="0" width="${nodeWidth}" height="${nodeHeight}" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>`);
    
    // Icon container
    parts.push(`    <rect x="${padding}" y="${padding}" width="${iconSize}" height="${iconSize}" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
    parts.push(`    <g transform="translate(${padding + iconSize/2}, ${padding + iconSize/2}) scale(${iconSize / 18})">`);
    parts.push(`      ${iconData.svg}`);
    parts.push(`    </g>`);
    
    // Fallback indicator
    if (isFallback) {
      parts.push(`    <text x="${nodeWidth - padding}" y="${padding + 10}" font-family="monospace" font-size="8" fill="#fbbf24" text-anchor="end">Custom</text>`);
    }
    
    // Label
    parts.push(`    <text x="${padding + iconSize + padding}" y="${padding + 14}" font-family="sans-serif" font-size="${11 * scale}" font-weight="bold" fill="#f1f5f9">${escapeXml(node.label)}</text>`);
    
    // Display name
    const displayName = meta?.displayName ?? node.service;
    parts.push(`    <text x="${padding + iconSize + padding}" y="${padding + 30}" font-family="monospace" font-size="${9 * scale}" fill="#94a3b8">${escapeXml(displayName)}</text>`);
    
    // SKU badge
    const sku = (node.config?.sku as string) ?? meta?.commonSkus[0];
    if (sku) {
      parts.push(`    <rect x="${padding + iconSize + padding}" y="${padding + 38}" width="${Math.max(50, sku.length * 6 * scale)}" height="20" rx="4" fill="#1e293b" stroke="#0ea5e9" stroke-width="1"/>`);
      parts.push(`    <text x="${padding + iconSize + padding + 4}" y="${padding + 52}" font-family="monospace" font-size="${9 * scale}" font-weight="600" fill="#38bdf8">${escapeXml(sku)}</text>`);
    }
    
    // Zone redundancy
    const zoneRedundant = node.config?.zoneRedundant as boolean || false;
    if (zoneRedundant) {
      parts.push(`    <circle cx="${nodeWidth - padding - 8}" cy="${padding + 8}" r="5" fill="#10b981"/>`);
      parts.push(`    <text x="${nodeWidth - padding - 8}" y="${padding + 11}" font-family="monospace" font-size="8" font-weight="bold" fill="#052e16" text-anchor="middle" dominant-baseline="middle">ZRS</text>`);
    }
    
    parts.push(`  </g>`);
  }
  
  // Title and metadata
  parts.push(`  <text x="${opts.width / 2}" y="${30}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#f1f5f9" text-anchor="middle">${escapeXml(diagram.meta.title || "Azure Architecture")}</text>`);
  parts.push(`  <text x="${opts.width / 2}" y="${54}" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">Region: ${escapeXml(diagram.meta.region || "eastus")} | Generated: ${new Date().toISOString().split("T")[0]}</text>`);
  
  parts.push(`</svg>`);
  
  return parts.join("\n");
}

function calculateLayoutBounds(diagram: DiagramJson): { x: number; y: number; width: number; height: number } {
  if (diagram.nodes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const node of diagram.nodes) {
    if (node.service === "editor") continue;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 180);
    maxY = Math.max(maxY, node.position.y + 100);
  }
  
  // Also consider groups
  for (const group of diagram.groups) {
    // Groups are positioned via their children
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return {
    x: minX,
    y: minY,
    width: Math.max(width, 400),
    height: Math.max(height, 300),
  };
}

function calculateGroupBounds(group: DiagramGroup, diagram: DiagramJson, scale: number, offsetX: number, offsetY: number) {
  const groupNodes = diagram.nodes.filter(n => {
    if (group.kind === "resource-group") return true; // All top-level nodes
    if (group.kind === "vnet") return n.service.includes("Network");
    if (group.kind === "subnet") return n.service.includes("Network") || n.service.includes("subnet");
    return false;
  });
  
  if (groupNodes.length === 0) {
    return { x: offsetX, y: offsetY, width: 400 * scale, height: 300 * scale };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of groupNodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 180);
    maxY = Math.max(maxY, node.position.y + 100);
  }
  
  const padding = 20 * scale;
  return {
    x: offsetX + (minX - padding) * scale,
    y: offsetY + (minY - padding) * scale,
    width: (maxX - minX + 2 * padding) * scale,
    height: (maxY - minY + 2 * padding) * scale,
  };
}

function getGroupColor(kind: string): { fill: string; stroke: string; dashArray: string; text: string } {
  switch (kind) {
    case "resource-group":
      return { fill: "#64748b", stroke: "#64748b", dashArray: "8,4", text: "#94a3b8" };
    case "vnet":
      return { fill: "#0ea5e9", stroke: "#0ea5e9", dashArray: "8,4", text: "#38bdf8" };
    case "subnet":
      return { fill: "#06b6d4", stroke: "#06b6d4", dashArray: "4,4", text: "#22d3ee" };
    case "subscription":
      return { fill: "#6366f1", stroke: "#6366f1", dashArray: "none", text: "#a5b4fc" };
    default:
      return { fill: "#64748b", stroke: "#64748b", dashArray: "8,4", text: "#94a3b8" };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\\\"")
    .replace(/'/g, "&apos;");
}