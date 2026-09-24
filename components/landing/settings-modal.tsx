"use client";

/**
 * Settings Modal for BYO NVIDIA NIM API Key.
 * Encrypts key with AES-256-GCM before database persistence.
 * Spec §2 & §5.
 */

import { useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingKey: boolean;
}

export function SettingsModal({ isOpen, onClose, hasExistingKey }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      setIsSaving(false);
      if (res.ok && data.success) {
        setStatusMessage("NVIDIA NIM API key encrypted and saved successfully.");
        setApiKey("");
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 1200);
      } else {
        setIsError(true);
        setStatusMessage(data.error ?? "Failed to save key");
      }
    } catch (err) {
      setIsSaving(false);
      setIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Workspace Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure your NVIDIA NIM inference credentials</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="nimKey" className="text-xs font-medium text-slate-200">
                NVIDIA NIM API Key
              </label>
              {hasExistingKey && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Key configured (AES-256 encrypted)
                </span>
              )}
            </div>
            <input
              id="nimKey"
              type="password"
              placeholder="nvapi-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-azure-500 focus:ring-1 focus:ring-azure-500 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Keys are encrypted at rest with AES-256-GCM using your session secret and are never logged or stored in plaintext. Obtain an API key at{" "}
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-azure-400 hover:text-azure-300 underline"
              >
                build.nvidia.com
              </a>.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                isError ? "bg-rose-950/40 border border-rose-800/60 text-rose-300" : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isSaving ? "Encrypting & Saving…" : "Save Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
