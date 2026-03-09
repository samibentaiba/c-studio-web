import {
  useState,
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { FileSystemItem } from "@/types";

interface UseFileSystemProps {
  initialFiles: FileSystemItem[];
  activeFileId: string | null;
  setActiveFileId: Dispatch<SetStateAction<string | null>>;
  setOpenTabs: Dispatch<SetStateAction<string[]>>;
  addLog: (type: any, content: string) => void;
}

export function useFileSystem({
  initialFiles,
  activeFileId,
  setActiveFileId,
  setOpenTabs,
  addLog,
}: UseFileSystemProps) {
  const [files, setFiles] = useState<FileSystemItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cstudio-files");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved files", e);
        }
      }
    }
    return initialFiles;
  });

  // Auto-save whenever files change
  useEffect(() => {
    if (typeof window !== "undefined" && files !== initialFiles) {
      localStorage.setItem("cstudio-files", JSON.stringify(files));
    }
  }, [files, initialFiles]);

  const findFile = (
    items: FileSystemItem[],
    id: string,
  ): FileSystemItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findFile(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeFile = activeFileId ? findFile(files, activeFileId) : null;

  const handleFileCreate = useCallback(
    (name: string, type: "file" | "folder", parentId?: string) => {
      const newItem: FileSystemItem = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        type,
        content: type === "file" ? "// New file" : undefined,
        children: type === "folder" ? [] : undefined,
        isOpen: true,
      };

      setFiles((prev: FileSystemItem[]) => {
        if (!parentId) {
          return [...prev, newItem];
        } else {
          const updateChildren = (
            items: FileSystemItem[],
          ): FileSystemItem[] => {
            return items.map((item) => {
              if (item.id === parentId) {
                return {
                  ...item,
                  children: [...(item.children || []), newItem],
                  isOpen: true,
                };
              }
              if (item.children) {
                return { ...item, children: updateChildren(item.children) };
              }
              return item;
            });
          };
          return updateChildren(prev);
        }
      });

      if (type === "file") {
        setActiveFileId(newItem.id);
        setOpenTabs((prev: string[]) =>
          prev.includes(newItem.id) ? prev : [...prev, newItem.id],
        );
      }
    },
    [setActiveFileId, setOpenTabs],
  );

  const handleDelete = (id: string) => {
    const deleteFromTree = (items: FileSystemItem[]): FileSystemItem[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children ? deleteFromTree(item.children) : undefined,
        }));
    };
    setFiles(deleteFromTree(files));
    if (activeFileId === id) setActiveFileId(null);
    setOpenTabs((prev: string[]) =>
      prev.filter((tabId: string) => tabId !== id),
    );
  };

  const handleRename = (id: string, newName: string) => {
    const renameInTree = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, name: newName };
        }
        if (item.children) {
          return { ...item, children: renameInTree(item.children) };
        }
        return item;
      });
    };
    setFiles(renameInTree(files));
  };

  const handleMoveFile = (sourceId: string, targetId: string | null) => {
    if (sourceId === targetId) return;

    const sourceItem = findFile(files, sourceId);
    if (!sourceItem) return;

    if (targetId) {
      const isDescendant = (
        parent: FileSystemItem,
        target: string,
      ): boolean => {
        if (!parent.children) return false;
        for (const child of parent.children) {
          if (child.id === target) return true;
          if (isDescendant(child, target)) return true;
        }
        return false;
      };
      if (isDescendant(sourceItem, targetId)) return;
    }

    const removeFromTree = (items: FileSystemItem[]): FileSystemItem[] => {
      return items
        .filter((item) => item.id !== sourceId)
        .map((item) => ({
          ...item,
          children: item.children ? removeFromTree(item.children) : undefined,
        }));
    };

    let newFiles = removeFromTree(files);

    if (!targetId) {
      newFiles = [...newFiles, sourceItem];
    } else {
      const addToTree = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map((item) => {
          if (item.id === targetId) {
            return {
              ...item,
              children: [...(item.children || []), sourceItem],
              isOpen: true,
            };
          }
          if (item.children) {
            return { ...item, children: addToTree(item.children) };
          }
          return item;
        });
      };
      newFiles = addToTree(newFiles);
    }

    setFiles(newFiles);
  };

  const handleNewFile = useCallback(() => {
    handleFileCreate("untitled.c", "file");
  }, [handleFileCreate]);

  const handleContentChange = (content: string, targetId?: string) => {
    const idToUpdate = targetId || activeFileId;
    if (!idToUpdate) return;
    const updateContent = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.map((item) => {
        if (item.id === idToUpdate) {
          return { ...item, content };
        }
        if (item.children) {
          return { ...item, children: updateContent(item.children) };
        }
        return item;
      });
    };
    setFiles(updateContent(files));
  };

  const handleToggleFolder = (id: string) => {
    const toggle = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, isOpen: !item.isOpen };
        }
        if (item.children) {
          return { ...item, children: toggle(item.children) };
        }
        return item;
      });
    };
    setFiles(toggle(files));
  };

  return {
    files,
    setFiles,
    activeFile,
    findFile,
    handleFileCreate,
    handleDelete,
    handleRename,
    handleMoveFile,
    handleContentChange,
    handleNewFile,
    handleToggleFolder,
  };
}
