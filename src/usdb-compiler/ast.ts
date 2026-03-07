// USDB Algorithmic Language - Abstract Syntax Tree
// Université Saad Dahlab - Blida 1

import { SourceSpan } from "./errors";

// Base node interface
export interface ASTNode {
  type: string;
  span?: SourceSpan;
}

// ==================== Program Structure ====================

export interface Program extends ASTNode {
  type: "Program";
  name: string;
  constants: ConstDeclaration[];
  types: TypeDeclaration[];
  variables: VarDeclaration[];
  functions: FunctionDeclaration[];
  procedures: ProcedureDeclaration[];
  body: Statement[];
}

// ==================== Declarations ====================

export interface ConstDeclaration extends ASTNode {
  type: "ConstDeclaration";
  name: string;
  value: Literal;
}

export interface TypeDeclaration extends ASTNode {
  type: "TypeDeclaration";
  name: string;
  definition: TypeExpression;
}

export interface VarDeclaration extends ASTNode {
  type: "VarDeclaration";
  names: string[];
  varType: TypeExpression;
}

export interface Parameter extends ASTNode {
  type: "Parameter";
  name: string;
  paramType: TypeExpression;
  byReference: boolean; // VAR keyword = pass by reference
}

export interface FunctionDeclaration extends ASTNode {
  type: "FunctionDeclaration";
  name: string;
  parameters: Parameter[];
  returnType: TypeExpression;
  constants: ConstDeclaration[];
  types: TypeDeclaration[];
  variables: VarDeclaration[];
  body: Statement[];
}

export interface ProcedureDeclaration extends ASTNode {
  type: "ProcedureDeclaration";
  name: string;
  parameters: Parameter[];
  constants: ConstDeclaration[];
  types: TypeDeclaration[];
  variables: VarDeclaration[];
  body: Statement[];
}

// ==================== Type Expressions ====================

export type TypeExpression =
  | PrimitiveType
  | ArrayType
  | StructureType
  | TypeReference;

export interface PrimitiveType extends ASTNode {
  type: "PrimitiveType";
  name: "INTEGER" | "REAL" | "BOOLEAN" | "CHAR" | "STRING";
}

export interface ArrayType extends ASTNode {
  type: "ArrayType";
  dimensions: Expression[]; // Can be integer literals, constants, or ranges
  elementType: TypeExpression;
}

export interface StructureType extends ASTNode {
  type: "StructureType";
  fields: VarDeclaration[];
}

export interface TypeReference extends ASTNode {
  type: "TypeReference";
  name: string;
}

// ==================== Statements ====================

export type Statement =
  | AssignmentStatement
  | IfStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | SwitchStatement
  | CallStatement
  | ScanStatement
  | PrintStatement
  | ReturnStatement
  | BlockStatement;

export interface AssignmentStatement extends ASTNode {
  type: "AssignmentStatement";
  target: LValue;
  value: Expression;
}

export interface IfStatement extends ASTNode {
  type: "IfStatement";
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface WhileStatement extends ASTNode {
  type: "WhileStatement";
  condition: Expression;
  body: Statement[];
}

export interface DoWhileStatement extends ASTNode {
  type: "DoWhileStatement";
  body: Statement[];
  condition: Expression;
}

export interface ForStatement extends ASTNode {
  type: "ForStatement";
  variable: string;
  start: Expression;
  end: Expression;
  step?: Expression;
  body: Statement[];
}

export interface SwitchStatement extends ASTNode {
  type: "SwitchStatement";
  expression: Expression;
  cases: CaseClause[];
  defaultCase?: Statement[];
}

export interface CaseClause extends ASTNode {
  type: "CaseClause";
  values: Expression[];
  body: Statement[];
}

export interface CallStatement extends ASTNode {
  type: "CallStatement";
  name: string;
  arguments: Expression[];
}

export interface ScanStatement extends ASTNode {
  type: "ScanStatement";
  targets: LValue[];
}

export interface PrintStatement extends ASTNode {
  type: "PrintStatement";
  expressions: Expression[];
}

export interface ReturnStatement extends ASTNode {
  type: "ReturnStatement";
  value: Expression;
}

export interface BlockStatement extends ASTNode {
  type: "BlockStatement";
  statements: Statement[];
}

// ==================== Expressions ====================

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | Literal
  | Identifier
  | ArrayAccess
  | FieldAccess
  | FunctionCall
  | ParenExpression;

export interface BinaryExpression extends ASTNode {
  type: "BinaryExpression";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "DIV"
  | "MOD"
  | "="
  | "<>"
  | "<"
  | ">"
  | "<="
  | ">="
  | "AND"
  | "OR";

export interface UnaryExpression extends ASTNode {
  type: "UnaryExpression";
  operator: UnaryOperator;
  operand: Expression;
}

export type UnaryOperator = "-" | "NOT";

export type Literal =
  | IntegerLiteral
  | RealLiteral
  | BooleanLiteral
  | CharLiteral
  | StringLiteral;

export interface IntegerLiteral extends ASTNode {
  type: "IntegerLiteral";
  value: number;
}

export interface RealLiteral extends ASTNode {
  type: "RealLiteral";
  value: number;
}

export interface BooleanLiteral extends ASTNode {
  type: "BooleanLiteral";
  value: boolean;
}

export interface CharLiteral extends ASTNode {
  type: "CharLiteral";
  value: string;
}

export interface StringLiteral extends ASTNode {
  type: "StringLiteral";
  value: string;
}

export interface Identifier extends ASTNode {
  type: "Identifier";
  name: string;
}

export interface ArrayAccess extends ASTNode {
  type: "ArrayAccess";
  array: Expression;
  indices: Expression[];
}

export interface FieldAccess extends ASTNode {
  type: "FieldAccess";
  object: Expression;
  field: string;
}

export interface FunctionCall extends ASTNode {
  type: "FunctionCall";
  name: string;
  arguments: Expression[];
}

export interface ParenExpression extends ASTNode {
  type: "ParenExpression";
  expression: Expression;
}

// ==================== L-Value (targets for assignment) ====================

export type LValue = Identifier | ArrayAccess | FieldAccess;
