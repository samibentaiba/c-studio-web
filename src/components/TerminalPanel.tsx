"use client";
import React, { useEffect, useRef, useState } from "react";
import { Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogMessage } from "../types";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  logs: LogMessage[];
  onClear: () => void;
  onInput?: (input: string) => void;
}

export function TerminalPanel({ logs, onClear, onInput }: TerminalPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (onInput) {
        onInput(inputValue);
        setInputValue("");
      }
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--theme-terminal-bg)' }}>
      <div className="h-10 flex-shrink-0 flex items-center justify-between px-4" style={{ backgroundColor: 'var(--theme-bg-light)', borderBottom: '1px solid var(--theme-border)' }}>
        <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--theme-fg)' }}>
          <Terminal size={16} /> Output
        </span>
        <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8">
          <Trash2 size={16} className="text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4 font-mono text-sm">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 text-slate-300 mb-1">
            <span className="text-slate-600 text-xs pt-1">{log.timestamp}</span>
            <span
              className={cn(
                "whitespace-pre-wrap",
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "success"
                    ? "text-green-400"
                    : "text-slate-300"
              )}
            >
              {log.content}
            </span>
          </div>
        ))}
        {onInput && (
          <div className="flex items-center mt-2 pl-[52px]">
            <span className="text-green-500 mr-2">➜</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder-slate-600"
              placeholder="Type input here..."
            />
          </div>
        )}
        <div ref={logsEndRef} />
      </ScrollArea>
    </div>
  );
}
