"use client";

/**
 * Custom Editor Node Component for React Flow.
 * Displays annotation notes, tag chips, and warning badges for diagram annotations.
 * Spec §3 (annotations schema) & §5 (editor node affordances).
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useState } from "react";
import type { EditorNodeData } from "./diagram-converter";

const TAG_PRESETS = ["TODO", "Review", "Deprecated", "Important", "Question"];

export function EditorNode({ data, selected }: NodeProps) {
  const nodeData = data as EditorNodeData;
  const [noteText, setNoteText] = useState(
    nodeData.annotations.find((a) => a.type === "note")?.text || ""
  );
  const [currentTagIndex, setCurrentTagIndex] = useState(() => {
    const tagAnnotation = nodeData.annotations.find((a) => a.type === "tag");
    return tagAnnotation ? TAG_PRESETS.indexOf(tagAnnotation.text) : -1;
  });
  const [hasWarning, setHasWarning] = useState(
    nodeData.annotations.some((a) => a.type === "warning")
  );

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNoteText(newText);
    
    const updatedAnnotations = nodeData.annotations.filter((a) => a.type !== "note");
    if (newText.trim()) {
      updatedAnnotations.push({ id: `note_${Date.now()}`, type: "note", text: newText });
    }
    
    nodeData.onAnnotationChange?.(updatedAnnotations);
  };

  const handleTagClick = () => {
    const nextIndex = (currentTagIndex + 1) % (TAG_PRESETS.length + 1);
    setCurrentTagIndex(nextIndex);
    
    const updatedAnnotations = nodeData.annotations.filter((a) => a.type !== "tag");
    if (nextIndex > 0) {
      const tagText = TAG_PRESETS[nextIndex - 1];
      if (tagText) {
        updatedAnnotations.push({ 
          id: `tag_${Date.now()}`, 
          type: "tag", 
          text: tagText 
        });
      }
    }
    
    nodeData.onAnnotationChange?.(updatedAnnotations);
  };

  const handleWarningToggle = () => {
    const newHasWarning = !hasWarning;
    setHasWarning(newHasWarning);
    
    const updatedAnnotations = nodeData.annotations.filter((a) => a.type !== "warning");
    if (newHasWarning) {
      updatedAnnotations.push({ 
        id: `warning_${Date.now()}`, 
        type: "warning", 
        text: "Review required" 
      });
    }
    
    nodeData.onAnnotationChange?.(updatedAnnotations);
  };

  const currentTag = currentTagIndex >= 0 ? TAG_PRESETS[currentTagIndex] : null;

  return (
    <div
      className={`relative min-w-[200px] max-w-[280px] rounded-xl bg-slate-900/95 border transition-all shadow-lg ${
        selected
          ? "border-amber-500 ring-2 ring-amber-500/30 shadow-amber-950/50"
          : "border-slate-700/80 hover:border-slate-600 hover:shadow-xl"
      }`}
    >
      {/* Target Connection Handle (Incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-slate-900 !-left-1.5 transition-transform hover:scale-125"
      />

      {/* Main Node Body */}
      <div className="p-3">
        {/* Header with type badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
            Annotation
          </span>
          <span className="text-xs font-semibold text-slate-300 truncate">
            {noteText.slice(0, 30) || "New annotation"}
          </span>
        </div>

        {/* Note textarea */}
        <textarea
          value={noteText}
          onChange={handleNoteChange}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />

        {/* Tags and Warning */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {/* Tag */}
          <button
            type="button"
            onClick={handleTagClick}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              currentTag
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"
            }`}
            title="Cycle through tags"
          >
            {currentTag ? `#${currentTag}` : "+ Tag"}
          </button>

          {/* Warning Toggle */}
          <button
            type="button"
            onClick={handleWarningToggle}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1 transition-colors ${
              hasWarning
                ? "bg-red-500/20 text-red-300 border border-red-500/50"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"
            }`}
            title="Toggle warning"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {!hasWarning && <span className="text-[10px]">!</span>}
            {hasWarning && <span className="text-[10px]">Warning</span>}
          </button>
        </div>
      </div>

      {/* Source Connection Handle (Outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-slate-900 !-right-1.5 transition-transform hover:scale-125"
      />
    </div>
  );
}