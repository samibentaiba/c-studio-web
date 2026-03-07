// USDB Algorithmic Language - Monaco Editor Configuration
// Université Saad Dahlab - Blida 1
// Syntax highlighting and language support for the Monaco editor

export const USDB_LANGUAGE_ID = "usdb-algo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoType = any;

// Language configuration
export const languageConfig = {
  comments: {
    lineComment: "//",
    blockComment: ["{", "}"] as [string, string],
  },
  brackets: [
    ["(", ")"],
    ["[", "]"],
    ["BEGIN", "END"],
  ] as [string, string][],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "{", close: "}" },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*(BEGIN|STRUCTURE|FUNCTION|PROCEDURE|IF|WHILE|FOR|SWITCH)/i,
      end: /^\s*END/i,
    },
  },
};

// Token provider for syntax highlighting
export const monarchTokensProvider = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: "invalid",
  ignoreCase: true,

  keywords: [
    "ALGORITHM",
    "BEGIN",
    "END",
    "CONST",
    "VAR",
    "TYPE",
    "INTEGER",
    "REAL",
    "BOOLEAN",
    "CHAR",
    "STRING",
    "ARRAY",
    "OF",
    "STRUCTURE",
    "IF",
    "THEN",
    "ELSE",
    "SWITCH",
    "CASE",
    "DEFAULT",
    "FOR",
    "TO",
    "STEP",
    "DO",
    "WHILE",
    "FUNCTION",
    "PROCEDURE",
    "RETURN",
    "SCAN",
    "PRINT",
  ],

  operators: ["OR", "AND", "NOT", "DIV", "MOD"],

  typeKeywords: ["INTEGER", "REAL", "BOOLEAN", "CHAR", "STRING"],

  builtinFunctions: [
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
    "length",
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Identifiers and keywords
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@operators": "keyword.operator",
            "@typeKeywords": "type",
            "@builtinFunctions": "support.function",
            TRUE: "constant.language",
            FALSE: "constant.language",
            "@default": "identifier",
          },
        },
      ],

      // Whitespace
      { include: "@whitespace" },

      // Delimiters and operators
      [/[{}()\[\]]/, "@brackets"],
      [/<-/, "operator.assignment"],
      [/<=|>=|<>|!=|[<>=]/, "operator.comparison"],
      [/[+\-*\/\^]/, "operator.arithmetic"],
      [/[;,.:()]/, "delimiter"],

      // Numbers
      [/\d+\.\d+/, "number.float"],
      [/\d+/, "number"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // Characters
      [/'[^\\']'/, "string.char"],
      [/'\\.'/, "string.char"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\/.*$/, "comment"],
      [/\{/, "comment", "@comment"],
      [/\/\*/, "comment", "@commentBlock"],
    ],

    comment: [
      [/[^}]+/, "comment"],
      [/\}/, "comment", "@pop"],
    ],

    commentBlock: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};

// Completion provider
export const createCompletionItemProvider = (monaco: MonacoType) => ({
  provideCompletionItems: (model: MonacoType, position: MonacoType) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const CompletionItemKind = monaco.languages.CompletionItemKind;
    const InsertTextRule = monaco.languages.CompletionItemInsertTextRule;

    const suggestions = [
      // Keywords
      ...[
        "ALGORITHM",
        "BEGIN",
        "END",
        "CONST",
        "VAR",
        "TYPE",
        "IF",
        "THEN",
        "ELSE",
        "WHILE",
        "DO",
        "FOR",
        "TO",
        "STEP",
        "SWITCH",
        "CASE",
        "DEFAULT",
        "FUNCTION",
        "PROCEDURE",
        "RETURN",
        "ARRAY",
        "OF",
        "STRUCTURE",
        "SCAN",
        "PRINT",
      ].map((kw) => ({
        label: kw,
        kind: CompletionItemKind.Keyword,
        insertText: kw,
        range,
      })),

      // Types
      ...["INTEGER", "REAL", "BOOLEAN", "CHAR", "STRING"].map((t) => ({
        label: t,
        kind: CompletionItemKind.TypeParameter,
        insertText: t,
        range,
      })),

      // Operators
      ...["AND", "OR", "NOT", "DIV", "MOD", "TRUE", "FALSE"].map((op) => ({
        label: op,
        kind: CompletionItemKind.Operator,
        insertText: op,
        range,
      })),

      // Built-in functions
      ...[
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
        "length",
      ].map((fn) => ({
        label: fn,
        kind: CompletionItemKind.Function,
        insertText: `${fn}($1)`,
        insertTextRules: InsertTextRule.InsertAsSnippet,
        range,
      })),

      // Snippets
      {
        label: "algorithm",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "ALGORITHM ${1:Name}",
          "VAR ${2:x} : ${3:INTEGER}",
          "",
          "BEGIN",
          "    $0",
          "END.",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "Basic algorithm template",
        range,
      },
      {
        label: "if-then-else",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "IF (${1:condition}) THEN",
          "    $2",
          "ELSE",
          "    $0",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "If-Then-Else statement",
        range,
      },
      {
        label: "while-do",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "WHILE (${1:condition}) DO",
          "BEGIN",
          "    $0",
          "END",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "While loop",
        range,
      },
      {
        label: "for-loop",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "FOR ${1:i} <- ${2:0} TO ${3:10} DO",
          "BEGIN",
          "    $0",
          "END",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "For loop",
        range,
      },
      {
        label: "function",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "FUNCTION ${1:name}(${2:param} : ${3:INTEGER}) : ${4:INTEGER}",
          "VAR ${5:result} : ${4}",
          "BEGIN",
          "    $0",
          "    RETURN(${5})",
          "END",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "Function definition",
        range,
      },
      {
        label: "procedure",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "PROCEDURE ${1:name}(${2:param} : ${3:INTEGER})",
          "BEGIN",
          "    $0",
          "END",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "Procedure definition",
        range,
      },
      {
        label: "structure",
        kind: CompletionItemKind.Snippet,
        insertText: [
          "TYPE ${1:Name} = STRUCTURE",
          "BEGIN",
          "    ${2:field} : ${3:INTEGER}",
          "END",
        ].join("\n"),
        insertTextRules: InsertTextRule.InsertAsSnippet,
        documentation: "Structure type definition",
        range,
      },
    ];

    return { suggestions };
  },
});

/**
 * Register the USDB Algo language with Monaco editor.
 * Call this function once when initializing the editor.
 */
export function registerUSDBLanguage(monaco: MonacoType): void {
  // Check if already registered
  const languages = monaco.languages.getLanguages();
  if (languages.some((lang: { id: string }) => lang.id === USDB_LANGUAGE_ID)) {
    return;
  }

  // Register the language
  monaco.languages.register({
    id: USDB_LANGUAGE_ID,
    extensions: [".algo"],
    aliases: ["USDB Algo", "algo", "Algorithm"],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(USDB_LANGUAGE_ID, languageConfig);

  // Set tokenizer
  monaco.languages.setMonarchTokensProvider(
    USDB_LANGUAGE_ID,
    monarchTokensProvider
  );

  // Register completion provider
  monaco.languages.registerCompletionItemProvider(
    USDB_LANGUAGE_ID,
    createCompletionItemProvider(monaco)
  );
}
