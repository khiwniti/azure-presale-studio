/**
 * ZIP Packager Module.
 * Bundles all export artifacts into a single ZIP archive.
 * Spec §4 (Export Pipeline - Documents).
 */

import archiver from "archiver";
import { PassThrough } from "stream";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";
import { diagramJsonToSvg } from "./svg-export";
import { diagramJsonToPng } from "./png-export";
import { diagramJsonToBicep } from "./bicep-emitter";
import { diagramJsonToTerraform } from "./terraform-emitter";
import { diagramJsonToXlsx } from "./xlsx-emitter";

interface ZipExportOptions {
  includeSvg?: boolean;
  includePng?: boolean;
  includeBicep?: boolean;
  includeTerraform?: boolean;
  includeXlsx?: boolean;
  pngScale?: number;
}

const DEFAULT_OPTIONS = {
  includeSvg: true,
  includePng: true,
  includeBicep: true,
  includeTerraform: true,
  includeXlsx: true,
  pngScale: 2,
};

/**
 * Creates a ZIP archive containing all export artifacts.
 */
export async function createDeliverablesZip(
  diagram: DiagramJson,
  options: ZipExportOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const title = diagram.meta.title || "architecture";
  const safeTitle = title.replace(/[^a-z0-9.-]/gi, "_");
  
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  
  const stream = new PassThrough();
  
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    
    archive.pipe(stream);
    
    // Create folder structure
    const folder = `${safeTitle}_deliverables`;
    
    // SVG Export
    if (opts.includeSvg) {
      const svgString = diagramJsonToSvg(diagram);
      archive.append(svgString, { name: `${folder}/diagrams/${safeTitle}.svg` });
    }
    
    // PNG Export
    if (opts.includePng) {
      diagramJsonToPng(diagram, { scale: opts.pngScale })
        .then((pngBuffer) => {
          archive.append(pngBuffer, { name: `${folder}/diagrams/${safeTitle}.png` });
        })
        .catch((err) => {
          console.warn("PNG export failed:", err);
        });
    }
    
    // Bicep Export
    if (opts.includeBicep) {
      const bicepString = diagramJsonToBicep(diagram);
      archive.append(bicepString, { name: `${folder}/iac/${safeTitle}.bicep` });
    }
    
    // Terraform Export
    if (opts.includeTerraform) {
      const terraformString = diagramJsonToTerraform(diagram);
      archive.append(terraformString, { name: `${folder}/iac/${safeTitle}.tf` });
    }
    
    // XLSX Export
    if (opts.includeXlsx) {
      diagramJsonToXlsx(diagram)
        .then((xlsxBuffer: Buffer) => {
          archive.append(xlsxBuffer, { name: `${folder}/documents/${safeTitle}.xlsx` });
        })
        .catch((err) => {
          console.warn("XLSX export failed:", err);
        });
    }
    
    // README
    const readme = generateReadme(diagram);
    archive.append(readme, { name: `${folder}/README.md` });
    
    archive.finalize().catch(reject);
  });
}

function generateReadme(diagram: DiagramJson): string {
  const safeTitle = (diagram.meta.title || "architecture").replace(/[^a-z0-9.-]/gi, "_");
  const date = new Date().toISOString().split("T")[0];
  
  return `# ${diagram.meta.title || "Azure Architecture"} Deliverables

Generated: ${date}
Region: ${diagram.meta.region || "eastus"}
Architecture: ${diagram.meta.title || "Untitled"}

## Contents

\`\`\`
${safeTitle}_deliverables/
├── diagrams/
│   ├── ${safeTitle}.svg          # Vector architecture diagram
│   └── ${safeTitle}.png          # High-resolution raster diagram (2x)
├── iac/
│   ├── ${safeTitle}.bicep        # Bicep Infrastructure as Code
│   └── ${safeTitle}.tf           # Terraform HCL configuration
├── documents/
│   └── ${safeTitle}.xlsx         # Pricing & inventory spreadsheet (Excel)
└── README.md                     # This file
\`\`\`

## Architecture Summary

- **Title**: ${diagram.meta.title || "Untitled"}
- **Region**: ${diagram.meta.region || "eastus"}
- **Services**: ${diagram.nodes.filter(n => n.service !== "editor").length}
- **Groups**: ${diagram.groups.length}
- **Connections**: ${diagram.edges.length}
- **Generated**: ${new Date().toISOString().split("T")[0]}

## File Descriptions

### Diagrams
- **SVG**: Scalable vector graphics with embedded Azure icons, suitable for presentations and documentation
- **PNG**: High-resolution (2x) raster image for embedding in documents

### Infrastructure as Code
- **Bicep**: Native Azure deployment language, compile with \`az bicep build\`
- **Terraform**: HashiCorp HCL format, validate with \`terraform validate\`

### Documents
- **XLSX**: Multi-sheet spreadsheet with Services, Groups, Connections, Pricing Estimate, and Security Checklist

## Usage

### Deploy Bicep
\`\`\`bash
az deployment group create --resource-group <rg-name> --template-file ${safeTitle}.bicep
\`\`\`

### Deploy Terraform
\`\`\`bash
terraform init
terraform plan
terraform apply
\`\`\`

## Notes

- Pricing estimates are placeholders; connect Azure Pricing MCP for live retail prices
- Security checklist is automated based on detected services; manual review recommended
- All Azure services use official ARM types and icons
- Diagram JSON is the single source of truth for all exports

## Support

Generated by Azure Presale Studio - converting natural language to validated Azure architectures.
`;
}