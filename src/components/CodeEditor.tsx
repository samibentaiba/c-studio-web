"use client";
import { Loader2 } from "lucide-react";
import React, { useRef, useEffect } from "react";
import MonacoEditor, { Monaco } from "@monaco-editor/react";

interface CodeEditorProps {
  language: "c" | "algorithm";
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function CodeEditor({ language, value, onChange, className }: CodeEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    // Custom algorithm language registration if monaco is loaded
    if (monacoRef.current) {
        monacoRef.current.languages.register({ id: "algorithm" })
        monacoRef.current.languages.setMonarchTokensProvider("algorithm", {
            tokenizer: {
                root: [
                    [/\b(ALGORITHM|CONST|VAR|BEGIN|END\.?|IF|THEN|ELSE|FOR|TO|DO|WHILE|FAIRE|TANTQUE|POUR|JUSQUA|FPOUR|F TANTQUE|FONCTION|F FONCTION|PROCEDURE|F PROCEDURE)\b/, "keyword"],
                    [/\b(INTEGER|REAL|CHAR|BOOLEAN|STRING|ENTIER|REEL|CARACTERE|CHAINE)\b/, "type"],
                    [/\b(TRUE|FALSE|VRAI|FAUX)\b/, "constant"],
                    [/\b(READ|WRITE|LIRE|ECRIRE)\b/, "support.function"],
                ]
            }
        });
    }
  }, [monacoRef.current]);

  return (
    <div className={`relative w-full h-full bg-[#1e1e1e] flex flex-col ${className || ""}`}>
      {/* Editor Header */}
      <div className="h-10 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-4 flex-none shadow-sm z-10">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <div className="ml-4 flex space-x-2">
          <div className="px-3 py-1 bg-[#1e1e1e] text-xs text-blue-400 font-mono rounded-t-md border border-[#3c3c3c] border-b-0 flex items-center gap-2">
            main.{language === "c" ? "c" : "algo"}
          </div>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full relative">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            formatOnPaste: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full w-full text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading Editor...
            </div>
          }
          onMount={(editor, monaco) => {
            monacoRef.current = monaco;
          }}
        />
      </div>
    </div>
  );
}
