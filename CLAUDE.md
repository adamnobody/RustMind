# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RustMind is a cross-platform **desktop mind-mapping application**. Users build mind maps as trees of connected nodes; the app auto-arranges them using one of 12 layout styles (hierarchy, org chart, fishbone, timeline, radial tree, network, etc.). Maps are saved as local `.rustmind` JSON files.

Core traits:
- **Structure-driven** — the user edits *structure* (parent/child links, sibling order), not pixel positions; the active layout strategy derives node positions from that structure (see the model section below). Exception: the `network` layout keeps free positions.
- **Rich editing** — inline node text editing, per-node/edge styling (shapes, colors, fonts, borders, arrows), free associative links alongside structural tree edges, undo/redo, and a right-docked inspector.
- **Local-first** — no backend or network; all persistence is local files via the Rust layer.
- **Localized** — UI in RU/EN/DE/FR (RU is the source dict).

### Stack

- **Shell:** [Tauri 2](https://tauri.app/) — Rust backend + web frontend in a native window; distributed as a desktop app.
- **Frontend:** React 18 + TypeScript (strict), Vite build. [`@xyflow/react`](https://reactflow.dev/) (ReactFlow v12) for the node/edge canvas, [Dagre](https://github.com/dagrejs/dagre) for tree layout, [Zustand](https://github.com/pmndrs/zustand) (+ Immer) for state. CSS Modules with `--rm-*` CSS variables for theming (dark/light).
- **Backend:** Rust — thin command layer (file read/write, system-font enumeration via `fontdb`); no business logic.
- **Tests:** Vitest (jsdom) for TS; `cargo test` for Rust.

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

- `lib.rs` — registers Tauri plugins (opener, dialog) and exposes commands via `generate_handler!`
- `commands/file_ops.rs` — `read_file` / `write_file` using `std::fs`
- `commands/fonts.rs` — `list_system_fonts` (via `fontdb`); slow (~hundreds of ms), so the frontend calls it once and caches. No other business logic lives in Rust.

All file I/O goes through Tauri invoke calls (`@tauri-apps/api/core`). Dialogs use `@tauri-apps/plugin-dialog`. Capabilities live in `src-tauri/capabilities/default.json` and must list any new plugin (e.g. `"dialog:default"`).

### The core model: structure-driven layout

The single most important concept. **Node positions are (mostly) not user-owned data — they are derived from tree structure.** The user edits *structure* (parent/child, sibling order); the layout strategy computes positions.

- Structure = **tree edges** (`data.kind !== 'free'`) + each node's `data.order` (position among siblings). `strategies/shared.ts` has the graph helpers (`treeParentOf`, `treeChildrenMap` sorts children by `order`, ancestor/cycle checks).
- **`positionMode: 'derived'`** (all strategies except `network`) — positions recomputed from structure after *every* structural change. `mindMapStore.recomputeIfDerived()` runs this and is called by add/delete/move/load. It's an invariant, not a feature.
- **`positionMode: 'stored'`** (only `network`) — positions are soft, kept as-is (drag / force layout).
- **Free edges** (`data.kind === 'free'`) are associative links the user draws; they never define hierarchy and layout never moves their handles. `isTreeEdge()` treats everything *not* explicitly `'free'` as tree (so legacy edges without `kind` migrate to tree).

### Frontend state (`src/store/`)

Two Zustand stores — never access one from inside the other via hooks; use `getState()` for cross-store reads:

- **`mindMapStore`** (Immer) — nodes, edges, documentName, filePath, isDirty, layoutType, `projectSettings`, plus an undo/redo history (`past`/`future` stacks of full `structuredClone` snapshots). All mutating actions set `isDirty = true`; `markSaved()`, `loadDocument()`, `resetDocument()` reset it. `types.ts` holds `MindMapState` and the history types. Slices under `store/slices/` are unused legacy — the store lives in `mindMapStore.ts`.
  - **History:** actions call `recordHistory(category)` *before* mutating. `HistoryCategory` (`structural`/`layout`/`move`/`text`) decides whether undo/redo re-centers the view (fitView). Continuous edits (typing a label, dragging a style slider) are **coalesced** into one undo entry via `recordCoalesced(key, ...)` within `COALESCE_MS`. `pushHistory()` lets the canvas snapshot at drag start (so a reparent = one entry via `moveNode(..., { skipHistory: true })`).
- **`uiStore`** (persist to localStorage) — theme, locale, UI `settings`, selection (`selectedNodeIds`/`selectedEdgeIds`), editing state, inspector visibility, `notice` toast, home-screen appearance, and a `_fitViewFn` callback registered by the canvas. **Persists only `theme`, `locale`, `settings`** (deep-merged so new setting keys survive old localStorage).

**Pattern:** components subscribe via hooks (`useMindMapStore(s => s.x)`); async functions and event handlers read via `useMindMapStore.getState()`.

### Feature modules (`src/features/`)

- **`layout/`** — the strategy system. `strategies/registry.ts` maps each `LayoutKind` (12: hierarchy/right/left/both/tree/org/logic/fishbone/timeline/bubble/network/free — see `engines/layoutTypes.ts`, default `hierarchy`) to a `LayoutStrategy` (`strategies/types.ts`): a pure `layout(nodes, edges)` positioner + `canConnect` predicate + `edgeConstraint`/`positionMode`/`edgeRouting`. Add a layout type = add one strategy module + register it. `applyLayout` is the wrapper the store calls. After any layout call, trigger `useUIStore.getState().triggerFitView()` in a short `setTimeout` so ReactFlow can measure nodes first. `LayoutTypeDialog` picks the type for new/existing docs.
- **`canvas/`** — `MindMapCanvas` is the ReactFlow root. `useGlobalHotkeys` = node shortcuts (Tab=child, Enter=sibling, F2/printable=edit, Delete). Guards: skip if `editingNodeId !== null` or target is editable. Node **drag reparents structure** (XMind-style): `lib/dropTarget.ts` computes the drop target, `uiStore.dragIndicator` highlights it, drop calls `moveNode`. `isValidConnection` blocks illegal connects per the active strategy's `canConnect` (the store's `onConnect` is the second guard).
- **`nodes/`** — `MindNode` + `useNodeEditing` (inline textarea) + `useNodeActions`. `MindNodeData` (`nodes/types.ts`): `label, color?, isRoot?, note?, order?, style?: NodeStyle, handleOffsets?`. `NodeStyle` (shape/border/font/colors) and `handleOffsets` store **only deviations from defaults** — `pruneStyle` strips fields equal to `DEFAULT_NODE_STYLE` (same helper the serializer uses).
- **`edges/`** — `MindEdge` renders paths; `lib/routing.ts` picks routing (orthogonal/bezier/radial/straight/fixed) per strategy. `edges/types.ts`: `EdgeKind` (tree/free), `EdgeStyle` (line/arrows/taper/label), `isTreeEdge`, `DEFAULT_TREE_EDGE_HANDLES`. Same prune-against-default contract as nodes.
- **`inspector/`** — right-docked style panel. Edits exactly one element (single node OR single edge — `isEditableSelection` in uiStore); auto-opens on single selection unless the user hid it (`inspectorManuallyHidden` override).
- **`persistence/`** — `fileService` (Tauri invoke wrappers, `.rustmind` files), `serializer` (`schema.ts` is `FILE_VERSION 4`), `usePersistence` (Save/SaveAs/Open/New with isDirty guards), `useWindowCloseGuard`, `recentFiles` (localStorage, for HomeScreen). `deserializeMindMap` → typed `LoadDocumentPayload`, migrates via `coerceLayoutKind` (unknown/legacy layoutType → `'hierarchy'`) and runs `normalizeStructure` (enforces one root, one parent per node, contiguous `order`). Old files without handles/`order`/`kind` are backfilled.
- **`toolbar/`** — `AppToolbar` (+ `MenuBar`, `FileMenu`, `LayoutSwitcher`, `UndoRedoButtons`) receives file-action callbacks as props from `EditorScreen`. `SettingsPanel` is a side drawer.

### App shell (`src/app/`)

Two screens toggled by local state in `App.tsx` (no router): `HomeScreen` (recent files + animated backdrop) → `EditorScreen`. Going home confirms unsaved changes and calls `resetDocument()`. `EditorScreen` calls `usePersistence()`, registers `useWindowCloseGuard()`, wraps content in `KeyboardProvider` (file hotkeys: Ctrl+S/Shift+S/O/N), and renders the toolbar, canvas, `Inspector`, `SettingsPanel`, `LayoutTypeDialog`.

### Shared (`src/shared/`)

- **`ui/`** — small component kit (`Button`, `IconButton`, `Modal`, `Drawer`, `Switch`, `SegmentedControl`, `Tooltip`, `Icon`). `Icon.tsx` is a stroke-based SVG system — add icons by extending the `IconName` union and `ICON_PATHS` record.
- **`hooks/useHotkeys`** — parses `"mod+shift+s"` style strings; `mod` = Ctrl or Cmd.
- **`lib/`** — `constants.ts` (`HOTKEYS`, `NODE_COLORS`, node sizes, layout spacing, `DEFAULT_HANDLE_VISIBILITY`), `style.ts` (`pruneStyle` — the shared default-stripping helper), `id.ts`, `geometry.ts`, `dom.ts`, `fonts.ts`.
- **`i18n/`** — app-wide localization (RU/EN/DE/FR). `ru` is the source-of-truth dict; other locales must match its keys (TS-enforced). Active `locale` lives in `uiStore` (persisted). Use `useT()` in components (re-renders on locale change); `translate()` in stores/services/handlers (reads `uiStore.getState().locale`). New-document content defaults (root/child labels, untitled name) are localized at creation via `translate()`; `isDefaultChildLabel()` detects the placeholder label across all locales.

### Theming

CSS variables prefixed `--rm-*`. Theme toggled by setting `data-theme` attribute on `document.documentElement`. `uiStore.setTheme()` handles the DOM side-effect. CSS modules used throughout; no global class names.

### Tests (`tests/`)

Tests are **not** co-located with source — all live under `tests/` (mirroring feature dirs: store, layout strategies/normalize, persistence serializer/recentFiles, edges routing, canvas dropTarget, shared pruneStyle). Vitest with jsdom. Store tests reset state in `beforeEach` via `resetDocument()`. Tauri APIs (`invoke`, dialog) are not available in tests and must not be imported from test files — test the pure serializer/store/strategy logic only.
