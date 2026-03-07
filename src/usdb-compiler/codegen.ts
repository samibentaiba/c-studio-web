// USDB Algorithmic Language - C Code Generator
// Université Saad Dahlab - Blida 1
// Translates AST to C99 code

import * as AST from "./ast";
import { CodeGenError, SourceLocation } from "./errors";

export class CodeGenerator {
  private output: string[] = [];
  private indentLevel: number = 0;
  private indentStr: string = "    ";
  private errors: CodeGenError[] = [];
  private typeMap: Map<string, string> = new Map(); // Track variable types
  private refMap: Set<string> = new Set(); // Track reference parameters

  generate(program: AST.Program): { code: string; errors: CodeGenError[] } {
    this.output = [];
    this.errors = [];
    this.indentLevel = 0;

    this.generateProgram(program);

    return { code: this.output.join("\n"), errors: this.errors };
  }

  private emit(line: string): void {
    this.output.push(this.indentStr.repeat(this.indentLevel) + line);
  }

  private emitRaw(line: string): void {
    this.output.push(line);
  }

  // ==================== Program Structure ====================

  private generateProgram(program: AST.Program): void {
    // Headers
    this.emitRaw("// Generated from USDB Algorithmic Language");
    this.emitRaw(`// Algorithm: ${program.name}`);
    this.emitRaw("");
    this.emitRaw("#include <stdio.h>");
    this.emitRaw("#include <stdlib.h>");
    this.emitRaw("#include <string.h>");
    this.emitRaw("#include <math.h>");
    this.emitRaw("#include <stdbool.h>");
    this.emitRaw("");

    // Type definitions (structures)
    for (const typeDecl of program.types) {
      this.generateTypeDeclaration(typeDecl);
    }

    // Constants
    for (const constDecl of program.constants) {
      this.generateConstDeclaration(constDecl);
    }

    // Global variables
    for (const varDecl of program.variables) {
      this.generateVarDeclaration(varDecl);
      // Track types
      const typeName = this.getPrimitiveTypeName(varDecl.varType);
      for (const name of varDecl.names) {
        this.typeMap.set(name.toLowerCase(), typeName);
      }
    }

    if (program.constants.length > 0 || program.variables.length > 0) {
      this.emitRaw("");
    }

    // Forward declarations for functions/procedures
    for (const func of program.functions) {
      this.generateFunctionPrototype(func);
    }
    for (const proc of program.procedures) {
      this.generateProcedurePrototype(proc);
    }

    if (program.functions.length > 0 || program.procedures.length > 0) {
      this.emitRaw("");
    }

    // Function/Procedure definitions
    for (const func of program.functions) {
      this.generateFunctionDefinition(func);
      this.emitRaw("");
    }

    for (const proc of program.procedures) {
      this.generateProcedureDefinition(proc);
      this.emitRaw("");
    }

    // Main function
    this.emitRaw("int main(void) {");
    this.indentLevel++;

    for (const stmt of program.body) {
      this.generateStatement(stmt);
    }

    this.emit("return 0;");
    this.indentLevel--;
    this.emitRaw("}");
  }

  // ==================== Declarations ====================

  private generateTypeDeclaration(typeDecl: AST.TypeDeclaration): void {
    if (typeDecl.definition.type === "StructureType") {
      this.emitRaw(`typedef struct {`);
      this.indentLevel++;
      for (const field of typeDecl.definition.fields) {
        const cType = this.typeExpressionToC(field.varType);
        for (const name of field.names) {
          this.emit(`${cType} ${name};`);
        }
      }
      this.indentLevel--;
      this.emitRaw(`} ${typeDecl.name};`);
      this.emitRaw("");
    } else if (typeDecl.definition.type === "ArrayType") {
      // Array type alias - will be handled inline
    }
  }

  private generateConstDeclaration(constDecl: AST.ConstDeclaration): void {
    const value = this.generateLiteral(constDecl.value);
    const cType = this.literalToCType(constDecl.value);
    this.emitRaw(`#define ${constDecl.name} ${value}`);
  }

  private generateVarDeclaration(varDecl: AST.VarDeclaration): void {
    const cType = this.typeExpressionToC(varDecl.varType);
    const arraySuffix = this.getArraySuffix(varDecl.varType);

    for (const name of varDecl.names) {
      this.emitRaw(`${cType} ${name}${arraySuffix};`);
    }
  }

