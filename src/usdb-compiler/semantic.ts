// USDB Algorithmic Language - Semantic Analyzer
// Université Saad Dahlab - Blida 1
// Type checking, scope analysis, and semantic validation

import { SemanticError, SourceLocation } from "./errors";
import * as AST from "./ast";

// Symbol types
export type SymbolType =
  | { kind: "integer" }
  | { kind: "real" }
  | { kind: "boolean" }
  | { kind: "char" }
  | { kind: "string" }
  | { kind: "array"; dimensions: number[]; elementType: SymbolType }
  | { kind: "structure"; fields: Map<string, SymbolType> }
  | { kind: "function"; params: SymbolType[]; returnType: SymbolType }
  | { kind: "procedure"; params: SymbolType[] }
  | { kind: "unknown" };

export interface Symbol {
  name: string;
  type: SymbolType;
  isConstant: boolean;
  constantValue?: unknown;
  byReference?: boolean;
}

export class SymbolTable {
  private scopes: Map<string, Symbol>[] = [new Map()];

  enterScope(): void {
    this.scopes.push(new Map());
  }

  exitScope(): void {
    if (this.scopes.length > 1) {
      this.scopes.pop();
    }
  }

  define(symbol: Symbol): void {
    this.scopes[this.scopes.length - 1].set(symbol.name.toLowerCase(), symbol);
  }

  lookup(name: string): Symbol | undefined {
    const lowerName = name.toLowerCase();
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const symbol = this.scopes[i].get(lowerName);
      if (symbol) return symbol;
    }
    return undefined;
  }

  lookupLocal(name: string): Symbol | undefined {
    return this.scopes[this.scopes.length - 1].get(name.toLowerCase());
  }
}

export class SemanticAnalyzer {
  private symbolTable = new SymbolTable();
  private typeTable = new Map<string, SymbolType>();
  private errors: SemanticError[] = [];
  private currentFunction: string | null = null;

  analyze(program: AST.Program): { errors: SemanticError[] } {
    this.symbolTable = new SymbolTable();
    this.typeTable = new Map();
    this.errors = [];

    // Define built-in functions
    this.defineBuiltins();

    // Analyze program
    this.analyzeProgram(program);

    return { errors: this.errors };
  }

  private defineBuiltins(): void {
    // Math functions
    const mathFuncs = [
      "sqrt",
      "abs",
      "sin",
      "cos",
      "tan",
      "ln",
      "log",
      "exp",
      "floor",
      "ceil",
      "round",
    ];
    for (const fn of mathFuncs) {
      this.symbolTable.define({
        name: fn,
        type: {
          kind: "function",
          params: [{ kind: "real" }],
          returnType: { kind: "real" },
        },
        isConstant: true,
      });
    }

    // String functions
    this.symbolTable.define({
      name: "length",
      type: {
        kind: "function",
        params: [{ kind: "string" }],
        returnType: { kind: "integer" },
      },
      isConstant: true,
    });
  }

  private analyzeProgram(program: AST.Program): void {
    // Process type declarations first
    for (const typeDecl of program.types) {
      const type = this.resolveTypeExpression(typeDecl.definition);
      this.typeTable.set(typeDecl.name.toLowerCase(), type);
    }

    // Process constants
    for (const constDecl of program.constants) {
      const type = this.inferLiteralType(constDecl.value);
      this.symbolTable.define({
        name: constDecl.name,
        type,
        isConstant: true,
        constantValue: this.getLiteralValue(constDecl.value),
      });
    }

    // Process variables
    for (const varDecl of program.variables) {
      const type = this.resolveTypeExpression(varDecl.varType);
      for (const name of varDecl.names) {
        this.symbolTable.define({ name, type, isConstant: false });
      }
    }

    // Process functions and procedures (first pass - define signatures)
    for (const func of program.functions) {
      const params = func.parameters.map((p) =>
        this.resolveTypeExpression(p.paramType)
      );
      const returnType = this.resolveTypeExpression(func.returnType);
      this.symbolTable.define({
        name: func.name,
        type: { kind: "function", params, returnType },
        isConstant: true,
      });
    }

    for (const proc of program.procedures) {
      const params = proc.parameters.map((p) =>
        this.resolveTypeExpression(p.paramType)
      );
      this.symbolTable.define({
        name: proc.name,
        type: { kind: "procedure", params },
        isConstant: true,
      });
    }

    // Second pass - analyze function/procedure bodies
    for (const func of program.functions) {
      this.analyzeFunction(func);
    }

    for (const proc of program.procedures) {
      this.analyzeProcedure(proc);
    }

    // Analyze main body
    for (const stmt of program.body) {
      this.analyzeStatement(stmt);
    }
  }

