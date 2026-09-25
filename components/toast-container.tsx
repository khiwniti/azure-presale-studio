"use client";

/**
 * Toast Notification System.
 * Displays transient notifications for errors, warnings, success, info.
 * Spec §5 (Frontend UX - Toast notifications).
 */

import { useState, useCallback, useEffect } from "react";
import { createContext, useContext, ReactNode } from "react";

type ToastType = "error" | "warning" | "success" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    
    if (toast.duration !== 0) {
      setTimeout(() => hideToast(id), toast.duration ?? 5000);
    }
    
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const typeStyles: Record<ToastType, string> = {
    error: "bg-red-500/20 border-red-500/30 text-red-100",
    warning: "bg-amber-500/20 border-amber-500/30 text-amber-100",
    success: "bg-green-500/20 border-green-500/30 text-green-100",
    info: "bg-azure-500/20 border-azure-500/30 text-azure-100",
  };

  const typeIcons: Record<ToastType, React.ReactNode> = {
    error: (
      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 10a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-azure-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm bg-slate-900/95 border rounded-xl shadow-2xl animate-slide-in ${typeStyles[toast.type]}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-400 mt-1">{toast.message}</p>
          )}
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); onClose(); }}
              className="mt-2 text-xs font-medium text-underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Helper functions for common toast patterns
export function useToastHelpers() {
  const { showToast, hideToast } = useToast();
  
  return {
    error: (title: string, message?: string, action?: Toast["action"]) => 
      showToast({ type: "error", title, message, action }),
    warning: (title: string, message?: string, action?: Toast["action"]) => 
      showToast({ type: "warning", title, message, action }),
    success: (title: string, message?: string, action?: Toast["action"]) => 
      showToast({ type: "success", title, message, action }),
    info: (title: string, message?: string, action?: Toast["action"]) => 
      showToast({ type: "info", title, message, action }),
    hide: hideToast,
  };
}