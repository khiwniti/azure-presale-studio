"use client";

/**
 * Chat Panel Component.
 * Displays conversation history with agent and allows follow-up prompts.
 * Spec §2 & §5.
 */

import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function ChatPanel({ messages, onSendMessage, disabled = false }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    
    onSendMessage(trimmed);
    setInputValue("");
  };

  return (
    <div className="w-80 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200">Chat</h3>
        <span className="text-[10px] text-slate-400 font-mono">{messages.length}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p>Start a conversation with the agent</p>
            <p className="mt-1 text-[10px]">Describe changes or ask questions</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex-1 max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                  msg.role === "user"
                    ? "bg-azure-600 text-white rounded-tr-none"
                    : "bg-slate-800 text-slate-100 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[9px] mt-1 opacity-60 ${msg.role === "user" ? "text-right" : ""}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                {msg.role === "user" ? (
                  <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-azure-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-azure-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="bg-slate-800 text-slate-100 px-3 py-2 rounded-2xl rounded-tl-none text-xs animate-pulse">
              <span className="flex gap-1">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={disabled ? "Agent is running..." : "Type a follow-up..."}
            disabled={disabled}
            className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-azure-500 focus:outline-none focus:ring-1 focus:ring-azure-500"
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="px-3 py-2 text-xs font-semibold text-white bg-azure-600 hover:bg-azure-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}