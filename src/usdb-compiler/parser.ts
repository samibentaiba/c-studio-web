// USDB Algorithmic Language - Parser
// Université Saad Dahlab - Blida 1
// Recursive descent parser

import { Token, TokenType, Lexer } from "./lexer";
import { ParserError, SourceLocation } from "./errors";
import * as AST from "./ast";

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParserError[] = [];

  parse(source: string): { ast: AST.Program | null; errors: ParserError[] } {
    const lexer = new Lexer(source);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    this.tokens = tokens;
    this.current = 0;
    this.errors = lexerErrors.map(
      (e) => new ParserError(e.message, e.location)
    );

    if (lexerErrors.length > 0) {
      return { ast: null, errors: this.errors };
    }

    try {
      const program = this.parseProgram();
      return { ast: program, errors: this.errors };
    } catch (e) {
      if (e instanceof ParserError) {
        this.errors.push(e);
      }
      return { ast: null, errors: this.errors };
    }
  }

  // ==================== Program Structure ====================

  private parseProgram(): AST.Program {
    // ALGORITHM Identifier
    this.expect(
      TokenType.ALGORITHM,
      "Expected 'ALGORITHM' at start of program"
    );
    const nameToken = this.expect(
      TokenType.IDENTIFIER,
      "Expected algorithm name"
    );

    // Environment declarations - can have multiple CONST, TYPE, VAR blocks in any order
    const constants: AST.ConstDeclaration[] = [];
    const types: AST.TypeDeclaration[] = [];
    const variables: AST.VarDeclaration[] = [];

    // Parse declaration blocks until we hit BEGIN, FUNCTION, or PROCEDURE
    while (
      !this.check(TokenType.BEGIN) &&
      !this.check(TokenType.FUNCTION) &&
      !this.check(TokenType.PROCEDURE) &&
      !this.isAtEnd()
    ) {
      if (this.check(TokenType.CONST)) {
        constants.push(...this.parseConstDeclarations());
      } else if (this.check(TokenType.TYPE)) {
        types.push(...this.parseTypeDeclarations());
      } else if (this.check(TokenType.VAR)) {
        variables.push(...this.parseVarDeclarations());
      } else {
        // Skip any unexpected tokens
        break;
      }
    }

    const { functions, procedures } =
      this.parseFunctionAndProcedureDeclarations();

    // Body
    this.expect(TokenType.BEGIN, "Expected 'BEGIN'");
    const body = this.parseStatementList();
    this.expect(TokenType.END, "Expected 'END'");
    this.expect(TokenType.DOT, "Expected '.' at end of program");

    return {
      type: "Program",
      name: nameToken.value,
      constants,
      types,
      variables,
      functions,
      procedures,
      body,
    };
  }

  // ==================== Declarations ====================

  private parseConstDeclarations(): AST.ConstDeclaration[] {
    const constants: AST.ConstDeclaration[] = [];

    if (!this.check(TokenType.CONST)) return constants;
    this.advance(); // consume CONST

    while (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      this.expect(TokenType.EQUAL, "Expected '=' after constant name");
      const value = this.parseLiteral();
      constants.push({ type: "ConstDeclaration", name, value });

      if (this.check(TokenType.SEMICOLON)) this.advance();
    }

    return constants;
  }

  private parseTypeDeclarations(): AST.TypeDeclaration[] {
    const types: AST.TypeDeclaration[] = [];

    if (!this.check(TokenType.TYPE)) return types;
    this.advance(); // consume TYPE

    while (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      this.expect(TokenType.EQUAL, "Expected '=' after type name");
      const definition = this.parseTypeExpression();
      types.push({ type: "TypeDeclaration", name, definition });

      if (this.check(TokenType.SEMICOLON)) this.advance();
    }

    return types;
  }

  private parseVarDeclarations(): AST.VarDeclaration[] {
    const variables: AST.VarDeclaration[] = [];

    if (!this.check(TokenType.VAR)) return variables;
    this.advance(); // consume VAR

    while (this.check(TokenType.IDENTIFIER)) {
      const names = this.parseIdentifierList();
      this.expect(TokenType.COLON, "Expected ':' after variable names");
      const varType = this.parseTypeExpression();
      variables.push({ type: "VarDeclaration", names, varType });

      if (this.check(TokenType.SEMICOLON)) this.advance();
    }

    return variables;
  }

  private parseFunctionAndProcedureDeclarations(): {
    functions: AST.FunctionDeclaration[];
    procedures: AST.ProcedureDeclaration[];
  } {
    const functions: AST.FunctionDeclaration[] = [];
    const procedures: AST.ProcedureDeclaration[] = [];

    while (this.check(TokenType.FUNCTION) || this.check(TokenType.PROCEDURE)) {
      if (this.check(TokenType.FUNCTION)) {
        functions.push(this.parseFunctionDeclaration());
      } else {
        procedures.push(this.parseProcedureDeclaration());
      }
    }

    return { functions, procedures };
  }

  private parseFunctionDeclaration(): AST.FunctionDeclaration {
    this.expect(TokenType.FUNCTION, "Expected 'FUNCTION'");
    const name = this.expect(
      TokenType.IDENTIFIER,
      "Expected function name"
    ).value;

    this.expect(TokenType.LPAREN, "Expected '(' after function name");
    const parameters = this.parseParameterList();
    this.expect(TokenType.RPAREN, "Expected ')' after parameters");

    this.expect(TokenType.COLON, "Expected ':' before return type");
    const returnType = this.parseTypeExpression();

    // Local declarations
    const constants = this.parseConstDeclarations();
    const types = this.parseTypeDeclarations();
    const variables = this.parseVarDeclarations();

    // Body
    this.expect(TokenType.BEGIN, "Expected 'BEGIN'");
    const body = this.parseStatementList();
    this.expect(TokenType.END, "Expected 'END'");

    return {
      type: "FunctionDeclaration",
      name,
      parameters,
      returnType,
      constants,
      types,
      variables,
      body,
    };
  }

  private parseProcedureDeclaration(): AST.ProcedureDeclaration {
    this.expect(TokenType.PROCEDURE, "Expected 'PROCEDURE'");
    const name = this.expect(
      TokenType.IDENTIFIER,
      "Expected procedure name"
    ).value;

    this.expect(TokenType.LPAREN, "Expected '(' after procedure name");
    const parameters = this.parseParameterList();
    this.expect(TokenType.RPAREN, "Expected ')' after parameters");

    // Local declarations
    const constants = this.parseConstDeclarations();
    const types = this.parseTypeDeclarations();
    const variables = this.parseVarDeclarations();

    // Body
    this.expect(TokenType.BEGIN, "Expected 'BEGIN'");
    const body = this.parseStatementList();
    this.expect(TokenType.END, "Expected 'END'");

    return {
      type: "ProcedureDeclaration",
      name,
      parameters,
      constants,
      types,
      variables,
      body,
    };
  }

  private parseParameterList(): AST.Parameter[] {
    const params: AST.Parameter[] = [];

    if (this.check(TokenType.RPAREN)) return params;

    do {
      const byReference = this.check(TokenType.VAR);
      if (byReference) this.advance();

      const name = this.expect(
        TokenType.IDENTIFIER,
        "Expected parameter name"
      ).value;
      this.expect(TokenType.COLON, "Expected ':' after parameter name");
      const paramType = this.parseTypeExpression();

      params.push({ type: "Parameter", name, paramType, byReference });
    } while (this.match(TokenType.COMMA));

    return params;
  }

  private parseIdentifierList(): string[] {
    const names: string[] = [];

    do {
      names.push(
        this.expect(TokenType.IDENTIFIER, "Expected identifier").value
      );
    } while (this.match(TokenType.COMMA));

    return names;
  }

  // ==================== Type Expressions ====================

  private parseTypeExpression(): AST.TypeExpression {
    // Array type
    if (this.check(TokenType.ARRAY)) {
      return this.parseArrayType();
    }

    // Structure type
    if (this.check(TokenType.STRUCTURE)) {
      return this.parseStructureType();
    }

    // Primitive types
    if (this.check(TokenType.INTEGER)) {
      this.advance();
      return { type: "PrimitiveType", name: "INTEGER" };
    }
    if (this.check(TokenType.REAL)) {
      this.advance();
      return { type: "PrimitiveType", name: "REAL" };
    }
    if (this.check(TokenType.BOOLEAN)) {
      this.advance();
      return { type: "PrimitiveType", name: "BOOLEAN" };
    }
    if (this.check(TokenType.CHAR)) {
      this.advance();
      return { type: "PrimitiveType", name: "CHAR" };
    }
    if (this.check(TokenType.STRING)) {
      this.advance();
      return { type: "PrimitiveType", name: "STRING" };
    }

    // Type reference (user-defined type)
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      return { type: "TypeReference", name };
    }

    throw new ParserError("Expected type", this.peek().location);
  }

  private parseArrayType(): AST.ArrayType {
    this.expect(TokenType.ARRAY, "Expected 'ARRAY'");

    const dimensions: AST.Expression[] = [];

    // Parse dimensions [size1][size2]...
    while (this.check(TokenType.LBRACKET)) {
      this.advance();
      dimensions.push(this.parseExpression());
      this.expect(TokenType.RBRACKET, "Expected ']'");
    }

    this.expect(TokenType.OF, "Expected 'OF' after array dimensions");
    const elementType = this.parseTypeExpression();

    return { type: "ArrayType", dimensions, elementType };
  }

  private parseStructureType(): AST.StructureType {
    this.expect(TokenType.STRUCTURE, "Expected 'STRUCTURE'");
    this.expect(TokenType.BEGIN, "Expected 'BEGIN' after STRUCTURE");

    const fields: AST.VarDeclaration[] = [];

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      const names = this.parseIdentifierList();
      this.expect(TokenType.COLON, "Expected ':' after field names");
      const varType = this.parseTypeExpression();
      fields.push({ type: "VarDeclaration", names, varType });

      if (this.check(TokenType.SEMICOLON)) this.advance();
    }

    this.expect(TokenType.END, "Expected 'END' after structure fields");

    return { type: "StructureType", fields };
  }

  // ==================== Statements ====================

  private parseStatementList(): AST.Statement[] {
    const statements: AST.Statement[] = [];

    while (
      !this.check(TokenType.END) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.CASE) &&
      !this.check(TokenType.DEFAULT) &&
      !this.check(TokenType.WHILE) &&
      !this.isAtEnd()
    ) {
      // Skip semicolons between statements
      if (this.check(TokenType.SEMICOLON)) {
        this.advance();
        continue;
      }

      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return statements;
  }

  private parseStatement(): AST.Statement | null {
    const startLoc = this.peek().location;
    let stmt: AST.Statement | null = null;

    // IF statement
    if (this.check(TokenType.IF)) {
      stmt = this.parseIfStatement();
    }
    // WHILE statement
    else if (this.check(TokenType.WHILE)) {
      stmt = this.parseWhileStatement();
    }
    // DO-WHILE statement
    else if (this.check(TokenType.DO)) {
      stmt = this.parseDoWhileStatement();
    }
    // FOR statement
    else if (this.check(TokenType.FOR)) {
      stmt = this.parseForStatement();
    }
    // SWITCH statement
    else if (this.check(TokenType.SWITCH)) {
      stmt = this.parseSwitchStatement();
    }
    // RETURN statement
    else if (this.check(TokenType.RETURN)) {
      stmt = this.parseReturnStatement();
    }
    // SCAN statement
    else if (this.check(TokenType.SCAN)) {
      stmt = this.parseScanStatement();
    }
    // PRINT statement
    else if (this.check(TokenType.PRINT)) {
      stmt = this.parsePrintStatement();
    }
    // BEGIN block
    else if (this.check(TokenType.BEGIN)) {
      this.advance();
      const statements = this.parseStatementList();
      this.expect(TokenType.END, "Expected 'END'");
      stmt = { type: "BlockStatement", statements };
    }
    // Assignment or procedure call
    else if (this.check(TokenType.IDENTIFIER)) {
      stmt = this.parseAssignmentOrCall();
    }

    if (stmt) {
        const endLoc = this.previous().location;
        stmt.span = { start: startLoc, end: endLoc };
    }

    return stmt;
  }

  private parseIfStatement(): AST.IfStatement {
    this.expect(TokenType.IF, "Expected 'IF'");
    this.expect(TokenType.LPAREN, "Expected '(' after IF");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    this.expect(TokenType.THEN, "Expected 'THEN'");

    const thenBranch = this.parseBlock();

    let elseBranch: AST.Statement[] | undefined;
    if (this.check(TokenType.ELSE)) {
      this.advance();
      elseBranch = this.parseBlock();
    }

    return { type: "IfStatement", condition, thenBranch, elseBranch };
  }

  private parseWhileStatement(): AST.WhileStatement {
    this.expect(TokenType.WHILE, "Expected 'WHILE'");
    this.expect(TokenType.LPAREN, "Expected '(' after WHILE");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    this.expect(TokenType.DO, "Expected 'DO'");

    const body = this.parseBlock();

    return { type: "WhileStatement", condition, body };
  }

  private parseDoWhileStatement(): AST.DoWhileStatement {
    this.expect(TokenType.DO, "Expected 'DO'");
    const body = this.parseBlock();
    this.expect(TokenType.WHILE, "Expected 'WHILE'");
    this.expect(TokenType.LPAREN, "Expected '(' after WHILE");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");

    return { type: "DoWhileStatement", body, condition };
  }

  private parseForStatement(): AST.ForStatement {
    this.expect(TokenType.FOR, "Expected 'FOR'");
    const variable = this.expect(
      TokenType.IDENTIFIER,
      "Expected loop variable"
    ).value;
    this.expect(TokenType.ASSIGN, "Expected '<-' after variable");
    const start = this.parseExpression();
    this.expect(TokenType.TO, "Expected 'TO'");
    const end = this.parseExpression();

    let step: AST.Expression | undefined;
    if (this.check(TokenType.STEP)) {
      this.advance();
      step = this.parseExpression();
    }

    this.expect(TokenType.DO, "Expected 'DO'");
    const body = this.parseBlock();

    return { type: "ForStatement", variable, start, end, step, body };
  }

  private parseSwitchStatement(): AST.SwitchStatement {
    this.expect(TokenType.SWITCH, "Expected 'SWITCH'");
    const expression = this.parseExpression();
    this.expect(TokenType.BEGIN, "Expected 'BEGIN' after SWITCH expression");

    const cases: AST.CaseClause[] = [];
    let defaultCase: AST.Statement[] | undefined;

    while (!this.check(TokenType.END) && !this.isAtEnd()) {
      if (this.check(TokenType.CASE)) {
        this.advance();
        const values: AST.Expression[] = [];
        do {
          values.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.COLON, "Expected ':' after case values");
        const body = this.parseBlock();
        cases.push({ type: "CaseClause", values, body });
      } else if (this.check(TokenType.DEFAULT)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':' after DEFAULT");
        defaultCase = this.parseBlock();
      } else {
        break;
      }
    }

    this.expect(TokenType.END, "Expected 'END' after switch cases");

    return { type: "SwitchStatement", expression, cases, defaultCase };
  }

  private parseReturnStatement(): AST.ReturnStatement {
    this.expect(TokenType.RETURN, "Expected 'RETURN'");
    this.expect(TokenType.LPAREN, "Expected '(' after RETURN");
    const value = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after return value");

    return { type: "ReturnStatement", value };
  }

  private parseScanStatement(): AST.ScanStatement {
    this.expect(TokenType.SCAN, "Expected 'SCAN'");
    this.expect(TokenType.LPAREN, "Expected '(' after SCAN");

    const targets: AST.LValue[] = [];
    do {
      targets.push(this.parseLValue());
    } while (this.match(TokenType.COMMA));

    this.expect(TokenType.RPAREN, "Expected ')' after SCAN arguments");

    return { type: "ScanStatement", targets };
  }

  private parsePrintStatement(): AST.PrintStatement {
    this.expect(TokenType.PRINT, "Expected 'PRINT'");
    this.expect(TokenType.LPAREN, "Expected '(' after PRINT");

    const expressions: AST.Expression[] = [];
    do {
      expressions.push(this.parseExpression());
    } while (this.match(TokenType.COMMA));

    this.expect(TokenType.RPAREN, "Expected ')' after PRINT arguments");

    return { type: "PrintStatement", expressions };
  }

  private parseAssignmentOrCall(): AST.AssignmentStatement | AST.CallStatement {
    const target = this.parseLValue();

    if (this.check(TokenType.ASSIGN)) {
      this.advance();
      const value = this.parseExpression();
      return { type: "AssignmentStatement", target, value };
    }

    // It's a procedure call (the identifier was already consumed)
    if (target.type === "Identifier") {
      let args: AST.Expression[] = [];
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "Expected ')' after arguments");
      }
      return { type: "CallStatement", name: target.name, arguments: args };
    }

    throw new ParserError(
      "Expected assignment or procedure call",
      this.peek().location
    );
  }

  private parseBlock(): AST.Statement[] {
    if (this.check(TokenType.BEGIN)) {
      this.advance();
      const statements = this.parseStatementList();
      this.expect(TokenType.END, "Expected 'END'");
      return statements;
    }
    // Single statement
    const stmt = this.parseStatement();
    return stmt ? [stmt] : [];
  }

  // ==================== Expressions (Precedence Climbing) ====================

  private parseExpression(): AST.Expression {
    return this.parseOr();
  }

  private parseOr(): AST.Expression {
    let left = this.parseAnd();

    while (this.check(TokenType.OR)) {
      this.advance();
      const right = this.parseAnd();
      left = { type: "BinaryExpression", operator: "OR", left, right };
    }

    return left;
  }

  private parseAnd(): AST.Expression {
    let left = this.parseRelational();

    while (this.check(TokenType.AND)) {
      this.advance();
      const right = this.parseRelational();
      left = { type: "BinaryExpression", operator: "AND", left, right };
    }

    return left;
  }

  private parseRelational(): AST.Expression {
    let left = this.parseAdditive();

    const relOps: Record<string, AST.BinaryOperator> = {
      [TokenType.EQUAL]: "=",
      [TokenType.NOT_EQUAL]: "<>",
      [TokenType.LESS]: "<",
      [TokenType.GREATER]: ">",
      [TokenType.LESS_EQUAL]: "<=",
      [TokenType.GREATER_EQUAL]: ">=",
    };

    while (Object.keys(relOps).some((t) => this.check(t as TokenType))) {
      const token = this.advance();
      const operator = relOps[token.type];
      const right = this.parseAdditive();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parseAdditive(): AST.Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator = this.advance().type === TokenType.PLUS ? "+" : "-";
      const right = this.parseMultiplicative();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): AST.Expression {
    let left = this.parsePower();

    while (
      this.check(TokenType.MULTIPLY) ||
      this.check(TokenType.DIVIDE) ||
      this.check(TokenType.DIV) ||
      this.check(TokenType.MOD)
    ) {
      const token = this.advance();
      const operator: AST.BinaryOperator =
        token.type === TokenType.MULTIPLY
          ? "*"
          : token.type === TokenType.DIVIDE
            ? "/"
            : token.type === TokenType.DIV
              ? "DIV"
              : "MOD";
      const right = this.parsePower();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parsePower(): AST.Expression {
    let left = this.parseUnary();

    if (this.check(TokenType.POWER)) {
      this.advance();
      const right = this.parsePower(); // Right associative
      left = { type: "BinaryExpression", operator: "^", left, right };
    }

    return left;
  }

  private parseUnary(): AST.Expression {
    if (this.check(TokenType.MINUS)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: "UnaryExpression", operator: "-", operand };
    }

    if (this.check(TokenType.NOT)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: "UnaryExpression", operator: "NOT", operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): AST.Expression {
    // Parenthesized expression
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, "Expected ')' after expression");
      return { type: "ParenExpression", expression: expr };
    }

    // Literals
    if (this.check(TokenType.INTEGER_LITERAL)) {
      const value = parseInt(this.advance().value, 10);
      return { type: "IntegerLiteral", value };
    }

    if (this.check(TokenType.REAL_LITERAL)) {
      const value = parseFloat(this.advance().value);
      return { type: "RealLiteral", value };
    }

    if (this.check(TokenType.TRUE)) {
      this.advance();
      return { type: "BooleanLiteral", value: true };
    }

    if (this.check(TokenType.FALSE)) {
      this.advance();
      return { type: "BooleanLiteral", value: false };
    }

    if (this.check(TokenType.STRING_LITERAL)) {
      const value = this.advance().value;
      return { type: "StringLiteral", value };
    }

    if (this.check(TokenType.CHAR_LITERAL)) {
      const value = this.advance().value;
      return { type: "CharLiteral", value };
    }

    // Identifier, array access, field access, or function call
    if (this.check(TokenType.IDENTIFIER)) {
      return this.parseIdentifierExpression();
    }

    throw new ParserError(
      `Unexpected token: ${this.peek().type}`,
      this.peek().location
    );
  }

  private parseIdentifierExpression(): AST.Expression {
    const name = this.advance().value;
    let expr: AST.Expression = { type: "Identifier", name };

    while (true) {
      // Array access
      if (this.check(TokenType.LBRACKET)) {
        this.advance();
        const indices: AST.Expression[] = [];
        do {
          indices.push(this.parseExpression());
          this.expect(TokenType.RBRACKET, "Expected ']'");
        } while (this.check(TokenType.LBRACKET) && this.advance());

        // Handle multiple dimensions T[i][j]
        if (indices.length === 1 && this.check(TokenType.LBRACKET)) {
          // Already handled by the loop
        }
        expr = { type: "ArrayAccess", array: expr, indices };
        continue;
      }

      // Field access
      if (this.check(TokenType.DOT)) {
        this.advance();
        const field = this.expect(
          TokenType.IDENTIFIER,
          "Expected field name"
        ).value;
        expr = { type: "FieldAccess", object: expr, field };
        continue;
      }

      // Function call
      if (this.check(TokenType.LPAREN) && expr.type === "Identifier") {
        this.advance();
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "Expected ')' after arguments");
        expr = {
          type: "FunctionCall",
          name: (expr as AST.Identifier).name,
          arguments: args,
        };
        continue;
      }

      break;
    }

    return expr;
  }

  private parseLValue(): AST.LValue {
    const name = this.expect(TokenType.IDENTIFIER, "Expected identifier").value;
    let expr: AST.LValue = { type: "Identifier", name };

    while (true) {
      // Array access
      if (this.check(TokenType.LBRACKET)) {
        this.advance();
        const indices: AST.Expression[] = [this.parseExpression()];
        this.expect(TokenType.RBRACKET, "Expected ']'");

        while (this.check(TokenType.LBRACKET)) {
          this.advance();
          indices.push(this.parseExpression());
          this.expect(TokenType.RBRACKET, "Expected ']'");
        }

        expr = { type: "ArrayAccess", array: expr, indices };
        continue;
      }

      // Field access
      if (this.check(TokenType.DOT)) {
        this.advance();
        const field = this.expect(
          TokenType.IDENTIFIER,
          "Expected field name"
        ).value;
        expr = { type: "FieldAccess", object: expr, field };
        continue;
      }

      break;
    }

    return expr;
  }

  private parseLiteral(): AST.Literal {
    if (this.check(TokenType.INTEGER_LITERAL)) {
      const value = parseInt(this.advance().value, 10);
      return { type: "IntegerLiteral", value };
    }

    if (this.check(TokenType.REAL_LITERAL)) {
      const value = parseFloat(this.advance().value);
      return { type: "RealLiteral", value };
    }

    if (this.check(TokenType.TRUE)) {
      this.advance();
      return { type: "BooleanLiteral", value: true };
    }

    if (this.check(TokenType.FALSE)) {
      this.advance();
      return { type: "BooleanLiteral", value: false };
    }

    if (this.check(TokenType.STRING_LITERAL)) {
      const value = this.advance().value;
      return { type: "StringLiteral", value };
    }

    if (this.check(TokenType.CHAR_LITERAL)) {
      const value = this.advance().value;
      return { type: "CharLiteral", value };
    }

    // Handle negative numbers
    if (this.check(TokenType.MINUS)) {
      this.advance();
      if (this.check(TokenType.INTEGER_LITERAL)) {
        const value = -parseInt(this.advance().value, 10);
        return { type: "IntegerLiteral", value };
      }
      if (this.check(TokenType.REAL_LITERAL)) {
        const value = -parseFloat(this.advance().value);
        return { type: "RealLiteral", value };
      }
    }

    throw new ParserError("Expected literal value", this.peek().location);
  }

  // ==================== Helper Methods ====================

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(
      `${message}, got '${this.peek().value || this.peek().type}'`,
      this.peek().location
    );
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}
