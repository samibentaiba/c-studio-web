// USDB Algorithmic Language - Flowchart Generator
// Université Saad Dahlab - Blida 1
// Converts AST to flowchart representation for visualization
// UNIFIED LAYOUT: Main + all subroutines in one diagram

import {
  Program,
  Statement,
  Expression,
  IfStatement,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  SwitchStatement,
  AssignmentStatement,
  CallStatement,
  ScanStatement,
  PrintStatement,
  ReturnStatement,
  BlockStatement,
  FunctionDeclaration,
  ProcedureDeclaration,
  BinaryExpression,
  UnaryExpression,
  Identifier,
  ArrayAccess,
  FieldAccess,
  FunctionCall,
  IntegerLiteral,
  RealLiteral,
  BooleanLiteral,
  CharLiteral,
  StringLiteral,
  LValue,
  VarDeclaration,
  ConstDeclaration,
  TypeDeclaration,
  TypeExpression,
} from "./ast";
import { Parser } from "./parser";
import { translateCToAlgo } from "./c-to-algo";
import { SourceSpan } from "./errors";

// ==================== Flowchart Types ====================

export type FlowchartNodeType =
  | "start"
  | "end"
  | "process"
  | "decision"
  | "input"
  | "output"
  | "connector"
  | "declaration"
  | "call";

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  span?: SourceSpan;
}

export interface FlowchartEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type?: "normal" | "true" | "false" | "loop" | "call";
}

export interface Flowchart {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  name: string;
  width: number;
  height: number;
}

// Legacy interface for backward compatibility
export interface FlowchartSet {
  success: boolean;
  main?: Flowchart;
  subroutines: Flowchart[];
  error?: string;
  sourceMap?: number[];
}

export interface FlowchartResult {
  success: boolean;
  flowchart?: Flowchart;
  error?: string;
}

// ==================== Layout Constants ====================

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const DECISION_WIDTH = 140;
const DECISION_HEIGHT = 70;
const HORIZONTAL_GAP = 150;
const VERTICAL_GAP = 60;
const SUBROUTINE_SPACING = 100; // Space between main and subroutines

// ==================== Helper Functions ====================

let nodeIdCounter = 0;
let edgeIdCounter = 0;

function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

function generateEdgeId(): string {
  return `edge_${++edgeIdCounter}`;
}

function resetCounters(): void {
  nodeIdCounter = 0;
  edgeIdCounter = 0;
}

function expressionToString(expr: Expression): string {
  switch (expr.type) {
    case "IntegerLiteral":
      return String((expr as IntegerLiteral).value);
    case "RealLiteral":
      return String((expr as RealLiteral).value);
    case "BooleanLiteral":
      return (expr as BooleanLiteral).value ? "VRAI" : "FAUX";
    case "CharLiteral":
      return `'${(expr as CharLiteral).value}'`;
    case "StringLiteral":
      return `"${(expr as StringLiteral).value}"`;
    case "Identifier":
      return (expr as Identifier).name;
    case "ArrayAccess": {
      const aa = expr as ArrayAccess;
      const indices = aa.indices.map(expressionToString).join(", ");
      return `${expressionToString(aa.array)}[${indices}]`;
    }
    case "FieldAccess": {
      const fa = expr as FieldAccess;
      return `${expressionToString(fa.object)}.${fa.field}`;
    }
    case "FunctionCall": {
      const fc = expr as FunctionCall;
      const args = fc.arguments.map(expressionToString).join(", ");
      return `${fc.name}(${args})`;
    }
    case "BinaryExpression": {
      const be = expr as BinaryExpression;
      return `${expressionToString(be.left)} ${be.operator} ${expressionToString(be.right)}`;
    }
    case "UnaryExpression": {
      const ue = expr as UnaryExpression;
      return `${ue.operator} ${expressionToString(ue.operand)}`;
    }
    case "ParenExpression":
      return `(${expressionToString((expr as { expression: Expression }).expression)})`;
    default:
      return "?";
  }
}