  private analyzeFunction(func: AST.FunctionDeclaration): void {
    this.symbolTable.enterScope();
    this.currentFunction = func.name;

    // Add parameters
    for (const param of func.parameters) {
      const type = this.resolveTypeExpression(param.paramType);
      this.symbolTable.define({
        name: param.name,
        type,
        isConstant: false,
        byReference: param.byReference,
      });
    }

    // Add local declarations
    this.analyzeLocalDeclarations(func.constants, func.types, func.variables);

    // Analyze body
    for (const stmt of func.body) {
      this.analyzeStatement(stmt);
    }

    this.currentFunction = null;
    this.symbolTable.exitScope();
  }

  private analyzeProcedure(proc: AST.ProcedureDeclaration): void {
    this.symbolTable.enterScope();

    // Add parameters
    for (const param of proc.parameters) {
      const type = this.resolveTypeExpression(param.paramType);
      this.symbolTable.define({
        name: param.name,
        type,
        isConstant: false,
        byReference: param.byReference,
      });
    }

    // Add local declarations
    this.analyzeLocalDeclarations(proc.constants, proc.types, proc.variables);

    // Analyze body
    for (const stmt of proc.body) {
      this.analyzeStatement(stmt);
    }

    this.symbolTable.exitScope();
  }

  private analyzeLocalDeclarations(
    constants: AST.ConstDeclaration[],
    types: AST.TypeDeclaration[],
    variables: AST.VarDeclaration[]
  ): void {
    for (const typeDecl of types) {
      const type = this.resolveTypeExpression(typeDecl.definition);
      this.typeTable.set(typeDecl.name.toLowerCase(), type);
    }

    for (const constDecl of constants) {
      const type = this.inferLiteralType(constDecl.value);
      this.symbolTable.define({
        name: constDecl.name,
        type,
        isConstant: true,
        constantValue: this.getLiteralValue(constDecl.value),
      });
    }

    for (const varDecl of variables) {
      const type = this.resolveTypeExpression(varDecl.varType);
      for (const name of varDecl.names) {
        this.symbolTable.define({ name, type, isConstant: false });
      }
    }
  }

  private analyzeStatement(stmt: AST.Statement): void {
    switch (stmt.type) {
      case "AssignmentStatement":
        this.analyzeAssignment(stmt);
        break;
      case "IfStatement":
        this.analyzeExpression(stmt.condition);
        for (const s of stmt.thenBranch) this.analyzeStatement(s);
        if (stmt.elseBranch) {
          for (const s of stmt.elseBranch) this.analyzeStatement(s);
        }
        break;
      case "WhileStatement":
        this.analyzeExpression(stmt.condition);
        for (const s of stmt.body) this.analyzeStatement(s);
        break;
      case "DoWhileStatement":
        for (const s of stmt.body) this.analyzeStatement(s);
        this.analyzeExpression(stmt.condition);
        break;
      case "ForStatement":
        this.analyzeExpression(stmt.start);
        this.analyzeExpression(stmt.end);
        if (stmt.step) this.analyzeExpression(stmt.step);
        for (const s of stmt.body) this.analyzeStatement(s);
        break;
      case "SwitchStatement":
        this.analyzeExpression(stmt.expression);
        for (const c of stmt.cases) {
          for (const v of c.values) this.analyzeExpression(v);
          for (const s of c.body) this.analyzeStatement(s);
        }
        if (stmt.defaultCase) {
          for (const s of stmt.defaultCase) this.analyzeStatement(s);
        }
        break;
      case "CallStatement":
        this.analyzeCall(stmt);
        break;
      case "ScanStatement":
        for (const target of stmt.targets) {
          this.analyzeLValue(target);
        }
        break;
      case "PrintStatement":
        for (const expr of stmt.expressions) {
          this.analyzeExpression(expr);
        }
        break;
      case "ReturnStatement":
        this.analyzeExpression(stmt.value);
        break;
      case "BlockStatement":
        for (const s of stmt.statements) this.analyzeStatement(s);
        break;
    }
  }