  private generateFunctionPrototype(func: AST.FunctionDeclaration): void {
    const returnType = this.typeExpressionToC(func.returnType);
    const params = this.generateParameterList(func.parameters);
    this.emitRaw(`${returnType} ${func.name}(${params});`);
  }

  private generateProcedurePrototype(proc: AST.ProcedureDeclaration): void {
    const params = this.generateParameterList(proc.parameters);
    this.emitRaw(`void ${proc.name}(${params});`);
  }

  private generateFunctionDefinition(func: AST.FunctionDeclaration): void {
    const returnType = this.typeExpressionToC(func.returnType);
    const params = this.generateParameterList(func.parameters);

    this.emitRaw(`${returnType} ${func.name}(${params}) {`);
    this.indentLevel++;

    // Track ref parameters
    this.refMap.clear();
    for (const p of func.parameters) {
        if (p.byReference) this.refMap.add(p.name);
    }

    // Local declarations
    for (const varDecl of func.variables) {
      const cType = this.typeExpressionToC(varDecl.varType);
      const arraySuffix = this.getArraySuffix(varDecl.varType);
      for (const name of varDecl.names) {
        this.emit(`${cType} ${name}${arraySuffix};`);
      }
    }

    // Body
    for (const stmt of func.body) {
      this.generateStatement(stmt);
    }

    this.indentLevel--;
    this.emitRaw("}");
  }

  private generateProcedureDefinition(proc: AST.ProcedureDeclaration): void {
    const params = this.generateParameterList(proc.parameters);

    this.emitRaw(`void ${proc.name}(${params}) {`);
    this.indentLevel++;

    // Track ref parameters
    this.refMap.clear();
    for (const p of proc.parameters) {
        if (p.byReference) this.refMap.add(p.name);
    }

    // Local declarations
    for (const varDecl of proc.variables) {
      const cType = this.typeExpressionToC(varDecl.varType);
      const arraySuffix = this.getArraySuffix(varDecl.varType);
      for (const name of varDecl.names) {
        this.emit(`${cType} ${name}${arraySuffix};`);
      }
    }

    // Body
    for (const stmt of proc.body) {
      this.generateStatement(stmt);
    }

    this.indentLevel--;
    this.emitRaw("}");
  }

  private generateParameterList(params: AST.Parameter[]): string {
    if (params.length === 0) return "void";

    return params
      .map((p) => {
        const cType = this.typeExpressionToC(p.paramType);
        if (p.byReference) {
          return `${cType} *${p.name}`;
        }
        return `${cType} ${p.name}`;
      })
      .join(", ");
  }

  // ==================== Statements ====================

  private generateStatement(stmt: AST.Statement): void {
    switch (stmt.type) {
      case "AssignmentStatement":
        this.generateAssignment(stmt);
        break;
      case "IfStatement":
        this.generateIfStatement(stmt);
        break;
      case "WhileStatement":
        this.generateWhileStatement(stmt);
        break;
      case "DoWhileStatement":
        this.generateDoWhileStatement(stmt);
        break;
      case "ForStatement":
        this.generateForStatement(stmt);
        break;
      case "SwitchStatement":
        this.generateSwitchStatement(stmt);
        break;
      case "CallStatement":
        this.generateCallStatement(stmt);
        break;
      case "ScanStatement":
        this.generateScanStatement(stmt);
        break;
      case "PrintStatement":
        this.generatePrintStatement(stmt);
        break;
      case "ReturnStatement":
        this.generateReturnStatement(stmt);
        break;
      case "BlockStatement":
        for (const s of stmt.statements) {
          this.generateStatement(s);
        }
        break;
    }
  }

  private generateAssignment(stmt: AST.AssignmentStatement): void {
    const target = this.generateLValue(stmt.target);
    const value = this.generateExpression(stmt.value);
    this.emit(`${target} = ${value};`);
  }

  private generateIfStatement(stmt: AST.IfStatement): void {
    const condition = this.generateExpression(stmt.condition);
    this.emit(`if (${condition}) {`);
    this.indentLevel++;
    for (const s of stmt.thenBranch) {
      this.generateStatement(s);
    }
    this.indentLevel--;

    if (stmt.elseBranch && stmt.elseBranch.length > 0) {
      this.emit("} else {");
      this.indentLevel++;
      for (const s of stmt.elseBranch) {
        this.generateStatement(s);
      }
      this.indentLevel--;
    }
    this.emit("}");
  }

