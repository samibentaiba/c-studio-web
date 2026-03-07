import { FileSystemItem } from "@/types";

interface UseTranslatorProps {
  files: FileSystemItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileSystemItem[]>>;
  activeFileId: string | null;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  addLog: (type: any, content: string) => void;
  findFile: (items: FileSystemItem[], id: string) => FileSystemItem | null;
  translateAlgoToC: (source: string) => any;
  translateCToAlgo: (source: string, workspace: Map<string, string>) => any;
}

export function useTranslator({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  setOpenTabs,
  addLog,
  findFile,
  translateAlgoToC,
  translateCToAlgo,
}: UseTranslatorProps) {

  const handleTranslate = () => {
    const file = findFile(files, activeFileId || "");
    if (!file || !file.content) {
      addLog("error", "No file selected to translate");
      return;
    }

    const newId = Math.random().toString(36).substr(2, 9);
    let newName: string;
    let newContent: string;

    if (file.name.endsWith(".algo")) {
      const result = translateAlgoToC(file.content);
      if (result.success && result.cCode) {
        const baseName = file.name.replace(/\.algo$/i, "");
        newName = `${baseName}_translated.c`;
        newContent = result.cCode;
        addLog("success", `Translated ${file.name} to ${newName}`);
      } else {
        addLog("error", "Cannot translate - code has errors:");
        for (const err of result.errors) {
          addLog("error", err.toString());
        }
        return;
      }
    } else if (file.name.endsWith(".c")) {
      const workspaceFiles = new Map<string, string>();
      const collectFiles = (items: FileSystemItem[], prefix = "") => {
        for (const item of items) {
          if (item.type === "file" && item.content) {
            const path = prefix ? `${prefix}/${item.name}` : item.name;
            workspaceFiles.set(path, item.content);
            workspaceFiles.set(item.name, item.content);
          } else if (item.type === "folder" && item.children) {
            collectFiles(
              item.children,
              prefix ? `${prefix}/${item.name}` : item.name
            );
          }
        }
      };
      collectFiles(files);

      const result = translateCToAlgo(file.content, workspaceFiles);
      const baseName = file.name.replace(/\.c$/i, "");
      newName = `${baseName}_translated.algo`;
      newContent = result.algoCode;

      if (result.warnings && result.warnings.length > 0) {
        addLog("warning", "Translation warnings:");
        for (const w of result.warnings) {
          addLog("warning", w);
        }
      }
      addLog("success", `Translated ${file.name} to Algo`);
    } else {
      addLog("error", "Can only translate .algo or .c files");
      return;
    }

    const newFile: FileSystemItem = {
      id: newId,
      name: newName,
      type: "file",
      content: newContent,
    };

    setFiles([...files, newFile]);
    setOpenTabs((prev) => [...prev, newId]);
    setActiveFileId(newId);
  };

  return { handleTranslate };
}
