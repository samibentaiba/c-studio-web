"use client";
import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { LogMessage } from "@/types";

interface XtermTerminalProps {
  workspacePath?: string | null;
  terminalLogs?: LogMessage[];
  onCommand?: (command: string) => void;
  readOnly?: boolean;
}

export function XtermTerminal({ workspacePath, terminalLogs, onCommand, readOnly }: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!terminalRef.current || xtermRef.current) return;

      const container = terminalRef.current;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      const xterm = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "Consolas, 'Courier New', monospace",
        theme: {
          background: "#1e1e1e",
          foreground: "#cccccc",
          cursor: "#ffffff",
          cursorAccent: "#1e1e1e",
          selectionBackground: "#264f78",
        },
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(container);
      
      setTimeout(() => {
        try { fitAddon.fit(); } catch (e) {}
      }, 50);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      setIsReady(true);

      // Welcome guide for students
      xterm.writeln("Welcome to C-Studio Terminal!");
      xterm.writeln("=====================================");
      xterm.writeln("");
      if (workspacePath) {
        xterm.writeln(`Working directory: ${workspacePath}`);
        xterm.writeln("Your files have been saved here for compilation.");
        xterm.writeln("");
      }
      xterm.writeln("QUICK START GUIDE:");
      xterm.writeln("");
      xterm.writeln("  1. COMPILE A C FILE:");
      xterm.writeln("     gcc main.c -o program.exe");
      xterm.writeln("");
      xterm.writeln("  2. RUN YOUR PROGRAM:");
      xterm.writeln("     .\\program.exe");
      xterm.writeln("");
      xterm.writeln("  3. COMPILE MULTIPLE FILES:");
      xterm.writeln("     gcc main.c utils.c -o program.exe");
      xterm.writeln("");
      xterm.writeln("  4. USEFUL COMMANDS:");
      xterm.writeln("     dir              - List files in current directory");
      xterm.writeln("     cd folder_name   - Change directory");
      xterm.writeln("     gcc --version    - Check compiler version");
      xterm.writeln("     cls              - Clear the screen");
      xterm.writeln("");
      xterm.writeln("=====================================");
      xterm.writeln("");

      // Simple PowerShell prompt
      let currentLine = "";
      
      const writePrompt = () => {
        xterm.write("PS> ");
      };
      
      writePrompt();

      xterm.onData((data: string) => {
        if (readOnly) return; // Disable typing when explicitly set to readonly
        if (data === "\r") {
          xterm.writeln("");
          if (currentLine.trim()) {
            if (currentLine.trim() === "clear" || currentLine.trim() === "cls") {
                xterm.clear();
            } else if (onCommand) {
                onCommand(currentLine.trim());
            } else {
                xterm.writeln(`Error: Native shell commands ('${currentLine}') are not available in the Web IDE.`);
                xterm.writeln(`Please use the 'Compile & Run' buttons in the interface.`);
            }
            writePrompt();
          } else {
            writePrompt();
          }
          currentLine = "";
        } else if (data === "\x7f" || data === "\b") {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            xterm.write("\b \b");
          }
        } else if (data === "\x03") {
          xterm.writeln("^C");
          currentLine = "";
          writePrompt();
        } else if (data.charCodeAt(0) >= 32) {
          currentLine += data;
          xterm.write(data);
        }
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [workspacePath, readOnly]);

  useEffect(() => {
    if (!isReady) return;

    const handleResize = () => {
      try { fitAddonRef.current?.fit(); } catch (e) {}
    };

    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    if (terminalRef.current) observer.observe(terminalRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [isReady]);

  const printedLogsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isReady || !xtermRef.current || !terminalLogs) return;

    terminalLogs.forEach(log => {
      if (!printedLogsRef.current.has(log.id)) {
        printedLogsRef.current.add(log.id);
        
        // Split on both literal '\n' and actual newlines
        const lines = log.content.split(/\\n|\n/);
        lines.forEach((line, index) => {
           if (line.trim()) {
               xtermRef.current?.writeln(line);
           }
        });
      }
    });
  }, [terminalLogs, isReady]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full"
      style={{ backgroundColor: "#1e1e1e", padding: "4px" }}
    />
  );
}
