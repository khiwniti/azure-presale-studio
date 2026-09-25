"use client";

/**
 * Agent Timeline Component.
 * Displays real-time timeline of agent run events (5 LangGraph nodes).
 * Spec §2 & §5.
 */

import type { TimelineEvent } from "@/lib/agent/types";

interface AgentTimelineProps {
  timeline: TimelineEvent[];
  overallStatus: "running" | "completed" | "failed";
}

const NODE_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  researcher: "Researcher",
  architect: "Architect",
  diagram_builder: "Diagram Builder",
  reviewer: "Reviewer",
};

const NODE_ICONS: Record<string, React.ReactNode> = {
  supervisor: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  researcher: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 4a2 2 0 012-2h8a2 2 0 012 2v11.172l.905-.905a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L5 15.172V4z" clipRule="evenodd" />
    </svg>
  ),
  architect: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293 1.293a1 1 0 101.414 1.414L11 10.414V14a1 1 0 102 0v-3.586l1.293-1.293a1 1 0 10-1.414-1.414L11 8.586V8z" clipRule="evenodd" />
    </svg>
  ),
  diagram_builder: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  ),
  reviewer: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 7a1 1 0 110-2 1 1 0 010 2zm0-5a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
};

const STATUS_COLORS: Record<string, string> = {
  running: "text-cyan-300 bg-cyan-500/20 border-cyan-500/30",
  completed: "text-green-300 bg-green-500/20 border-green-500/30",
  failed: "text-red-300 bg-red-500/20 border-red-500/30",
  queued: "text-slate-400 bg-slate-500/20 border-slate-500/30",
  pending: "text-slate-400 bg-slate-500/20 border-slate-500/30",
};

export function AgentTimeline({ timeline, overallStatus }: AgentTimelineProps) {
  const nodeOrder = ["supervisor", "researcher", "architect", "diagram_builder", "reviewer"] as const;

  return (
    <div className="w-80 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200">Agent Timeline</h3>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            STATUS_COLORS[overallStatus] ?? STATUS_COLORS.pending
          }`}
        >
          {overallStatus}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {nodeOrder.map((nodeId) => {
          const event = timeline.find((e) => e.node === nodeId);
          const isLast = nodeOrder.indexOf(nodeId) === nodeOrder.length - 1;
          const status = event?.status ?? "queued";
          
          return (
            <div key={nodeId} className="flex gap-3">
              {/* Vertical line */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-2 h-2 rounded-full border-2 ${
                    status === "completed" ? "bg-green-500 border-green-500"
                    : status === "running" ? "bg-cyan-500 border-cyan-500 animate-pulse"
                    : status === "failed" ? "bg-red-500 border-red-500"
                    : "bg-slate-600 border-slate-600"
                  }`}
                />
                {!isLast && (
                  <div className="flex-1 w-0.5 bg-slate-700 mt-1" />
                )}
              </div>

              {/* Node info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === "completed" ? "bg-green-500/20 text-green-300"
                    : status === "running" ? "bg-cyan-500/20 text-cyan-300"
                    : status === "failed" ? "bg-red-500/20 text-red-300"
                    : "bg-slate-700/50 text-slate-500"
                  }`}>
                    {NODE_ICONS[nodeId]}
                  </div>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {NODE_LABELS[nodeId]}
                  </span>
                </div>

                {event && (
                  <div className="mt-1 ml-8 space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono">
                      {event.startedAt ? new Date(event.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                    </p>
                    {event.findings && (
                      <p className="text-[10px] text-slate-500 truncate">{event.findings}</p>
                    )}
                    {event.error && (
                      <p className="text-[10px] text-red-400 truncate">{event.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="flex items-center">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  STATUS_COLORS[status] ?? STATUS_COLORS.queued
                }`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}