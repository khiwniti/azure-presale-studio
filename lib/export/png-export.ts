/**
 * PNG Export Module.
 * Rasterizes SVG to PNG using @resvg/resvg-js.
 * Spec §4 (Export Pipeline).
 */

import { Resvg } from "@resvg/resvg-js";
import { diagramJsonToSvg } from "./svg-export";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";

interface PngExportOptions {
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: string;
  gridSize?: number;
  scale?: number; // Output scale factor (e.g., 2 for 2x/retina)
}

const DEFAULT_PNG_OPTIONS: Required<PngExportOptions> = {
  width: 1920,
  height: 1080,
  padding: 80,
  backgroundColor: "#020817",
  gridSize: 20,
  scale: 2,
};

/**
 * Converts DiagramJson to PNG buffer.
 */
export async function diagramJsonToPng(
  diagram: DiagramJson,
  options: PngExportOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_PNG_OPTIONS, ...options };
  
  // Generate SVG with scaled dimensions for the requested output scale
  const svgOptions = {
    width: opts.width * opts.scale,
    height: opts.height * opts.scale,
    padding: opts.padding * opts.scale,
    backgroundColor: opts.backgroundColor,
    gridSize: opts.gridSize * opts.scale,
  };
  
  const svgString = diagramJsonToSvg(diagram, svgOptions);
  
  // Render to PNG using resvg
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: opts.width * opts.scale,
    },
    background: opts.backgroundColor,
    font: {
      loadSystemFonts: false,
      fontFiles: [],
    },
  });
  
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  return Buffer.from(pngBuffer);
}

/**
 * Converts SVG string to PNG buffer.
 */
export async function svgToPng(
  svgString: string,
  options: { width?: number; height?: number; backgroundColor?: string; scale?: number } = {}
): Promise<Buffer> {
  const { width = 1920, height = 1080, backgroundColor = "#020817", scale = 2 } = options;
  
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: width * scale,
    },
    background: backgroundColor,
    font: {
      loadSystemFonts: false,
      fontFiles: [],
    },
  });
  
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  return Buffer.from(pngBuffer);
}

/**
 * Synchronous version for simpler use cases.
 * Note: This may block the event loop for complex diagrams.
 */
export function diagramJsonToPngSync(
  diagram: DiagramJson,
  options: PngExportOptions = {}
): Buffer {
  const opts = { ...DEFAULT_PNG_OPTIONS, ...options };
  
  const svgOptions = {
    width: opts.width * opts.scale,
    height: opts.height * opts.scale,
    padding: opts.padding * opts.scale,
    backgroundColor: opts.backgroundColor,
    gridSize: opts.gridSize * opts.scale,
  };
  
  const svgString = diagramJsonToSvg(diagram, svgOptions);
  
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: opts.width * opts.scale,
    },
    background: opts.backgroundColor,
    font: {
      loadSystemFonts: false,
      fontFiles: [],
    },
  });
  
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  return Buffer.from(pngBuffer);
}