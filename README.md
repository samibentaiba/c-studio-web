# C-Studio Web

An advanced, entirely client-side web application for writing, compiling, executing C code, and translating between C and the USDB Algorithmic Language.

## Features

- **In-Browser C Compilation:** Uses [Emception](https://github.com/jprendes/emception) (Clang compiled to WebAssembly) to parse and compile C programs directly in the browser—meaning zero server costs for code execution and total sandbox security.
- **USDB Algo Translation:** Built-in lexer and parser for the USDB Algorithmic language, capable of converting C to Algo and Algo to C.
- **Virtual File System:** A React-managed virtual file system mimicking desktop IDE workflows (supports multi-file compilation, nesting, and split editor views).
- **Interactive Pseudo-Terminal:** Powershell-like UI powered by Xterm.js acting as a pseudo-TTY for running GCC WebAssembly commands (`gcc`, `./executable`).
- **No Backend Required:** Ready for simple static site generation and CDN hosting on Vercel.

## Architecture

The application is built on Next.js 15+ (App Router) and React 19.

### Key Directories
- `src/app`: Reusable layout component, global generic CSS, and application entrypoints.
- `src/components`: UI components including the Monaco Editor, Resizable Sidebar, XtermTerminal, and Editor Tabs.
- `src/hooks`: Advanced state management extracted from the main page to keep components clean, including `useCompiler`, `useFileSystem`, `useTranslator`, and `useEditorState`.
- `src/usdb-compiler`: AST structure, parsers, and bidirectional translators for turning raw string C/Algo into functional representations.
- `public/emception`: The WebAssembly payload that Clang uses for client-side C processing. This directory is served statically with COOP/COEP headers enforced in `next.config.ts`.

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the IDE.

## Deployment

This app is optimized for Vercel. The `next.config.ts` automatically configures the correct cross-origin headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`) required for WebAssembly's `SharedArrayBuffer` threading to work efficiently.

Deploying to Vercel is as simple as hooking up the repository and letting it build via the standard Next.js preset.
