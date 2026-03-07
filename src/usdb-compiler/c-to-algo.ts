// USDB Algorithmic Language - C to Algo Translator
// A simple translator that converts basic C code to USDB Algo
// Limited to a subset of C that maps cleanly to Algo constructs
// Supports multi-file C projects by consolidating into single Algo output

interface TranslationResult {
  success: boolean;
  algoCode: string;
  warnings: string[];
  errors: string[];

  sourceMap: number[]; // index = algo line, value = c line
}

interface SourceLine {
  code: string;
  cLine: number;
}

interface Variable {
  name: string;
  type: string;
  isArray: boolean;
  arraySize?: string;
}

// Workspace files: Map of filename -> content
export function translateCToAlgo(
  cCode: string,
  workspaceFiles?: Map<string, string>
): TranslationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const variables: Variable[] = [];
  const constants: { name: string; value: string }[] = [];
  const types: string[] = []; // STRUCTURE and enum type declarations
  const functions: SourceLine[][] = []; // Array of function bodies
  const mainBody: SourceLine[] = [];
  const processedIncludes = new Set<string>();

  // Helper track current line number for algo generation
  let currentAlgoLine = 0;

  // Expand local includes recursively
  const expandedCode = expandIncludes(
    cCode,
    workspaceFiles,
    processedIncludes,
    warnings
  );

  const lines = expandedCode.split("\n");
  let inMain = false;
  let inFunction = false;
  let currentFunctionName = "";
  let currentFunctionBody: SourceLine[] = [];
  let currentFunctionParams: string[] = [];
  let currentFunctionReturnType = "";
  let braceCount = 0;
  let algorithmName = "TranslatedProgram";

  // Type mapping
  const typeMap: Record<string, string> = {
    int: "INTEGER",
    float: "REAL",
    double: "REAL",
    char: "CHAR",
    bool: "BOOLEAN",
    void: "VOID",
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("//")) continue;

    // Skip includes (already processed)
    if (line.startsWith("#include")) {
      continue;
    }

    // Handle #define as CONST
    if (line.startsWith("#define")) {
      const match = line.match(/#define\s+(\w+)\s+(.+)/);
      if (match) {
        constants.push({ name: match[1], value: match[2] });
      }
      continue;
    }

    // Handle typedef struct - parse multi-line struct definition
    if (line.match(/typedef\s+struct/)) {
      const structResult = parseStructDefinition(lines, i, typeMap);
      if (structResult) {
        types.push(structResult.algoType);
        i = structResult.endIndex; // Skip processed lines
        continue;
      }
    }

    // Handle struct without typedef
    if (line.match(/^struct\s+\w+\s*{/) || line.match(/^struct\s+\w+$/)) {
      const structResult = parseStructDefinition(lines, i, typeMap);
      if (structResult) {
        types.push(structResult.algoType);
        i = structResult.endIndex;
        continue;
      }
    }

    // Handle enum definition
    if (line.match(/typedef\s+enum/) || line.match(/^enum\s+\w+/)) {
      const enumResult = parseEnumDefinition(lines, i);
      if (enumResult) {
        types.push(enumResult.algoType);
        i = enumResult.endIndex;
        continue;
      }
    }

    // Track braces
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    // Detect main function
    if (line.match(/int\s+main\s*\(/)) {
      inMain = true;
      continue;
    }

    // Detect function declaration
    const funcMatch = line.match(
      /^(int|float|double|char|bool|void|struct\s+\w+|[A-Z]\w*)\s+(\w+)\s*\(([^)]*)\)\s*{?/
    );
    if (funcMatch && !inMain) {
      inFunction = true;
      let cReturn = funcMatch[1];
      if (cReturn.startsWith("struct ")) cReturn = cReturn.replace("struct ", "").trim();
      currentFunctionReturnType = typeMap[cReturn] || cReturn;
      currentFunctionName = funcMatch[2];
      currentFunctionParams = parseParams(funcMatch[3], typeMap);
      currentFunctionBody = [];
      continue;
    }

    // End of function/main
    if (line === "}" && braceCount === 0) {
      if (inFunction && currentFunctionName) {
        functions.push(
          generateAlgoFunction(
            currentFunctionName,
            currentFunctionReturnType,
            currentFunctionParams,
            currentFunctionBody,
            // We can approximate cLine for function start/end using current line i
             i 
          )
        );
        inFunction = false;
        currentFunctionName = "";
      }
      inMain = false;
      continue;
    }

    // Process statements
    if (inMain || inFunction) {
      const translated = translateStatement(line, typeMap, variables, warnings);
      if (translated) {
        const sourceLine: SourceLine = { code: translated, cLine: i };
        if (inMain) {
          mainBody.push(sourceLine);
        } else {
          currentFunctionBody.push(sourceLine);
        }
      }
    } else {
      // Global variable declaration
      const varMatch = line.match(/^(int|float|double|char|bool|struct\s+\w+|[A-Z]\w*)\s+(.+);$/);
      if (varMatch) {
        parseVariableDeclaration(
          varMatch[1],
          varMatch[2],
          typeMap,
          variables,
          warnings
        );
      }
    }
  }

  // Output Algo Code with Source Map construction
  let linesAccumulator: SourceLine[] = [];
  
  // Header
  linesAccumulator.push({ code: `ALGORITHM ${algorithmName}`, cLine: -1 });

  // Constants
  if (constants.length > 0) {
    linesAccumulator.push({ code: "", cLine: -1 });
    linesAccumulator.push({ code: "CONST", cLine: -1 });
    for (const c of constants) {
      linesAccumulator.push({ code: `    ${c.name} = ${c.value}`, cLine: -1 });
    }
  }

  // Types
  if (types.length > 0) {
    linesAccumulator.push({ code: "", cLine: -1 });
    linesAccumulator.push({ code: "TYPE", cLine: -1 });
    for (const t of types) {
      // Types are multiline strings, split them
      t.split("\n").forEach(l => linesAccumulator.push({ code: l, cLine: -1 }));
    }
  }

  // Variables
  if (variables.length > 0) {
    linesAccumulator.push({ code: "", cLine: -1 });
    linesAccumulator.push({ code: "VAR", cLine: -1 });
    const grouped = groupVariablesByType(variables);
    for (const [type, vars] of Object.entries(grouped)) {
      const simpleVars = vars.filter((v) => !v.isArray).map((v) => v.name);
      const arrayVars = vars.filter((v) => v.isArray);

      if (simpleVars.length > 0) {
        linesAccumulator.push({ code: `    ${simpleVars.join(", ")} : ${type}`, cLine: -1 });
      }
      for (const av of arrayVars) {
        linesAccumulator.push({ code: `    ${av.name} : ARRAY[${av.arraySize}] OF ${type}`, cLine: -1 });
      }
    }
  }

  // Functions
  for (const funcLines of functions) {
    linesAccumulator.push({ code: "", cLine: -1 });
    linesAccumulator.push(...funcLines);
  }

  // Main body
  linesAccumulator.push({ code: "", cLine: -1 });
  linesAccumulator.push({ code: "BEGIN", cLine: -1 });
  for (const stmt of mainBody) {
    linesAccumulator.push({ code: "    " + stmt.code, cLine: stmt.cLine });
  }
  linesAccumulator.push({ code: "END.", cLine: -1 });

  // Generate final code and map
  let finalCode = "";
  const sourceMap: number[] = [];
  
  linesAccumulator.forEach((line, index) => {
    finalCode += line.code + "\n";
    sourceMap.push(line.cLine);
  });

  return {
    success: errors.length === 0,
    algoCode: finalCode,
    warnings,
    errors,
    sourceMap,
  };
}

function parseParams(
  paramStr: string,
  typeMap: Record<string, string>
): string[] {
  if (!paramStr.trim() || paramStr.trim() === "void") return [];

  const params = paramStr.split(",").map((p) => p.trim());
  const result: string[] = [];

  for (const param of params) {
    const match = param.match(/^(int|float|double|char|bool|struct\s+\w+|[A-Z]\w*)\s+(\*?\s*\w+)$/);
    if (match) {
      let cType = match[1];
      let varName = match[2];
      let isRef = false;
      if (varName.includes("*")) {
          isRef = true;
          varName = varName.replace("*", "").trim();
      }
      if (cType.startsWith("struct ")) cType = cType.replace("struct ", "").trim();
      const algoType = typeMap[cType] || cType;
      const refPrefix = isRef ? "VAR " : "";
      result.push(`${refPrefix}${varName} : ${algoType}`);
    }
  }

  return result;
}

function parseVariableDeclaration(
  cType: string,
  varsStr: string,
  typeMap: Record<string, string>,
  variables: Variable[],
  warnings: string[]
): void {
  let algoType = typeMap[cType] || cType;
  if (cType.startsWith("struct ")) {
      algoType = cType.replace("struct ", "").trim();
  }

  const varNames = varsStr.split(",").map((v) => v.trim().replace(/;$/, ""));

  for (let varName of varNames) {
    // Check for array
    const arrayMatch = varName.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      variables.push({
        name: arrayMatch[1],
        type: algoType,
        isArray: true,
        arraySize: arrayMatch[2],
      });
    } else if (varName.includes("*")) {
      warnings.push(`Pointer '${varName}' not supported, skipped`);
    } else {
      // Handle initialization
      const initMatch = varName.match(/(\w+)\s*=\s*(.+)/);
      if (initMatch) {
        varName = initMatch[1];
      }
      variables.push({ name: varName, type: algoType, isArray: false });
    }
  }
}

