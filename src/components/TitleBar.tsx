"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTheme, appThemes } from "../ThemeContext";
import { Palette, Terminal, GitBranch, Check, AlertTriangle, Loader2 } from "lucide-react";

interface MenuItem {
  label?: string;
  action?: () => void;
  divider?: boolean;
  shortcut?: string;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
}

function DropdownMenu({ label, items }: MenuProps) {
  const testId = `menu-${label.toLowerCase()}`;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <div
        className="px-2 py-1 text-xs cursor-pointer transition-colors rounded"
        style={{
          color: theme.ui.foreground,
          backgroundColor: isOpen ? theme.ui.backgroundLight : "transparent",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.backgroundLight)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOpen ? theme.ui.backgroundLight : "transparent")}
        onClick={() => setIsOpen(!isOpen)}
        data-testid={testId}
      >
        {label}
      </div>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 rounded-md shadow-lg min-w-[200px] py-1 z-50"
          style={{
            backgroundColor: theme.ui.background,
            border: `1px solid ${theme.ui.border}`,
          }}
        >
          {items.map((item, index) =>
            item.divider ? (
              <div key={index} style={{ borderTop: `1px solid ${theme.ui.border}` }} className="my-1" />
            ) : (
              <div
                key={index}
                className="px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center transition-colors"
                style={{ color: theme.ui.foreground }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                onClick={() => {
                  item.action?.();
                  setIsOpen(false);
                }}
                data-testid={`${testId}-item-${item.label?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] ml-4" style={{ color: theme.ui.foregroundMuted }}>
                    {item.shortcut}
                  </span>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Theme Selector Component
function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, themeId, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <div
        className="px-2 py-1 text-xs cursor-pointer transition-colors rounded flex items-center gap-1"
        style={{
          color: theme.ui.foreground,
          backgroundColor: isOpen ? theme.ui.backgroundLight : "transparent",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.backgroundLight)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOpen ? theme.ui.backgroundLight : "transparent")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette size={12} />
        Theme
      </div>
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 rounded-md shadow-lg min-w-[160px] py-1 z-50"
          style={{
            backgroundColor: theme.ui.background,
            border: `1px solid ${theme.ui.border}`,
          }}
        >
          {appThemes.map((t) => (
            <div
              key={t.id}
              className="px-3 py-1.5 text-xs cursor-pointer flex items-center gap-2 transition-colors"
              style={{
                color: theme.ui.foreground,
                backgroundColor: themeId === t.id ? theme.ui.accent : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = themeId === t.id ? theme.ui.accent : "transparent")}
              onClick={() => {
                setTheme(t.id);
                setIsOpen(false);
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: t.editor.background,
                  border: `1px solid ${t.ui.border}`,
                }}
              />
              {t.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type FlowchartStatus = 'ok' | 'error' | 'loading' | 'hidden';

interface TitleBarProps {
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onExportWorkspace?: () => void;
  onImportWorkspace?: () => void;
  onOpenTerminal?: () => void;
  onToggleFlowchart?: () => void;
  isFlowchartVisible?: boolean;
  flowchartStatus?: FlowchartStatus;
  flowchartError?: string;
}

export function TitleBar({
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onExportWorkspace,
  onImportWorkspace,
  onOpenTerminal,
  onToggleFlowchart,
  isFlowchartVisible = false,
  flowchartStatus = 'hidden',
  flowchartError,
}: TitleBarProps) {
  const { theme } = useTheme();

  const fileMenuItems: MenuItem[] = [
    { label: "New File", action: onNewFile, shortcut: "Ctrl+N" },
    { divider: true },
    { label: "Open File...", action: onOpenFile, shortcut: "Ctrl+O" },
    { label: "Open Folder...", action: onOpenFolder, shortcut: "Ctrl+Shift+O" },
    { divider: true },
    { label: "Save", action: onSaveFile, shortcut: "Ctrl+S" },
    { divider: true },
    { label: "Export Workspace...", action: onExportWorkspace, shortcut: "Ctrl+E" },
    { label: "Import Workspace...", action: onImportWorkspace, shortcut: "Ctrl+I" },
  ];

  const editMenuItems: MenuItem[] = [
    { label: "Undo", shortcut: "Ctrl+Z" },
    { label: "Redo", shortcut: "Ctrl+Y" },
    { divider: true },
    { label: "Cut", shortcut: "Ctrl+X" },
    { label: "Copy", shortcut: "Ctrl+C" },
    { label: "Paste", shortcut: "Ctrl+V" },
  ];

  const viewMenuItems: MenuItem[] = [
    { label: "Toggle Terminal", action: onOpenTerminal, shortcut: "Ctrl+`" },
    { label: "Toggle Sidebar", shortcut: "Ctrl+B" },
  ];

  const helpMenuItems: MenuItem[] = [
    { label: "About C-Studio" },
    { label: "Documentation" },
  ];

  return (
    <div
      className="h-8 flex items-center px-2 select-none w-full draggable"
      style={{
        backgroundColor: theme.ui.backgroundDark,
        borderBottom: `1px solid ${theme.ui.border}`,
      }}
    >
      <div className="flex items-center gap-2 mr-4">
        <div
          className="w-4 h-4 rounded-sm flex items-center justify-center"
          style={{ backgroundColor: theme.ui.accent }}
        >
          <span className="text-[10px] font-bold text-white">C</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu label="File" items={fileMenuItems} />
        <DropdownMenu label="Edit" items={editMenuItems} />
        <DropdownMenu label="View" items={viewMenuItems} />
        <DropdownMenu label="Help" items={helpMenuItems} />
      </div>
      <div className="flex-1 text-center text-xs font-medium" style={{ color: theme.ui.foregroundMuted }}>
        C-Studio - v1.5.0
      </div>
      <div className="flex items-center gap-2 mr-2">
        {/* Flowchart Toggle Button */}
        <div
          className="px-2 py-1 text-xs cursor-pointer transition-colors rounded flex items-center gap-1"
          style={{ 
            color: isFlowchartVisible ? theme.ui.accent : theme.ui.foreground,
            backgroundColor: isFlowchartVisible ? theme.ui.backgroundLight : "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.backgroundLight)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isFlowchartVisible ? theme.ui.backgroundLight : "transparent")}
          onClick={onToggleFlowchart}
          title={"Afficher/Masquer l'organigramme (Ctrl+Shift+F)"}
          data-testid="btn-flowchart-toggle"
        >
          <GitBranch size={12} />
          Organigramme
          {/* Status indicator */}
          {isFlowchartVisible && flowchartStatus !== 'hidden' && (
            <span className="ml-1" title={flowchartError || ''}>
              {flowchartStatus === 'ok' && (
                <Check size={10} className="text-green-500" />
              )}
              {flowchartStatus === 'error' && (
                <AlertTriangle size={10} className="text-yellow-500" />
              )}
              {flowchartStatus === 'loading' && (
                <Loader2 size={10} className="animate-spin text-blue-400" />
              )}
            </span>
          )}
        </div>
        {/* Terminal Button */}
        <div
          className="px-2 py-1 text-xs cursor-pointer transition-colors rounded flex items-center gap-1"
          style={{ color: theme.ui.foreground }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.ui.backgroundLight)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          onClick={onOpenTerminal}
          title="Terminal (Ctrl+`)"
          data-testid="btn-terminal"
        >
          <Terminal size={12} />
          Terminal
        </div>
        <ThemeSelector />
      </div>
    </div>
  );
}
