"use client";
import React, { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Play, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileSystemItem } from "@/types";
import init, { format } from "@wasm-fmt/clang-format/web";
import { useTheme } from "@/ThemeContext";
import { EditorTabs } from "@/components/EditorTabs";
import {
  registerUSDBLanguage,
  USDB_LANGUAGE_ID,
} from "@/usdb-compiler/usdb-language";

interface Marker {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

interface MonacoEditorProps {
  activeFile: FileSystemItem;
  onContentChange: (content: string) => void;
  onRun: () => void;
  isCompiling: boolean;
  markers: Marker[];
  openTabs: string[];
  files: FileSystemItem[];
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  onSplitRight?: (fileId: string) => void;
  onTranslate?: () => void;
  showOutputTab?: boolean;
}

export function MonacoEditor({
  activeFile,
  onContentChange,
  onRun,
  isCompiling,
  markers,
  openTabs,
  files,
  onTabClick,
  onTabClose,
  onSplitRight,
  onTranslate,
  showOutputTab,
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { theme, themeId } = useTheme();

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    monaco.editor.defineTheme("custom-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        {
          token: "comment",
          foreground: theme.syntax.comment.replace("#", ""),
          fontStyle: "italic",
        },
        { token: "keyword", foreground: theme.syntax.keyword.replace("#", "") },
        { token: "string", foreground: theme.syntax.string.replace("#", "") },
        { token: "number", foreground: theme.syntax.number.replace("#", "") },
        { token: "type", foreground: theme.syntax.type.replace("#", "") },
        {
          token: "function",
          foreground: theme.syntax.function.replace("#", ""),
        },
        {
          token: "variable",
          foreground: theme.syntax.variable.replace("#", ""),
        },
        {
          token: "operator",
          foreground: theme.syntax.operator.replace("#", ""),
        },
      ],
      colors: {
        "editor.background": theme.editor.background,
        "editor.foreground": theme.editor.foreground,
        "editor.lineHighlightBackground": theme.editor.lineHighlight,
        "editor.selectionBackground": theme.editor.selection,
        "editorCursor.foreground": theme.editor.cursor,
      },
    });

    monaco.editor.setTheme("custom-theme");

    // Register USDB Algo language
    registerUSDBLanguage(monaco);
  };

  // Update theme when changed
  useEffect(() => {
    if (monacoRef.current) {
      const monaco = monacoRef.current;
      monaco.editor.defineTheme("custom-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          {
            token: "comment",
            foreground: theme.syntax.comment.replace("#", ""),
            fontStyle: "italic",
          },
          {
            token: "keyword",
            foreground: theme.syntax.keyword.replace("#", ""),
          },
          { token: "string", foreground: theme.syntax.string.replace("#", "") },
          { token: "number", foreground: theme.syntax.number.replace("#", "") },
          { token: "type", foreground: theme.syntax.type.replace("#", "") },
          {
            token: "function",
            foreground: theme.syntax.function.replace("#", ""),
          },
          {
            token: "variable",
            foreground: theme.syntax.variable.replace("#", ""),
          },
          {
            token: "operator",
            foreground: theme.syntax.operator.replace("#", ""),
          },
        ],
        colors: {
          "editor.background": theme.editor.background,
          "editor.foreground": theme.editor.foreground,
          "editor.lineHighlightBackground": theme.editor.lineHighlight,
          "editor.selectionBackground": theme.editor.selection,
          "editorCursor.foreground": theme.editor.cursor,
        },
      });
      monaco.editor.setTheme("custom-theme");
    }
  }, [themeId, theme]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeFile) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoMarkers = markers
          .filter((m) => m.file === activeFile.name)
          .map((m) => ({
            startLineNumber: m.line,
            startColumn: m.column,
            endLineNumber: m.line,
            endColumn: m.column + 1,
            message: m.message,
            severity:
              m.severity === "error"
                ? monacoRef.current.MarkerSeverity.Error
                : monacoRef.current.MarkerSeverity.Warning,
          }));
        monacoRef.current.editor.setModelMarkers(model, "owner", monacoMarkers);
      }
    }
  }, [markers, activeFile]);

  // Register C Formatter
  useEffect(() => {
    if (monacoRef.current) {
      const monaco = monacoRef.current;

      const initWasm = async () => {
        try {
          // Initialize WASM via local public asset for offline support
          if (typeof window !== "undefined") {
            await init("/clang-format.wasm");
          }
        } catch (error) {
          console.error("Failed to initialize clang-format WASM:", error);
        }
      };
      initWasm();

      const dispose = monaco.languages.registerDocumentFormattingEditProvider(
        "c",
        {
          provideDocumentFormattingEdits: async (model: any) => {
            const text = model.getValue();
            try {
              const formatted = await format(
                text,
                "main.c",
                JSON.stringify({ BasedOnStyle: "Chromium", IndentWidth: 4 }),
              );
              return [
                {
                  range: model.getFullModelRange(),
                  text: formatted,
                },
              ];
            } catch (e) {
              console.error("Formatting failed:", e);
              return [];
            }
          },
        },
      );

      return () => dispose.dispose();
    }
  }, [monacoRef.current]);

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith(".algo")) return USDB_LANGUAGE_ID;
    if (filename.endsWith(".c") || filename.endsWith(".h")) return "c";
    if (filename.endsWith(".cpp")) return "cpp";
    if (filename.endsWith(".json")) return "json";
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".ts")) return "typescript";
    return "plaintext";
  };

  return (
    <div
      className="flex-1 flex flex-col min-w-0"
      style={{ backgroundColor: theme.editor.background }}
    >
      {/* Tab bar */}
      <EditorTabs
        openTabs={openTabs}
        activeFileId={activeFile.id}
        files={files}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
        onSplitRight={onSplitRight}
        showOutputTab={showOutputTab}
      />

      {/* Toolbar */}
      <div
        className="h-10 flex items-center justify-end px-4"
        style={{
          backgroundColor: theme.ui.backgroundLight,
          borderBottom: `1px solid ${theme.ui.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={handleFormat}
            variant="secondary"
            size="sm"
            className="text-xs"
            title="Format Code (Shift+Alt+F)"
          >
            Format
          </Button>
          {onTranslate &&
            (activeFile.name.endsWith(".algo") ||
              activeFile.name.endsWith(".c")) && (
              <Button
                onClick={onTranslate}
                variant="outline"
                size="sm"
                className="text-xs"
                title="Translate Code (Ctrl+T)"
              >
                <ArrowRightLeft size={14} className="mr-1" />
                {activeFile.name.endsWith(".algo") ? "To C" : "To Algo"}
              </Button>
            )}
          <Button
            onClick={onRun}
            disabled={isCompiling}
            className={
              isCompiling
                ? "bg-muted text-muted-foreground"
                : "bg-green-600 hover:bg-green-700 text-white"
            }
            size="sm"
            title="Run Code (F5)"
          >
            {isCompiling ? (
              "Running..."
            ) : (
              <>
                <Play size={16} className="mr-2" fill="currentColor" /> Run Code
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(activeFile.name)}
          value={activeFile.content || ""}
          theme="custom-theme"
          onChange={(value) => onContentChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
              horizontal: "visible",
              horizontalScrollbarSize: 10,
              verticalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
}