  private generateWhileStatement(stmt: AST.WhileStatement): void {
    const condition = this.generateExpression(stmt.condition);
    this.emit(`while (${condition}) {`);
    this.indentLevel++;
    for (const s of stmt.body) {
      this.generateStatement(s);
    }
    this.indentLevel--;
    this.emit("}");
  }

  private generateDoWhileStatement(stmt: AST.DoWhileStatement): void {
    this.emit("do {");
    this.indentLevel++;
    for (const s of stmt.body) {
      this.generateStatement(s);
    }
    this.indentLevel--;
    const condition = this.generateExpression(stmt.condition);
    this.emit(`} while (${condition});`);
  }

  private generateForStatement(stmt: AST.ForStatement): void {
    const start = this.generateExpression(stmt.start);
    const end = this.generateExpression(stmt.end);
    const step = stmt.step ? this.generateExpression(stmt.step) : "1";

    // Determine direction
    const stepExpr = stmt.step
      ? `${stmt.variable} += ${step}`
      : `${stmt.variable}++`;
    this.emit(
      `for (${stmt.variable} = ${start}; ${stmt.variable} <= ${end}; ${stepExpr}) {`
    );
    this.indentLevel++;
    for (const s of stmt.body) {
      this.generateStatement(s);
    }
    this.indentLevel--;
    this.emit("}");
  }

  private generateSwitchStatement(stmt: AST.SwitchStatement): void {
    const expression = this.generateExpression(stmt.expression);
    this.emit(`switch (${expression}) {`);
    this.indentLevel++;

    for (const caseClause of stmt.cases) {
      for (const value of caseClause.values) {
        const v = this.generateExpression(value);
        this.emit(`case ${v}:`);
      }
      this.indentLevel++;
      for (const s of caseClause.body) {
        this.generateStatement(s);
      }
      this.emit("break;");
      this.indentLevel--;
    }

    if (stmt.defaultCase) {
      this.emit("default:");
      this.indentLevel++;
      for (const s of stmt.defaultCase) {
        this.generateStatement(s);
      }
      this.emit("break;");
      this.indentLevel--;
    }

    this.indentLevel--;
    this.emit("}");
  }

  private generateCallStatement(stmt: AST.CallStatement): void {
    const args = stmt.arguments
      .map((a) => this.generateExpression(a))
      .join(", ");
    this.emit(`${stmt.name}(${args});`);
  }

  private generateScanStatement(stmt: AST.ScanStatement): void {
    for (const target of stmt.targets) {
      const lvalue = this.generateLValue(target);
      const format = this.inferScanFormat(target);
      // For simple variables, add &
      const ref = this.needsAddressOf(target) ? "&" : "";
      this.emit(`scanf("${format}", ${ref}${lvalue});`);
    }
  }

  private generatePrintStatement(stmt: AST.PrintStatement): void {
    const formats: string[] = [];
    const args: string[] = [];

    for (const expr of stmt.expressions) {
      const format = this.inferPrintFormat(expr);
      formats.push(format);
      args.push(this.generateExpression(expr));
    }

    const formatStr = formats.join("");
    const argsStr = args.length > 0 ? ", " + args.join(", ") : "";
    this.emit(`printf("${formatStr}\\n"${argsStr});`);
  }

  private generateReturnStatement(stmt: AST.ReturnStatement): void {
    const value = this.generateExpression(stmt.value);
    this.emit(`return ${value};`);
  }

  // ==================== Expressions ====================

  private generateExpression(expr: AST.Expression): string {
    switch (expr.type) {
      case "IntegerLiteral":
        return expr.value.toString();
      case "RealLiteral":
        return expr.value.toString();
      case "BooleanLiteral":
        return expr.value ? "true" : "false";
      case "CharLiteral":
        return `'${this.escapeChar(expr.value)}'`;
      case "StringLiteral":
        return `"${this.escapeString(expr.value)}"`;
      case "Identifier":
        return this.refMap.has(expr.name) ? `*${expr.name}` : expr.name;
      case "BinaryExpression":
        return this.generateBinaryExpression(expr);
      case "UnaryExpression":
        return this.generateUnaryExpression(expr);
      case "ArrayAccess":
        return this.generateArrayAccess(expr);
      case "FieldAccess":
        return this.generateFieldAccess(expr);
      case "FunctionCall":
        return this.generateFunctionCall(expr);
      case "ParenExpression":
        return `(${this.generateExpression(expr.expression)})`;
    }
  }

