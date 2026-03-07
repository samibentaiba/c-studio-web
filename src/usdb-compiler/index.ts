// USDB Algorithmic Language - Main Compiler Entry Point
// Université Saad Dahlab - Blida 1

import { Parser } from "./parser";
import { SemanticAnalyzer } from "./semantic";
import { CodeGenerator } from "./codegen";
import { CompilationResult, CompilerError } from "./errors";

export type { CompilationResult, CompilerError } from "./errors";
export { Lexer } from "./lexer";
export type { Token, TokenType } from "./lexer";
export * as AST from "./ast";
export { translateCToAlgo } from "./c-to-algo";

/**
 * Compile USDB Algo source code to C.
 *
 * @param source - The USDB Algo source code
 * @returns Compilation result with C code or errors
 */
export function compile(source: string): CompilationResult {
  const errors: CompilerError[] = [];
  const warnings: CompilerError[] = [];

  // Phase 1: Parse
  const parser = new Parser();
  const { ast, errors: parseErrors } = parser.parse(source);

  if (parseErrors.length > 0) {
    return {
      success: false,
      errors: parseErrors,
      warnings: [],
    };
  }

  if (!ast) {
    return {
      success: false,
      errors: [
        {
          message: "Failed to parse program",
          location: { line: 1, column: 1, offset: 0 },
          severity: "error",
          name: "ParseError",
          toString: () => "Failed to parse program",
        } as CompilerError,
      ],
      warnings: [],
    };
  }

  // Phase 2: Semantic Analysis
  const semanticAnalyzer = new SemanticAnalyzer();
  const { errors: semanticErrors } = semanticAnalyzer.analyze(ast);

  // Separate errors and warnings
  for (const err of semanticErrors) {
    if (err.severity === "warning") {
      warnings.push(err);
    } else {
      errors.push(err);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  // Phase 3: Code Generation
  const codeGenerator = new CodeGenerator();
  const { code, errors: codeGenErrors } = codeGenerator.generate(ast);

  if (codeGenErrors.length > 0) {
    return {
      success: false,
      errors: codeGenErrors,
      warnings,
    };
  }

  return {
    success: true,
    cCode: code,
    errors: [],
    warnings,
  };
}

/**
 * Get the file extension for USDB Algo source files.
 */
export const USDB_EXTENSION = ".algo";

/**
 * Check if a filename is a USDB Algo source file.
 */
export function isUSDBFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(USDB_EXTENSION);
}
