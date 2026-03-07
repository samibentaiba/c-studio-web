"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// App-wide theme definitions
export interface AppTheme {
  id: string;
  name: string;
  // Editor colors (Monaco)
  editor: {
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
    cursor: string;
  };
  // UI colors
  ui: {
    background: string;
    backgroundLight: string;
    backgroundDark: string;
    foreground: string;
    foregroundMuted: string;
    border: string;
    accent: string;
    accentHover: string;
  };
  // Terminal colors
  terminal: {
    background: string;
    foreground: string;
  };
  // Syntax highlighting (for Monaco)
  syntax: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    type: string;
    function: string;
    variable: string;
    operator: string;
  };
}

export const appThemes: AppTheme[] = [
  {
    id: "vs-dark",
    name: "VS Dark",
    editor: {
      background: "#1e1e1e",
      foreground: "#d4d4d4",
      lineHighlight: "#2a2d2e",
      selection: "#264f78",
      cursor: "#aeafad",
    },
    ui: {
      background: "#252526",
      backgroundLight: "#2d2d2d",
      backgroundDark: "#1e1e1e",
      foreground: "#cccccc",
      foregroundMuted: "#999999",
      border: "#3c3c3c",
      accent: "#007acc",
      accentHover: "#1a9fff",
    },
    terminal: {
      background: "#1e1e1e",
      foreground: "#cccccc",
    },
    syntax: {
      comment: "#6a9955",
      keyword: "#569cd6",
      string: "#ce9178",
      number: "#b5cea8",
      type: "#4ec9b0",
      function: "#dcdcaa",
      variable: "#9cdcfe",
      operator: "#d4d4d4",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    editor: {
      background: "#272822",
      foreground: "#f8f8f2",
      lineHighlight: "#3e3d32",
      selection: "#49483e",
      cursor: "#f8f8f0",
    },
    ui: {
      background: "#272822",
      backgroundLight: "#3e3d32",
      backgroundDark: "#1e1e1e",
      foreground: "#f8f8f2",
      foregroundMuted: "#75715e",
      border: "#49483e",
      accent: "#a6e22e",
      accentHover: "#c6f24e",
    },
    terminal: {
      background: "#272822",
      foreground: "#f8f8f2",
    },
    syntax: {
      comment: "#75715e",
      keyword: "#f92672",
      string: "#e6db74",
      number: "#ae81ff",
      type: "#66d9ef",
      function: "#a6e22e",
      variable: "#f8f8f2",
      operator: "#f92672",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    editor: {
      background: "#282a36",
      foreground: "#f8f8f2",
      lineHighlight: "#44475a",
      selection: "#44475a",
      cursor: "#f8f8f2",
    },
    ui: {
      background: "#282a36",
      backgroundLight: "#44475a",
      backgroundDark: "#21222c",
      foreground: "#f8f8f2",
      foregroundMuted: "#6272a4",
      border: "#44475a",
      accent: "#bd93f9",
      accentHover: "#d9b3ff",
    },
    terminal: {
      background: "#282a36",
      foreground: "#f8f8f2",
    },
    syntax: {
      comment: "#6272a4",
      keyword: "#ff79c6",
      string: "#f1fa8c",
      number: "#bd93f9",
      type: "#8be9fd",
      function: "#50fa7b",
      variable: "#f8f8f2",
      operator: "#ff79c6",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    editor: {
      background: "#0d1117",
      foreground: "#c9d1d9",
      lineHighlight: "#161b22",
      selection: "#264f78",
      cursor: "#c9d1d9",
    },
    ui: {
      background: "#161b22",
      backgroundLight: "#21262d",
      backgroundDark: "#0d1117",
      foreground: "#c9d1d9",
      foregroundMuted: "#8b949e",
      border: "#30363d",
      accent: "#58a6ff",
      accentHover: "#79b8ff",
    },
    terminal: {
      background: "#0d1117",
      foreground: "#c9d1d9",
    },
    syntax: {
      comment: "#8b949e",
      keyword: "#ff7b72",
      string: "#a5d6ff",
      number: "#79c0ff",
      type: "#ffa657",
      function: "#d2a8ff",
      variable: "#c9d1d9",
      operator: "#ff7b72",
    },
  },
  {
    id: "one-dark",
    name: "One Dark Pro",
    editor: {
      background: "#282c34",
      foreground: "#abb2bf",
      lineHighlight: "#2c313c",
      selection: "#3e4451",
      cursor: "#528bff",
    },
    ui: {
      background: "#21252b",
      backgroundLight: "#2c313c",
      backgroundDark: "#1e2127",
      foreground: "#abb2bf",
      foregroundMuted: "#5c6370",
      border: "#3e4451",
      accent: "#61afef",
      accentHover: "#81bfff",
    },
    terminal: {
      background: "#282c34",
      foreground: "#abb2bf",
    },
    syntax: {
      comment: "#5c6370",
      keyword: "#c678dd",
      string: "#98c379",
      number: "#d19a66",
      type: "#e5c07b",
      function: "#61afef",
      variable: "#e06c75",
      operator: "#56b6c2",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    editor: {
      background: "#002b36",
      foreground: "#839496",
      lineHighlight: "#073642",
      selection: "#073642",
      cursor: "#839496",
    },
    ui: {
      background: "#073642",
      backgroundLight: "#094959",
      backgroundDark: "#002b36",
      foreground: "#839496",
      foregroundMuted: "#586e75",
      border: "#094959",
      accent: "#268bd2",
      accentHover: "#46abf2",
    },
    terminal: {
      background: "#002b36",
      foreground: "#839496",
    },
    syntax: {
      comment: "#586e75",
      keyword: "#859900",
      string: "#2aa198",
      number: "#d33682",
      type: "#b58900",
      function: "#268bd2",
      variable: "#839496",
      operator: "#859900",
    },
  },
  {
    id: "nord",
    name: "Nord",
    editor: {
      background: "#2e3440",
      foreground: "#d8dee9",
      lineHighlight: "#3b4252",
      selection: "#434c5e",
      cursor: "#d8dee9",
    },
    ui: {
      background: "#3b4252",
      backgroundLight: "#434c5e",
      backgroundDark: "#2e3440",
      foreground: "#d8dee9",
      foregroundMuted: "#616e88",
      border: "#4c566a",
      accent: "#88c0d0",
      accentHover: "#a8d0e0",
    },
    terminal: {
      background: "#2e3440",
      foreground: "#d8dee9",
    },
    syntax: {
      comment: "#616e88",
      keyword: "#81a1c1",
      string: "#a3be8c",
      number: "#b48ead",
      type: "#8fbcbb",
      function: "#88c0d0",
      variable: "#d8dee9",
      operator: "#81a1c1",
    },
  },
];

const THEME_STORAGE_KEY = "c-studio-app-theme";

interface ThemeContextType {
  theme: AppTheme;
  themeId: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>("vs-dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) setThemeId(savedTheme);
    }
  }, []);

  const theme = appThemes.find((t) => t.id === themeId) || appThemes[0];

  const setTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  };

  // Apply CSS variables to document
  useEffect(() => {
    const root = document.documentElement;
    
    // UI variables
    root.style.setProperty("--theme-bg", theme.ui.background);
    root.style.setProperty("--theme-bg-light", theme.ui.backgroundLight);
    root.style.setProperty("--theme-bg-dark", theme.ui.backgroundDark);
    root.style.setProperty("--theme-fg", theme.ui.foreground);
    root.style.setProperty("--theme-fg-muted", theme.ui.foregroundMuted);
    root.style.setProperty("--theme-border", theme.ui.border);
    root.style.setProperty("--theme-accent", theme.ui.accent);
    root.style.setProperty("--theme-accent-hover", theme.ui.accentHover);
    
    // Editor variables
    root.style.setProperty("--theme-editor-bg", theme.editor.background);
    root.style.setProperty("--theme-editor-fg", theme.editor.foreground);
    
    // Terminal variables
    root.style.setProperty("--theme-terminal-bg", theme.terminal.background);
    root.style.setProperty("--theme-terminal-fg", theme.terminal.foreground);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function getAppTheme(id: string): AppTheme | undefined {
  return appThemes.find((t) => t.id === id);
}
