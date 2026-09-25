"use client";

/**
 * Degraded Mode Component.
 * Displays fallback UI when MCP servers are unavailable.
 * Shows cached data with clear indication of degraded functionality.
 * Spec §5 (Frontend UX - Degradation).
 */

import { useState, useEffect } from "react";

interface DegradedModeProps {
  isDegraded: boolean;
  message?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DegradedMode({ isDegraded, message, onRetry, children }: DegradedModeProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isDegraded) {
      setShowBanner(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setShowBanner(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isDegraded]);

  return (
    <>
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-amber-950/95 border-b border-amber-800 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-100">Degraded Mode Active</p>
                  <p className="text-xs text-amber-300">{message || "Some features may be limited. Using cached data where available."}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    Retry Connection
                  </button>
                )}
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-2 text-amber-300 hover:text-amber-100 rounded-lg hover:bg-amber-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={isDegraded ? "relative" : ""}>
        {children}
        
        {isDegraded && (
          <div className="absolute inset-0 bg-slate-950/50 pointer-events-none">
            <div className="absolute top-4 right-4 bg-amber-950/90 border border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono">
              ⚠ DEGRADED MODE
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Slide down animation keyframes (add to global CSS if needed)
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-down {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-down > div { animation: slide-down 0.3s ease-out; }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}