function translateStatement(
  line: string,
  typeMap: Record<string, string>,
  variables: Variable[],
  warnings: string[]
): string | null {
  line = line.replace(/;$/, "").trim();

  // Skip return 0
  if (line === "return 0") return null;

  // Variable declaration with optional initialization
  const declMatch = line.match(/^(int|float|double|char|bool|struct\s+\w+|[A-Z]\w*)\s+(.+)/);
  if (declMatch) {
    parseVariableDeclaration(
      declMatch[1],
      declMatch[2],
      typeMap,
      variables,
      warnings
    );
    // Check if there's an initialization
    const initMatch = declMatch[2].match(/(\w+)\s*=\s*(.+)/);
    if (initMatch) {
      return `${initMatch[1]} <- ${translateExpression(initMatch[2])}`;
    }
    return null;
  }

  // printf
  const printfMatch = line.match(/printf\s*\(\s*(.+)\s*\)/);
  if (printfMatch) {
    return translatePrintf(printfMatch[1]);
  }

  // scanf
  const scanfMatch = line.match(/scanf\s*\(\s*(.+)\s*\)/);
  if (scanfMatch) {
    return translateScanf(scanfMatch[1]);
  }

  // if statement
  if (line.startsWith("if")) {
    const condMatch = line.match(/if\s*\((.+)\)\s*{?/);
    if (condMatch) {
      return `IF (${translateExpression(condMatch[1])}) THEN`;
    }
  }

  // else if
  if (line.match(/}\s*else\s+if/)) {
    const condMatch = line.match(/else\s+if\s*\((.+)\)\s*{?/);
    if (condMatch) {
      return `ELSE IF (${translateExpression(condMatch[1])}) THEN`;
    }
  }

  // else
  if (line.match(/}\s*else\s*{?/) || line === "else" || line === "else {") {
    return "ELSE";
  }

  // while loop
  if (line.startsWith("while")) {
    const condMatch = line.match(/while\s*\((.+)\)\s*{?/);
    if (condMatch) {
      return `WHILE (${translateExpression(condMatch[1])}) DO`;
    }
  }

  // for loop
  const forMatch = line.match(
    /for\s*\(\s*(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*(<|<=)\s*(.+?)\s*;\s*\w+\+\+\s*\)\s*{?/
  );
  if (forMatch) {
    const varName = forMatch[1];
    const start = forMatch[2];
    const op = forMatch[3];
    let end = translateExpression(forMatch[4]);
    if (op === "<") end = `${end} - 1`;
    return `FOR ${varName} <- ${start} TO ${end} DO`;
  }

  // for loop with step (i += step)
  const forStepMatch = line.match(
    /for\s*\(\s*(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*(<|<=)\s*(.+?)\s*;\s*\w+\s*\+=\s*(\d+)\s*\)\s*{?/
  );
  if (forStepMatch) {
    const varName = forStepMatch[1];
    const start = forStepMatch[2];
    const op = forStepMatch[3];
    let end = translateExpression(forStepMatch[4]);
    const step = forStepMatch[5];
    if (op === "<") end = `${end} - 1`;
    return `FOR ${varName} <- ${start} TO ${end} STEP ${step} DO`;
  }

  // do-while (start)
  if (line === "do" || line === "do {") {
    return "DO";
  }

  // do-while (end with condition)
  const doWhileMatch = line.match(/}\s*while\s*\((.+)\)\s*;?/);
  if (doWhileMatch) {
    return `WHILE (${translateExpression(doWhileMatch[1])})`;
  }

  // switch statement
  const switchMatch = line.match(/switch\s*\((.+)\)\s*{?/);
  if (switchMatch) {
    return `SWITCH ${translateExpression(switchMatch[1])} BEGIN`;
  }

  // case statement
  const caseMatch = line.match(/case\s+(.+?):/);
  if (caseMatch) {
    return `CASE ${translateExpression(caseMatch[1])} :`;
  }

  // default case
  if (line === "default:" || line.startsWith("default:")) {
    return "DEFAULT :";
  }

  // break (skip - not needed in USDB Algo)
  if (line === "break") {
    return null;
  }

  // Closing brace - skip (handled by brace tracking)
  if (line === "}") {
    return null;
  }

  // return statement
  const returnMatch = line.match(/return\s+(.+)/);
  if (returnMatch) {
    return `RETURN(${translateExpression(returnMatch[1])})`;
  }

  // Assignment
  const assignMatch = line.match(/^(\w+(?:\[\w+\])?)\s*=\s*(.+)/);
  if (assignMatch) {
    return `${assignMatch[1]} <- ${translateExpression(assignMatch[2])}`;
  }

  // Function call
  const callMatch = line.match(/^(\w+)\s*\((.+)?\)/);
  if (callMatch) {
    const args = callMatch[2] ? translateExpression(callMatch[2]) : "";
    return `${callMatch[1]}(${args})`;
  }

  return null;
}

function translateExpression(expr: string): string {
  expr = expr.trim();

  // Replace == with =
  expr = expr.replace(/==/g, "=");

  // Replace != with <>
  expr = expr.replace(/!=/g, "<>");

  // Replace && with AND
  expr = expr.replace(/&&/g, " AND ");

  // Replace || with OR
  expr = expr.replace(/\|\|/g, " OR ");

  // Replace ! with NOT (but not !=)
  expr = expr.replace(/!(?!=)/g, "NOT ");

  // Replace % with MOD
  expr = expr.replace(/%/g, " MOD ");

  // Replace pow() with ^
  expr = expr.replace(/pow\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, "($1 ^ $2)");

  return expr;
}

function translatePrintf(args: string): string {
  // Parse printf arguments
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let parenDepth = 0;

  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === '"' && args[i - 1] !== "\\") {
      inString = !inString;
      current += char;
    } else if (char === "(" && !inString) {
      parenDepth++;
      current += char;
    } else if (char === ")" && !inString) {
      parenDepth--;
      current += char;
    } else if (char === "," && !inString && parenDepth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  // First part is format string
  if (parts.length === 0) return "PRINT()";

  const formatStr = parts[0];
  const printArgs: string[] = [];

  // Extract string literals and variables
  const cleanFormat = formatStr.replace(/^"|"$/g, "").replace(/\\n/g, "");
  if (cleanFormat && !cleanFormat.match(/^%/)) {
    // Has a string prefix
    const textMatch = cleanFormat.match(/^([^%]+)/);
    if (textMatch) {
      printArgs.push(`"${textMatch[1]}"`);
    }
  }

  // Add variables
  for (let i = 1; i < parts.length; i++) {
    printArgs.push(parts[i]);
  }

  return `PRINT(${printArgs.join(", ")})`;
}

function translateScanf(args: string): string {
  // Extract variable references (remove & and format string)
  const varMatch = args.match(/&(\w+)/g);
  if (varMatch) {
    const vars = varMatch.map((v) => v.replace("&", ""));
    return `SCAN(${vars.join(", ")})`;
  }
  return "SCAN()";
}

function generateAlgoFunction(
  name: string,
  returnType: string,
  params: string[],
  body: SourceLine[],
  endLine: number
): SourceLine[] {
  const paramStr = params.join(", ");
  const isProc = returnType === "VOID";
  const result: SourceLine[] = [];

  const header = isProc
    ? `PROCEDURE ${name}(${paramStr})`
    : `FUNCTION ${name}(${paramStr}) : ${returnType}`;
  
  result.push({ code: header, cLine: -1 }); // Header doesn't map perfectly to one line usually
  result.push({ code: "VAR", cLine: -1 }); // Implicit VAR block
  result.push({ code: "BEGIN", cLine: -1 });
  
  for (const stmt of body) {
    result.push({ code: "    " + stmt.code, cLine: stmt.cLine });
  }
  result.push({ code: "END", cLine: endLine });

  return result;
}

function groupVariablesByType(
  variables: Variable[]
): Record<string, Variable[]> {
  const groups: Record<string, Variable[]> = {};
  for (const v of variables) {
    if (!groups[v.type]) groups[v.type] = [];
    groups[v.type].push(v);
  }
  return groups;
}

/**
 * Expand local #include directives by inlining content from workspace files.
 * Only handles local includes (#include "file.h"), ignores system includes (<...>).
 */
function expandIncludes(
  code: string,
  workspaceFiles: Map<string, string> | undefined,
  processedIncludes: Set<string>,
  warnings: string[]
): string {
  if (!workspaceFiles) return code;

  const lines = code.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for local include
    const includeMatch = trimmed.match(/#include\s+"([^"]+)"/);
    if (includeMatch) {
      const filename = includeMatch[1];

      // Skip if already processed (prevent infinite loops)
      if (processedIncludes.has(filename)) {
        result.push(`// Already included: ${filename}`);
        continue;
      }

      // Try to find the file in workspace
      const content = findFileInWorkspace(filename, workspaceFiles);
      if (content) {
        processedIncludes.add(filename);
        result.push(`// --- Inlined from ${filename} ---`);
        // Recursively expand includes in the included file
        const expanded = expandIncludes(
          content,
          workspaceFiles,
          processedIncludes,
          warnings
        );
        result.push(expanded);
        result.push(`// --- End of ${filename} ---`);

        // If this is a .h header, also try to include the corresponding .c source file
        // This ensures function implementations are included, not just prototypes
        if (filename.endsWith(".h")) {
          const sourceFile = filename.replace(/\.h$/, ".c");
          if (!processedIncludes.has(sourceFile)) {
            const sourceContent = findFileInWorkspace(
              sourceFile,
              workspaceFiles
            );
            if (sourceContent) {
              processedIncludes.add(sourceFile);
              result.push(`// --- Inlined companion source: ${sourceFile} ---`);
              const expandedSource = expandIncludes(
                sourceContent,
                workspaceFiles,
                processedIncludes,
                warnings
              );
              result.push(expandedSource);
              result.push(`// --- End of ${sourceFile} ---`);
            }
          }
        }
      } else {
        warnings.push(`Could not find included file: ${filename}`);
        result.push(`// Include not found: ${filename}`);
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

/**
 * Find a file in the workspace by name (supports path variants).
 */
function findFileInWorkspace(
  filename: string,
  workspaceFiles: Map<string, string>
): string | undefined {
  // Direct match
  if (workspaceFiles.has(filename)) {
    return workspaceFiles.get(filename);
  }

  // Try basename match (for includes like "utils.h" matching "src/utils.h")
  for (const [path, content] of workspaceFiles) {
    if (path.endsWith("/" + filename) || path === filename) {
      return content;
    }
  }

  return undefined;
}

/**
 * Parse a C struct definition and convert to USDB Algo STRUCTURE syntax.
 * Handles: typedef struct { ... } Name; and struct Name { ... };
 */
function parseStructDefinition(
  lines: string[],
  startIndex: number,
  typeMap: Record<string, string>
): { algoType: string; endIndex: number } | null {
  let structName = "";
  const fields: string[] = [];
  let i = startIndex;
  let braceCount = 0;
  let foundStart = false;

  // Find struct name and opening brace
  for (; i < lines.length; i++) {
    const line = lines[i].trim();

    // typedef struct { or typedef struct Name {
    const typedefMatch = line.match(/typedef\s+struct\s*(\w*)\s*{?/);
    if (typedefMatch) {
      foundStart = true;
      if (line.includes("{")) braceCount = 1;
      continue;
    }

    // struct Name { or struct Name
    const structMatch = line.match(/^struct\s+(\w+)\s*{?/);
    if (structMatch) {
      structName = structMatch[1];
      foundStart = true;
      if (line.includes("{")) braceCount = 1;
      continue;
    }

    // Just opening brace
    if (foundStart && line === "{") {
      braceCount = 1;
      continue;
    }

    // Inside struct - parse fields
    if (braceCount > 0) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      // End of struct
      if (braceCount === 0) {
        // Check for typedef name: } TypeName;
        const endMatch = line.match(/}\s*(\w+)\s*;/);
        if (endMatch) {
          structName = endMatch[1];
        }
        break;
      }

      // Parse field: type name;
      const fieldMatch = line.match(
        /^\s*(int|float|double|char|bool|\w+)\s+(\w+)\s*;/
      );
      if (fieldMatch) {
        const fieldType = typeMap[fieldMatch[1]] || fieldMatch[1].toUpperCase();
        const fieldName = fieldMatch[2];
        fields.push(`    ${fieldName} : ${fieldType}`);
      }
    }
  }

  if (!structName || fields.length === 0) {
    return null;
  }

  // Generate USDB Algo STRUCTURE syntax
  const algoType = `    ${structName} = STRUCTURE
BEGIN
${fields.join("\n")}
END`;

  return { algoType, endIndex: i };
}

/**
 * Parse a C enum definition and convert to USDB Algo enumerated type syntax.
 * Handles: typedef enum { ... } Name; and enum Name { ... };
 */
function parseEnumDefinition(
  lines: string[],
  startIndex: number
): { algoType: string; endIndex: number } | null {
  let enumName = "";
  const values: string[] = [];
  let i = startIndex;
  let braceCount = 0;
  let foundStart = false;
  let enumContent = "";

  // Collect enum content
  for (; i < lines.length; i++) {
    const line = lines[i].trim();

    // typedef enum { or typedef enum Name {
    const typedefMatch = line.match(/typedef\s+enum\s*(\w*)\s*{?/);
    if (typedefMatch) {
      foundStart = true;
      if (line.includes("{")) {
        braceCount = 1;
        const afterBrace = line.split("{")[1];
        enumContent += afterBrace;
      }
      continue;
    }

    // enum Name { or enum Name
    const enumMatch = line.match(/^enum\s+(\w+)\s*{?/);
    if (enumMatch) {
      enumName = enumMatch[1];
      foundStart = true;
      if (line.includes("{")) {
        braceCount = 1;
        const afterBrace = line.split("{")[1];
        enumContent += afterBrace;
      }
      continue;
    }

    if (foundStart && braceCount === 0 && line.includes("{")) {
      braceCount = 1;
      enumContent += line.split("{")[1];
      continue;
    }

    if (braceCount > 0) {
      // Check for end
      if (line.includes("}")) {
        const beforeBrace = line.split("}")[0];
        enumContent += " " + beforeBrace;

        // Check for typedef name
        const endMatch = line.match(/}\s*(\w+)\s*;/);
        if (endMatch) {
          enumName = endMatch[1];
        }
        break;
      }
      enumContent += " " + line;
    }
  }

  if (!enumName) {
    return null;
  }

  // Parse enum values (ignore = value assignments)
  const cleanContent = enumContent.replace(/\s+/g, " ").trim();
  const valueMatches = cleanContent.split(",");
  for (const v of valueMatches) {
    const valueName = v.trim().split("=")[0].trim().split(" ")[0];
    if (valueName && /^\w+$/.test(valueName)) {
      values.push(valueName);
    }
  }

  if (values.length === 0) {
    return null;
  }

  // Generate USDB Algo enum syntax: TYPE Name = (Val1, Val2, ...)
  const algoType = `    ${enumName} = (${values.join(", ")})`;

  return { algoType, endIndex: i };
}
