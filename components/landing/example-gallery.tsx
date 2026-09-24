"use client";

/**
 * Example Gallery Component.
 * Curated real-world Azure solution architecture patterns.
 * Spec §1 & §5.
 */

export interface ExamplePattern {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  services: string[];
}

export const ARCHITECTURE_EXAMPLES: ExamplePattern[] = [
  {
    id: "ecommerce-ha",
    title: "Global E-Commerce Platform",
    category: "High Availability",
    description: "Multi-region web tier with Azure Front Door global routing, App Service Premium v3, Redis session caching, and Azure SQL active geo-replication.",
    prompt: "Design a highly available multi-region e-commerce platform on Azure with Azure Front Door, App Service P1v3, Redis caching for shopping carts, Azure SQL Database, and Key Vault.",
    services: ["Azure Front Door", "App Service", "Azure SQL", "Redis Cache", "Key Vault"],
  },
  {
    id: "aks-baseline",
    title: "Production AKS Microservices",
    category: "Cloud Native",
    description: "Enterprise Kubernetes baseline with Application Gateway WAF v2 ingress, Azure CNI networking, Microsoft Entra Workload Identity, and Cosmos DB.",
    prompt: "Design an enterprise microservices platform on Azure Kubernetes Service (AKS) with Application Gateway WAF v2, Azure Cosmos DB data tier, Key Vault, and Log Analytics.",
    services: ["AKS", "App Gateway WAF", "Cosmos DB", "Log Analytics"],
  },
  {
    id: "genai-rag",
    title: "Enterprise RAG on Azure OpenAI",
    category: "AI & Cognitive",
    description: "Retrieval-Augmented Generation pipeline combining Azure OpenAI service, Azure AI Search vector indexes, Blob Storage data lake, and Container Apps.",
    prompt: "Architect an enterprise GenAI document assistant using Azure OpenAI, Azure AI Search vector store, Azure Container Apps, and private Blob Storage.",
    services: ["Azure OpenAI", "Azure AI Search", "Container Apps", "Blob Storage"],
  },
  {
    id: "event-streaming",
    title: "Real-Time Event Streaming Hub",
    category: "Data & Analytics",
    description: "High-throughput telemetry ingestion with Azure Event Hubs, Azure Stream Analytics, and Azure Database for PostgreSQL Flexible Server.",
    prompt: "Design a real-time IoT event streaming pipeline with Azure Event Hubs, PostgreSQL Flexible Server, and Azure Key Vault.",
    services: ["Event Hubs", "PostgreSQL", "Storage Account", "Key Vault"],
  },
];

interface ExampleGalleryProps {
  onSelectPrompt: (promptText: string) => void;
}

export function ExampleGallery({ onSelectPrompt }: ExampleGalleryProps) {
  return (
    <section className="mt-16 w-full max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Featured Architecture Templates</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any template to pre-fill the architecture generator</p>
        </div>
        <span className="text-xs font-mono text-azure-400 bg-azure-950/60 border border-azure-800/60 px-2.5 py-1 rounded-full">
          Official Microsoft Learn Grounding
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ARCHITECTURE_EXAMPLES.map((example) => (
          <div
            key={example.id}
            onClick={() => onSelectPrompt(example.prompt)}
            className="group relative p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-azure-500/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-azure-950/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-azure-400 font-mono">
                  {example.category}
                </span>
                <span className="text-xs text-slate-500 group-hover:text-azure-400 transition-colors">
                  Use Template →
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 group-hover:text-azure-200 transition-colors">
                {example.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                {example.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
              {example.services.map((svc) => (
                <span
                  key={svc}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono border border-slate-700/40"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
