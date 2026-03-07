"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import dynamic from "next/dynamic";
const MonacoEditor = dynamic(() => import("@/components/MonacoEditor").then(mod => mod.MonacoEditor), { ssr: false });
import { TerminalPanel } from "@/components/TerminalPanel";
const XtermTerminal = dynamic(() => import("@/components/XtermTerminal").then(mod => mod.XtermTerminal), { ssr: false });
import { EditorTabs } from "@/components/EditorTabs";
import { TitleBar, FlowchartStatus } from "@/components/TitleBar";
import { UpdateNotification } from "@/components/UpdateNotification";
const FlowchartPanel = dynamic(() => import("@/components/FlowchartPanel").then(mod => mod.FlowchartPanel), { ssr: false });
import { ThemeProvider } from "@/ThemeContext";
import { FileSystemItem, LogMessage, LogType } from "@/types";
import { useShortcut, ShortcutProvider } from "@/ShortcutContext";
// Import modules directly (barrel export from index.ts causes crash)
import { translateCToAlgo } from "@/usdb-compiler/c-to-algo";
import { Parser } from "@/usdb-compiler/parser";
import { SemanticAnalyzer } from "@/usdb-compiler/semantic";
import { CodeGenerator } from "@/usdb-compiler/codegen";

// Local compile function (bypasses index.ts barrel exports)
const translateAlgoToC = (source: string) => {
  // Phase 1: Parse
  const parser = new Parser();
  const { ast, errors: parseErrors } = parser.parse(source);

  if (parseErrors.length > 0 || !ast) {
    return {
      success: false as const,
      cCode: undefined as undefined,
      errors:
        parseErrors.length > 0
          ? parseErrors
          : [{ toString: () => "Parse failed" }],
      warnings: [] as { toString: () => string }[],
    };
  }

  // Phase 2: Semantic Analysis
  const semanticAnalyzer = new SemanticAnalyzer();
  const { errors: semanticErrors } = semanticAnalyzer.analyze(ast);
  const errors = semanticErrors.filter((e) => e.severity !== "warning");
  const warnings = semanticErrors.filter((e) => e.severity === "warning");

  if (errors.length > 0) {
    return { success: false as const, cCode: undefined, errors, warnings };
  }

  // Phase 3: Code Generation
  const codeGenerator = new CodeGenerator();
  const { code, errors: codeGenErrors } = codeGenerator.generate(ast);

  if (codeGenErrors.length > 0) {
    return {
      success: false as const,
      cCode: undefined,
      errors: codeGenErrors,
      warnings,
    };
  }

  return {
    success: true as const,
    cCode: code,
    errors: [] as { toString: () => string }[],
    warnings,
  };
};

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  releaseName?: string;
}

// Helper to flatten tree for compiler (temporary until backend supports tree)
// Actually, we will send the tree to backend, but for now let's keep it simple
// Helper to flatten tree for compiler (temporary until backend supports tree)
// Actually, we will send the tree to backend, but for now let's keep it simple
// const flattenFiles = (items: FileSystemItem[]): { name: string; content: string }[] => {
//   let result: { name: string; content: string }[] = [];
//   items.forEach((item) => {
//     if (item.type === "file") {
//       result.push({ name: item.name, content: item.content || "" });
//     } else if (item.children) {
//       const children = flattenFiles(item.children);
//       // Prefix children names with parent name for flat structure simulation if needed
//       // But for real tree support, we should pass the structure.
//       // For now, let's just pass the file content.
//       // TODO: Update compiler to handle folders.
//       result = [...result, ...children];
//     }
//   });
//   return result;
// };

// Hooks
import { useLogs } from "@/hooks/useLogs";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useEditorState } from "@/hooks/useEditorState";
import { useWorkspacePersistence } from "@/hooks/useWorkspacePersistence";
import { useCompiler } from "@/hooks/useCompiler";
import { useTranslator } from "@/hooks/useTranslator";

