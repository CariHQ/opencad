# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCAD is a browser-native, AI-powered, open-source BIM (Building Information Modeling) platform. It targets parity with tools like Archicad/Revit while being browser-first, real-time collaborative, offline-capable, and AI-integrated.

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev:browser         # Start browser app (Vite dev server)
pnpm dev:desktop         # Start desktop app (Tauri)

# Building
pnpm build               # Build all packages
pnpm build:browser       # Build browser app only
pnpm build:desktop       # Build desktop app (Tauri)

# Testing
pnpm test:unit                              # Run unit tests across all packages
pnpm --filter=@opencad/document test:unit   # Run tests in a specific package
pnpm --filter=@opencad/geometry test:unit
pnpm test:e2e                               # Playwright E2E tests
pnpm test:e2e:ui                            # Playwright with UI

# Quality
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint
pnpm lint:fix            # ESLint with auto-fix
pnpm format              # Prettier format
pnpm format:check        # Prettier check

# Per-package operations
pnpm --filter=@opencad/<package> build
pnpm --filter=@opencad/<package> test:watch  # Watch mode for TDD
```

## Architecture

This is a **pnpm + Turborepo monorepo** with the following packages:

### `packages/app` (`@opencad/app`)
The browser React application (Vite + React 19 + PWA). This is the main UI shell.
- **State**: Zustand store in `src/stores/documentStore.ts` — central state for the active document, selected elements, active tool, undo/redo history, and online status
- **Viewport**: Two rendering modes — `useViewport` (2D canvas-based drafting) and `useThreeViewport` (Three.js 3D view). The `Viewport` component switches between them based on `viewType`
- **UI panels**: `AppLayout.tsx` composes `ToolShelf`, `Navigator`, `LayerPanel`, `PropertiesPanel`, `StatusBar`, `AIChatPanel`, `LevelSelector`, `Viewport`
- **Theme**: Light/dark, toggled via `data-theme` attribute on `<html>`, stored in `localStorage`

### `packages/document` (`@opencad/document`)
The CRDT document model. This is the source of truth for all project data.
- `types.ts` — All TypeScript interfaces: `DocumentSchema`, `ElementSchema`, `ElementType`, `LayerSchema`, `LevelSchema`, etc.
- `document.ts` — `DocumentModel` class and `createProject()` factory
- `index.ts` — Public exports; everything flows through here
- File format adapters: `ifc.ts`, `dwg.ts`, `pdf.ts`, `revit.ts`, `archicad.ts`, `sketchup.ts`

### `packages/geometry` (`@opencad/geometry`)
WASM geometry kernel (Rust → WASM via wasm-pack). Provides the OpenCASCADE-based Boolean operations, BRep modeling, and parametric geometry used by the document model.

### `packages/ai` (`@opencad/ai`)
AI orchestration layer. Handles prompt-to-project generation, code compliance checking, and design modification commands.

### `packages/sync` (`@opencad/sync`)
Cloud sync engine. Manages CRDT-based real-time collaboration and offline-first synchronization (IndexedDB in browser, SQLite on desktop).

### `packages/shared` (`@opencad/shared`)
Shared utilities and types consumed by all other packages.

### `packages/desktop` (`@opencad/desktop`)
Tauri v2 desktop application wrapper. The Rust backend (`src-tauri/`) handles native file I/O, local AI (Ollama), and OS integrations.

### `e2e/`
Playwright end-to-end tests configured via `playwright.config.ts` at the root.

## TDD Workflow (AGENTS.md)

**This project enforces strict TDD.** All work follows:
1. **Red** — Write a failing test first
2. **Green** — Write minimal code to pass
3. **Refactor** — Clean up while keeping tests green

Test IDs follow PRD section conventions:
- `T-DOC-*` — Document model
- `T-COL-*` — Collaboration/CRDT
- `T-3D-*` — 3D geometry
- `T-OFF-*` — Offline-first
- `T-AI-*` — AI features
- `T-2D-*` — 2D drafting
- `T-DSK-*` — Desktop app

**Every PR must include failing tests that the implementation makes pass.** No production code without tests.

## PR Workflow

Always create a PR after completing work:
```bash
git checkout -b feat/<issue-id>-<description>
# ... implement with TDD ...
git push -u origin feat/<branch-name>
gh pr create  # Use .github/PULL_REQUEST_TEMPLATE.md
```

Link issues with `Closes #<number>` in the PR body. See `AGENTS.md` for full details.

## TypeScript Conventions

- **Strict mode** enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`)
- No `any` — use `unknown` for truly unknown types
- Interfaces over type aliases for object shapes
- Explicit return types on public functions
- `Result<T, E>` pattern for expected errors instead of throw/catch
- Target: ES2022, module resolution: `bundler`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(geometry): add fillet operation
fix(sync): prevent stale write overriding server state
test(document): add property-based CRDT merge tests
```

Scopes match package names: `geometry`, `document`, `app`, `sync`, `ai`, `desktop`.