function typeExpressionToString(typeExpr: TypeExpression): string {
  if (typeExpr.type === "PrimitiveType") return typeExpr.name;
  if (typeExpr.type === "TypeReference") return typeExpr.name;
  if (typeExpr.type === "ArrayType") {
    const dim = typeExpr.dimensions.map(d => `[${expressionToString(d)}]`).join("");
    return `ARRAY ${dim} OF ${typeExpressionToString(typeExpr.elementType)}`;
  }
  if (typeExpr.type === "StructureType") return "STRUCTURE";
  return "UNKNOWN";
}

function lvalueToString(lv: LValue): string {
  return expressionToString(lv as Expression);
}

function truncateLabel(label: string, maxLen: number = 200): string {
  if (label.length <= maxLen) return label;
  return label.substring(0, maxLen - 3) + "...";
}

function calculateWidth(label: string, type: FlowchartNodeType): number {
  const isDecision = type === "decision";
  const isCapsule = type === "start" || type === "end";
  const base = isDecision ? DECISION_WIDTH : NODE_WIDTH;
  const chars = label.length;
  let required = chars * 11;
  if (isCapsule) {
    required += 60;
  } else {
    required += 20;
  }
  return Math.max(base, required);
}

// ==================== Unified Flowchart Builder ====================

interface BuildContext {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  currentX: number;
  currentY: number;
  maxX: number;
  maxY: number;
  subroutineStartNodes: Map<string, string>; // Maps function name to start node ID
}

function createNode(
  ctx: BuildContext,
  type: FlowchartNodeType,
  label: string,
  customWidth?: number,
  customHeight?: number,
  span?: SourceSpan
): FlowchartNode {
  const isDecision = type === "decision";
  const calculatedWidth = customWidth ? customWidth : calculateWidth(label, type);
  const width = calculatedWidth;
  const height = customHeight || (isDecision ? DECISION_HEIGHT : NODE_HEIGHT);
  
  const node: FlowchartNode = {
    id: generateNodeId(),
    type,
    label: truncateLabel(label),
    x: ctx.currentX - width / 2,
    y: ctx.currentY,
    width,
    height,
    span,
  };
  
  ctx.nodes.push(node);
  ctx.maxX = Math.max(ctx.maxX, ctx.currentX + width / 2 + HORIZONTAL_GAP);
  ctx.maxY = Math.max(ctx.maxY, ctx.currentY + height);
  
  return node;
}

function createEdge(
  ctx: BuildContext,
  from: string,
  to: string,
  label?: string,
  edgeType?: "normal" | "true" | "false" | "loop" | "call"
): FlowchartEdge {
  const edge: FlowchartEdge = {
    id: generateEdgeId(),
    from,
    to,
    label,
    type: edgeType || "normal",
  };
  ctx.edges.push(edge);
  return edge;
}

function advanceY(ctx: BuildContext, amount: number = VERTICAL_GAP + NODE_HEIGHT): void {
  ctx.currentY += amount;
}

function processDeclarations(
  ctx: BuildContext,
  vars: VarDeclaration[],
  consts: ConstDeclaration[],
  types: TypeDeclaration[],
  previousNodeId: string
): string {
  let lastNodeId = previousNodeId;

  for (const c of consts) {
    advanceY(ctx);
    const label = `CONST ${c.name} = ${expressionToString(c.value)}`;
    const node = createNode(ctx, "declaration", label, undefined, undefined, c.span);
    createEdge(ctx, lastNodeId, node.id);
    lastNodeId = node.id;
  }

  for (const t of types) {
    advanceY(ctx);
    const label = `TYPE ${t.name} = ${typeExpressionToString(t.definition)}`;
    const node = createNode(ctx, "declaration", label, undefined, undefined, t.span);
    createEdge(ctx, lastNodeId, node.id);
    lastNodeId = node.id;
  }

  for (const v of vars) {
    advanceY(ctx);
    const typeStr = typeExpressionToString(v.varType);
    const names = v.names.join(", ");
    const label = `${typeStr} ${names}`;
    const node = createNode(ctx, "declaration", label, undefined, undefined, v.span);
    createEdge(ctx, lastNodeId, node.id);
    lastNodeId = node.id;
  }

  return lastNodeId;
}

