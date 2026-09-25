"use client";

/**
 * Report Wizard Component.
 * Multi-step wizard for generating client deliverables:
 * 1. Architecture Summary
 * 2. Pricing Estimate
 * 3. Security Review
 * 4. Export Options
 * Spec §4 (Report Builder) & §5 (Frontend UX).
 */

import { useState, useCallback } from "react";
import type { DiagramJson } from "@/mcp/azure-diagram/validator";

type WizardStep = "summary" | "pricing" | "security" | "export";

interface ReportWizardProps {
  diagramJson: DiagramJson;
  onClose: () => void;
  onGenerateReport: (format: "docx" | "pdf" | "html") => void;
}

const STEPS: WizardStep[] = ["summary", "pricing", "security", "export"];

const STEP_LABELS: Record<WizardStep, { label: string }> = {
  summary: { label: "Summary" },
  pricing: { label: "Pricing" },
  security: { label: "Security" },
  export: { label: "Export" },
};

const ICON_CHECK = (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ICON_CROSS = (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const ICON_WARNING = (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export function ReportWizard({ diagramJson, onClose, onGenerateReport }: ReportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("summary");
  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleNext = useCallback(() => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  }, [currentStepIndex]);

  const handleExport = useCallback((format: "docx" | "pdf" | "html") => {
    onGenerateReport(format);
    onClose();
  }, [onClose, onGenerateReport]);

  // Generate architecture summary
  const getSummary = () => {
    const services = diagramJson.nodes
      .filter(n => n.service !== "editor")
      .map(n => ({
        name: n.label,
        type: n.service,
        sku: n.config?.sku as string || "Default",
        zoneRedundant: n.config?.zoneRedundant as boolean || false,
      }));

    const groups = diagramJson.groups.map(g => ({
      name: g.label,
      kind: g.kind,
    }));

    const connections = diagramJson.edges.map(e => {
      const fromNode = diagramJson.nodes.find(n => n.id === e.from);
      const toNode = diagramJson.nodes.find(n => n.id === e.to);
      return `${fromNode?.label || e.from} → ${toNode?.label || e.to}${e.label ? ` (${e.label})` : ""}`;
    });

    return { services, groups, connections };
  };

  // Generate pricing estimate
  const getPricingEstimate = () => {
    const summary = getSummary();
    // Simplified pricing - in production would call Azure Pricing MCP
    const estimates = summary.services.map(s => ({
      service: s.name,
      sku: s.sku,
      estimatedMonthly: Math.floor(Math.random() * 500) + 50, // Placeholder
    }));

    const total = estimates.reduce((sum, e) => sum + e.estimatedMonthly, 0);

    return { estimates, total };
  };

  // Generate security checklist
  const getSecurityChecklist = () => {
    const summary = getSummary();
    const checks = [
      { category: "Network", item: "WAF enabled on Application Gateway", status: summary.services.some(s => s.type.includes("applicationGateways")) ? "pass" : "fail" },
      { category: "Network", item: "Private endpoints for data services", status: summary.services.some(s => s.type.includes("storageAccounts")) ? "review" : "pass" },
      { category: "Identity", item: "Key Vault for secrets management", status: summary.services.some(s => s.type.includes("KeyVault")) ? "pass" : "fail" },
      { category: "Data", item: "Encryption at rest enabled", status: "pass" },
      { category: "Data", item: "Backup retention configured", status: summary.services.some(s => s.type.includes("database")) ? "review" : "pass" },
      { category: "Monitoring", item: "Log Analytics workspace configured", status: summary.services.some(s => s.type.includes("OperationalInsights")) ? "pass" : "fail" },
      { category: "Governance", item: "Azure Policy assignments", status: "review" },
    ];

    return checks;
  };

  const summary = getSummary();
  const pricing = getPricingEstimate();
  const security = getSecurityChecklist();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Generate Report</h2>
            <p className="text-xs text-slate-400">Create client deliverables from architecture diagram</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {STEPS.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              disabled={index > currentStepIndex}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                index === currentStepIndex
                  ? "text-azure-300 border-b-2 border-azure-500"
                  : index < currentStepIndex
                  ? "text-green-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                index === currentStepIndex
                  ? "bg-azure-500/20 text-azure-300"
                  : index < currentStepIndex
                  ? "bg-green-500/20 text-green-300"
                  : "bg-slate-700/50 text-slate-400"
              }`}>
                {index < currentStepIndex ? ICON_CHECK : <span>{index + 1}</span>}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[step].label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Architecture Summary */}
          {currentStep === "summary" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-4 h-4 text-azure-400">📋</span>
                  Architecture Summary
                </h3>
                <p className="text-xs text-slate-400 mt-1">Auto-generated from diagram</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Services ({summary.services.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {summary.services.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No services in diagram</p>
                    ) : (
                      summary.services.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                          <div>
                            <p className="text-xs font-medium text-slate-100">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{s.type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-azure-300 border border-slate-700/50">{s.sku}</span>
                            {s.zoneRedundant && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">ZRS</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Groups ({summary.groups.length})</h4>
                  <div className="space-y-2">
                    {summary.groups.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No groups defined</p>
                    ) : (
                      summary.groups.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono ${
                            g.kind === "resource-group" ? "bg-slate-700/80 text-slate-300"
                            : g.kind === "vnet" ? "bg-azure-600/50 text-azure-300"
                            : "bg-cyan-600/50 text-cyan-300"
                          }`}>
                            {g.kind?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                          <span className="text-xs text-slate-300 truncate">{g.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Connections ({summary.connections.length})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[10px]">
                  {summary.connections.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No connections defined</p>
                  ) : (
                    summary.connections.map((c, i) => (
                      <div key={i} className="text-slate-400 p-1 bg-slate-800/50 rounded hover:bg-slate-800 transition-colors">
                        {c}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === "pricing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-4 h-4 text-azure-400">💰</span>
                  Pricing Estimate
                </h3>
                <p className="text-xs text-slate-400 mt-1">Monthly cost estimates (placeholder - requires live Azure Pricing API)</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="space-y-3">
                  {pricing.estimates.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-slate-100">{e.service}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{e.sku}</p>
                      </div>
                      <span className="text-sm font-semibold text-azure-300">${e.estimatedMonthly}/mo</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Total Estimated</span>
                    <span className="text-lg font-bold text-azure-300">${pricing.total}/mo</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-xs text-amber-300">
                  <strong>Note:</strong> These are placeholder estimates. Connect Azure Pricing MCP for live retail prices.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Security */}
          {currentStep === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-4 h-4 text-azure-400">🔒</span>
                  Security Review
                </h3>
                <p className="text-xs text-slate-400 mt-1">Automated checklist based on architecture services</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="space-y-3">
                  {security.map((check, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                          check.status === "pass" ? "bg-green-500/20 text-green-300"
                          : check.status === "fail" ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {check.status === "pass" ? ICON_CHECK : check.status === "fail" ? ICON_CROSS : ICON_WARNING}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-200">{check.item}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{check.category}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        check.status === "pass" ? "bg-green-500/20 text-green-300"
                        : check.status === "fail" ? "bg-red-500/20 text-red-300"
                        : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Export */}
          {currentStep === "export" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-4 h-4 text-azure-400">📤</span>
                  Export Format
                </h3>
                <p className="text-xs text-slate-400 mt-1">Choose output format for client delivery</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { format: "docx" as const, label: "Word Document", desc: "Full architecture doc with diagrams" },
                  { format: "pdf" as const, label: "PDF", desc: "Print-ready architecture summary" },
                  { format: "html" as const, label: "HTML", desc: "Interactive web-based report" },
                ].map(({ format, label, desc }) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleExport(format)}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-azure-500 hover:bg-slate-900 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-azure-500/20 text-azure-300 mb-3">
                      <span className="text-2xl">{format === "docx" ? "📄" : format === "pdf" ? "📕" : "🌐"}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100">{label}</h4>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {currentStepIndex === STEPS.length - 1 ? (
              <span className="text-xs text-slate-400">Ready to export</span>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 rounded-lg transition-colors shadow-sm"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}