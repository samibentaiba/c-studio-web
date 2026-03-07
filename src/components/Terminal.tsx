"use client";
import React, { useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Play, AlertCircle, Trash2 } from "lucide-react";

interface TerminalProps {
  logs: string[];
  isExecuting: boolean;
  onClear: () => void;
  className?: string;
}

export function Terminal({ logs, isExecuting, onClear, className }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`w-full bg-[#1e1e1e] flex flex-col font-mono text-sm border-t border-[#3c3c3c] ${className || ""}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center text-gray-400">
          <TerminalIcon className="w-4 h-4 mr-2" />
          <span className="font-semibold text-xs tracking-wider uppercase">Console Output</span>
        </div>
        <div className="flex items-center space-x-3">
          {isExecuting && (
            <div className="flex items-center text-blue-400 text-xs animate-pulse">
              <Play className="w-3 h-3 mr-1" /> Executing...
            </div>
          )}
          <button 
            onClick={onClear}
            className="text-gray-500 hover:text-red-400 transition-colors tooltip tooltip-left"
            data-tip="Clear Terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#1e1e1e] text-gray-300"
      >
        {logs.length === 0 ? (
          <div className="text-gray-600 flex items-center h-full justify-center text-xs italic">
            Output will appear here...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`whitespace-pre-wrap ${log.includes("Error:") ? "text-red-400" : log.includes("Warning:") ? "text-yellow-400" : ""}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