function CCodeStudioInner() {
  const { logs, setLogs, terminalLogs, setTerminalLogs, addLog, addTerminalLog } = useLogs();

  const [activeFileId, setActiveFileId] = useState<string | null>("1");
  const {
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
  } = useEditorState(activeFileId, setActiveFileId);

  const {
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
  } = useFileSystem({
    initialFiles: [
      {
        id: "1",
        name: "main.c",
        type: "file",
        content: `#include <stdio.h>\n#include "utils.h"\n\nint main() {\n    printf("App Running...\\n");\n    print_message();\n    return 0;\n}`,
      },
      {
        id: "2",
        name: "utils.h",
        type: "file",
        content: `#ifndef UTILS_H\n#define UTILS_H\n\nvoid print_message();\n\n#endif`,
      },
      {
        id: "3",
        name: "utils.c",
        type: "file",
        content: `#include <stdio.h>\n#include "utils.h"\n\nvoid print_message() {\n    printf("Hello from bundled GCC!\\n");\n}`,
      },
      {
        id: "4",
        name: "factorial.algo",
        type: "file",
        content: `ALGORITHM Factorial\nVAR n, result : INTEGER\n\nFUNCTION Fact(x : INTEGER) : INTEGER\nBEGIN\n    IF (x <= 1) THEN\n        RETURN(1)\n    ELSE\n        RETURN(x * Fact(x - 1))\nEND\n\nBEGIN\n    PRINT("Enter a number:")\n    SCAN(n)\n    result <- Fact(n)\n    PRINT("Factorial is:", result)\nEND.`,
      },
    ],
    activeFileId,
    setActiveFileId,
    setOpenTabs,
    addLog,
  });

  const { isCompiling, handleRun } = useCompiler({
    activeFile,
    files,
    addTerminalLog,
    setShowTerminalTab,
    openTabs,
    setOpenTabs,
    setActiveFileId,
    translateAlgoToC,
  });

  const { handleTranslate } = useTranslator({
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    setOpenTabs,
    addLog,
    findFile,
    translateAlgoToC,
    translateCToAlgo,
  });

  const { isWorkspaceLoaded } = useWorkspacePersistence({
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
  });

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [flowchartStatus, setFlowchartStatus] = useState<FlowchartStatus>('ok');
  const [flowchartError, setFlowchartError] = useState<string | undefined>(undefined);


  const handleGenerateTest = (
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
  ) => {
    const newId = () => Math.random().toString(36).substr(2, 9);
    const rootId = newId();

    let newFolder: FileSystemItem | undefined;

    if (type === "multi-input") {
      // Test scenario for multiple input cases with scanf
      newFolder = {
        id: rootId,
        name: "Test_MultiInput",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "main.c",
            type: "file",
            content: `#include <stdio.h>

int main() {
    // Test 1: Single integer input
    int age;
    printf("Enter your age: ");
    scanf("%d", &age);
    printf("Your age is: %d\\n\\n", age);

    // Test 2: Multiple integers on same line
    int a, b, c;
    printf("Enter three numbers (space separated): ");
    scanf("%d %d %d", &a, &b, &c);
    printf("Sum: %d\\n\\n", a + b + c);

    // Test 3: String input
    char name[50];
    printf("Enter your name: ");
    scanf("%s", name);
    printf("Hello, %s!\\n\\n", name);

    // Test 4: Mixed types
    char grade;
    float score;
    printf("Enter grade letter and score: ");
    scanf(" %c %f", &grade, &score);
    printf("Grade: %c, Score: %.2f\\n\\n", grade, score);

    // Test 5: Full line input with fgets
    char sentence[100];
    printf("Enter a sentence: ");
    getchar(); // consume leftover newline
    fgets(sentence, 100, stdin);
    printf("You said: %s\\n", sentence);

    return 0;
}`,
          },
        ],
      };
    } else if (type === "pointers") {
      // Test scenario for pointers between functions and libraries
      newFolder = {
        id: rootId,
        name: "Test_Pointers",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "pointer_lib.h",
            type: "file",
            content: `#ifndef POINTER_LIB_H
#define POINTER_LIB_H

// Function to swap two integers using pointers
void swap(int *a, int *b);

// Function to modify array elements
void doubleArray(int *arr, int size);

// Function that returns a pointer (allocates memory)
int* createArray(int size, int initialValue);

// Function to print array using pointer arithmetic
void printArray(int *arr, int size);

// Function to find max element and return pointer to it
int* findMax(int *arr, int size);

// Function pointer type for operations
typedef int (*Operation)(int, int);

// Function that uses function pointer
int applyOperation(int a, int b, Operation op);

// Sample operations
int add(int a, int b);
int multiply(int a, int b);

#endif`,
          },
          {
            id: newId(),
            name: "pointer_lib.c",
            type: "file",
            content: `#include <stdio.h>
#include <stdlib.h>
#include "pointer_lib.h"

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

void doubleArray(int *arr, int size) {
    for (int i = 0; i < size; i++) {
        *(arr + i) *= 2;  // Pointer arithmetic
    }
}

int* createArray(int size, int initialValue) {
    int *arr = (int*)malloc(size * sizeof(int));
    if (arr != NULL) {
        for (int i = 0; i < size; i++) {
            arr[i] = initialValue;
        }
    }
    return arr;
}

void printArray(int *arr, int size) {
    printf("[");
    for (int *p = arr; p < arr + size; p++) {
        printf("%d", *p);
        if (p < arr + size - 1) printf(", ");
    }
    printf("]\\n");
}

int* findMax(int *arr, int size) {
    int *maxPtr = arr;
    for (int i = 1; i < size; i++) {
        if (*(arr + i) > *maxPtr) {
            maxPtr = arr + i;
        }
    }
    return maxPtr;
}

int applyOperation(int a, int b, Operation op) {
    return op(a, b);
}

int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}`,
          },
          {
            id: newId(),
            name: "main.c",
            type: "file",
            content: `#include <stdio.h>
#include <stdlib.h>
#include "pointer_lib.h"

int main() {
    printf("=== Pointer Test Scenarios ===\\n\\n");

    // Test 1: Swap using pointers
    printf("Test 1: Swap Function\\n");
    int x = 10, y = 20;
    printf("Before swap: x = %d, y = %d\\n", x, y);
    swap(&x, &y);
    printf("After swap:  x = %d, y = %d\\n\\n", x, y);

    // Test 2: Modify array through pointer
    printf("Test 2: Double Array Elements\\n");
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    printf("Before: ");
    printArray(numbers, size);
    doubleArray(numbers, size);
    printf("After:  ");
    printArray(numbers, size);
    printf("\\n");

    // Test 3: Dynamic memory allocation
    printf("Test 3: Dynamic Array Creation\\n");
    int *dynamicArr = createArray(5, 7);
    if (dynamicArr != NULL) {
        printf("Created array: ");
        printArray(dynamicArr, 5);
        free(dynamicArr);
    }
    printf("\\n");

    // Test 4: Find max and return pointer
    printf("Test 4: Find Max Element\\n");
    int data[] = {15, 3, 27, 8, 12};
    int *maxPtr = findMax(data, 5);
    printf("Array: ");
    printArray(data, 5);
    printf("Max value: %d (at address %p)\\n\\n", *maxPtr, (void*)maxPtr);

    // Test 5: Function pointers
    printf("Test 5: Function Pointers\\n");
    int a = 5, b = 3;
    printf("Numbers: %d and %d\\n", a, b);
    printf("Using add function: %d\\n", applyOperation(a, b, add));
    printf("Using multiply function: %d\\n\\n", applyOperation(a, b, multiply));

    // Test 6: Pointer to pointer
    printf("Test 6: Pointer to Pointer\\n");
    int value = 42;
    int *ptr = &value;
    int **pptr = &ptr;
    printf("Value: %d\\n", value);
    printf("Via *ptr: %d\\n", *ptr);
    printf("Via **pptr: %d\\n", **pptr);

    return 0;
}`,
          },
        ],
      };
    } else if (type === "complex-nested") {
      newFolder = {
        id: rootId,
        name: "Test_Complex",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "src",
            type: "folder",
            isOpen: true,
            children: [
              {
                id: newId(),
                name: "moduleA",
                type: "folder",
                isOpen: true,
                children: [
                  {
                    id: newId(),
                    name: "a.h",
                    type: "file",
                    content: `#ifndef A_H\n#define A_H\n\nvoid funcA();\n\n#endif`,
                  },
                  {
                    id: newId(),
                    name: "a.c",
                    type: "file",
                    content: `#include <stdio.h>\n#include "a.h"\n#include "../moduleB/b.h"\n\nvoid funcA() {\n    printf("Function A calling B...\\n");\n    funcB();\n}`,
                  },
                ],
              },
              {
                id: newId(),
                name: "moduleB",
                type: "folder",
                isOpen: true,
                children: [
                  {
                    id: newId(),
                    name: "b.h",
                    type: "file",
                    content: `#ifndef B_H\n#define B_H\n\nvoid funcB();\n\n#endif`,
                  },
                  {
                    id: newId(),
                    name: "b.c",
                    type: "file",
                    content: `#include <stdio.h>\n#include "b.h"\n\nvoid funcB() {\n    printf("Function B executed!\\n");\n}`,
                  },
                ],
              },
              {
                id: newId(),
                name: "main.c",
                type: "file",
                content: `#include <stdio.h>\n#include "moduleA/a.h"\n\nint main() {\n    printf("Main starting...\\n");\n    funcA();\n    return 0;\n}`,
              },
            ],
          },
        ],
      };
    } else if (type === "multi-main") {
      let newFolder: FileSystemItem = {
        id: rootId,
        name: "Test_MultiMain",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "app1.c",
            type: "file",
            content: `#include <stdio.h>\n\nint main() {\n    printf("Running App 1\\n");\n    return 0;\n}`,
          },
          {
            id: newId(),
            name: "app2.c",
            type: "file",
            content: `#include <stdio.h>\n\nint main() {\n    printf("Running App 2\\n");\n    return 0;\n}`,
          },
        ],
      };
    } else if (type === "nested") {
      newFolder = {
        id: rootId,
        name: "Test_Nested",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "include",
            type: "folder",
            isOpen: true,
            children: [
              {
                id: newId(),
                name: "math_utils.h",
                type: "file",
                content: `#ifndef MATH_UTILS_H\n#define MATH_UTILS_H\n\nint add(int a, int b);\n\n#endif`,
              },
            ],
          },
          {
            id: newId(),
            name: "src",
            type: "folder",
            isOpen: true,
            children: [
              {
                id: newId(),
                name: "math_utils.c",
                type: "file",
                content: `#include "../include/math_utils.h"\n\nint add(int a, int b) {\n    return a + b;\n}`,
              },
            ],
          },
          {
            id: newId(),
            name: "main.c",
            type: "file",
            content: `#include <stdio.h>\n#include "include/math_utils.h"\n\nint main() {\n    printf("2 + 3 = %d\\n", add(2, 3));\n    return 0;\n}`,
          },
        ],
      };
    } else if (type === "assets") {
      newFolder = {
        id: rootId,
        name: "Test_Assets",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "data.txt",
            type: "file",
            content: `Hello from text file!`,
          },
          {
            id: newId(),
            name: "main.c",
            type: "file",
            content: `#include <stdio.h>\n\nint main() {\n    FILE *f = fopen("data.txt", "r");\n    if (f) {\n        char buffer[100];\n        fgets(buffer, 100, f);\n        printf("Read: %s\\n", buffer);\n        fclose(f);\n    } else {\n        printf("Failed to open file.\\n");\n    }\n    return 0;\n}`,
          },
        ],
      };
    } else if (type === "algo-factorial") {
      // USDB Algo: Factorial
      newFolder = {
        id: rootId,
        name: "Algo_Factorial",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "factorial.algo",
            type: "file",
            content: `ALGORITHM Factorial
VAR n, result : INTEGER

FUNCTION Fact(x : INTEGER) : INTEGER
BEGIN
    IF (x <= 1) THEN
        RETURN(1)
    ELSE
        RETURN(x * Fact(x - 1))
END

BEGIN
    PRINT("=== Factorial Calculator ===")
    PRINT("Enter a number:")
    SCAN(n)
    result <- Fact(n)
    PRINT("Factorial of", n, "is", result)
END.`,
          },
        ],
      };
    } else if (type === "algo-array-sum") {
      // USDB Algo: Array Sum
      newFolder = {
        id: rootId,
        name: "Algo_ArraySum",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "array_sum.algo",
            type: "file",
            content: `ALGORITHM ArraySum
CONST SIZE = 5
VAR T : ARRAY[SIZE] OF INTEGER
VAR i, sum : INTEGER

BEGIN
    PRINT("=== Array Sum Calculator ===")
    PRINT("Enter", SIZE, "numbers:")
    
    sum <- 0
    FOR i <- 0 TO SIZE - 1 DO
    BEGIN
        SCAN(T[i])
        sum <- sum + T[i]
    END
    
    PRINT("Numbers entered:")
    FOR i <- 0 TO SIZE - 1 DO
        PRINT(T[i])
    
    PRINT("Sum =", sum)
    PRINT("Average =", sum / SIZE)
END.`,
          },
        ],
      };
    } else if (type === "algo-quadratic") {
      // USDB Algo: Quadratic Equation
      newFolder = {
        id: rootId,
        name: "Algo_Quadratic",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "quadratic.algo",
            type: "file",
            content: `ALGORITHM QuadraticEquation
VAR a, b, c : REAL
VAR delta, x1, x2 : REAL

BEGIN
    PRINT("=== Quadratic Equation Solver ===")
    PRINT("Equation: ax^2 + bx + c = 0")
    PRINT("Enter coefficient a:")
    SCAN(a)
    PRINT("Enter coefficient b:")
    SCAN(b)
    PRINT("Enter coefficient c:")
    SCAN(c)
    
    delta <- b * b - 4 * a * c
    
    IF (delta > 0) THEN
    BEGIN
        x1 <- (-b + sqrt(delta)) / (2 * a)
        x2 <- (-b - sqrt(delta)) / (2 * a)
        PRINT("Two real solutions:")
        PRINT("x1 =", x1)
        PRINT("x2 =", x2)
    END
    ELSE IF (delta = 0) THEN
    BEGIN
        x1 <- -b / (2 * a)
        PRINT("One solution:")
        PRINT("x =", x1)
    END
    ELSE
        PRINT("No real solutions (delta < 0)")
END.`,
          },
        ],
      };
    } else if (type === "algo-struct") {
      // USDB Algo: Structures Test
      newFolder = {
        id: rootId,
        name: "Algo_Structures",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "structures.algo",
            type: "file",
            content: `ALGORITHM StructuresTest
TYPE
    Date = STRUCTURE
    BEGIN
        D : INTEGER
        M : INTEGER
        Y : INTEGER
    END
    
    Student = STRUCTURE
    BEGIN
        ID : INTEGER
        Name : STRING
        BirthDate : Date
        Average : REAL
    END

VAR
    S1 : Student

BEGIN
    PRINT("=== USDB Algo Structures Test ===")
    
    // Assign values
    S1.ID <- 2023001
    S1.Name <- "Ahmed"
    S1.BirthDate.D <- 15
    S1.BirthDate.M <- 5
    S1.BirthDate.Y <- 2000
    S1.Average <- 14.75
    
    // Print the structure
    PRINT("Student ID:", S1.ID)
    PRINT("Name:", S1.Name)
    PRINT("Birth Date:", S1.BirthDate.D, "/", S1.BirthDate.M, "/", S1.BirthDate.Y)
    PRINT("Average:", S1.Average)
END.`,
          },
        ],
      };
    } else if (type === "algo-loops") {
      // USDB Algo: Loops Test
      const algoFolder: FileSystemItem = {
        id: rootId,
        name: "Algo_Loops",
        type: "folder",
        isOpen: true,
        children: [
          {
            id: newId(),
            name: "loops.algo",
            type: "file",
            content: `ALGORITHM LoopsTest
VAR
    i, sum : INTEGER

BEGIN
    PRINT("=== USDB Algo Loops Test ===")
    
    // FOR Loop
    PRINT("--- FOR Loop (1 to 5) ---")
    FOR i <- 1 TO 5 DO
        PRINT("i =", i)
    
    // FOR with STEP
    PRINT("--- FOR Loop with STEP 2 (0 to 10) ---")
    FOR i <- 0 TO 10 STEP 2 DO
        PRINT("i =", i)
    
    // WHILE Loop
    PRINT("--- WHILE Loop (countdown) ---")
    i <- 5
    WHILE (i > 0) DO
    BEGIN
        PRINT("Countdown:", i)
        i <- i - 1
    END
    
    // Calculate sum with FOR
    sum <- 0
    FOR i <- 1 TO 10 DO
        sum <- sum + i
    
    PRINT("Sum of 1 to 10 =", sum)
END.`,
          },
        ],
      };
      setFiles([...files, algoFolder]);
      return;
    }

    // Default fallback since `newFolder` type was separated into block scopes 
    const defaultFolder: FileSystemItem = {
      id: rootId,
      name: "New_Test",
      type: "folder",
      isOpen: true,
      children: [],
    };
    setFiles([...files, newFolder || defaultFolder]);
  };


  const [markers, setMarkers] = useState<
    {
      file: string;
      line: number;
      column: number;
      message: string;
      severity: "error" | "warning";
    }[]
  >([]);

  useEffect(() => {
    // Syntax check fallback on web, can be extended via Next.js API
    setMarkers([]);
  }, [files]);

  useEffect(() => {
    // Listen for process output (Web proxy: no-op since Xterm handles socket streams separately or not at all depending on impl)
    if (typeof window !== "undefined" && (window as any).electron) {
       (window as any).electron.onProcessOutput((data: string) => {
         addLog("info", data);
       });
    }

    if (typeof window !== "undefined" && (window as any).electron) {
       (window as any).electron.onProcessExit((code: number) => {
         addLog("info", `\\nProcess exited with code ${code}`);
       });
    }

    return () => {};
  }, []);

  // Check for updates on app startup (Web proxy: no-op)
  useEffect(() => {
    // Disabled for web
  }, []);







  const handleTerminalInput = (input: string) => {
    // In Web, Terminal is mostly mock/read-only unless bridged to an API shell 
    addLog("info", input + "\n");
  };

  const handleTerminalCommand = (command: string) => {
    if (command.startsWith("gcc") || command.startsWith("g++")) {
       handleRun();
    } else if (command.startsWith("./") || command.startsWith(".\\")) {
       // Since web gcc compile+runs simultaneously or we only have single state, just re-run
       handleRun();
    } else {
       addTerminalLog("error", `Error: Command '${command}' not recognized in Web virtual terminal.`);
    }
  };


  // ===== File System Handlers =====

  const handleFileSelect = (file: FileSystemItem) => {
    setActiveFileId(file.id);
    if (!openTabs.includes(file.id)) {
      setOpenTabs((prev) => [...prev, file.id]);
    }
  };

  const handleOpenFile = useCallback(() => {
    if (typeof window === "undefined") return;
    
    // Web implementation: Use a hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".algo,.c,.h,.txt";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: FileSystemItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: "file",
          content: content,
        };
        setFiles((prev) => [...prev, newFile]);
        setActiveFileId(newFile.id);
        addLog("success", `Opened: ${file.name}`);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addLog]);

  const handleOpenFolder = useCallback(() => {
    addLog("warning", "Folder opening is limited in Web mode. Please open files individually or use workspace export/import.");
  }, [addLog]);

  const handleSave = useCallback(() => {
    if (!activeFile || activeFile.type !== "file") {
      addLog("warning", "No file selected to save");
      return;
    }

    if (typeof window === "undefined") return;

    // Web implementation: Create a blob and trigger download
    const blob = new Blob([activeFile.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog("success", `Downloaded: ${activeFile.name}`);
  }, [activeFile, addLog]);

  const handleExportWorkspace = useCallback(() => {
    if (typeof window === "undefined") return;

    const workspace = {
      version: "1.5.0",
      name: "C-Studio Project",
      files: files,
    };

    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.cstudio";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog("success", `Workspace exported successfully`);
  }, [files, addLog]);

  const handleImportWorkspace = useCallback(() => {
    if (typeof window === "undefined") return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".cstudio";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          const workspace = JSON.parse(content);
          if (workspace.files && Array.isArray(workspace.files)) {
             setFiles(workspace.files);
             setActiveFileId(null);
             addLog("success", `Workspace imported: ${workspace.name || "Unnamed"}`);
          } else {
             addLog("error", "Invalid workspace file format");
          }
        } catch {
          addLog("error", "Failed to parse workspace file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addLog]);
  
  const handleCloseActiveTab = useCallback(() => {
    if (activeFileId) {
      handleTabClose(activeFileId);
    }
  }, [activeFileId, handleTabClose]);

  // Keyboard shortcuts
  const { registerShortcut } = useShortcut();

  useEffect(() => {
    const unsubs = [
      registerShortcut("Ctrl+n", (e) => { e.preventDefault(); handleNewFile(); }),
      registerShortcut("Ctrl+o", (e) => { e.preventDefault(); handleOpenFile(); }),
      registerShortcut("Ctrl+Shift+o", (e) => { e.preventDefault(); handleOpenFolder(); }),
      registerShortcut("Ctrl+s", (e) => { e.preventDefault(); handleSave(); }),
      registerShortcut("Ctrl+e", (e) => { e.preventDefault(); handleExportWorkspace(); }),
      registerShortcut("Ctrl+i", (e) => { e.preventDefault(); handleImportWorkspace(); }),
      registerShortcut("Ctrl+`", (e) => { e.preventDefault(); setIsTerminalCollapsed((prev) => !prev); }),
      registerShortcut("Ctrl+b", (e) => { e.preventDefault(); setIsSidebarCollapsed((prev) => !prev); }),
      registerShortcut("Ctrl+Shift+f", (e) => { e.preventDefault(); setIsFlowchartVisible((prev) => !prev); }),
      registerShortcut("F5", (e) => { e.preventDefault(); handleRun(); }),
      registerShortcut("Ctrl+t", (e) => { e.preventDefault(); handleTranslate(); }),
      registerShortcut("Ctrl+w", (e) => { e.preventDefault(); handleCloseActiveTab(); }),
    ];
    return () => unsubs.forEach(u => u());
  }, [handleNewFile, handleOpenFile, handleOpenFolder, handleSave, handleExportWorkspace, handleImportWorkspace, handleRun, handleTranslate, handleCloseActiveTab]);

  const [terminalWorkspacePath, setTerminalWorkspacePath] = useState<string | null>(null);

  const handleOpenTerminal = async () => {
    // Workspaces saving in web isn't an explicit folder for Xterm, so we just set dummy.
    setTerminalWorkspacePath("Virtual Web Workspace");
    
    setShowTerminalTab(true);
    if (!openTabs.includes("terminal")) {
      setOpenTabs((prev) => [...prev, "terminal"]);
    }
    setActiveFileId("terminal");
  };

  return (
    <ThemeProvider>
      <div
        className="flex flex-col h-screen w-full font-sans overflow-hidden"
        style={{
          backgroundColor: "var(--theme-bg-dark)",
          color: "var(--theme-fg)",
        }}
      >
        <TitleBar
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onSaveFile={handleSave}
          onExportWorkspace={handleExportWorkspace}
          onImportWorkspace={handleImportWorkspace}
          onOpenTerminal={handleOpenTerminal}
          onToggleFlowchart={() => setIsFlowchartVisible(!isFlowchartVisible)}
          isFlowchartVisible={isFlowchartVisible}
          flowchartStatus={flowchartStatus}
          flowchartError={flowchartError}
        />
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar collapse toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-full w-8 flex items-center justify-center hover:bg-white/5 transition-colors flex-shrink-0"
            style={{
              backgroundColor: "var(--theme-bg)",
              borderRight: "1px solid var(--theme-border)",
            }}
            title={
              isSidebarCollapsed
                ? "Expand Sidebar (Ctrl+B)"
                : "Collapse Sidebar (Ctrl+B)"
            }
          >
            <svg
              className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}
              style={{ color: "var(--theme-fg-muted)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Resizable Sidebar */}
          <div
            className="flex-shrink-0 transition-all duration-200 overflow-hidden relative"
            style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
          >
            <div className="h-full" style={{ width: sidebarWidth - 4 }}>
              <Sidebar
                files={files}
                activeFileId={activeFileId}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onDelete={handleDelete}
                onToggleFolder={handleToggleFolder}
                onMoveFile={handleMoveFile}
                onGenerateTest={handleGenerateTest}
                onRename={handleRename}
              />
            </div>
            {/* Resize handle */}
            {!isSidebarCollapsed && (
              <div
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors"
                style={{ backgroundColor: "var(--theme-border)" }}
                onMouseDown={handleSidebarResize}
              />
            )}
          </div>

          {/* Main Editor and Split Editor */}
          <div className="flex-1 flex min-w-0">
            {/* Primary Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex flex-col min-h-0">
                {activeFileId === "output" ? (
                  /* Output Tab Content */
                  <div className="h-full flex flex-col" style={{ backgroundColor: "var(--theme-bg-dark)" }}>
                    <EditorTabs
                      openTabs={openTabs}
                      activeFileId={activeFileId}
                      files={files}
                      onTabClick={handleTabClick}
                      onTabClose={handleTabClose}
                      onSplitRight={handleSplitRight}
                      showOutputTab={showOutputTab}
                    />
                    <div className="flex-1">
                      <TerminalPanel
                        logs={logs}
                        onClear={() => setLogs([])}
                        onInput={handleTerminalInput}
                      />
                    </div>
                  </div>
                ) : activeFileId === "terminal" ? (
                  /* Terminal Tab Content - Interactive PowerShell */
                  <div className="h-full flex flex-col" style={{ backgroundColor: "var(--theme-bg-dark)" }}>
                    <EditorTabs
                      openTabs={openTabs}
                      activeFileId={activeFileId}
                      files={files}
                      onTabClick={handleTabClick}
                      onTabClose={handleTabClose}
                      onSplitRight={handleSplitRight}
                      showOutputTab={showOutputTab}
                    />
                    <div className="flex-1">
                      <XtermTerminal workspacePath={terminalWorkspacePath} terminalLogs={terminalLogs} onCommand={handleTerminalCommand} />
                    </div>
                  </div>
                ) : activeFile ? (
                  <MonacoEditor
                    activeFile={activeFile}
                    onContentChange={handleContentChange}
                    onRun={handleRun}
                    isCompiling={isCompiling}
                    markers={markers}
                    openTabs={openTabs}
                    files={files}
                    onTabClick={handleTabClick}
                    onTabClose={handleTabClose}
                    onSplitRight={handleSplitRight}
                    onTranslate={handleTranslate}
                    showOutputTab={showOutputTab}
                  />
                ) : (
                  <div
                    className="flex-1 flex items-center justify-center text-muted-foreground"
                    style={{ backgroundColor: "var(--theme-bg-dark)" }}
                  >
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>

            {/* Split Editor (Right Pane) */}
            {splitTabs.length > 0 && !isFlowchartVisible && (
              <div
                className="flex-1 flex flex-col min-w-0"
                style={{ borderLeft: "1px solid var(--theme-border)" }}
              >
                <div className="flex-1 flex flex-col min-h-0">
                  {activeSplitFileId && findFile(files, activeSplitFileId) ? (
                    <MonacoEditor
                      activeFile={findFile(files, activeSplitFileId)!}
                      onContentChange={handleContentChange}
                      onRun={handleRun}
                      isCompiling={isCompiling}
                      markers={markers}
                      openTabs={splitTabs}
                      files={files}
                      onTabClick={handleSplitTabClick}
                      onTabClose={handleSplitTabClose}
                    />
                  ) : (
                    <div
                      className="flex-1 flex items-center justify-center text-muted-foreground"
                      style={{ backgroundColor: "var(--theme-bg-dark)" }}
                    >
                      Select a file
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Flowchart Panel (Right Pane) with Resize Handle */}
            {isFlowchartVisible && (
              <div
                className="flex min-w-0 relative"
                style={{ 
                  width: `${flowchartPanelWidth}px`,
                  minWidth: "250px",
                  maxWidth: "70%",
                }}
              >
                {/* Resize Handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 z-10"
                  style={{ 
                    backgroundColor: isResizingFlowchart ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingFlowchart(true);
                    const startX = e.clientX;
                    const startWidth = flowchartPanelWidth;
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const delta = startX - moveEvent.clientX;
                      const newWidth = Math.max(250, Math.min(window.innerWidth * 0.7, startWidth + delta));
                      setFlowchartPanelWidth(newWidth);
                    };
                    
                    const handleMouseUp = () => {
                      setIsResizingFlowchart(false);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("c-studio-flowchart-width", flowchartPanelWidth.toString());
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      }
                    };
                    
                    if (typeof window !== "undefined") {
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }
                  }}
                />
                
                {/* Panel Content */}
                <div 
                  className="flex-1 flex flex-col"
                  style={{ borderLeft: "1px solid var(--theme-border)" }}
                >
                  <FlowchartPanel
                    source={activeFile?.content || ""}
                    language={activeFile?.name.endsWith('.algo') ? 'algo' : 'c'}
                    onParseError={(error) => {
                      setFlowchartStatus('error');
                      setFlowchartError(error);
                    }}
                    onParseSuccess={() => {
                      setFlowchartStatus('ok');
                      setFlowchartError(undefined);
                    }}
                      onCodeChange={(newCode) => {
                        if (activeFileId) {
                          handleContentChange(newCode, activeFileId);
                        }
                      }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Update notification popup */}
        {updateInfo && (
          <UpdateNotification
            updateInfo={updateInfo}
            onDismiss={() => setUpdateInfo(null)}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default function CCodeStudio() {
  return (
    <ShortcutProvider>
      <CCodeStudioInner />
    </ShortcutProvider>
  );
}
