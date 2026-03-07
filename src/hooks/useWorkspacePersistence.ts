import { useState, useEffect } from "react";
import { FileSystemItem, LogMessage } from "@/types";

interface UseWorkspacePersistenceProps {
  files: FileSystemItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileSystemItem[]>>;
  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeFileId: string | null;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  splitTabs: string[];
  setSplitTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeSplitFileId: string | null;
  setActiveSplitFileId: React.Dispatch<React.SetStateAction<string | null>>;
  sidebarWidth: number;
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
  showTerminalTab: boolean;
  setShowTerminalTab: React.Dispatch<React.SetStateAction<boolean>>;
  terminalLogs: LogMessage[];
  setTerminalLogs: React.Dispatch<React.SetStateAction<LogMessage[]>>;
}

export function useWorkspacePersistence({
  files,
  setFiles,
  openTabs,
  setOpenTabs,
  activeFileId,
  setActiveFileId,
  splitTabs,
  setSplitTabs,
  activeSplitFileId,
  setActiveSplitFileId,
  sidebarWidth,
  setSidebarWidth,
  showTerminalTab,
  setShowTerminalTab,
  terminalLogs,
  setTerminalLogs,
}: UseWorkspacePersistenceProps) {
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);

  useEffect(() => {
    const loadWorkspace = () => {
      try {
        const saved = localStorage.getItem("c-studio-workspace");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.files) setFiles(data.files);
          if (data.openTabs) setOpenTabs(data.openTabs);
          if (data.activeFileId) setActiveFileId(data.activeFileId);
          if (data.splitTabs) setSplitTabs(data.splitTabs);
          if (data.activeSplitFileId) setActiveSplitFileId(data.activeSplitFileId);
          if (data.sidebarWidth) setSidebarWidth(data.sidebarWidth);
          if (data.terminalLogs) setTerminalLogs(data.terminalLogs);
          if (data.showTerminalTab !== undefined) setShowTerminalTab(data.showTerminalTab);
        }
      } catch (e) {
        console.error("Failed to load workspace", e);
      } finally {
        setIsWorkspaceLoaded(true);
      }
    };
    loadWorkspace();
  }, [
    setFiles,
    setOpenTabs,
    setActiveFileId,
    setSplitTabs,
    setActiveSplitFileId,
    setSidebarWidth,
    setTerminalLogs,
    setShowTerminalTab,
  ]);

  useEffect(() => {
    if (!isWorkspaceLoaded) return;
    const saveTimer = setTimeout(() => {
      localStorage.setItem(
        "c-studio-workspace",
        JSON.stringify({
          files,
          openTabs,
          activeFileId,
          splitTabs,
          activeSplitFileId,
          sidebarWidth,
          showTerminalTab,
          terminalLogs: terminalLogs.slice(-100), // Keep the last 100 lines
        })
      );
    }, 1000); // Debounce to allow typing
    return () => clearTimeout(saveTimer);
  }, [
    files,
    openTabs,
    activeFileId,
    splitTabs,
    activeSplitFileId,
    sidebarWidth,
    showTerminalTab,
    terminalLogs,
    isWorkspaceLoaded,
  ]);

  return { isWorkspaceLoaded };
}