function processStatements(
  ctx: BuildContext,
  statements: Statement[],
  previousNodeId: string
): string {
  let lastNodeId = previousNodeId;
  for (const stmt of statements) {
    lastNodeId = processStatement(ctx, stmt, lastNodeId);
  }
  return lastNodeId;
}

function processStatement(
  ctx: BuildContext,
  stmt: Statement,
  previousNodeId: string
): string {
  // Helper to find all function calls in an expression
  function findFunctionCalls(expr: Expression): string[] {
    const calls: string[] = [];
    
    function traverse(e: Expression) {
      if (e.type === "FunctionCall") {
        const fc = e as FunctionCall;
        calls.push(fc.name);
        fc.arguments.forEach(traverse);
      } else if (e.type === "BinaryExpression") {
        const be = e as BinaryExpression;
        traverse(be.left);
        traverse(be.right);
      } else if (e.type === "UnaryExpression") {
        traverse((e as UnaryExpression).operand);
      } else if (e.type === "ArrayAccess") {
        const aa = e as ArrayAccess;
        traverse(aa.array);
        aa.indices.forEach(traverse);
      } else if (e.type === "FieldAccess") {
        traverse((e as FieldAccess).object);
      } else if (e.type === "ParenExpression") {
        traverse((e as { expression: Expression }).expression);
      }
    }
    
    traverse(expr);
    return calls;
  }

  switch (stmt.type) {
    case "AssignmentStatement": {
      const as = stmt as AssignmentStatement;
      advanceY(ctx);
      const label = `${lvalueToString(as.target)} ← ${expressionToString(as.value)}`;
      const node = createNode(ctx, "process", label, undefined, undefined, as.span);
      createEdge(ctx, previousNodeId, node.id);
      
      // Create call edges for any function calls in the expression
      const funcCalls = findFunctionCalls(as.value);
      funcCalls.forEach(funcName => {
        const targetStart = ctx.subroutineStartNodes.get(funcName);
        if (targetStart) {
          createEdge(ctx, node.id, targetStart, "call", "call");
        }
      });
      
      return node.id;
    }

    case "ScanStatement": {
      const ss = stmt as ScanStatement;
      advanceY(ctx);
      const targets = ss.targets.map(lvalueToString).join(", ");
      const label = `Read(${targets})`;
      const node = createNode(ctx, "input", label, undefined, undefined, ss.span);
      createEdge(ctx, previousNodeId, node.id);
      return node.id;
    }

    case "PrintStatement": {
      const ps = stmt as PrintStatement;
      advanceY(ctx);
      const exprs = ps.expressions.map(expressionToString).join(", ");
      const label = `Print(${exprs})`;
      const node = createNode(ctx, "output", label, undefined, undefined, ps.span);
      createEdge(ctx, previousNodeId, node.id);
      
      // Create call edges for any function calls in print expressions
      ps.expressions.forEach(expr => {
        const funcCalls = findFunctionCalls(expr);
        funcCalls.forEach(funcName => {
          const targetStart = ctx.subroutineStartNodes.get(funcName);
          if (targetStart) {
            createEdge(ctx, node.id, targetStart, "call", "call");
          }
        });
      });
      
      return node.id;
    }

    case "CallStatement": {
      const cs = stmt as CallStatement;
      advanceY(ctx);
      const args = cs.arguments.map(expressionToString).join(", ");
      const label = `${cs.name}(${args})`;
      const node = createNode(ctx, "call", label, undefined, undefined, cs.span);
      createEdge(ctx, previousNodeId, node.id);

      // Create a call edge to the subroutine start node if it exists
      const targetStart = ctx.subroutineStartNodes.get(cs.name);
      if (targetStart) {
        createEdge(ctx, node.id, targetStart, "call", "call");
      }

      return node.id;
    }

    case "ReturnStatement": {
      const rs = stmt as ReturnStatement;
      advanceY(ctx);
      const label = `Return ${expressionToString(rs.value)}`;
      const node = createNode(ctx, "end", label, undefined, undefined, rs.span);
      createEdge(ctx, previousNodeId, node.id);
      
      // Create call edges for any function calls in return expression
      const funcCalls = findFunctionCalls(rs.value);
      funcCalls.forEach(funcName => {
        const targetStart = ctx.subroutineStartNodes.get(funcName);
        if (targetStart) {
          createEdge(ctx, node.id, targetStart, "call", "call");
        }
      });
      
      return node.id;
    }

    case "IfStatement":
      return processIfStatement(ctx, stmt as IfStatement, previousNodeId);
    case "WhileStatement":
      return processWhileStatement(ctx, stmt as WhileStatement, previousNodeId);
    case "DoWhileStatement":
      return processDoWhileStatement(ctx, stmt as DoWhileStatement, previousNodeId);
    case "ForStatement":
      return processForStatement(ctx, stmt as ForStatement, previousNodeId);
    case "SwitchStatement":
      return processSwitchStatement(ctx, stmt as SwitchStatement, previousNodeId);
    case "BlockStatement": {
      const bs = stmt as BlockStatement;
      return processStatements(ctx, bs.statements, previousNodeId);
    }
    default:
      return previousNodeId;
  }
}

