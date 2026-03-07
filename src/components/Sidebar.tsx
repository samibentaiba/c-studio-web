"use client";
import React, { useState } from "react";
import {
  FileCode,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSystemItem } from "../types";
import { cn } from "../lib/utils";
import { useShortcut } from "../ShortcutContext";

interface SidebarProps {
  files: FileSystemItem[];
  activeFileId: string | null;
  onFileSelect: (file: FileSystemItem) => void;
  onFileCreate: (
    name: string,
    type: "file" | "folder",
    parentId?: string
  ) => void;
  onDelete: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onMoveFile: (sourceId: string, targetId: string | null) => void;
  onGenerateTest: (
    type:
      | "multi-main"
      | "nested"
      | "assets"
      | "complex-nested"
      | "multi-input"
      | "pointers"
      | "algo-factorial"
      | "algo-array-sum"
      | "algo-quadratic"
      | "algo-struct"
      | "algo-loops"
  ) => void;
  onRename: (id: string, newName: string) => void;
}

export function Sidebar({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onDelete,
  onToggleFolder,
  onMoveFile,
  onGenerateTest,
  onRename,
}: SidebarProps) {
  const [creatingState, setCreatingState] = useState<{
    type: "file" | "folder";
    parentId?: string;
  } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const { registerShortcut } = useShortcut();

  React.useEffect(() => {
    const unsubs = [
      registerShortcut("Ctrl+Shift+N", (e) => {
        e.preventDefault();
        setCreatingState({ type: "folder" });
      }),
      registerShortcut("Ctrl+Shift+E", (e) => {
        e.preventDefault();
        sidebarRef.current?.focus();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [registerShortcut]);

  // Sync active file with focus when active changes, but only if we don't have focus
  React.useEffect(() => {
    if (activeFileId) {
       setFocusedId(activeFileId);
    }
  }, [activeFileId]);

  // Recursively get visible items
  const getVisibleItems = (items: FileSystemItem[]): FileSystemItem[] => {
    let visible: FileSystemItem[] = [];
    for (const item of items) {
      visible.push(item);
      if (item.type === "folder" && item.isOpen && item.children) {
        visible = [...visible, ...getVisibleItems(item.children)];
      }
    }
    return visible;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If renaming or creating, don't interfere
    if (renamingId || creatingState) return;

    const visibleItems = getVisibleItems(files);
    const currentIndex = visibleItems.findIndex(item => item.id === focusedId);
    
    // If nothing focused, focus first item
    if (currentIndex === -1 && visibleItems.length > 0) {
        setFocusedId(visibleItems[0].id);
        return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentIndex < visibleItems.length - 1) {
        setFocusedId(visibleItems[currentIndex + 1].id);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentIndex > 0) {
        setFocusedId(visibleItems[currentIndex - 1].id);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = visibleItems[currentIndex];
      if (item) {
        if (item.type === "folder") {
          onToggleFolder(item.id);
        } else {
          onFileSelect(item);
        }
      }
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const item = visibleItems[currentIndex];
        if (item && item.type === "folder") {
            if (!item.isOpen) {
                onToggleFolder(item.id);
            } else {
                // Move to first child if available
                 if (currentIndex < visibleItems.length - 1) {
                    setFocusedId(visibleItems[currentIndex + 1].id);
                }
            }
        }
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const item = visibleItems[currentIndex];
        if (item) {
             if (item.type === "folder" && item.isOpen) {
                onToggleFolder(item.id);
            } else {
                // Move to parent
                // Find parent by structure
                const findParent = (items: FileSystemItem[], targetId: string, parent: FileSystemItem | null = null): FileSystemItem | null => {
                    for (const it of items) {
                        if (it.id === targetId) return parent;
                        if (it.children) {
                            const found = findParent(it.children, targetId, it);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const parent = findParent(files, item.id);
                if (parent) {
                    setFocusedId(parent.id);
                }
            }
        }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !creatingState) return;
    onFileCreate(newItemName, creatingState.type, creatingState.parentId);
    setNewItemName("");
    setCreatingState(null);
  };

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const renderTree = (items: FileSystemItem[], depth = 0) => {
    return items.map((item) => (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center justify-between px-2 py-1 group cursor-pointer select-none transition-colors",
            // Default state (inactive): Light gray text, dark hover bg
            "text-[#CCCCCC] hover:bg-[#2A2D2E] hover:text-white",
            // Active state: Darker gray bg, white text
            activeFileId === item.id && "bg-[#37373D] text-white",
            // Focused state outline
            focusedId === item.id && "ring-1 ring-inset ring-blue-500",
            depth > 0 && "ml-4" // Simple indentation
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", item.id);
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.type === "folder") {
              e.currentTarget.classList.add("bg-[#37373D]");
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove("bg-[#37373D]");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove("bg-[#37373D]");
            const sourceId = e.dataTransfer.getData("text/plain");
            if (item.type === "folder") {
              onMoveFile(sourceId, item.id);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (item.type === "folder") {
              onToggleFolder(item.id);
            } else {
              onFileSelect(item);
            }
          }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {item.type === "folder" ? (
              <>
                {item.isOpen ? (
                  <ChevronDown size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
                {item.isOpen ? (
                  <FolderOpen size={16} className="text-blue-400" />
                ) : (
                  <Folder size={16} className="text-blue-400" />
                )}
              </>
            ) : (
              <FileCode
                size={16}
                className="text-current opacity-70 group-hover:opacity-100"
              />
            )}
            {renamingId === item.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(item.id);
                  if (e.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                }}
                autoFocus
                className="text-sm bg-transparent border border-blue-500 rounded px-1 outline-none w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(item.id);
                  setRenameValue(item.name);
                }}
              >
                {item.name}
              </span>
            )}
          </div>

          <div className="flex items-center opacity-0 group-hover:opacity-100">
            {item.type === "folder" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingState({ type: "file", parentId: item.id });
                    if (!item.isOpen) onToggleFolder(item.id);
                  }}
                >
                  <FilePlus size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingState({ type: "folder", parentId: item.id });
                    if (!item.isOpen) onToggleFolder(item.id);
                  }}
                >
                  <FolderPlus size={12} />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>

        {/* Render Children */}
        {item.type === "folder" && item.isOpen && item.children && (
          <div>
            {renderTree(item.children, depth + 1)}
            {/* Input for creating new item inside this folder */}
            {creatingState?.parentId === item.id && (
              <form
                onSubmit={handleCreateSubmit}
                className="pr-2 py-1"
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                <div className="flex items-center gap-2">
                  {creatingState.type === "folder" ? (
                    <Folder size={16} className="text-blue-400" />
                  ) : (
                    <FileCode size={16} className="text-slate-400" />
                  )}
                  <Input
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onBlur={() => setCreatingState(null)}
                    className="h-6 text-xs py-0"
                    placeholder="Name..."
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div
      className="h-full w-full flex flex-col outline-none focus:ring-1 focus:ring-blue-500/50"
      style={{
        backgroundColor: "var(--theme-bg)",
        borderRight: "1px solid var(--theme-border)",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData("text/plain");
        onMoveFile(sourceId, null);
      }}
      tabIndex={0}
      ref={sidebarRef}
      onKeyDown={handleKeyDown}
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          C-Studio
        </h1>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCreatingState({ type: "file" })}
            title="New File (Ctrl+N)"
            data-testid="btn-new-file"
          >
            <FilePlus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCreatingState({ type: "folder" })}
            title="New Folder (Ctrl+Shift+N)"
            data-testid="btn-new-folder"
          >
            <FolderPlus size={16} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        {/* Root Level Input */}
        {creatingState && !creatingState.parentId && (
          <form onSubmit={handleCreateSubmit} className="px-2 mb-2">
            <div className="flex items-center gap-2">
              {creatingState.type === "folder" ? (
                <Folder size={16} className="text-blue-400" />
              ) : (
                <FileCode size={16} className="text-slate-400" />
              )}
              <Input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onBlur={() => setCreatingState(null)}
                className="h-6 text-xs py-0"
                placeholder="Name..."
              />
            </div>
          </form>
        )}
        {renderTree(files)}
      </ScrollArea>
      <div className="p-4 border-t border-white/10">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
          C Language
        </h3>
        <div className="flex flex-col gap-1 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("multi-main")}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
            Multi-Main
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("nested")}
          >
            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
            Nested Project
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("assets")}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Assets / I/O
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("pointers")}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Pointers & Libraries
          </Button>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
          USDB Algo
        </h3>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("algo-factorial")}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
            Factorial
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("algo-array-sum")}
          >
            <div className="w-2 h-2 rounded-full bg-teal-500 mr-2" />
            Array Sum
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("algo-quadratic")}
          >
            <div className="w-2 h-2 rounded-full bg-pink-500 mr-2" />
            Quadratic Equation
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("algo-struct")}
          >
            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
            Structures
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-7 bg-[#2A2D2E] border-white/5 hover:bg-[#37373D] hover:text-white text-[#CCCCCC]"
            onClick={() => onGenerateTest("algo-loops")}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Loops
          </Button>
        </div>
      </div>
    </div>
  );
}
