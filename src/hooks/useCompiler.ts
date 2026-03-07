import { useState } from "react";
import { FileSystemItem } from "@/types";

interface UseCompilerProps {
  activeFile: FileSystemItem | null;
  files: FileSystemItem[];
  addTerminalLog: (type: any, content: string) => void;
  setShowTerminalTab: React.Dispatch<React.SetStateAction<boolean>>;
  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  translateAlgoToC: (source: string) => any;
}

export function useCompiler({
  activeFile,
  files,
  addTerminalLog,
  setShowTerminalTab,
  openTabs,
  setOpenTabs,
  setActiveFileId,
  translateAlgoToC,
}: UseCompilerProps) {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleRun = async () => {
    if (isCompiling) return;
    if (!activeFile) return;

    setIsCompiling(true);
    addTerminalLog("info", "Sending files to Web GCC (Piston API)...");
    
    // Show Output tab when running
    setShowTerminalTab(true);
    if (!openTabs.includes("terminal")) {
      setOpenTabs((prev) => [...prev, "terminal"]);
    }
    setActiveFileId("terminal");

    try {
      // Gather all .c and .h files to construct a multi-file Piston payload
      let codeToRun = activeFile.content || "";
      let payloadFiles: {name: string, content: string}[] = [];

      if (activeFile.name.endsWith('.algo')) {
         const transpile = translateAlgoToC(codeToRun);
         if (transpile.success && transpile.cCode) {
             payloadFiles = [{ name: "main.c", content: transpile.cCode }];
             addTerminalLog("info", "Successfully transpiled .algo to C before executing.");
         } else {
             addTerminalLog("error", "Failed to transpile Algo code. Cannot execute.");
             setIsCompiling(false);
             return;
         }
      } else {
         // Create a flat map of the virtual file system for quick path lookups
         const fileMap = new Map<string, string>();
         const buildFileMap = (items: FileSystemItem[], currentPath = "") => {
           for (const item of items) {
             const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
             if (item.type === "file" && item.content !== undefined) {
               fileMap.set(itemPath, item.content);
             } else if (item.type === "folder" && item.children) {
               buildFileMap(item.children, itemPath);
             }
           }
         };
         buildFileMap(files);

         // Find the active file's path in our map to resolve relative paths
         let activeFilePath = activeFile.name;
         for (const [path, content] of fileMap.entries()) {
             if (content === activeFile.content && path.endsWith(activeFile.name)) {
                 activeFilePath = path;
                 break;
             }
         }

         const activeFileDir = activeFilePath.includes('/') 
            ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/')) 
            : "";

         const visited = new Set<string>();
         const cFilesToCompile = new Set<string>();
         
         // Helper to safely resolve paths (handles "folder/file.h" and "../file.h")
         const resolvePath = (baseDir: string, relativePath: string) => {
             if (!relativePath.startsWith('.')) {
                 // For #include "math.h" -> if baseDir is "src", check "src/math.h". If not found, check root "math.h".
                 const localPath = baseDir ? `${baseDir}/${relativePath}` : relativePath;
                 if (fileMap.has(localPath)) return localPath;
                 return relativePath; 
             }
             
             const baseParts = baseDir ? baseDir.split('/') : [];
             const relParts = relativePath.split('/');
             
             for (const part of relParts) {
                 if (part === '.') continue;
                 if (part === '..') {
                     if (baseParts.length > 0) baseParts.pop();
                 } else {
                     baseParts.push(part);
                 }
             }
             return baseParts.join('/');
         };

         // Parse file for #include "..." statements and add it and dependencies
         const resolveDependencies = (filePath: string) => {
             if (visited.has(filePath)) return;
             visited.add(filePath);
             
             const content = fileMap.get(filePath);
             if (content === undefined) {
                 addTerminalLog("warning", `Included file not found in workspace: ${filePath}`);
                 return;
             }
             
             payloadFiles.push({ name: filePath, content });
             if (filePath.endsWith('.c') || filePath.endsWith('.cpp')) {
                 cFilesToCompile.add(filePath);
             }
             
             // Extract all #include "..." occurrences (handle both single and double quotes conceptually, though C is double)
             const includeRegex = /#include\s+["<]([^">]+)[">]/g;
             let match;
             const fileDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : "";
             
             while ((match = includeRegex.exec(content)) !== null) {
                 const headerPathRel = match[1];
                 const fullHeaderPath = resolvePath(fileDir, headerPathRel);
                 
                 // Process the header file if we have it in our virtual workspace (ignore stdlib headers)
                 if (fileMap.has(fullHeaderPath)) {
                     resolveDependencies(fullHeaderPath);
                     
                     // If there's a corresponding .c file for the header, we must find it and include it.
                     // The .c file might be anywhere, but it likely includes this exactly same header.
                     if (fullHeaderPath.endsWith('.h') || fullHeaderPath.endsWith('.hpp')) {
                         for (const [p, c] of fileMap.entries()) {
                             // Look for .c files we haven't compiled yet
                             if ((p.endsWith('.c') || p.endsWith('.cpp')) && !cFilesToCompile.has(p)) {
                                 // Check if this .c file includes the header we are tracking
                                 const cRegex = /#include\s+["<]([^">]+)[">]/g;
                                 let cMatch;
                                 const cDir = p.includes('/') ? p.substring(0, p.lastIndexOf('/')) : '';
                                 
                                 while ((cMatch = cRegex.exec(c)) !== null) {
                                     const incFromC = resolvePath(cDir, cMatch[1]);
                                     if (incFromC === fullHeaderPath) {
                                         // Found the C implementation for this header!
                                         resolveDependencies(p);
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
         };

         // Start dependency resolution from the entry point
         resolveDependencies(activeFilePath);

         if (payloadFiles.length === 0) {
             payloadFiles = [{ name: activeFile.name, content: codeToRun }];
         }
      }

      let emception = (window as any).emception;
          
      if (!emception) {
          addTerminalLog("info", "Initializing Clang WebAssembly Compiler (first run may download ~300MB bundle)...");
          // @ts-ignore
          const { default: Emception } = await import(/* webpackIgnore: true */ "/emception/emception.js");
          emception = new Emception();
          (window as any).emception = emception;
          
          emception.onstdout = () => {}; // Silence emcc verbose tracking unless debugging
          emception.onstderr = (str: string) => addTerminalLog("error", str);
          
          await emception.init();
          addTerminalLog("success", "Clang ready.");
      }

      const cFilesToCompile = [];
      for (const file of payloadFiles) {
          const safeName = file.name;
          const path = `/working/${safeName}`;
          
          const parts = safeName.split('/');
          if (parts.length > 1) {
              let currentDir = '/working';
              for (let i = 0; i < parts.length - 1; i++) {
                  currentDir += '/' + parts[i];
                  try {
                      emception.fileSystem.mkdir(currentDir);
                  } catch (e) {
                      // Ignore if the directory already exists
                  }
              }
          }

          await emception.fileSystem.writeFile(path, file.content);
          if (safeName.endsWith('.c') || safeName.endsWith('.cpp')) {
              cFilesToCompile.push(path);
          }
      }

      if (cFilesToCompile.length === 0) {
          addTerminalLog("error", "\\n[Execution Failed]: No C files found to compile.");
          setIsCompiling(false);
          return;
      }

      addTerminalLog("info", "Compiling...");
      // Add -I. to include paths from the working directory
      const cmd = `emcc -O2 -fexceptions -sEXIT_RUNTIME=1 -sSINGLE_FILE=1 -sUSE_CLOSURE_COMPILER=0 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME='CppAreaModule' -I/working ` + cFilesToCompile.join(' ') + ` -o main.js`;
      
      const result = await emception.run(cmd);
      
      if (result.returncode === 0) {
          addTerminalLog("success", "\\n[Execution Output]:");
          const content = new TextDecoder().decode(await emception.fileSystem.readFile("/working/main.js"));
          
          let runOutput = "";
          let runErr = "";
          
          try {
              const blob = new Blob([content], { type: "application/javascript" });
              const url = URL.createObjectURL(blob);
              
              // Use native browser ES module loading to evaluate the Emscripten payload safely
              const emModule = await import(/* webpackIgnore: true */ url);
              const Factory = emModule.default;
              
              if (!Factory) {
                  addTerminalLog("error", "Failed to extract WebAssembly ES6 Factory.");
                  setIsCompiling(false);
                  return;
              }

              let inputBuffer: number[] = [];
              await Factory({
                  print: (text: string) => { runOutput += text + "\\n"; },
                  printErr: (text: string) => { runErr += text + "\\n"; },
                  stdin: () => {
                      if (inputBuffer.length === 0) {
                          const result = window.prompt("Terminal Input requested by C Program:");
                          if (result === null) return null; // EOF
                          inputBuffer = result.split('').map((c: string) => c.charCodeAt(0));
                          inputBuffer.push(10); // newline
                      }
                      return inputBuffer.shift() ?? null;
                  }
              });
              
              if (runOutput.trim()) runOutput.trim().split("\\n").forEach((l: string) => addTerminalLog("success", l));
              if (runErr.trim()) runErr.trim().split("\\n").forEach((l: string) => addTerminalLog("error", l));
              if (!runOutput.trim() && !runErr.trim()) addTerminalLog("info", "\\n[Execution finished with no output]");
              
              // Clean up blob
              URL.revokeObjectURL(url);
          } catch (evalErr) {
              if (runOutput.trim()) runOutput.trim().split("\\n").forEach((l: string) => addTerminalLog("success", l));
              if (runErr.trim()) runErr.trim().split("\\n").forEach((l: string) => addTerminalLog("error", l));
              addTerminalLog("error", "\\n[Runtime Exception]: " + String(evalErr));
          }
      } else {
          addTerminalLog("error", "\\n[Compilation Failed]");
      }

    } catch (e) {
      addTerminalLog("error", "Execution Error: " + String(e));
    } finally {
      setIsCompiling(false);
    }
  };

  return { isCompiling, handleRun };
}
