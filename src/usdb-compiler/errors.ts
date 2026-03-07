// USDB Algorithmic Language - Error Types
// Université Saad Dahlab - Blida 1

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

export class CompilerError extends Error {
  constructor(
    message: string,
    public location: SourceLocation,
    public severity: "error" | "warning" = "error"
  ) {
    super(message);
    this.name = "CompilerError";
  }

  toString(): string {
    return `[${this.severity.toUpperCase()}] Line ${this.location.line}, Column ${this.location.column}: ${this.message}`;
  }
}

export class LexerError extends CompilerError {
  constructor(message: string, location: SourceLocation) {
    super(message, location);
    this.name = "LexerError";
  }
}

export class ParserError extends CompilerError {
  constructor(message: string, location: SourceLocation) {
    super(message, location);
    this.name = "ParserError";
  }
}

export class SemanticError extends CompilerError {
  constructor(
    message: string,
    location: SourceLocation,
    severity: "error" | "warning" = "error"
  ) {
    super(message, location, severity);
    this.name = "SemanticError";
  }
}

export class CodeGenError extends CompilerError {
  constructor(message: string, location: SourceLocation) {
    super(message, location);
    this.name = "CodeGenError";
  }
}

export interface CompilationResult {
  success: boolean;
  cCode?: string;
  errors: CompilerError[];
  warnings: CompilerError[];
}