  private analyzeAssignment(stmt: AST.AssignmentStatement): void {
    this.analyzeLValue(stmt.target);
    this.analyzeExpression(stmt.value);

    // Check for constant assignment
    if (stmt.target.type === "Identifier") {
      const symbol = this.symbolTable.lookup(stmt.target.name);
      if (symbol?.isConstant) {
        this.error(
          `Cannot assign to constant '${stmt.target.name}'`,
          stmt.target.span?.start
        );
      }
    }
  }

  private analyzeCall(stmt: AST.CallStatement): void {
    const symbol = this.symbolTable.lookup(stmt.name);
    if (!symbol) {
      this.error(`Undefined procedure '${stmt.name}'`, stmt.span?.start);
      return;
    }

    if (symbol.type.kind !== "procedure" && symbol.type.kind !== "function") {
      this.error(`'${stmt.name}' is not a procedure`, stmt.span?.start);
    }

    for (const arg of stmt.arguments) {
      this.analyzeExpression(arg);
    }
  }

  private analyzeLValue(lvalue: AST.LValue): void {
    if (lvalue.type === "Identifier") {
      const symbol = this.symbolTable.lookup(lvalue.name);
      if (!symbol) {
        this.error(`Undefined variable '${lvalue.name}'`, lvalue.span?.start);
      }
    } else if (lvalue.type === "ArrayAccess") {
      this.analyzeExpression(lvalue.array);
      for (const index of lvalue.indices) {
        this.analyzeExpression(index);
      }
    } else if (lvalue.type === "FieldAccess") {
      this.analyzeExpression(lvalue.object);
    }
  }

  private analyzeExpression(expr: AST.Expression): SymbolType {
    switch (expr.type) {
      case "IntegerLiteral":
        return { kind: "integer" };
      case "RealLiteral":
        return { kind: "real" };
      case "BooleanLiteral":
        return { kind: "boolean" };
      case "CharLiteral":
        return { kind: "char" };
      case "StringLiteral":
        return { kind: "string" };
      case "Identifier":
        return this.analyzeIdentifier(expr);
      case "BinaryExpression":
        return this.analyzeBinaryExpression(expr);
      case "UnaryExpression":
        return this.analyzeUnaryExpression(expr);
      case "ArrayAccess":
        return this.analyzeArrayAccess(expr);
      case "FieldAccess":
        return this.analyzeFieldAccess(expr);
      case "FunctionCall":
        return this.analyzeFunctionCall(expr);
      case "ParenExpression":
        return this.analyzeExpression(expr.expression);
      default:
        return { kind: "unknown" };
    }
  }

  private analyzeIdentifier(expr: AST.Identifier): SymbolType {
    const symbol = this.symbolTable.lookup(expr.name);
    if (!symbol) {
      this.error(`Undefined identifier '${expr.name}'`, expr.span?.start);
      return { kind: "unknown" };
    }
    return symbol.type;
  }

  private analyzeBinaryExpression(expr: AST.BinaryExpression): SymbolType {
    const leftType = this.analyzeExpression(expr.left);
    const rightType = this.analyzeExpression(expr.right);

    // Arithmetic operators
    if (["+", "-", "*", "/", "^", "DIV", "MOD"].includes(expr.operator)) {
      if (leftType.kind === "real" || rightType.kind === "real") {
        return { kind: "real" };
      }
      return { kind: "integer" };
    }

    // Relational operators
    if (["=", "<>", "<", ">", "<=", ">="].includes(expr.operator)) {
      return { kind: "boolean" };
    }

    // Logical operators
    if (["AND", "OR"].includes(expr.operator)) {
      return { kind: "boolean" };
    }

    return { kind: "unknown" };
  }

