// USDB Algorithmic Language - Lexer (Tokenizer)
// Université Saad Dahlab - Blida 1

import { LexerError, SourceLocation } from "./errors";

// Token types
export enum TokenType {
  // Keywords
  ALGORITHM = "ALGORITHM",
  BEGIN = "BEGIN",
  END = "END",
  CONST = "CONST",
  VAR = "VAR",
  TYPE = "TYPE",
  INTEGER = "INTEGER",
  REAL = "REAL",
  BOOLEAN = "BOOLEAN",
  CHAR = "CHAR",
  STRING = "STRING",
  ARRAY = "ARRAY",
  OF = "OF",
  STRUCTURE = "STRUCTURE",
  IF = "IF",
  THEN = "THEN",
  ELSE = "ELSE",
  SWITCH = "SWITCH",
  CASE = "CASE",
  DEFAULT = "DEFAULT",
  FOR = "FOR",
  TO = "TO",
  STEP = "STEP",
  DO = "DO",
  WHILE = "WHILE",
  FUNCTION = "FUNCTION",
  PROCEDURE = "PROCEDURE",
  RETURN = "RETURN",
  OR = "OR",
  AND = "AND",
  NOT = "NOT",
  DIV = "DIV",
  MOD = "MOD",
  SCAN = "SCAN",
  PRINT = "PRINT",
  TRUE = "TRUE",
  FALSE = "FALSE",

  // Literals
  INTEGER_LITERAL = "INTEGER_LITERAL",
  REAL_LITERAL = "REAL_LITERAL",
  STRING_LITERAL = "STRING_LITERAL",
  CHAR_LITERAL = "CHAR_LITERAL",

  // Identifiers
  IDENTIFIER = "IDENTIFIER",

  // Operators
  ASSIGN = "ASSIGN", // <-
  PLUS = "PLUS", // +
  MINUS = "MINUS", // -
  MULTIPLY = "MULTIPLY", // *
  DIVIDE = "DIVIDE", // /
  POWER = "POWER", // ^ or ↑
  EQUAL = "EQUAL", // =
  NOT_EQUAL = "NOT_EQUAL", // <> or !=
  LESS = "LESS", // <
  GREATER = "GREATER", // >
  LESS_EQUAL = "LESS_EQUAL", // <=
  GREATER_EQUAL = "GREATER_EQUAL", // >=

  // Delimiters
  SEMICOLON = "SEMICOLON", // ;
  COMMA = "COMMA", // ,
  COLON = "COLON", // :
  DOT = "DOT", // .
  LPAREN = "LPAREN", // (
  RPAREN = "RPAREN", // )
  LBRACKET = "LBRACKET", // [
  RBRACKET = "RBRACKET", // ]

  // Special
  EOF = "EOF",
}

