import { useState, useEffect } from "react";

export function useEditorState(activeFileId: string | null, setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>) {
  const [openTabs, setOpenTabs] = useState<string[]>(["1"]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  
  const [splitTabs, setSplitTabs] = useState<string[]>([]);
  const [activeSplitFileId, setActiveSplitFileId] = useState<string | null>(null);

  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [showOutputTab, setShowOutputTab] = useState(false);
  const [showTerminalTab, setShowTerminalTab] = useState(false);

  const [isFlowchartVisible, setIsFlowchartVisible] = useState(false);
  const [flowchartPanelWidth, setFlowchartPanelWidth] = useState(400);
  const [isResizingFlowchart, setIsResizingFlowchart] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("c-studio-sidebar-width");
      if (savedWidth) setSidebarWidth(parseInt(savedWidth, 10));

      const savedFlowWidth = localStorage.getItem("c-studio-flowchart-width");
      if (savedFlowWidth) setFlowchartPanelWidth(parseInt(savedFlowWidth, 10));
    }
  }, []);

  const handleTabClick = (fileId: string) => {
    setActiveFileId(fileId);
  };

  const handleTabClose = (fileId: string) => {
    const tabIndex = openTabs.indexOf(fileId);
    const newTabs = openTabs.filter((id) => id !== fileId);
    setOpenTabs(newTabs);

    if (activeFileId === fileId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveFileId(newTabs[newIndex]);
      } else {
        setActiveFileId(null);
      }
    }
  };

  const handleSplitRight = (fileId: string) => {
    if (!splitTabs.includes(fileId)) {
      setSplitTabs((prev) => [...prev, fileId]);
    }
    setActiveSplitFileId(fileId);
    setOpenTabs((prev) => prev.filter((id) => id !== fileId));
    if (activeFileId === fileId) {
      const remaining = openTabs.filter((id) => id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleSplitTabClick = (fileId: string) => {
    setActiveSplitFileId(fileId);
  };

  const handleSplitTabClose = (fileId: string) => {
    const tabIndex = splitTabs.indexOf(fileId);
    const newTabs = splitTabs.filter((id) => id !== fileId);
    setSplitTabs(newTabs);

    if (activeSplitFileId === fileId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveSplitFileId(newTabs[newIndex]);
      } else {
        setActiveSplitFileId(null);
      }
    }
  };

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(500, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (typeof window !== "undefined") {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        localStorage.setItem("c-studio-sidebar-width", sidebarWidth.toString());
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  return {
    openTabs,
    setOpenTabs,
    splitTabs,
    setSplitTabs,
    activeSplitFileId,
    setActiveSplitFileId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    isTerminalCollapsed,
    setIsTerminalCollapsed,
    showOutputTab,
    setShowOutputTab,
    showTerminalTab,
    setShowTerminalTab,
    isFlowchartVisible,
    setIsFlowchartVisible,
    flowchartPanelWidth,
    setFlowchartPanelWidth,
    isResizingFlowchart,
    setIsResizingFlowchart,
    handleTabClick,
    handleTabClose,
    handleSplitRight,
    handleSplitTabClick,
    handleSplitTabClose,
    handleSidebarResize,
  };
}
