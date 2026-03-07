"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FlowchartNode,
  FlowchartEdge,
  FlowchartSet,
  generateAllFlowcharts,
} from "../usdb-compiler/flowchart-generator";
import { useShortcut } from "../ShortcutContext";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Grid,
  ChevronDown,
  Plus,
  Printer,
  FileInput,
  ArrowRight,
  GitBranch,
  Repeat,
  Phone,
  CornerDownLeft,
  Box,
  Code,
} from "lucide-react";

// Instruction types for visual editing
type InstructionType = "print" | "read" | "assignment" | "if" | "while" | "dowhile" | "for" | "switch" | "call" | "return" | "type" | "function" | "procedure";

interface InstructionOption {
  type: InstructionType;
  label: string;
  icon: React.ReactNode;
  color: string;
  shortcut?: string;
}

interface FlowchartPanelProps {
  source: string;
  language: "algo" | "c";
  onParseError?: (error: string) => void;
  onParseSuccess?: () => void;
  onCodeChange?: (newCode: string) => void;
}

// ==================== THEMES ====================

interface FlowchartTheme {
  id: string;
  name: string;
  isDark: boolean;
  background: string;
  gridColor: string;
  nodeColors: {
    start: { fill: string; stroke: string; text: string };
    end: { fill: string; stroke: string; text: string };
    process: { fill: string; stroke: string; text: string };
    decision: { fill: string; stroke: string; text: string };
    input: { fill: string; stroke: string; text: string };
    output: { fill: string; stroke: string; text: string };
    connector: { fill: string; stroke: string };
    declaration: { fill: string; stroke: string; text: string };
    call: { fill: string; stroke: string; text: string };
  };
  edgeColor: {
    normal: string;
    true: string;
    false: string;
    loop: string;
  };
  fontFamily: string;
}

