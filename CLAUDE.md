# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full Tauri dev (Rust + frontend, opens desktop window)
npm run tauri dev

# Frontend only (Vite, no Rust compilation)
npm run dev

# Type check only
npx tsc --noEmit

# Lint (0 warnings allowed; ESLint ignores src-tauri/)
npm run lint

# All JS/TS tests
npm run test

# Single test file
npx vitest run tests/store/mindMapStore.test.ts

# Rust checks (run from src-tauri/)
cargo check
cargo clippy -- -D warnings
cargo test
```

`npm run tauri build` produces a distributable. `npm run build` is frontend-only (tsc + vite).

## Architecture

RustMind is a Tauri 2 desktop app: React/TypeScript frontend + Rust backend communicating via Tauri `invoke`.

### Rust backend (`src-tauri/src/`)

- `lib.rs` — registers Tauri plugins (opener, dialog) and expose commands via `generate_handler!`
- `commands/file_ops.rs` — `read_file` / `write_file` using `std::fs`; no business logic in Rust

All file I/O goes through Tauri invoke calls (`@tauri-apps/api/core`). Dialogs use `@tauri-apps/plugin-dialog`. Capabilities live in `src-tauri/capabilities/default.json` and must list any new plugin (e.g. `"dialog:default"`).

### Frontend state (`src/store/`)

Two Zustand stores — never access one from inside the other via hooks; use `getState()` for cross-store reads:

- **`mindMapStore`** (Immer middleware) — nodes, edges, documentName, filePath, isDirty, layoutType. All mutating actions set `isDirty = true`; `markSaved()` and `loadDocument()` reset it.
- **`uiStore`** (Immer + persist to localStorage) — theme, UI settings, selectedNodeId, editingNodeId, and a `_fitViewFn` callback registered by the canvas. Persists only `theme` and `settings`.

**Pattern:** components subscribe via hooks (`useMindMapStore(s => s.x)`); async functions and event handlers read via `useMindMapStore.getState()`.

### Feature modules (`src/features/`)

- **`canvas/`** — `MindMapCanvas` is the ReactFlow root. `useGlobalHotkeys` manages all node keyboard shortcuts (Tab/Enter/F2/Delete/Escape/printable chars). Guards: skip if `editingNodeId !== null` or `isEditableTarget(e.target)`.
- **`nodes/`** — `MindNode` component + `useNodeEditing` (inline textarea with commit/cancel). Node data shape: `MindNodeData { label, color?, textColor?, collapsed?, isRoot?, note? }`.
- **`edges/`** — `MindEdge` renders bezier paths.
- **`layout/`** — Pure `layoutTree(nodes, edges, { direction })` using Dagre. Called via `applyLayout` wrapper. After any layout call, trigger `useUIStore.getState().triggerFitView()` with a short `setTimeout` so ReactFlow can measure nodes first.
- **`persistence/`** — `fileService` (Tauri invoke wrappers), `serializer` (serialize/deserialize), `usePersistence` hook (Save/SaveAs/Open/New with isDirty guards), `useWindowCloseGuard` (onCloseRequested listener). `deserializeMindMap` returns typed `LoadDocumentPayload` and coerces unknown `layoutType` values to `'tree-LR'`.
- **`toolbar/`** — `AppToolbar` receives file-action callbacks as props from `EditorScreen`. `SettingsPanel` is a side drawer.

### App shell (`src/app/`)

`EditorScreen` is the single route. It orchestrates: calls `usePersistence()`, registers `useWindowCloseGuard()`, wraps content in `KeyboardProvider` (file hotkeys: Ctrl+S/Shift+S/O/N), renders `AppToolbar` with action props.

### Shared (`src/shared/`)

- **`ui/Icon/Icon.tsx`** — stroke-based SVG icon system. Add new icons by extending `IconName` union and `ICON_PATHS` record.
- **`hooks/useHotkeys`** — parses `"mod+shift+s"` style strings; `mod` = Ctrl or Cmd.
- **`lib/constants.ts`** — `HOTKEYS`, `NODE_COLORS`, `DEFAULT_LABELS`, layout spacing.

### Theming

CSS variables prefixed `--rm-*`. Theme toggled by setting `data-theme` attribute on `document.documentElement`. `uiStore.setTheme()` handles the DOM side-effect. CSS modules used throughout; no global class names.

### Tests (`tests/`)

Tests are **not** co-located with source — all live under `tests/`. Vitest with jsdom. Store tests reset state in `beforeEach` via `resetDocument()`. Tauri APIs (`invoke`, dialog) are not available in tests and should not be imported from test files; test the pure serializer/store logic only.