function processIfStatement(ctx: BuildContext, stmt: IfStatement, previousNodeId: string): string {
  advanceY(ctx);
  const condLabel = expressionToString(stmt.condition);
  const decisionNode = createNode(ctx, "decision", condLabel, undefined, undefined, stmt.span);
  createEdge(ctx, previousNodeId, decisionNode.id);

  const decisionY = ctx.currentY;
  const centerX = ctx.currentX;

  ctx.currentX = centerX - HORIZONTAL_GAP - NODE_WIDTH / 2;
  ctx.currentY = decisionY;
  const thenLastNode = processStatements(ctx, stmt.thenBranch, decisionNode.id);
  const thenEdge = ctx.edges.find(e => e.from === decisionNode.id && e.to !== previousNodeId);
  if (thenEdge) {
    thenEdge.label = "True";
    thenEdge.type = "true";
  }
  const thenEndY = ctx.currentY;

  let elseLastNode: string | null = null;
  let elseEndY = decisionY;
  
  if (stmt.elseBranch && stmt.elseBranch.length > 0) {
    ctx.currentX = centerX + HORIZONTAL_GAP + NODE_WIDTH / 2;
    ctx.currentY = decisionY;
    elseLastNode = processStatements(ctx, stmt.elseBranch, decisionNode.id);
    const elseEdges = ctx.edges.filter(e => e.from === decisionNode.id);
    if (elseEdges.length >= 2) {
      elseEdges[1].label = "False";
      elseEdges[1].type = "false";
    }
    elseEndY = ctx.currentY;
  }

  ctx.currentX = centerX;
  ctx.currentY = Math.max(thenEndY, elseEndY) + VERTICAL_GAP;
  const mergeNode = createNode(ctx, "connector", "", 20, 20);

  createEdge(ctx, thenLastNode, mergeNode.id);
  if (elseLastNode) {
    createEdge(ctx, elseLastNode, mergeNode.id);
  } else {
    createEdge(ctx, decisionNode.id, mergeNode.id, "False", "false");
  }

  return mergeNode.id;
}