// Keywords map (case insensitive)
const KEYWORDS: Map<string, TokenType> = new Map([
  ["algorithm", TokenType.ALGORITHM],
  ["begin", TokenType.BEGIN],
  ["end", TokenType.END],
  ["const", TokenType.CONST],
  ["var", TokenType.VAR],
  ["type", TokenType.TYPE],
  ["integer", TokenType.INTEGER],
  ["real", TokenType.REAL],
  ["boolean", TokenType.BOOLEAN],
  ["char", TokenType.CHAR],
  ["string", TokenType.STRING],
  ["array", TokenType.ARRAY],
  ["of", TokenType.OF],
  ["structure", TokenType.STRUCTURE],
  ["if", TokenType.IF],
  ["then", TokenType.THEN],
  ["else", TokenType.ELSE],
  ["switch", TokenType.SWITCH],
  ["case", TokenType.CASE],
  ["default", TokenType.DEFAULT],
  ["for", TokenType.FOR],
  ["to", TokenType.TO],
  ["step", TokenType.STEP],
  ["do", TokenType.DO],
  ["while", TokenType.WHILE],
  ["function", TokenType.FUNCTION],
  ["procedure", TokenType.PROCEDURE],
  ["return", TokenType.RETURN],
  ["or", TokenType.OR],
  ["and", TokenType.AND],
  ["not", TokenType.NOT],
  ["div", TokenType.DIV],
  ["mod", TokenType.MOD],
  ["scan", TokenType.SCAN],
  ["print", TokenType.PRINT],
  ["true", TokenType.TRUE],
  ["false", TokenType.FALSE],
]);

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: LexerError[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): { tokens: Token[]; errors: LexerError[] } {
    this.tokens = [];
    this.errors = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      try {
        this.scanToken();
      } catch (e) {
        if (e instanceof LexerError) {
          this.errors.push(e);
          this.advance(); // Skip problematic character
        } else {
          throw e;
        }
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      location: this.getLocation(),
    });

    return { tokens: this.tokens, errors: this.errors };
  }

  private scanToken(): void {
    this.skipWhitespaceAndComments();
    if (this.isAtEnd()) return;

    const location = this.getLocation();
    const char = this.peek();

    // Operators and delimiters
    if (char === "<") {
      this.advance();
      if (this.peek() === "-") {
        this.advance();
        this.addToken(TokenType.ASSIGN, "<-", location);
      } else if (this.peek() === "=") {
        this.advance();
        this.addToken(TokenType.LESS_EQUAL, "<=", location);
      } else if (this.peek() === ">") {
        this.advance();
        this.addToken(TokenType.NOT_EQUAL, "<>", location);
      } else {
        this.addToken(TokenType.LESS, "<", location);
      }
      return;
    }

    if (char === ">") {
      this.advance();
      if (this.peek() === "=") {
        this.advance();
        this.addToken(TokenType.GREATER_EQUAL, ">=", location);
      } else {
        this.addToken(TokenType.GREATER, ">", location);
      }
      return;
    }

    if (char === "!") {
      this.advance();
      if (this.peek() === "=") {
        this.advance();
        this.addToken(TokenType.NOT_EQUAL, "!=", location);
      } else {
        throw new LexerError(`Unexpected character '!'`, location);
      }
      return;
    }

    // Single character tokens
    const singleTokens: Record<string, TokenType> = {
      "+": TokenType.PLUS,
      "-": TokenType.MINUS,
      "*": TokenType.MULTIPLY,
      "/": TokenType.DIVIDE,
      "^": TokenType.POWER,
      "↑": TokenType.POWER,
      "=": TokenType.EQUAL,
      ";": TokenType.SEMICOLON,
      ",": TokenType.COMMA,
      ":": TokenType.COLON,
      ".": TokenType.DOT,
      "(": TokenType.LPAREN,
      ")": TokenType.RPAREN,
      "[": TokenType.LBRACKET,
      "]": TokenType.RBRACKET,
    };

    if (singleTokens[char]) {
      this.advance();
      this.addToken(singleTokens[char], char, location);
      return;
    }

    // String literal
    if (char === '"') {
      this.scanString(location);
      return;
    }

    // Char literal
    if (char === "'") {
      this.scanChar(location);
      return;
    }

    // Number literal
    if (this.isDigit(char)) {
      this.scanNumber(location);
      return;
    }

    // Identifier or keyword
    if (this.isAlpha(char)) {
      this.scanIdentifier(location);
      return;
    }

    throw new LexerError(`Unexpected character '${char}'`, location);
  }

  private scanString(location: SourceLocation): void {
    this.advance(); // consume opening "
    let value = "";

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === "\n") {
        throw new LexerError("Unterminated string literal", location);
      }
      if (this.peek() === "\\") {
        this.advance();
        value += this.scanEscapeSequence();
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError("Unterminated string literal", location);
    }

    this.advance(); // consume closing "
    this.addToken(TokenType.STRING_LITERAL, value, location);
  }

  private scanChar(location: SourceLocation): void {
    this.advance(); // consume opening '
    let value = "";

    if (this.isAtEnd() || this.peek() === "'") {
      throw new LexerError("Empty character literal", location);
    }

    if (this.peek() === "\\") {
      this.advance();
      value = this.scanEscapeSequence();
    } else {
      value = this.advance();
    }

    if (this.peek() !== "'") {
      throw new LexerError(
        "Character literal too long or missing closing quote",
        location
      );
    }

    this.advance(); // consume closing '
    this.addToken(TokenType.CHAR_LITERAL, value, location);
  }

  private scanEscapeSequence(): string {
    const char = this.advance();
    switch (char) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "\\":
        return "\\";
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return char;
    }
  }

  private scanNumber(location: SourceLocation): void {
    let value = "";

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check for real number
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
      this.addToken(TokenType.REAL_LITERAL, value, location);
    } else {
      this.addToken(TokenType.INTEGER_LITERAL, value, location);
    }
  }

  private scanIdentifier(location: SourceLocation): void {
    let value = "";

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check if it's a keyword (case insensitive)
    const keyword = KEYWORDS.get(value.toLowerCase());
    if (keyword) {
      this.addToken(keyword, value, location);
    } else {
      this.addToken(TokenType.IDENTIFIER, value, location);
    }
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();

      if (char === " " || char === "\t" || char === "\r") {
        this.advance();
      } else if (char === "\n") {
        this.advance();
        this.line++;
        this.column = 1;
      } else if (char === "/" && this.peekNext() === "/") {
        // Line comment
        while (!this.isAtEnd() && this.peek() !== "\n") {
          this.advance();
        }
      } else if (char === "{") {
        // Block comment { ... }
        this.advance();
        while (!this.isAtEnd() && this.peek() !== "}") {
          if (this.peek() === "\n") {
            this.line++;
            this.column = 0;
          }
          this.advance();
        }
        if (!this.isAtEnd()) this.advance(); // consume }
      } else if (char === "/" && this.peekNext() === "*") {
        // Block comment /* ... */
        this.advance(); // consume /
        this.advance(); // consume *
        while (
          !this.isAtEnd() &&
          !(this.peek() === "*" && this.peekNext() === "/")
        ) {
          if (this.peek() === "\n") {
            this.line++;
            this.column = 0;
          }
          this.advance();
        }
        if (!this.isAtEnd()) {
          this.advance(); // consume *
          this.advance(); // consume /
        }
      } else {
        break;
      }
    }
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos] ?? "\0";
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? "\0";
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isAlpha(char: string): boolean {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char) || char === "_";
  }

  private getLocation(): SourceLocation {
    return { line: this.line, column: this.column, offset: this.pos };
  }

  private addToken(
    type: TokenType,
    value: string,
    location: SourceLocation
  ): void {
    this.tokens.push({ type, value, location });
  }
}
