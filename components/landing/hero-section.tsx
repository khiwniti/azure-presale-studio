"use client";

/**
 * Hero Section Component.
 * The primary input interface: requirements prompt textarea, model picker,
 * settings modal trigger, and architecture generation trigger.
 * Spec §1 & §5.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModelPicker } from "./model-picker";
import { SettingsModal } from "./settings-modal";

interface HeroSectionProps {
  initialModel: string;
  hasKey: boolean;
}

const QUICK_STARTERS = [
  "Multi-region active-active web app with Front Door and Cosmos DB",
  "Zero-trust AKS microservices with WAF v2 and Key Vault",
  "High-throughput IoT event ingestion with Event Hubs and PostgreSQL",
];

export function HeroSection({ initialModel, hasKey }: HeroSectionProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, model: selectedModel }),
      });

      const data = (await res.json()) as { success?: boolean; canvasId?: string; error?: string };

      if (res.ok && data.canvasId) {
        router.push(`/canvas/${data.canvasId}`);
      } else {
        setIsSubmitting(false);
        setErrorMessage(data.error ?? "Failed to initialize architecture canvas");
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleGenerate();
    }
  }

  return (
    <div className="w-full max-w-4xl flex flex-col items-center text-center">
      {/* Top Bar Navigation Affordance */}
      <div className="w-full flex items-center justify-between pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-azure-600 flex items-center justify-center shadow-md shadow-azure-900/40">
            <svg className="w-4 h-4 text-white" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5S13.14 1.5 9 1.5zm0 13.5c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="currentColor"/>
              <path d="M5.5 8h7v2h-7z" fill="#50E6FF"/>
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100">
            Azure Presale Studio
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          <span>Credentials</span>
          {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
      </div>

      {/* Hero Headline */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 max-w-2xl leading-[1.15]">
        Turn natural language into validated Azure designs.
      </h1>
      <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
        Grounded in official Microsoft Learn architectures and live Azure Retail Prices. Complete with infinite canvas studio, live agent timeline, and client deliverables.
      </p>

      {/* Main Interactive Prompt Box */}
      <form onSubmit={handleGenerate} className="mt-8 w-full relative">
        <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 focus-within:border-azure-500 focus-within:ring-2 focus-within:ring-azure-500/20 shadow-2xl transition-all overflow-hidden text-left">
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your architecture requirements (e.g. 'Design a highly available e-commerce platform on Azure with Front Door, App Service, Redis, and SQL Database in eastus')..."
            className="w-full p-4 sm:p-5 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 outline-none resize-none leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 border-t border-slate-800/80">
            <ModelPicker selectedModel={selectedModel} onSelectModel={setSelectedModel} />

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] font-mono text-slate-500">
                ⌘ + Enter
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !prompt.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-azure-900/50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Planning Solution…</span>
                  </>
                ) : (
                  <>
                    <span>Generate Architecture</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M1 8a.75.75 0 01.75-.75h10.69L8.22 3.03a.75.75 0 011.06-1.06l5.5 5.5a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06-1.06l4.22-4.22H1.75A.75.75 0 011 8z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 text-left">
            {errorMessage}
          </div>
        )}
      </form>

      {/* Quick Starters */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-slate-500 text-[11px] font-mono mr-1">Try:</span>
        {QUICK_STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-azure-500/40 text-slate-300 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasExistingKey={hasKey}
      />
    </div>
  );
}