function processWhileStatement(ctx: BuildContext, stmt: WhileStatement, previousNodeId: string): string {
  advanceY(ctx);
  const condLabel = expressionToString(stmt.condition);
  const decisionNode = createNode(ctx, "decision", condLabel, undefined, undefined, stmt.span);
  createEdge(ctx, previousNodeId, decisionNode.id);

  const bodyLastNode = processStatements(ctx, stmt.body, decisionNode.id);
  const bodyEdge = ctx.edges.find(e => e.from === decisionNode.id && e.to !== previousNodeId);
  if (bodyEdge) {
    bodyEdge.label = "True";
    bodyEdge.type = "true";
  }

  createEdge(ctx, bodyLastNode, decisionNode.id, "", "loop");

  const exitY = ctx.currentY + VERTICAL_GAP;
  ctx.currentY = exitY;
  const exitNode = createNode(ctx, "connector", "", 20, 20);
  createEdge(ctx, decisionNode.id, exitNode.id, "False", "false");

  return exitNode.id;
}

function processDoWhileStatement(ctx: BuildContext, stmt: DoWhileStatement, previousNodeId: string): string {
  const bodyLastNode = processStatements(ctx, stmt.body, previousNodeId);

  advanceY(ctx);
  const condLabel = expressionToString(stmt.condition);
  const decisionNode = createNode(ctx, "decision", condLabel, undefined, undefined, stmt.span);
  createEdge(ctx, bodyLastNode, decisionNode.id);

  const firstBodyEdge = ctx.edges.find(e => e.from === previousNodeId);
  if (firstBodyEdge) {
    createEdge(ctx, decisionNode.id, firstBodyEdge.to, "False", "loop");
  }

  advanceY(ctx);
  const exitNode = createNode(ctx, "connector", "", 20, 20);
  createEdge(ctx, decisionNode.id, exitNode.id, "True", "true");

  return exitNode.id;
}

function processForStatement(ctx: BuildContext, stmt: ForStatement, previousNodeId: string): string {
  advanceY(ctx);
  const initLabel = `${stmt.variable} ← ${expressionToString(stmt.start)}`;
  // Approximating span for init part (using stmt span)
  const initNode = createNode(ctx, "process", initLabel, undefined, undefined, stmt.span);
  createEdge(ctx, previousNodeId, initNode.id);

  advanceY(ctx);
  const condLabel = `${stmt.variable} ≤ ${expressionToString(stmt.end)}`;
  const decisionNode = createNode(ctx, "decision", condLabel);
  createEdge(ctx, initNode.id, decisionNode.id);

  const bodyLastNode = processStatements(ctx, stmt.body, decisionNode.id);
  const bodyEdge = ctx.edges.find(e => e.from === decisionNode.id);
  if (bodyEdge) {
    bodyEdge.label = "True";
    bodyEdge.type = "true";
  }

  advanceY(ctx);
  const stepValue = stmt.step ? expressionToString(stmt.step) : "1";
  const incrLabel = `${stmt.variable} ← ${stmt.variable} + ${stepValue}`;
  const incrNode = createNode(ctx, "process", incrLabel);
  createEdge(ctx, bodyLastNode, incrNode.id);

  createEdge(ctx, incrNode.id, decisionNode.id, "", "loop");

  advanceY(ctx);
  const exitNode = createNode(ctx, "connector", "", 20, 20);
  createEdge(ctx, decisionNode.id, exitNode.id, "False", "false");

  return exitNode.id;
}

