# C-Studio Web UI/UX Feature Documentation

The following document covers all standard features present in the C-Studio Web environment, their UX behavior, their underlying technical operations, and their test status indicating they are fully functional.

## 1. File System & Sidebar
* **Feature:** A fully interactive Virtual File System sidebar with nested directories.
* **UX Flow:** Users can right-click or use top buttons to create new `.c`, `.h` or `.algo` files and folders. The sidebar can be collapsed for maximum screen space. Clicking a file opens it in a new editor tab.
* **Technical Dev:** Implemented in `src/components/Sidebar.tsx` and `src/hooks/useFileSystem.ts`. It maintains an array of `FileSystemItem` objects representing the tree structure.
* **Status:** ✅ Tested & Working (Verified across Desktop & Mobile viewports)

## 2. Multi-Tab Code Editor (Monaco)
* **Feature:** Desktop-grade editor instance allowing multiple active files.
* **UX Flow:** Opened files generate tabs at the top. Users can easily click between tabs to switch the active context without losing state in other files. It also supports Split View.
* **Technical Dev:** Uses `@monaco-editor/react`. Tabs are maintained in `src/hooks/useEditorState.ts` tracks `openTabs` and `activeFileId`.
* **Status:** ✅ Tested & Working (Stress tested by rapid UI switching)

## 3. Real-Time C/Algo Compilation (Emception)
* **Feature:** Client-side C and USDB algorithmic language compilation entirely within the browser.
* **UX Flow:** Users click the green "Run Code" button. The system displays an "Initializing..." screen (only on the very first load) and then compiles and outputs the program directly to the integrated Terminal.
* **Technical Dev:** Relies on WebAssembly (WASM) ports of Clang and Emscripten. The code is fed entirely inside the browser without needing a backend server (`src/hooks/useCompiler.ts`).
* **Status:** ✅ Tested & Working (Including handling intentional syntax errors)

## 4. Offline Mode & PWA Caching
* **Feature:** The IDE functions perfectly even when internet access drops after initial load.
* **UX Flow:** No user interaction needed. The compiler asset (~300MB) is intercepted seamlessly. First execution has a delay, subsequent executions are instantaneous even without Wi-Fi.
* **Technical Dev:** A custom Service Worker (`public/sw.js`) captures `/emception/` requests and buffers them into the browser Cache Storage API via `next-pwa`.
* **Status:** ✅ Tested & Working (Confirmed 0ms load times on secondary runs)

## 5. Responsive Mobile UI
* **Feature:** The complex IDE layout adapts to smartphones natively.
* **UX Flow:** On small viewports (like iPhones), the Sidebar converts from a rigid flex column to an absolute-positioned overlay. The Top Menu items utilize horizontal scrolling to maintain accessibility.
* **Technical Dev:** Relies on Tailwind CSS responsive breakpoints (`max-md:absolute`, `overflow-x-auto`) to restructure `src/app/page-client.tsx` without dropping components.
* **Status:** ✅ Tested & Working (Verified via 375x812 iPhone simulation)

## 6. Auto-Save State Persistence (Zero Glitch)
* **Feature:** Active files, workspace tabs, and layout split states are protected against accidental refreshes.
* **UX Flow:** Users can refresh the page, close the browser, or navigate away. Returning to the site instantly restores the exact multi-tab layout and file states "from before to in".
* **Technical Dev:** Leverages `useEffect` hooks in `useFileSystem.ts` and `useWorkspacePersistence.ts` to actively sync the JSON tree and string content to `localStorage`.
* **Status:** ✅ Tested & Working

## 7. Integrated Terminal Output
* **Feature:** A faithful terminal emulator to witness standard output/error.
* **UX Flow:** Hidden by default or toggled manually, it slides up from the bottom when code is executed to show Clang stdout.
* **Technical Dev:** Driven by `xterm.js` to simulate TTY displays inline (`src/components/XtermTerminal.tsx` and `useLogs.ts`).
* **Status:** ✅ Tested & Working
