/**
 * Azure Docs MCP Server.
 * Searches and fetches official Microsoft Learn documentation for architecture
 * design grounding (reliability, security, cost optimization, performance).
 *
 * Spec §4: Azure Docs MCP.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface DocSearchResult {
  title: string;
  url: string;
  snippet: string;
  category: string;
}

// Curated Microsoft Learn architecture reference briefs for offline and fast grounding
const ARCHITECTURE_KNOWLEDGE_BASE: Record<string, { title: string; url: string; content: string }> = {
  "ha-web-app": {
    title: "Highly Available Multi-Region Web App - Azure Architecture Center",
    url: "https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/app-service-web-app/multi-region",
    content: `
# Multi-region web application on Azure

## Architecture Overview
This architecture uses Azure Front Door for global load balancing and traffic routing across two Azure regions.
- **Frontend / Gateway:** Azure Front Door routes incoming HTTPS traffic to the closest active region with Web Application Firewall (WAF) enabled.
- **Compute Tier:** Azure App Service (Premium v3 SKU, P1v3/P2v3) running in multiple availability zones within each region.
- **Data Tier:** Azure Cosmos DB with multi-region replication or Azure SQL Database active geo-replication.
- **Caching:** Azure Cache for Redis in each region to reduce database load.
- **Security:** Azure Key Vault for managing connection strings, TLS certificates, and secrets with Managed Identity.
- **Observability:** Application Insights and Log Analytics workspace for end-to-end distributed tracing.
`,
  },
  "microservices-aks": {
    title: "Baseline Architecture for an Azure Kubernetes Service (AKS) Cluster",
    url: "https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks/baseline-aks",
    content: `
# Baseline AKS Architecture

## Core Components
- **Cluster Networking:** Azure CNI Overlay or standard Azure CNI inside a dedicated Virtual Network with separate system and user subnets.
- **Ingress Controller:** Azure Application Gateway with Ingress Controller (AGIC) or Azure Front Door.
- **Egress Lockdown:** Azure Firewall or NAT Gateway configured on the outbound subnet.
- **Identity & Access:** Microsoft Entra Workload ID for pod-to-Azure resource authentication without hardcoded credentials.
- **Data Storage:** Azure Database for PostgreSQL Flexible Server or Azure Cosmos DB accessed via Private Endpoints.
`,
  },
  "ecommerce-secure": {
    title: "E-Commerce Front Office on Azure - Architecture Center",
    url: "https://learn.microsoft.com/en-us/azure/architecture/solution-ideas/articles/ecommerce-front-office",
    content: `
# E-Commerce Architecture on Azure

## Recommended Topology
- **Edge Routing:** Azure Front Door Premium with WAF rules protecting against OWASP Top 10 vulnerabilities.
- **API Management:** Azure API Management (APIM) acting as the API gateway between mobile/web clients and backend services.
- **Microservices Layer:** Azure Container Apps or App Service with zone redundancy enabled.
- **Data Tier:** Azure Cosmos DB (SQL API) for product catalog and shopping cart; Azure Database for PostgreSQL for transactional order management.
- **Event Streaming:** Azure Service Bus queues for asynchronous order processing and checkout workflows.
`,
  },
};

/**
 * Search official Microsoft Learn docs.
 */
export async function searchDocs(query: string, top: number = 3): Promise<DocSearchResult[]> {
  const lowerQuery = query.toLowerCase();

  // 1. Check local architecture knowledge base first
  const matchedEntries = Object.entries(ARCHITECTURE_KNOWLEDGE_BASE)
    .filter(([key, doc]) =>
      lowerQuery.includes(key) ||
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery)
    )
    .map(([, doc]) => ({
      title: doc.title,
      url: doc.url,
      snippet: doc.content.slice(0, 300).replace(/\n+/g, " ").trim() + "...",
      category: "Architecture Center",
    }));

  if (matchedEntries.length >= top) {
    return matchedEntries.slice(0, top);
  }

  // 2. Query Microsoft Learn search API
  try {
    const searchUrl = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=en-us&scoring=semantic&$top=${top}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{ title: string; url: string; description?: string }>;
      };
      if (data.results && data.results.length > 0) {
        const liveResults: DocSearchResult[] = data.results.map((r) => ({
          title: r.title,
          url: r.url.startsWith("http") ? r.url : `https://learn.microsoft.com${r.url}`,
          snippet: r.description ?? "Official Microsoft Learn documentation article.",
          category: "Microsoft Learn",
        }));
        return [...matchedEntries, ...liveResults].slice(0, top);
      }
    }
  } catch {
    // Fallback to knowledge base
  }

  // Fallback defaults
  if (matchedEntries.length > 0) {
    return matchedEntries;
  }

  return [
    {
      title: "Azure Architecture Center Guidance",
      url: "https://learn.microsoft.com/en-us/azure/architecture/",
      snippet: "Comprehensive cloud design patterns, best practices, and reference architectures from Microsoft Azure engineering.",
      category: "Architecture Center",
    },
  ];
}

/**
 * Fetch official Microsoft Learn document content.
 * Strictly domain-gated to learn.microsoft.com.
 */
export async function fetchDocPage(url: string): Promise<{ title: string; url: string; content: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsedUrl.hostname !== "learn.microsoft.com") {
    throw new Error(`Security error: Only 'learn.microsoft.com' URLs are permitted. Received: ${parsedUrl.hostname}`);
  }

  // Check cached knowledge base first
  for (const doc of Object.values(ARCHITECTURE_KNOWLEDGE_BASE)) {
    if (doc.url === url) {
      return doc;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Azure-Presale-Studio/1.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      // Strip navigation, script, and style tags to extract clean text
      const cleanContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      return {
        title: "Microsoft Learn Documentation",
        url,
        content: cleanContent,
      };
    }
  } catch {
    // Return standard guidance on network failure
  }

  return {
    title: "Azure Architecture Guidance",
    url,
    content: "Reference architecture grounded in Azure Well-Architected Framework: Reliability, Security, Cost Optimization, Operational Excellence, and Performance Efficiency.",
  };
}

const server = new Server(
  {
    name: "azure-docs",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_docs",
        description:
          "Search official Microsoft Learn documentation and Azure Architecture Center for reference architectures and guidance.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query, e.g. 'e-commerce web app', 'multi-region Cosmos DB', 'AKS baseline'",
            },
            top: {
              type: "number",
              description: "Maximum number of search results to return (default 3)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "fetch_page",
        description:
          "Fetch the text content of an official Microsoft Learn document by URL (strictly domain-filtered to learn.microsoft.com).",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The complete https://learn.microsoft.com/... URL to fetch",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_docs": {
      const query = String(args?.["query"] ?? "");
      const top = Number(args?.["top"] ?? 3);
      const results = await searchDocs(query, top);
      return {
        content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }],
      };
    }

    case "fetch_page": {
      const url = String(args?.["url"] ?? "");
      const page = await fetchDocPage(url);
      return {
        content: [{ type: "text", text: JSON.stringify(page, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startServer().catch((err) => {
    console.error("Failed to start azure-docs MCP server:", err);
    process.exit(1);
  });
}