  private generateBinaryExpression(expr: AST.BinaryExpression): string {
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);

    const opMap: Record<string, string> = {
      "+": "+",
      "-": "-",
      "*": "*",
      "/": "/",
      "^": "", // Special: use pow()
      DIV: "/",
      MOD: "%",
      "=": "==",
      "<>": "!=",
      "<": "<",
      ">": ">",
      "<=": "<=",
      ">=": ">=",
      AND: "&&",
      OR: "||",
    };

    if (expr.operator === "^") {
      return `pow(${left}, ${right})`;
    }

    const op = opMap[expr.operator] || expr.operator;
    return `(${left} ${op} ${right})`;
  }

  private generateUnaryExpression(expr: AST.UnaryExpression): string {
    const operand = this.generateExpression(expr.operand);

    if (expr.operator === "NOT") {
      return `!${operand}`;
    }

    return `${expr.operator}${operand}`;
  }

  private generateArrayAccess(expr: AST.ArrayAccess): string {
    const array = this.generateExpression(expr.array);
    const indices = expr.indices
      .map((i) => `[${this.generateExpression(i)}]`)
      .join("");
    return `${array}${indices}`;
  }

  private generateFieldAccess(expr: AST.FieldAccess): string {
    const object = this.generateExpression(expr.object);
    // If it's a dereferenced pointer (*obj), then (*obj).field is valid, but we can simplify to obj->field if we wanted.
    // However (*obj).field is perfectly valid C. We just return it.
    // Wait, if object contains '*', we might need parens: (*obj).field.
    // Since generateExpression adds `*`, we should put parens around it if it's an identifier and in refMap.
    let objStr = object;
    if (expr.object.type === "Identifier" && this.refMap.has(expr.object.name)) {
        objStr = `(${object})`; // (*name)
    }
    return `${objStr}.${expr.field}`;
  }

  private generateFunctionCall(expr: AST.FunctionCall): string {
    const args = expr.arguments
      .map((a) => this.generateExpression(a))
      .join(", ");
    
    // Handle built-in math functions
    const funcName = expr.name.toUpperCase();
    const builtInFunctions: Record<string, string> = {
      // Absolute value
      "ABS": "fabs",
      // Square root
      "SQRT": "sqrt",
      // Power
      "POW": "pow",
      "POWER": "pow",
      // Min/Max (use ternary for C)
      "MIN": "__MIN__",
      "MAX": "__MAX__",
      // Rounding
      "FLOOR": "floor",
      "CEIL": "ceil",
      "ROUND": "round",
      "TRUNC": "trunc",
      // Logarithms
      "LOG": "log",
      "LOG10": "log10",
      "LOG2": "log2",
      "LN": "log",
      "EXP": "exp",
      // Trigonometric
      "SIN": "sin",
      "COS": "cos",
      "TAN": "tan",
      "ASIN": "asin",
      "ACOS": "acos",
      "ATAN": "atan",
      "ATAN2": "atan2",
      // Hyperbolic
      "SINH": "sinh",
      "COSH": "cosh",
      "TANH": "tanh",
      // Other
      "RANDOM": "rand",
      "RANDOMIZE": "srand",
    };
    
    if (builtInFunctions[funcName]) {
      const cFunc = builtInFunctions[funcName];
      
      // Special handling for MIN/MAX (use ternary operators)
      if (cFunc === "__MIN__" && expr.arguments.length >= 2) {
        const a = this.generateExpression(expr.arguments[0]);
        const b = this.generateExpression(expr.arguments[1]);
        return `((${a}) < (${b}) ? (${a}) : (${b}))`;
      }
      if (cFunc === "__MAX__" && expr.arguments.length >= 2) {
        const a = this.generateExpression(expr.arguments[0]);
        const b = this.generateExpression(expr.arguments[1]);
        return `((${a}) > (${b}) ? (${a}) : (${b}))`;
      }
      
      return `${cFunc}(${args})`;
    }
    
    return `${expr.name}(${args})`;
  }

  private generateLValue(lvalue: AST.LValue): string {
    switch (lvalue.type) {
      case "Identifier":
        return this.refMap.has(lvalue.name) ? `*${lvalue.name}` : lvalue.name;
      case "ArrayAccess":
        return this.generateArrayAccess(lvalue);
      case "FieldAccess":
        return this.generateFieldAccess(lvalue);
    }
  }

  private generateLiteral(literal: AST.Literal): string {
    switch (literal.type) {
      case "IntegerLiteral":
        return literal.value.toString();
      case "RealLiteral":
        return literal.value.toString();
      case "BooleanLiteral":
        return literal.value ? "true" : "false";
      case "CharLiteral":
        return `'${this.escapeChar(literal.value)}'`;
      case "StringLiteral":
        return `"${this.escapeString(literal.value)}"`;
    }
  }

  // ==================== Type Helpers ====================

  private typeExpressionToC(typeExpr: AST.TypeExpression): string {
    switch (typeExpr.type) {
      case "PrimitiveType":
        return this.primitiveToC(typeExpr.name);
      case "ArrayType":
        return this.typeExpressionToC(typeExpr.elementType);
      case "StructureType":
        return "struct"; // Structures are typedef'd
      case "TypeReference":
        return typeExpr.name;
    }
  }

  private primitiveToC(name: string): string {
    switch (name) {
      case "INTEGER":
        return "int";
      case "REAL":
        return "double";
      case "BOOLEAN":
        return "bool";
      case "CHAR":
        return "char";
      case "STRING":
        return "char*";
      default:
        return "int";
    }
  }

  private getPrimitiveTypeName(typeExpr: AST.TypeExpression): string {
    if (typeExpr.type === "PrimitiveType") {
      return typeExpr.name;
    }
    if (typeExpr.type === "ArrayType") {
      return this.getPrimitiveTypeName(typeExpr.elementType);
    }
    return "INTEGER";
  }

  private literalToCType(literal: AST.Literal): string {
    switch (literal.type) {
      case "IntegerLiteral":
        return "int";
      case "RealLiteral":
        return "double";
      case "BooleanLiteral":
        return "bool";
      case "CharLiteral":
        return "char";
      case "StringLiteral":
        return "const char*";
    }
  }

  private getArraySuffix(typeExpr: AST.TypeExpression): string {
    if (typeExpr.type !== "ArrayType") return "";

    return typeExpr.dimensions
      .map((d) => {
        const size = this.generateExpression(d);
        return `[${size}]`;
      })
      .join("");
  }

  private inferScanFormat(target: AST.LValue): string {
    // Use tracked type information
    if (target.type === "Identifier") {
      const typeName = this.typeMap.get(target.name.toLowerCase());
      if (typeName === "REAL") return "%lf";
      if (typeName === "CHAR") return " %c";
      if (typeName === "STRING") return "%s";
    }
    return "%d";
  }

  private inferPrintFormat(expr: AST.Expression): string {
    switch (expr.type) {
      case "IntegerLiteral":
        return "%d";
      case "RealLiteral":
        return "%f";
      case "BooleanLiteral":
        return "%d";
      case "CharLiteral":
        return "%c";
      case "StringLiteral":
        return "%s";
      case "Identifier": {
        // Use tracked type info
        const typeName = this.typeMap.get(expr.name.toLowerCase());
        if (typeName === "REAL") return "%f";
        if (typeName === "CHAR") return "%c";
        if (typeName === "STRING") return "%s";
        return "%d";
      }
      case "BinaryExpression": {
        // Check if operands involve REAL types
        const leftFormat = this.inferPrintFormat(expr.left);
        const rightFormat = this.inferPrintFormat(expr.right);
        if (leftFormat === "%f" || rightFormat === "%f") return "%f";
        return "%d";
      }
      case "FunctionCall": {
        // Math functions return REAL
        const mathFuncs = [
          "sqrt",
          "sin",
          "cos",
          "tan",
          "ln",
          "log",
          "exp",
          "floor",
          "ceil",
          "round",
          "abs",
        ];
        if (mathFuncs.includes(expr.name.toLowerCase())) return "%f";
        return "%d";
      }
      default:
        return "%d";
    }
  }

  private needsAddressOf(target: AST.LValue): boolean {
    // Arrays don't need &, but simple variables do
    // For now, assume we always need it for non-array targets
    if (target.type === "Identifier" && this.refMap.has(target.name)) {
        // It's a pointer already! So we don't need '&' to read a value into it
        return false;
    }
    return true;
  }

  private escapeChar(char: string): string {
    switch (char) {
      case "\n":
        return "\\n";
      case "\t":
        return "\\t";
      case "\r":
        return "\\r";
      case "\\":
        return "\\\\";
      case "'":
        return "\\'";
      default:
        return char;
    }
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r");
  }
}