const THEMES: Record<string, FlowchartTheme> = {
  dark: {
    id: "dark",
    name: "C-Studio Dark",
    isDark: true,
    background: "#1e1e1e",
    gridColor: "#333333",
    nodeColors: {
      start: { fill: "#059669", stroke: "#34d399", text: "#ffffff" },
      end: { fill: "#b91c1c", stroke: "#f87171", text: "#ffffff" },
      process: { fill: "#2563eb", stroke: "#60a5fa", text: "#ffffff" },
      decision: { fill: "#d97706", stroke: "#fbbf24", text: "#ffffff" },
      input: { fill: "#7c3aed", stroke: "#a78bfa", text: "#ffffff" },
      output: { fill: "#0891b2", stroke: "#22d3ee", text: "#ffffff" },
      connector: { fill: "#4b5563", stroke: "#9ca3af" },
      declaration: { fill: "#ea580c", stroke: "#fdba74", text: "#ffffff" },
      call: { fill: "#db2777", stroke: "#f472b6", text: "#ffffff" },
    },
    edgeColor: {
      normal: "#9ca3af",
      true: "#4ade80",
      false: "#f87171",
      loop: "#a78bfa",
    },
    fontFamily: 'Consolas, monospace',
  },
  flowgorithm: {
    id: "flowgorithm",
    name: "Flowgorithm Classic",
    isDark: false,
    background: "#ffffff",
    gridColor: "#e5e7eb",
    nodeColors: {
      start: { fill: "#fce7f3", stroke: "#db2777", text: "#000000" },
      end: { fill: "#fce7f3", stroke: "#db2777", text: "#000000" },
      process: { fill: "#fef9c3", stroke: "#d97706", text: "#000000" }, // Yellow
      decision: { fill: "#ffedd5", stroke: "#ea580c", text: "#000000" }, // Orange
      input: { fill: "#dbeafe", stroke: "#2563eb", text: "#000000" }, // Blue
      output: { fill: "#dcfce7", stroke: "#16a34a", text: "#000000" }, // Green
      connector: { fill: "#9ca3af", stroke: "#4b5563" },
      declaration: { fill: "#fef9c3", stroke: "#d97706", text: "#000000" }, // Yellow
      call: { fill: "#fef9c3", stroke: "#d97706", text: "#000000" }, // Yellow
    },
    edgeColor: {
      normal: "#000000",
      true: "#16a34a",
      false: "#dc2626",
      loop: "#000000",
    },
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
};

// ==================== COMPONENT ====================

export const FlowchartPanel: React.FC<FlowchartPanelProps> = ({
  source,
  language,
  onParseError,
  onParseSuccess,
  onCodeChange,
}) => {
  const [data, setData] = useState<FlowchartSet | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string>("main");
  const [error, setError] = useState<string | null>(null);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Default to Dark theme as per user request
  const [currentThemeId, setCurrentThemeId] = useState<string>("dark");
  const [showGrid, setShowGrid] = useState(true);
  
  // Visual Editor State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [pendingInstructionType, setPendingInstructionType] = useState<InstructionType | null>(null);
  const [instructionInput, setInstructionInput] = useState("");
  
  // Custom instruction fields
  const [assignTarget, setAssignTarget] = useState("");
  const [assignValue, setAssignValue] = useState("");
  const [forVar, setForVar] = useState("");
  const [forFrom, setForFrom] = useState("");
  const [forTo, setForTo] = useState("");
  const [forStep, setForStep] = useState("");
  const [switchExpr, setSwitchExpr] = useState("");
  const [switchCases, setSwitchCases] = useState<{value: string, action: string}[]>([{value: "", action: ""}]);
  const [switchDefault, setSwitchDefault] = useState("");
  const [callName, setCallName] = useState("");
  const [callArgs, setCallArgs] = useState("");
  
  // Type form state
  const [typeName, setTypeName] = useState("");
  const [typeCategory, setTypeCategory] = useState<"struct" | "alias">("struct");
  const [typeAliasDefinition, setTypeAliasDefinition] = useState("");
  const [typeFields, setTypeFields] = useState<{name: string, fieldType: string}[]>([{name: "", fieldType: ""}]);
  
  // Function form state
  const [funcName, setFuncName] = useState("");
  const [funcParams, setFuncParams] = useState<{name: string, paramType: string}[]>([{name: "", paramType: ""}]);
  const [funcReturnType, setFuncReturnType] = useState("");
  
  // Procedure form state
  const [procName, setProcName] = useState("");
  const [procParams, setProcParams] = useState<{name: string, paramType: string}[]>([{name: "", paramType: ""}]);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowchartNode | null>(null);
  const [editInput, setEditInput] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[currentThemeId];
  
  // Instruction options for toolbar
  const instructionOptions: InstructionOption[] = [
    { type: "print", label: "Print", icon: <Printer size={14} />, color: "#0891b2", shortcut: "P" },
    { type: "read", label: "Read", icon: <FileInput size={14} />, color: "#7c3aed", shortcut: "R" },
    { type: "assignment", label: "Assign", icon: <ArrowRight size={14} />, color: "#2563eb", shortcut: "A" },
    { type: "if", label: "If", icon: <GitBranch size={14} />, color: "#d97706", shortcut: "I" },
    { type: "while", label: "While", icon: <Repeat size={14} />, color: "#16a34a", shortcut: "W" },
    { type: "dowhile", label: "Do-While", icon: <Repeat size={14} />, color: "#15803d", shortcut: "D" },
    { type: "for", label: "For", icon: <Repeat size={14} />, color: "#059669", shortcut: "F" },
    { type: "switch", label: "Switch", icon: <GitBranch size={14} />, color: "#ea580c", shortcut: "Shift+S" },
    { type: "call", label: "Call", icon: <Phone size={14} />, color: "#db2777", shortcut: "Shift+C" },
    { type: "return", label: "Return", icon: <CornerDownLeft size={14} />, color: "#b91c1c", shortcut: "Enter" },
    { type: "type", label: "Type", icon: <Box size={14} />, color: "#7c3aed", shortcut: "T" },
    { type: "function", label: "Function", icon: <Code size={14} />, color: "#0891b2", shortcut: "Shift+F" },
    { type: "procedure", label: "Procedure", icon: <Code size={14} />, color: "#0d9488", shortcut: "Shift+P" },
  ];

  // Debounced flowchart generation
  const generateFlowchartDebounced = useCallback(
    (src: string, lang: "algo" | "c") => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const result: FlowchartSet = generateAllFlowcharts(src, lang);

        if (result.success) {
          setData(result);
          setError(null);
          onParseSuccess?.();
          
          if (selectedChartId !== "main" && 
              !result.subroutines.find(s => s.name === selectedChartId)) {
            setSelectedChartId("main");
          }
        } else {
          setError(result.error || "Erreur inconnue");
          onParseError?.(result.error || "Erreur inconnue");
        }
      }, 300);
    },
    [onParseError, onParseSuccess, selectedChartId]
  );

  useEffect(() => {
    if (source.trim()) {
      generateFlowchartDebounced(source, language);
    }
  }, [source, language, generateFlowchartDebounced]);

  // Shortcuts
  const { registerShortcut, setActiveScope } = useShortcut();

  const initiateInstruction = useCallback((type: InstructionType) => {
    const isGlobal = ["type", "function", "procedure"].includes(type);
    if (isGlobal || selectedNodeId || selectedEdgeId) {
      setPendingInstructionType(type);
      setInstructionInput("");
      setShowInstructionModal(true);
    } else {
      // Optional: notification if nothing selected
    }
  }, [selectedNodeId, selectedEdgeId]);

  useEffect(() => {
    // When flowchart is active (or mouse over?), set scope
    // Ideally we assume if this component is mounted and visible, we want shortcuts.
    // However, FlowchartPanel is likely always mounted but maybe hidden?
    // TitleBar has "isFlowchartVisible". If FlowchartPanel is only rendered when visible, then:
    setActiveScope("flowchart");
    return () => setActiveScope("global");
  }, [setActiveScope]);



  // Focus input when modal opens
  useEffect(() => {
    if (showInstructionModal && inputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [showInstructionModal]);

  // Focus edit input when edit modal opens
  useEffect(() => {
    if (showEditModal && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 50);
    }
  }, [showEditModal]);

  // Determine which flowchart to display
  const displayFlowchart = useMemo(() => {
    if (!data) return null;
    if (selectedChartId === "main") return data.main;
    return data.subroutines.find(s => s.name === selectedChartId) || data.main;
  }, [data, selectedChartId]);

  // Reset view when switching charts
  useEffect(() => {
    if (displayFlowchart && containerRef.current) {
      // Small delay to ensure container is measurable
      const timer = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const padding = 60;
        const availWidth = container.clientWidth - padding;
        const availHeight = container.clientHeight - padding;
        
        // Scale to fit, capped at 1.0 (100%)
        const scaleX = availWidth / displayFlowchart.width;
        const scaleY = availHeight / displayFlowchart.height;
        const fitZoom = Math.min(Math.min(scaleX, scaleY), 1.0);
        
        setZoom(fitZoom > 0.1 ? fitZoom : 0.5);
        
        // Center the flowchart
        const chartWidth = displayFlowchart.width * fitZoom;
        const chartHeight = displayFlowchart.height * fitZoom;
        const panX = Math.max((availWidth - chartWidth) / 2, 10);
        const panY = Math.max((availHeight - chartHeight) / 2, 10);
        setPan({ x: panX, y: panY });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [displayFlowchart]);

  // Handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.1));
  const handleFitToView = () => {
    if (!displayFlowchart || !containerRef.current) return;
    const container = containerRef.current;
    const scaleX = (container.clientWidth - 40) / displayFlowchart.width;
    const scaleY = (container.clientHeight - 80) / displayFlowchart.height;
    setZoom(Math.min(Math.min(scaleX, scaleY), 1.2));
    setPan({ x: 20, y: 20 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.1, Math.min(4, z + delta)));
    } else {
      setPan(p => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleExportPNG = () => {
    const svgElement = containerRef.current?.querySelector("svg");
    if (!svgElement) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svgElement.clientWidth; // Or use viewBox
      canvas.height = svgElement.clientHeight;
      if (ctx) {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const link = document.createElement("a");
      link.download = `flowchart_${displayFlowchart?.name || 'main'}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  useEffect(() => {
    const unsubs = [
      registerShortcut("p", () => initiateInstruction("print"), "flowchart"),
      registerShortcut("r", () => initiateInstruction("read"), "flowchart"),
      registerShortcut("a", () => initiateInstruction("assignment"), "flowchart"),
      registerShortcut("i", () => initiateInstruction("if"), "flowchart"),
      registerShortcut("w", () => initiateInstruction("while"), "flowchart"),
      registerShortcut("d", () => initiateInstruction("dowhile"), "flowchart"),
      registerShortcut("f", () => initiateInstruction("for"), "flowchart"),
      registerShortcut("Shift+s", () => initiateInstruction("switch"), "flowchart"),
      registerShortcut("Shift+c", () => initiateInstruction("call"), "flowchart"),
      registerShortcut("Enter", () => initiateInstruction("return"), "flowchart"),
      registerShortcut("t", () => initiateInstruction("type"), "flowchart"),
      registerShortcut("Shift+f", () => initiateInstruction("function"), "flowchart"),
      registerShortcut("Shift+p", () => initiateInstruction("procedure"), "flowchart"),
      registerShortcut("g", () => setShowGrid((p) => !p), "flowchart"),
      registerShortcut("Ctrl+0", handleFitToView, "flowchart"),
      registerShortcut("Ctrl+=", (e) => { e.preventDefault(); handleZoomIn(); }, "flowchart"),
      registerShortcut("Ctrl+-", (e) => { e.preventDefault(); handleZoomOut(); }, "flowchart"),
      registerShortcut("Escape", () => {
        setShowInstructionModal(false);
        setShowEditModal(false);
      }, "flowchart"),
    ];
    return () => unsubs.forEach(u => u());
  }, [initiateInstruction, handleFitToView, registerShortcut]);

  // --- Keyboard Navigation ---
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If modal is open, don't navigate
    if (showInstructionModal || showEditModal) return;
    
    // Check if flowchart is focused (simple check if active element is container or within)
    // We'll rely on the container having focus via tabIndex
    
    if (!displayFlowchart) return;
    const { nodes, edges } = displayFlowchart;

    const getOutgoingEdges = (nodeId: string) => edges.filter(ed => ed.from === nodeId);
    const getIncomingEdges = (nodeId: string) => edges.filter(ed => ed.to === nodeId);

    if (!selectedNodeId && !selectedEdgeId) {
       // If nothing selected, select Start node on ArrowDown/Up/Right/Left
       if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) {
         e.preventDefault();
         const startNode = nodes.find(n => n.type === "start");
         if (startNode) setSelectedNodeId(startNode.id);
       }
       return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectedNodeId) {
        // From Node -> Go to first outgoing edge
        const outgoing = getOutgoingEdges(selectedNodeId);
        if (outgoing.length > 0) {
            setSelectedNodeId(null);
            setSelectedEdgeId(outgoing[0].id);
        }
      } else if (selectedEdgeId) {
        // From Edge -> Go to target Node
        const edge = edges.find(ed => ed.id === selectedEdgeId);
        if (edge) {
            setSelectedEdgeId(null);
            setSelectedNodeId(edge.to);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedNodeId) {
         // From Node -> Go to first incoming edge
         const incoming = getIncomingEdges(selectedNodeId);
         if (incoming.length > 0) {
            setSelectedNodeId(null);
            setSelectedEdgeId(incoming[0].id);
         }
      } else if (selectedEdgeId) {
          // From Edge -> Go to source Node
          const edge = edges.find(ed => ed.id === selectedEdgeId);
          if (edge) {
              setSelectedEdgeId(null);
              setSelectedNodeId(edge.from);
          }
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Cycle active edges (siblings)
        if (selectedEdgeId) {
             e.preventDefault();
             const edge = edges.find(ed => ed.id === selectedEdgeId);
             if (edge) {
                 const siblings = getOutgoingEdges(edge.from);
                 if (siblings.length > 1) {
                     const idx = siblings.findIndex(s => s.id === selectedEdgeId);
                     const nextIdx = e.key === "ArrowRight" 
                        ? (idx + 1) % siblings.length 
                        : (idx - 1 + siblings.length) % siblings.length;
                     setSelectedEdgeId(siblings[nextIdx].id);
                 }
             }
        }
    }
  };

  // --- Render Functions ---



  const confirmAddInstruction = () => {
       let code = "";
       let isValid = false;
       
       switch (pendingInstructionType) {
          case "print": 
            if (instructionInput.trim()) { code = `    PRINT(${instructionInput})`; isValid = true; }
            break;
          case "read": 
            if (instructionInput.trim()) { code = `    SCAN(${instructionInput})`; isValid = true; }
            break;
          case "assignment": 
            if (assignTarget.trim() && assignValue.trim()) { code = `    ${assignTarget} <- ${assignValue}`; isValid = true; }
            break;
          case "if": 
            if (instructionInput.trim()) { code = `    IF (${instructionInput}) THEN\n        // TODO\n    END_IF`; isValid = true; }
            break;
          case "while": 
            if (instructionInput.trim()) { code = `    WHILE (${instructionInput}) DO\n        // TODO\n    END_WHILE`; isValid = true; }
            break;
          case "dowhile": 
            if (instructionInput.trim()) { code = `    DO\n        // TODO\n    WHILE (${instructionInput})`; isValid = true; }
            break;
          case "for": 
            if (forVar.trim() && forFrom.trim() && forTo.trim()) {
              const step = forStep.trim() ? ` STEP ${forStep}` : "";
              code = `    FOR ${forVar} FROM ${forFrom} TO ${forTo}${step} DO\n        // TODO\n    END_FOR`;
              isValid = true;
            }
            break;
          case "switch": 
            if (switchExpr.trim()) {
              let casesCode = "";
              switchCases.forEach(c => {
                if (c.value.trim()) {
                  casesCode += `        CASE ${c.value}: ${c.action || "// TODO"}\n`;
                }
              });
              if (switchDefault.trim()) {
                casesCode += `        DEFAULT: ${switchDefault}\n`;
              } else {
                casesCode += `        DEFAULT: // TODO\n`;
              }
              code = `    SWITCH (${switchExpr})\n${casesCode}    END_SWITCH`;
              isValid = true;
            }
            break;
          case "call": 
            if (callName.trim()) { code = `    ${callName}(${callArgs})`; isValid = true; }
            break;
          case "return": 
            if (instructionInput.trim()) { code = `    RETURN(${instructionInput})`; isValid = true; }
            break;
          case "type":
            if (typeName.trim()) {
              if (typeCategory === "alias" && typeAliasDefinition.trim()) {
                code = `TYPE ${typeName} : ${typeAliasDefinition}`;
                isValid = true;
              } else if (typeCategory === "struct") {
                const fields = typeFields
                  .filter(f => f.name.trim() && f.fieldType.trim())
                  .map(f => `    ${f.name} : ${f.fieldType}`)
                  .join("\n");
                code = `TYPE ${typeName} : STRUCT\n${fields}\nEND_STRUCT`;
                isValid = true;
              }
            }
            break;
          case "function":  
            if (funcName.trim() && funcReturnType.trim()) {
                const params = funcParams
                  .filter(p => p.name.trim() && p.paramType.trim())
                  .map(p => `${p.name} : ${p.paramType}`)
                  .join(", ");
                code = `FUNCTION ${funcName}(${params}) : ${funcReturnType}\nVAR\nBEGIN\n    // TODO\nEND`;
                isValid = true;
            }
            break;
          case "procedure":
            if (procName.trim()) {
                const params = procParams
                  .filter(p => p.name.trim() && p.paramType.trim())
                  .map(p => `${p.name} : ${p.paramType}`)
                  .join(", ");
                code = `PROCEDURE ${procName}(${params})\nVAR\nBEGIN\n    // TODO\nEND`;
                isValid = true;
            }
            break;
        }
        
        // Insert code into source
        if (isValid && onCodeChange && code) {
          if (pendingInstructionType === "function" || pendingInstructionType === "procedure") {
            // Handle C files
            if (language === "c") {
                let cCode = "";
                // Helper to map type names to C types
                const mapTypeToC = (t: string) => {
                    t = t.trim().toUpperCase();
                    if (t === "INTEGER") return "int";
                    if (t === "REAL") return "float"; // Default to float or double?
                    if (t === "BOOLEAN") return "bool";
                    if (t === "CHAR") return "char";
                    if (t === "VOID") return "void";
                    if (t === "STRING") return "char*";
                    return "int"; // fallback
                };

                if (pendingInstructionType === "function") {
                    const cReturnType = mapTypeToC(funcReturnType || "INTEGER");
                    // Parse params from string "name : TYPE, name2 : TYPE"
                    // Wait, funcParams is string. We need to parse it if it was constructed from fields.
                    // But here 'params' (line 580) is a string constructed from `funcParams` inputs.
                    // Let's re-construct params properly for C.
                    // Access `funcParams` state variable which is {name, paramType}[]
                    const cParams = funcParams
                        .filter(p => p.name.trim() && p.paramType.trim())
                        .map(p => `${mapTypeToC(p.paramType)} ${p.name}`)
                        .join(", ");
                    
                    cCode = `\n${cReturnType} ${funcName}(${cParams}) {\n    // TODO\n    return 0;\n}`;
                } else {
                    // Procedure -> void function
                    const cParams = procParams
                        .filter(p => p.name.trim() && p.paramType.trim())
                        .map(p => `${mapTypeToC(p.paramType)} ${p.name}`)
                        .join(", ");
                    cCode = `\nvoid ${procName}(${cParams}) {\n    // TODO\n}`;
                }
                
                // Append C code
                onCodeChange(source + "\n" + cCode);
            } else {
                // Algo (existing behavior)
                onCodeChange(source + "\n\n" + code);
            }
          } else if (pendingInstructionType === "type") {
             // ... existing logic for type ...
             const algoMatch = source.match(/^ALGORITHM\s+\w+/m);
             if (algoMatch && algoMatch.index !== undefined) {
               const insertPos = algoMatch.index + algoMatch[0].length;
               const newSource = source.slice(0, insertPos) + "\n\n" + code + source.slice(insertPos);
               onCodeChange(newSource);
             } else {
               onCodeChange(code + "\n\n" + source);
             }
          } else if (selectedEdgeId && data && data.main) {
             // Find edge and source node
             const edge = data.main.edges.find(e => e.id === selectedEdgeId);
             const sourceNode = edge ? data.main.nodes.find(n => n.id === edge.from) : null;
             
             if (sourceNode && sourceNode.span) {
                let insertIndex = sourceNode.span.end.line; // 1-based line number (insert after)
                
                // If entering a block (True edge), insert after the header (start line)
                if (edge?.type === "true" || edge?.type === "loop") {
                   insertIndex = sourceNode.span.start.line;
                }
                
                // Handle C file mapping
                if (language === "c" && data.sourceMap) {
                   // Map Algo line to C line
                   // insertIndex is 1-based, sourceMap is 0-based array of 0-based C lines
                   const algoLineIdx = Math.max(0, insertIndex - 1);
                   let cLineIdx = data.sourceMap[algoLineIdx];
                   
                   // Fallback if map is missing for that line (binary search or nearest)
                   if (cLineIdx === undefined) {
                      // Find nearest valid mapping
                      for (let i = algoLineIdx; i >= 0; i--) {
                        if (data.sourceMap[i] !== undefined) { cLineIdx = data.sourceMap[i]; break; }
                      }
                      if (cLineIdx === undefined) cLineIdx = 0;
                   }
                   
                   // Construct C code
                   let cCode = "";
                   const algoComment = `// [ALGO] ${code.replace(/\n/g, " ").trim()}`;
                   
                   switch(pendingInstructionType) {
                      case "print": cCode = `    printf(${instructionInput.includes('"') ? instructionInput : `"%d\\n", ${instructionInput}`});`; break;
                      case "read": cCode = `    scanf("%d", &${instructionInput});`; break;
                      case "assignment": cCode = `    ${assignTarget} = ${assignValue};`; break;
                      case "if": cCode = `    if (${instructionInput}) {\n        // TODO\n    }`; break;
                      case "while": cCode = `    while (${instructionInput}) {\n        // TODO\n    }`; break;
                      case "dowhile": cCode = `    do {\n        // TODO\n    } while (${instructionInput});`; break;
                      case "for": cCode = `    for (${forVar} = ${forFrom}; ${forVar} <= ${forTo}; ${forVar} += ${forStep || 1}) {\n        // TODO\n    }`; break;
                      case "switch": cCode = `    switch (${switchExpr}) {\n        // TODO\n    }`; break;
                      case "call": cCode = `    ${callName}(${callArgs});`; break;
                      case "return": cCode = `    return ${instructionInput};`; break;
                      default: cCode = `    // ${code}`;
                   }
                   
                   const lines = source.split("\n");
                   // Insert after the mapped line
                   lines.splice(cLineIdx + 1, 0, algoComment, cCode);
                   onCodeChange(lines.join("\n"));
                   return;
                }
                
                // Default Algo insertion
                const lines = source.split("\n");
                // insertIndex is 1-based. To insert after, index = insertIndex
                if (insertIndex >= lines.length) {
                   lines.push(code);
                } else {
                   lines.splice(insertIndex, 0, code);
                }
                onCodeChange(lines.join("\n"));
                return;
             }

             // Fallback if no span
             const endMatch = source.match(/^END\.\s*$/m);
             if (endMatch && endMatch.index !== undefined) {
               const newSource = source.slice(0, endMatch.index) + code + "\n" + source.slice(endMatch.index);
               onCodeChange(newSource);
             } else {
               onCodeChange(source + "\n" + code);
             }
          } else {
             // Global Append Fallback
             const endMatch = source.match(/^END\.\s*$/m);
             if (endMatch && endMatch.index !== undefined) {
               const newSource = source.slice(0, endMatch.index) + code + "\n" + source.slice(endMatch.index);
               onCodeChange(newSource);
             } else {
               onCodeChange(source + "\n" + code);
             }
          }
        }
        
        setShowInstructionModal(false);
        setPendingInstructionType(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        // Reset all fields
        setInstructionInput("");
        setAssignTarget("");
        setAssignValue("");
        setForVar("");
        setForFrom("");
        setForTo("");
        setForStep("");
        setSwitchExpr("");
        setSwitchCases([{value: "", action: ""}]);
        setSwitchDefault("");
        setCallName("");
        setCallArgs("");
        setTypeName("");
        setTypeCategory("struct");
        setTypeAliasDefinition("");
        setTypeFields([{name: "", fieldType: ""}]);
        setFuncName("");
        setFuncParams([{name: "", paramType: ""}]);
        setFuncReturnType("");
        setProcName("");
        setProcParams([{name: "", paramType: ""}]);
  };

  const renderStartEndNode = (node: FlowchartNode, isStart: boolean) => {
    const style = isStart ? theme.nodeColors.start : theme.nodeColors.end;
    return (
      <g key={node.id}>
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.height / 2}
          ry={node.height / 2}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={style.text}
          fontSize={12}
          fontWeight={600}
          fontFamily={theme.fontFamily}
        >
          {node.label}
        </text>
      </g>
    );
  };

  const renderRectNode = (node: FlowchartNode, type: 'process' | 'declaration' | 'call') => {
    const style = theme.nodeColors[type];
    const isCall = type === 'call';
    return (
      <g key={node.id}>
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
          rx={2}
          ry={2}
        />
        {isCall && (
          <>
            <line 
              x1={node.x + 10} y1={node.y} 
              x2={node.x + 10} y2={node.y + node.height}
              stroke={style.stroke} strokeWidth={2}
            />
            <line 
              x1={node.x + node.width - 10} y1={node.y} 
              x2={node.x + node.width - 10} y2={node.y + node.height}
              stroke={style.stroke} strokeWidth={2}
            />
          </>
        )}
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={style.text}
          fontSize={11}
          fontFamily={theme.fontFamily}
        >
          {node.label}
        </text>
      </g>
    );
  };

  const renderDecisionNode = (node: FlowchartNode) => {
    const style = theme.nodeColors.decision;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const hw = node.width / 2;
    const hh = node.height / 2;
    const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
    
    return (
      <g key={node.id}>
        <polygon
          points={points}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={style.text}
          fontSize={10}
          fontWeight={500}
          fontFamily={theme.fontFamily}
        >
          {node.label}
        </text>
      </g>
    );
  };

  const renderInputOutputNode = (node: FlowchartNode, isInput: boolean) => {
    const style = isInput ? theme.nodeColors.input : theme.nodeColors.output;
    const skew = 20;
    const points = `
      ${node.x + skew},${node.y}
      ${node.x + node.width},${node.y}
      ${node.x + node.width - skew},${node.y + node.height}
      ${node.x},${node.y + node.height}
    `;
    
    return (
      <g key={node.id}>
        <polygon
          points={points}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={style.text}
          fontSize={11}
          fontFamily={theme.fontFamily}
        >
          {node.label}
        </text>
      </g>
    );
  };

  const renderConnector = (node: FlowchartNode) => {
    const style = theme.nodeColors.connector;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const r = Math.min(node.width, node.height) / 2;
    
    return (
      <g key={node.id}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
      </g>
    );
  };

  const renderNode = (node: FlowchartNode) => {
    const isSelected = selectedNodeId === node.id;
    
    const nodeContent = (() => {
      switch (node.type) {
        case "start": return renderStartEndNode(node, true);
        case "end": return renderStartEndNode(node, false);
        case "process": return renderRectNode(node, 'process');
        case "declaration": return renderRectNode(node, 'declaration');
        case "call": return renderRectNode(node, 'call');
        case "decision": return renderDecisionNode(node);
        case "input": return renderInputOutputNode(node, true);
        case "output": return renderInputOutputNode(node, false);
        case "connector": return renderConnector(node);
        default: return null;
      }
    })();

    // Wrap in a group with click handler and selection highlight
    const isEditable = ["start", "process", "input", "output", "decision", "declaration", "call"].includes(node.type);
    
    return (
      <g 
        key={`selectable-${node.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
          setSelectedEdgeId(null); // Clear edge selection when node is selected
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isEditable) {
            setEditingNode(node);
            setEditInput(node.label);
            setShowEditModal(true);
          }
        }}
        style={{ cursor: isEditable ? "pointer" : "default" }}
      >
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={node.x - 4}
            y={node.y - 4}
            width={node.width + 8}
            height={node.height + 8}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={3}
            strokeDasharray="5,3"
            rx={8}
            style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.6))" }}
          />
        )}
        {nodeContent}
      </g>
    );
  };

  const renderEdge = (edge: FlowchartEdge, nodes: FlowchartNode[]) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    // Helper functions
    const getTop = (n: FlowchartNode) => ({ x: n.x + n.width/2, y: n.y });
    const getBottom = (n: FlowchartNode) => ({ x: n.x + n.width/2, y: n.y + n.height });
    const getLeft = (n: FlowchartNode) => ({ x: n.x, y: n.y + n.height/2 });
    const getRight = (n: FlowchartNode) => ({ x: n.x + n.width, y: n.y + n.height/2 });

    let start = getBottom(fromNode);
    let end = getTop(toNode);
    let path = "";
    let labelPos = { x: 0, y: 0 };
    
    if (edge.type === "call") {
      // Special call edge: curved dashed line from right side of call node to left side of function start
      start = getRight(fromNode);
      end = getLeft(toNode);
      const controlX = (start.x + end.x) / 2;
      path = `M ${start.x} ${start.y} C ${controlX} ${start.y}, ${controlX} ${end.y}, ${end.x} ${end.y}`;
      labelPos = { x: controlX, y: (start.y + end.y) / 2 - 10 };
    }
    else if (edge.type === "loop") {
      start = getBottom(fromNode);
      end = getLeft(toNode);
      const midX = Math.min(fromNode.x, toNode.x) - 40;
      path = `M ${start.x} ${start.y} 
              L ${start.x} ${start.y + 20} 
              L ${midX} ${start.y + 20} 
              L ${midX} ${end.y} 
              L ${end.x} ${end.y}`;
      labelPos = { x: midX - 10, y: (start.y + end.y) / 2 };
    } 
    else if (edge.type === "true" && fromNode.type === "decision") {
      start = getLeft(fromNode);
      end = getTop(toNode);
      path = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
      labelPos = { x: (start.x + end.x) / 2 - 15, y: start.y - 10 };
    } 
    else if (edge.type === "false" && fromNode.type === "decision") {
      start = getRight(fromNode);
      end = getTop(toNode);
      path = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
      labelPos = { x: (start.x + end.x) / 2 + 15, y: start.y - 10 };
    } 
    else {
      const midY = (start.y + end.y) / 2;
      path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
      labelPos = { x: (start.x + end.x) / 2 + 5, y: midY };
    }

    const color = edge.type === "call" ? "#22d3ee" : // Cyan for call edges
                 edge.type === "true" ? theme.edgeColor.true :
                 edge.type === "false" ? theme.edgeColor.false :
                 edge.type === "loop" ? theme.edgeColor.loop : theme.edgeColor.normal;

    const isDashed = edge.type === "call";

    const isEdgeSelected = selectedEdgeId === edge.id;
    
    return (
      <g 
        key={edge.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEdgeId(edge.id === selectedEdgeId ? null : edge.id);
          setSelectedNodeId(null); // Clear node selection when edge is selected
        }}
        style={{ cursor: "pointer" }}
      >
        <defs>
          <marker
            id={`arrow-${edge.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        </defs>
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth={15}
          fill="none"
        />
        {/* Selection highlight */}
        {isEdgeSelected && (
          <path
            d={path}
            stroke="#22d3ee"
            strokeWidth={6}
            fill="none"
            style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.8))" }}
          />
        )}
        {/* Actual edge */}
        <path
          d={path}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={isDashed ? "5,5" : undefined}
          fill="none"
          markerEnd={`url(#arrow-${edge.id})`}
        />
        {edge.label && (
          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            fill={color}
            fontSize={11}
            fontWeight={600}
            fontFamily={theme.fontFamily}
            filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      className="h-full flex flex-col outline-none"
      style={{ backgroundColor: theme.background }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => {
        // Focus container when clicked background
        if (document.activeElement !== containerRef.current) {
            // We can't easily ref the outer div unless we add a ref, 
            // but clicking background usually focuses it if tabIndex is set.
        }
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b gap-2 flex-wrap"
        style={{
          backgroundColor: theme.isDark ? "#2d2d2d" : "#f1f5f9",
          borderColor: theme.isDark ? "#404040" : "#e2e8f0",
        }}
      >
        <div className="flex items-center gap-2">
          {/* Unified View Label */}
          <span
            className="text-sm font-bold"
            style={{ color: theme.isDark ? "#fff" : "#1e293b" }}
          >
            {data?.main?.name || "Organigramme"}
          </span>
          
          {/* Instruction Toolbar */}
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-500/30">
            {instructionOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => initiateInstruction(opt.type)}
                title={opt.label + (opt.shortcut ? ` (${opt.shortcut})` : "")}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ 
                  backgroundColor: opt.color + "20",
                  color: theme.isDark ? "#fff" : opt.color,
                  border: `1px solid ${opt.color}50`
                }}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-white/50 dark:bg-black/20 rounded-md p-0.5">
            <button onClick={handleZoomOut} className="p-1 hover:bg-black/5 rounded" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0.1"
              max="4.0"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 mx-2 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <button onClick={handleZoomIn} className="p-1 hover:bg-black/5 rounded" title="Zoom In (Ctrl+=)">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <button onClick={handleFitToView} className="p-1.5 rounded hover:bg-black/5" title="Fit to View (Ctrl+0)">
            <Maximize2 size={16} />
          </button>
          
          <button onClick={() => setShowGrid(!showGrid)} className="p-1.5 rounded hover:bg-black/5" title="Toggle Grid (G)">
            <Grid size={16} style={{ opacity: showGrid ? 1 : 0.5 }} />
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Theme Selector - Restricted to Dark/Flowgorithm */}
          <select
            value={currentThemeId}
            onChange={(e) => setCurrentThemeId(e.target.value)}
            className="text-xs p-1 rounded border-none bg-transparent font-medium cursor-pointer hover:bg-black/5 focus:ring-0"
            style={{ color: theme.isDark ? "#fff" : "#1e293b" }}
          >
            <option value="dark">C-Studio Dark</option>
            <option value="flowgorithm">Flowgorithm Classic</option>
          </select>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <button onClick={handleExportPNG} className="p-1.5 rounded hover:bg-black/5" title="Export as PNG">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${theme.gridColor} 1px, transparent 1px)`,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />
        )}

        {displayFlowchart ? (
          <svg
            viewBox={`0 0 ${displayFlowchart.width} ${displayFlowchart.height}`}
            width={displayFlowchart.width * zoom}
            height={displayFlowchart.height * zoom}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            {displayFlowchart.edges.map((edge) => renderEdge(edge, displayFlowchart.nodes))}
            {displayFlowchart.nodes.map((node) => renderNode(node))}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-sm opacity-50">
            {source.trim() ? "Generating Flowchart..." : "Enter code to visualize"}
          </div>
        )}
      </div>

      {/* Error Bar */}
      {error && (
        <div className="px-3 py-2 text-xs border-t bg-yellow-50 text-yellow-800 border-yellow-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Instruction Input Modal */}
      {showInstructionModal && pendingInstructionType && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowInstructionModal(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg p-4 shadow-xl min-w-[350px] max-w-[450px]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowInstructionModal(false);
                setPendingInstructionType(null); // Ensure modal closes fully state-wise if needed or just close logic
                // Reset fields
                setInstructionInput("");
                setAssignTarget("");
                setAssignValue("");
                setForVar("");
                setForFrom("");
                setForTo("");
                setForStep("");
                setSwitchExpr("");
                setSwitchCases([{value: "", action: ""}]);
                setSwitchDefault("");
                setCallName("");
                setCallArgs("");
                setTypeName("");
                setTypeCategory("struct");
                setTypeAliasDefinition("");
                setTypeFields([{name: "", fieldType: ""}]);
                setFuncName("");
                setFuncParams([{name: "", paramType: ""}]);
                setFuncReturnType("");
                setProcName("");
                setProcParams([{name: "", paramType: ""}]);
              } else if (e.key === "Enter") {
                 confirmAddInstruction();
              }
            }}
          >
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Plus size={16} />
              Add {instructionOptions.find(o => o.type === pendingInstructionType)?.label}
            </h3>
            
            {/* Print Form */}
            {pendingInstructionType === "print" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Expression to print</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder='"Hello World" or variable'
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Read Form */}
            {pendingInstructionType === "read" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Variable name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="n, x, name"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Assignment Form */}
            {pendingInstructionType === "assignment" && (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-gray-400 text-xs mb-1 block">Target</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={assignTarget}
                      onChange={(e) => setAssignTarget(e.target.value)}
                      placeholder="x"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-white text-lg mt-5">←</span>
                  <div className="flex-1">
                    <label className="text-gray-400 text-xs mb-1 block">Value</label>
                    <input
                      type="text"
                      value={assignValue}
                      onChange={(e) => setAssignValue(e.target.value)}
                      placeholder="5 or x + 1"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* If / While / DoWhile Form */}
            {(pendingInstructionType === "if" || pendingInstructionType === "while" || pendingInstructionType === "dowhile") && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Condition</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="x > 0, i <= n, x <> 0"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* For Loop Form */}
            {pendingInstructionType === "for" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Variable</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={forVar}
                      onChange={(e) => setForVar(e.target.value)}
                      placeholder="i"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">From</label>
                    <input
                      type="text"
                      value={forFrom}
                      onChange={(e) => setForFrom(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">To</label>
                    <input
                      type="text"
                      value={forTo}
                      onChange={(e) => setForTo(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Step (optional)</label>
                    <input
                      type="text"
                      value={forStep}
                      onChange={(e) => setForStep(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Switch Form */}
            {pendingInstructionType === "switch" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Expression to switch on</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={switchExpr}
                    onChange={(e) => setSwitchExpr(e.target.value)}
                    placeholder="choice, option, n"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-gray-400 text-xs">Cases</label>
                    <button
                      onClick={() => setSwitchCases([...switchCases, {value: "", action: ""}])}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      + Add Case
                    </button>
                  </div>
                  
                  {switchCases.map((c, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <div className="w-20">
                        <input
                          type="text"
                          value={c.value}
                          onChange={(e) => {
                            const newCases = [...switchCases];
                            newCases[idx].value = e.target.value;
                            setSwitchCases(newCases);
                          }}
                          placeholder="Value"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <span className="text-gray-400 text-sm mt-1">:</span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={c.action}
                          onChange={(e) => {
                            const newCases = [...switchCases];
                            newCases[idx].action = e.target.value;
                            setSwitchCases(newCases);
                          }}
                          placeholder="Action (e.g., PRINT(...))"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      {switchCases.length > 1 && (
                        <button
                          onClick={() => {
                            const newCases = switchCases.filter((_, i) => i !== idx);
                            setSwitchCases(newCases);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Default action (optional)</label>
                  <input
                    type="text"
                    value={switchDefault}
                    onChange={(e) => setSwitchDefault(e.target.value)}
                    placeholder='PRINT("Invalid option")'
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Call Form */}
            {pendingInstructionType === "call" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Function/Procedure name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={callName}
                    onChange={(e) => setCallName(e.target.value)}
                    placeholder="MyFunction"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Arguments (comma separated)</label>
                  <input
                    type="text"
                    value={callArgs}
                    onChange={(e) => setCallArgs(e.target.value)}
                    placeholder="x, y, 10"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Return Form */}
            {pendingInstructionType === "return" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Return value</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="x * 2, result"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Type Form */}
            {pendingInstructionType === "type" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Type Name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    placeholder="MyStruct, Student"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-4 border-b border-gray-600 pb-2 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="typeCategory"
                      checked={typeCategory === "struct"}
                      onChange={() => setTypeCategory("struct")}
                      className="text-blue-500"
                    />
                    <span className="text-gray-300 text-sm">Structure</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="typeCategory"
                      checked={typeCategory === "alias"}
                      onChange={() => setTypeCategory("alias")}
                      className="text-blue-500"
                    />
                    <span className="text-gray-300 text-sm">Alias / Array</span>
                  </label>
                </div>
                
                {typeCategory === "struct" ? (
                  <div className="border-t border-gray-600 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-gray-400 text-xs">Fields</label>
                      <button
                        onClick={() => setTypeFields([...typeFields, {name: "", fieldType: ""}])}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        + Add Field
                      </button>
                    </div>
                    
                    {typeFields.map((f, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={f.name}
                            onChange={(e) => {
                              const newFields = [...typeFields];
                              newFields[idx].name = e.target.value;
                              setTypeFields(newFields);
                            }}
                            placeholder="Field Name"
                            className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                          />
                        </div>
                        <span className="text-gray-400 text-sm mt-1">:</span>
                        <div className="w-24">
                          <input
                            type="text"
                            value={f.fieldType}
                            onChange={(e) => {
                              const newFields = [...typeFields];
                              newFields[idx].fieldType = e.target.value;
                              setTypeFields(newFields);
                            }}
                            placeholder="Type"
                            className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                          />
                        </div>
                        {typeFields.length > 1 && (
                          <button
                            onClick={() => {
                              const newFields = typeFields.filter((_, i) => i !== idx);
                              setTypeFields(newFields);
                            }}
                            className="text-red-400 hover:text-red-300 text-sm px-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Based On (Base Type or Array Def)</label>
                    <input
                      type="text"
                      value={typeAliasDefinition}
                      onChange={(e) => setTypeAliasDefinition(e.target.value)}
                      placeholder="INTEGER, ARRAY[1..10] OF STRING"
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Function Form */}
            {pendingInstructionType === "function" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Function Name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={funcName}
                    onChange={(e) => setFuncName(e.target.value)}
                    placeholder="CalculateSum"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-gray-400 text-xs">Parameters</label>
                    <button
                      onClick={() => setFuncParams([...funcParams, {name: "", paramType: ""}])}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      + Add Param
                    </button>
                  </div>
                  
                  {funcParams.map((p, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                       <div className="flex-1">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const newParams = [...funcParams];
                            newParams[idx].name = e.target.value;
                            setFuncParams(newParams);
                          }}
                          placeholder="Param Name"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <span className="text-gray-400 text-sm mt-1">:</span>
                      <div className="w-24">
                        <input
                          type="text"
                          value={p.paramType}
                          onChange={(e) => {
                            const newParams = [...funcParams];
                            newParams[idx].paramType = e.target.value;
                            setFuncParams(newParams);
                          }}
                          placeholder="Type"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newParams = funcParams.filter((_, i) => i !== idx);
                          setFuncParams(newParams);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Return Type</label>
                  <input
                    type="text"
                    value={funcReturnType}
                    onChange={(e) => setFuncReturnType(e.target.value)}
                    placeholder="INTEGER"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Procedure Form */}
            {pendingInstructionType === "procedure" && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Procedure Name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={procName}
                    onChange={(e) => setProcName(e.target.value)}
                    placeholder="DisplayMenu"
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-gray-400 text-xs">Parameters</label>
                    <button
                      onClick={() => setProcParams([...procParams, {name: "", paramType: ""}])}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      + Add Param
                    </button>
                  </div>
                  
                  {procParams.map((p, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                       <div className="flex-1">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const newParams = [...procParams];
                            newParams[idx].name = e.target.value;
                            setProcParams(newParams);
                          }}
                          placeholder="Param Name"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <span className="text-gray-400 text-sm mt-1">:</span>
                      <div className="w-24">
                        <input
                          type="text"
                          value={p.paramType}
                          onChange={(e) => {
                            const newParams = [...procParams];
                            newParams[idx].paramType = e.target.value;
                            setProcParams(newParams);
                          }}
                          placeholder="Type"
                          className="w-full px-2 py-1.5 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newParams = procParams.filter((_, i) => i !== idx);
                          setProcParams(newParams);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowInstructionModal(false);
                  // Reset all fields
                  setInstructionInput("");
                  setAssignTarget("");
                  setAssignValue("");
                  setForVar("");
                  setForFrom("");
                  setForTo("");
                  setForStep("");
                  setSwitchExpr("");
                  setSwitchCases([{value: "", action: ""}]);
                  setSwitchDefault("");
                  setCallName("");
                  setCallArgs("");
                  setTypeName("");
                  setTypeCategory("struct");
                  setTypeAliasDefinition("");
                  setTypeFields([{name: "", fieldType: ""}]);
                  setFuncName("");
                  setFuncParams([{name: "", paramType: ""}]);
                  setFuncReturnType("");
                  setProcName("");
                  setProcParams([{name: "", paramType: ""}]);
                }}
                className="px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddInstruction}
                className="px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Node Modal */}
      {showEditModal && editingNode && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg p-4 shadow-xl min-w-[350px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              ✏️ Edit Instruction
            </h3>
            
            <div className="text-gray-400 text-xs mb-2">
              Type: {editingNode.type}
            </div>
            
            <input
              ref={editInputRef}
              type="text"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editInput.trim()) {
                  // Find and replace the old label with new content in source
                  if (onCodeChange && editingNode) {
                    const oldLabel = editingNode.label;
                    let searchPattern = "";
                    let newCode = "";
                    let newSource = source;
                    
                    if (editingNode.type === "start") {
                      // Handle algorithm name: "Start AlgorithmName" -> ALGORITHM AlgorithmName
                      if (oldLabel.startsWith("Start ")) {
                        const oldName = oldLabel.slice(6);
                        // Check if it's the main algorithm or a function/procedure
                        const algoMatch = source.match(/ALGORITHM\s+(\w+)/);
                        if (algoMatch && algoMatch[1] === oldName) {
                          // Update ALGORITHM declaration
                          newSource = source.replace(`ALGORITHM ${oldName}`, `ALGORITHM ${editInput}`);
                          // Also update END at the bottom
                          newSource = newSource.replace(new RegExp(`End ${oldName}`, 'g'), `End ${editInput}`);
                        }
                      } else if (oldLabel.startsWith("Function ")) {
                        // "Function Name(params) : ReturnType" -> FUNCTION Name(params) : ReturnType
                        const funcMatch = oldLabel.match(/Function\s+(\w+)\((.*?)\)\s*:\s*(\w+)/);
                        if (funcMatch) {
                          const oldFuncName = funcMatch[1];
                          const newFuncMatch = editInput.match(/(\w+)\((.*?)\)\s*:\s*(\w+)/);
                          if (newFuncMatch) {
                            const [, newName, newParams, newRetType] = newFuncMatch;
                            // Replace FUNCTION declaration
                            const oldPattern = new RegExp(`FUNCTION\\s+${oldFuncName}\\s*\\([^)]*\\)\\s*:\\s*\\w+`);
                            newSource = source.replace(oldPattern, `FUNCTION ${newName}(${newParams}) : ${newRetType}`);
                            // Update End
                            newSource = newSource.replace(`End ${oldFuncName}`, `End ${newName}`);
                          }
                        }
                      } else if (oldLabel.startsWith("Procedure ")) {
                        const procMatch = oldLabel.match(/Procedure\s+(\w+)\((.*?)\)/);
                        if (procMatch) {
                          const oldProcName = procMatch[1];
                          const newProcMatch = editInput.match(/(\w+)\((.*?)\)/);
                          if (newProcMatch) {
                            const [, newName, newParams] = newProcMatch;
                            const oldPattern = new RegExp(`PROCEDURE\\s+${oldProcName}\\s*\\([^)]*\\)`);
                            newSource = source.replace(oldPattern, `PROCEDURE ${newName}(${newParams})`);
                            newSource = newSource.replace(`End ${oldProcName}`, `End ${newName}`);
                          }
                        }
                      }
                      onCodeChange(newSource);
                    } else if (editingNode.type === "output" && oldLabel.startsWith("Print(")) {
                      const content = oldLabel.slice(6, -1);
                      searchPattern = `PRINT(${content})`;
                      newCode = `PRINT(${editInput})`;
                      if (source.includes(searchPattern)) {
                        onCodeChange(source.replace(searchPattern, newCode));
                      }
                    } else if (editingNode.type === "input" && oldLabel.startsWith("Read(")) {
                      const content = oldLabel.slice(5, -1);
                      searchPattern = `SCAN(${content})`;
                      newCode = `SCAN(${editInput})`;
                      if (source.includes(searchPattern)) {
                        onCodeChange(source.replace(searchPattern, newCode));
                      }
                    } else if (editingNode.type === "process" && oldLabel.includes("←")) {
                      const [target, value] = oldLabel.split("←").map(s => s.trim());
                      searchPattern = `${target} <- ${value}`;
                      if (editInput.includes("←")) {
                        const [newTarget, newValue] = editInput.split("←").map(s => s.trim());
                        newCode = `${newTarget} <- ${newValue}`;
                      } else {
                        newCode = editInput;
                      }
                      if (source.includes(searchPattern)) {
                        onCodeChange(source.replace(searchPattern, newCode));
                      }
                    } else {
                      searchPattern = oldLabel;
                      newCode = editInput;
                      if (source.includes(searchPattern)) {
                        onCodeChange(source.replace(searchPattern, newCode));
                      }
                    }
                  }
                  
                  setShowEditModal(false);
                  setEditingNode(null);
                  setEditInput("");
                }
                if (e.key === 'Escape') {
                  setShowEditModal(false);
                }
              }}
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editInput.trim() && onCodeChange && editingNode) {
                    const oldLabel = editingNode.label;
                    let searchPattern = "";
                    let newCode = "";
                    
                    if (editingNode.type === "output" && oldLabel.startsWith("Print(")) {
                      const content = oldLabel.slice(6, -1);
                      searchPattern = `PRINT(${content})`;
                      newCode = `PRINT(${editInput})`;
                    } else if (editingNode.type === "input" && oldLabel.startsWith("Read(")) {
                      const content = oldLabel.slice(5, -1);
                      searchPattern = `SCAN(${content})`;
                      newCode = `SCAN(${editInput})`;
                    } else if (editingNode.type === "process" && oldLabel.includes("←")) {
                      const [target, value] = oldLabel.split("←").map(s => s.trim());
                      searchPattern = `${target} <- ${value}`;
                      if (editInput.includes("←")) {
                        const [newTarget, newValue] = editInput.split("←").map(s => s.trim());
                        newCode = `${newTarget} <- ${newValue}`;
                      } else {
                        newCode = editInput;
                      }
                    } else {
                      searchPattern = oldLabel;
                      newCode = editInput;
                    }
                    
                    if (source.includes(searchPattern)) {
                      const newSource = source.replace(searchPattern, newCode);
                      onCodeChange(newSource);
                    }
                  }
                  setShowEditModal(false);
                  setEditingNode(null);
                  setEditInput("");
                }}
                className="px-3 py-1.5 rounded text-sm bg-green-600 text-white hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowchartPanel;
