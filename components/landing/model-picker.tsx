"use client";

/**
 * Model Picker Component.
 * Allows solution architects to select their preferred NIM reasoning model.
 * Spec §1 & §5.
 */

import { useState } from "react";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  description: string;
}

export const NIM_MODELS: ModelOption[] = [
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    name: "Llama 3.1 Nemotron 70B",
    provider: "NVIDIA",
    badge: "Recommended",
    description: "Tuned for complex architectural reasoning and Azure topology planning",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
    badge: "Versatile",
    description: "High-throughput general solution design and CAF naming adherence",
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    badge: "Deep Think",
    description: "Chain-of-thought verification for multi-region active-active patterns",
  },
  {
    id: "mistralai/mistral-large-2-instruct",
    name: "Mistral Large 2",
    provider: "Mistral",
    badge: "Fast",
    description: "Rapid diagram prototyping and iterative in-chat refinement",
  },
];

interface ModelPickerProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelPicker({ selectedModel, onSelectModel }: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = NIM_MODELS.find((m) => m.id === selectedModel) ?? NIM_MODELS[0]!;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-azure-500/80 text-xs font-medium text-slate-200 transition-colors shadow-sm"
        aria-expanded={isOpen}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-slate-400">Model:</span>
        <span className="text-slate-100 font-semibold">{current.name}</span>
        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 6L8 9.5 11.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 p-2 overflow-hidden">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              NVIDIA NIM Reasoning Models
            </div>
            <div className="mt-1 space-y-1">
              {NIM_MODELS.map((model) => {
                const isSelected = model.id === current.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                      isSelected
                        ? "bg-azure-600/20 border border-azure-500/40 text-azure-200"
                        : "hover:bg-slate-800 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{model.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {model.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">{model.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