function processSwitchStatement(ctx: BuildContext, stmt: SwitchStatement, previousNodeId: string): string {
  advanceY(ctx);
  const exprLabel = `Switch ${expressionToString(stmt.expression)}`;
  const switchNode = createNode(ctx, "decision", exprLabel, undefined, undefined, stmt.span);
  createEdge(ctx, previousNodeId, switchNode.id);

  const switchY = ctx.currentY;
  const centerX = ctx.currentX;
  const caseNodes: string[] = [];

  stmt.cases.forEach((caseClause, index) => {
    const offset = (index - (stmt.cases.length - 1) / 2) * (NODE_WIDTH + HORIZONTAL_GAP);
    ctx.currentX = centerX + offset;
    ctx.currentY = switchY;

    const caseValues = caseClause.values.map(expressionToString).join(", ");
    const lastNode = processStatements(ctx, caseClause.body, switchNode.id);
    
    const caseEdge = ctx.edges.find(
      e => e.from === switchNode.id && ctx.edges.filter(e2 => e2.from === switchNode.id).indexOf(e) === index
    );
    if (caseEdge) caseEdge.label = caseValues;

    caseNodes.push(lastNode);
  });

  if (stmt.defaultCase && stmt.defaultCase.length > 0) {
    ctx.currentX = centerX + ((stmt.cases.length) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;
    ctx.currentY = switchY;
    const defaultLast = processStatements(ctx, stmt.defaultCase, switchNode.id);
    caseNodes.push(defaultLast);
  }

  ctx.currentX = centerX;
  ctx.currentY = ctx.maxY + VERTICAL_GAP;
  const mergeNode = createNode(ctx, "connector", "", 20, 20);
  caseNodes.forEach(nodeId => createEdge(ctx, nodeId, mergeNode.id));

  return mergeNode.id;
}

// ==================== Normalization ====================

function normalizeCoordinates(nodes: FlowchartNode[]): { width: number; height: number } {
  if (nodes.length === 0) return { width: 0, height: 0 };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  });

  const PADDING = 100;
  const shiftX = -minX + PADDING;
  const shiftY = -minY + PADDING;

  nodes.forEach(node => {
    node.x += shiftX;
    node.y += shiftY;
  });

  return {
    width: (maxX - minX) + (PADDING * 2),
    height: (maxY - minY) + (PADDING * 2)
  };
}

// ==================== Main Unified Generator ====================