  private analyzeUnaryExpression(expr: AST.UnaryExpression): SymbolType {
    const operandType = this.analyzeExpression(expr.operand);

    if (expr.operator === "-") {
      return operandType;
    }

    if (expr.operator === "NOT") {
      return { kind: "boolean" };
    }

    return { kind: "unknown" };
  }

  private analyzeArrayAccess(expr: AST.ArrayAccess): SymbolType {
    const arrayType = this.analyzeExpression(expr.array);

    for (const index of expr.indices) {
      this.analyzeExpression(index);
    }

    if (arrayType.kind === "array") {
      return arrayType.elementType;
    }

    return { kind: "unknown" };
  }

  private analyzeFieldAccess(expr: AST.FieldAccess): SymbolType {
    const objectType = this.analyzeExpression(expr.object);

    if (objectType.kind === "structure") {
      const fieldType = objectType.fields.get(expr.field.toLowerCase());
      if (fieldType) return fieldType;
      this.error(`Unknown field '${expr.field}'`, expr.span?.start);
    }

    return { kind: "unknown" };
  }

  private analyzeFunctionCall(expr: AST.FunctionCall): SymbolType {
    const symbol = this.symbolTable.lookup(expr.name);

    if (!symbol) {
      this.error(`Undefined function '${expr.name}'`, expr.span?.start);
      return { kind: "unknown" };
    }

    if (symbol.type.kind !== "function") {
      this.error(`'${expr.name}' is not a function`, expr.span?.start);
      return { kind: "unknown" };
    }

    for (const arg of expr.arguments) {
      this.analyzeExpression(arg);
    }

    return symbol.type.returnType;
  }

  private resolveTypeExpression(typeExpr: AST.TypeExpression): SymbolType {
    switch (typeExpr.type) {
      case "PrimitiveType": {
        const typeMap: Record<string, SymbolType> = {
          INTEGER: { kind: "integer" },
          REAL: { kind: "real" },
          BOOLEAN: { kind: "boolean" },
          CHAR: { kind: "char" },
          STRING: { kind: "string" },
        };
        return typeMap[typeExpr.name] || { kind: "unknown" };
      }
      case "ArrayType": {
        const elementType = this.resolveTypeExpression(typeExpr.elementType);
        const dimensions = typeExpr.dimensions.map(() => 0); // Sizes determined at runtime
        return { kind: "array", dimensions, elementType };
      }
      case "StructureType": {
        const fields = new Map<string, SymbolType>();
        for (const field of typeExpr.fields) {
          const fieldType = this.resolveTypeExpression(field.varType);
          for (const name of field.names) {
            fields.set(name.toLowerCase(), fieldType);
          }
        }
        return { kind: "structure", fields };
      }
      case "TypeReference": {
        const resolved = this.typeTable.get(typeExpr.name.toLowerCase());
        if (resolved) return resolved;
        this.error(`Undefined type '${typeExpr.name}'`);
        return { kind: "unknown" };
      }
    }
  }

  private inferLiteralType(literal: AST.Literal): SymbolType {
    switch (literal.type) {
      case "IntegerLiteral":
        return { kind: "integer" };
      case "RealLiteral":
        return { kind: "real" };
      case "BooleanLiteral":
        return { kind: "boolean" };
      case "CharLiteral":
        return { kind: "char" };
      case "StringLiteral":
        return { kind: "string" };
    }
  }

  private getLiteralValue(literal: AST.Literal): unknown {
    switch (literal.type) {
      case "IntegerLiteral":
        return literal.value;
      case "RealLiteral":
        return literal.value;
      case "BooleanLiteral":
        return literal.value;
      case "CharLiteral":
        return literal.value;
      case "StringLiteral":
        return literal.value;
    }
  }

  private error(message: string, location?: SourceLocation): void {
    this.errors.push(
      new SemanticError(message, location || { line: 1, column: 1, offset: 0 })
    );
  }
}
