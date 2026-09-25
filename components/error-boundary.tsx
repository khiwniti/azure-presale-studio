"use client";

/**
 * Error Boundary Component.
 * Catches React component errors and displays friendly fallback UI.
 * Spec §5 (Frontend UX - Error Handling).
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };
  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    
    // Log to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call optional callback
    this.props.onError?.(error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 10a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Something went wrong</h2>
                <p className="text-sm text-slate-400">We caught an unexpected error</p>
              </div>
            </div>
            
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 mb-4 font-mono text-xs text-slate-500 max-h-40 overflow-auto">
              {this.state.error?.message || "Unknown error"}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-azure-600 hover:bg-azure-500 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}