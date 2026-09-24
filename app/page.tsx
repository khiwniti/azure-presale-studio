/**
 * Root Landing Page.
 * Bolt.new / Lovable.dev aesthetic for rapid natural-language Azure architecture generation.
 * Spec §1 & §5.
 */

import { ExampleGallery } from "@/components/landing/example-gallery";
import { HeroSection } from "@/components/landing/hero-section";
import { RecentCanvases, type RecentCanvasItem } from "@/components/landing/recent-canvases";
import { prisma } from "@/lib/prisma";
import { getSessionId, touchSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let settings = {
    hasKey: false,
    defaultModel: "nvidia/llama-3.1-nemotron-70b-instruct",
  };
  let recentCanvases: RecentCanvasItem[] = [];

  try {
    const sessionId = await getSessionId();
    const session = await touchSession(sessionId);

    settings = {
      hasKey: Boolean(session.nimKeyEncrypted),
      defaultModel: session.defaultModel ?? "nvidia/llama-3.1-nemotron-70b-instruct",
    };

    const dbCanvases = await prisma.canvas.findMany({
      where: { sessionId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        diagramJson: true,
      },
    });

    recentCanvases = dbCanvases.map((c) => {
      let nodeCount = 0;
      try {
        const parsed = JSON.parse(c.diagramJson) as { nodes?: unknown[] };
        nodeCount = parsed.nodes?.length ?? 0;
      } catch {
        // Fallback
      }
      return {
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
        nodeCount,
      };
    });
  } catch {
    // Fresh visit without active cookies yet; middleware will assign sid
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start px-4 py-8 sm:px-8 sm:py-12">
      {/* Design Contract: Impeccable new-work compliance */}
      {/*
        THESIS: Enterprise-grade cloud architecture studio converting prompt requirements into official Azure ARM diagrams with zero hallucinated services.
        OWN-WORLD: Slate-950 deep canvas (#020817), Azure blue accents (#0078D4), cyan tag highlights (#38bdf8), crisp borders, zero gradient text.
      */}

      {/* Hero Interactive Generator */}
      <HeroSection
        initialModel={settings.defaultModel}
        hasKey={settings.hasKey}
      />

      {/* Recent Canvases (Session Scoped) */}
      <RecentCanvases canvases={recentCanvases} />

      {/* Example Architecture Gallery */}
      <ExampleGallery onSelectPrompt={() => {}} />

      {/* Footer */}
      <footer className="mt-24 pb-8 w-full max-w-5xl border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2">
          <span>Azure Presale Studio</span>
          <span>•</span>
          <span>ARM Type Enforced</span>
          <span>•</span>
          <span>Microsoft Learn Grounded</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://learn.microsoft.com/en-us/azure/architecture/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Architecture Center
          </a>
          <a
            href="https://prices.azure.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Retail Prices API
          </a>
        </div>
      </footer>
    </main>
  );
}