export function generateAllFlowcharts(source: string, lang: "algo" | "c"): FlowchartSet {
  try {
    let algoSource = source;
    let sourceMap: number[] | undefined;

    if (lang === "c") {
      const translation = translateCToAlgo(source);
      if (!translation.success) {
        return { success: false, subroutines: [], error: `C Translation Error: ${translation.errors?.join(", ")}` };
      }
      algoSource = translation.algoCode || "";
      sourceMap = translation.sourceMap;
    }

    const parser = new Parser();
    const { ast, errors: parseErrors } = parser.parse(algoSource);
    if (parseErrors.length > 0) {
      return { success: false, subroutines: [], error: `Syntax Error: ${parseErrors[0].toString()}` };
    }
    if (!ast) {
      return { success: false, subroutines: [], error: "Failed to parse program" };
    }

    resetCounters();

    const ctx: BuildContext = {
      nodes: [],
      edges: [],
      currentX: 400,
      currentY: 40,
      maxX: 400,
      maxY: 40,
      subroutineStartNodes: new Map(),
    };

    // ===== PHASE 1: Pre-register ALL subroutine start nodes =====
    // This allows call arrows to find their targets when processing main or other subroutines
    const SUBROUTINE_Y_START = 700; // Will be updated after main is generated
    const totalSubroutines = ast.functions.length + ast.procedures.length;
    const mainCenterX = 400;
    
    interface SubroutineInfo {
      decl: typeof ast.functions[0] | typeof ast.procedures[0];
      type: 'function' | 'procedure';
      startNodeId: string;
      offsetX: number;
    }
    const subroutines: SubroutineInfo[] = [];
    
    // Pre-create start nodes for all functions
    ast.functions.forEach((func, index) => {
      const offset = (index - (totalSubroutines - 1) / 2) * 400;
      ctx.currentX = mainCenterX + offset;
      ctx.currentY = SUBROUTINE_Y_START;
      
      const params = func.parameters.map(p => 
        `${p.byReference ? "VAR " : ""}${p.name}: ${typeExpressionToString(p.paramType)}`
      ).join(", ");
      const startLabel = `Function ${func.name}(${params}) : ${typeExpressionToString(func.returnType)}`;
      const startNode = createNode(ctx, "start", startLabel);
      
      ctx.subroutineStartNodes.set(func.name, startNode.id);
      subroutines.push({ decl: func, type: 'function', startNodeId: startNode.id, offsetX: offset });
    });
    
    // Pre-create start nodes for all procedures
    ast.procedures.forEach((proc, index) => {
      const offset = ((ast.functions.length + index) - (totalSubroutines - 1) / 2) * 400;
      ctx.currentX = mainCenterX + offset;
      ctx.currentY = SUBROUTINE_Y_START;
      
      const params = proc.parameters.map(p => 
        `${p.byReference ? "VAR " : ""}${p.name}: ${typeExpressionToString(p.paramType)}`
      ).join(", ");
      const startLabel = `Procedure ${proc.name}(${params})`;
      const startNode = createNode(ctx, "start", startLabel);
      
      ctx.subroutineStartNodes.set(proc.name, startNode.id);
      subroutines.push({ decl: proc, type: 'procedure', startNodeId: startNode.id, offsetX: offset });
    });

    // ===== PHASE 2: Generate Main (now call arrows can find subroutines) =====
    ctx.currentX = mainCenterX;
    ctx.currentY = 40;
    ctx.maxY = 40; // Reset for main
    
    const mainStartNode = createNode(ctx, "start", `Start ${ast.name}`);
    const lastDeclNode = processDeclarations(ctx, ast.variables, ast.constants, ast.types, mainStartNode.id);
    const lastBodyNode = processStatements(ctx, ast.body, lastDeclNode);
    advanceY(ctx);
    const mainEndNode = createNode(ctx, "end", `End ${ast.name}`);
    createEdge(ctx, lastBodyNode, mainEndNode.id);

    const mainEndY = ctx.maxY;
    const actualSubroutineY = mainEndY + 150;

    // ===== PHASE 3: Process subroutine bodies =====
    subroutines.forEach(sub => {
      ctx.currentX = mainCenterX + sub.offsetX;
      ctx.currentY = actualSubroutineY;
      
      // Update the start node's Y position
      const startNode = ctx.nodes.find(n => n.id === sub.startNodeId);
      if (startNode) {
        startNode.y = actualSubroutineY;
      }
      
      const declLast = processDeclarations(
        ctx, 
        sub.decl.variables, 
        sub.decl.constants, 
        sub.decl.types, 
        sub.startNodeId
      );
      const bodyLast = processStatements(ctx, sub.decl.body, declLast);
      advanceY(ctx);
      const endNode = createNode(ctx, "end", `End ${sub.decl.name}`);
      createEdge(ctx, bodyLast, endNode.id);
    });

    // ===== PHASE 3: Normalize and return as a single unified flowchart =====
    const { width, height } = normalizeCoordinates(ctx.nodes);

    const unifiedFlowchart: Flowchart = {
      nodes: ctx.nodes,
      edges: ctx.edges,
      name: ast.name,
      width,
      height,
    };

    return {
      success: true,
      main: unifiedFlowchart,
      subroutines: [], // Empty since everything is unified
      sourceMap,
    };

  } catch (error) {
    return { success: false, subroutines: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function generateFlowchartFromSource(source: string, language: "algo" | "c"): FlowchartResult {
  const result = generateAllFlowcharts(source, language);
  return { success: result.success, flowchart: result.main, error: result.error };
}

export function generateFlowchart(ast: Program): FlowchartResult {
  // This is now a simplified wrapper - the unified generation happens in generateAllFlowcharts
  resetCounters();
  const ctx: BuildContext = {
    nodes: [], edges: [], currentX: 400, currentY: 40, maxX: 400, maxY: 40, subroutineStartNodes: new Map(),
  };
  const startNode = createNode(ctx, "start", `Début ${ast.name}`);
  const lastDeclNode = processDeclarations(ctx, ast.variables, ast.constants, ast.types, startNode.id);
  const lastBodyNode = processStatements(ctx, ast.body, lastDeclNode);
  advanceY(ctx);
  const endNode = createNode(ctx, "end", `Fin ${ast.name}`);
  createEdge(ctx, lastBodyNode, endNode.id);
  const { width, height } = normalizeCoordinates(ctx.nodes);
  return { success: true, flowchart: { nodes: ctx.nodes, edges: ctx.edges, name: ast.name, width, height } };
}
