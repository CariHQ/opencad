# OpenCAD Agent Workflow Guide

## Overview

This project follows a **Test-Driven Development (TDD)** workflow based on the PRD (section 12). Every feature is defined by its test requirements before implementation.

## PRD Test ID Convention

Tests are named with prefixes matching PRD sections:

- `T-DOC-*` - Document model tests
- `T-COL-*` - Collaboration/CRDT tests
- `T-3D-*` - 3D geometry tests
- `T-OFF-*` - Offline-first tests
- `T-AI-*` - AI feature tests
- `T-2D-*` - 2D drafting tests

## TDD Workflow

1. **Check existing code first** - Look in `packages/*/src/` for existing implementations and `packages/*/src/*.test.ts` for tests
2. **Check existing issues** - Run `gh issue list --repo CariHQ/opencad` to see what's already created
3. **Write failing test first** - Add test with PRD ID to existing test file
4. **Implement to pass** - Write code until tests pass
5. **Create PR** - Branch → commit → PR with test results

## GitHub Issues Workflow

### Before Creating Issues

1. Run `gh issue list --repo CariHQ/opencad` to see existing issues
2. Check existing test files in `packages/*/src/*.test.ts`
3. Run tests with `pnpm test:unit` to verify current state

### Issue Labels

- `T-DOC`, `T-COL`, `T-3D`, `T-OFF`, `T-AI`, `T-2D` - PRD test series
- `infrastructure` - CI/CD, build
- `enhancement` - New features
- `bug` - Bug fixes

### Issue Status Convention

- Status shown in title: "IMPLEMENTED", "IN PROGRESS", "PENDING", "PARTIALLY IMPLEMENTED"
- Close issues that are done

## CI/CD Pipeline

On every commit/PR (`.github/workflows/tdd.yml`):

1. Type check: `pnpm typecheck`
2. Lint: `pnpm lint`
3. Unit tests: `pnpm test:unit`
4. Build: `pnpm build:browser`

## PR Template

Use `.github/PULL_REQUEST_TEMPLATE.md` - includes test plan section mapping PRD test IDs.

## Important Commands

```bash
# Run all tests
pnpm test:unit

# Run specific package tests
pnpm --filter=@opencad/document test:unit
pnpm --filter=@opencad/geometry test:unit
pnpm --filter=@opencad/sync test:unit

# Type check
pnpm typecheck

# Build
pnpm build
pnpm build:browser
pnpm build:desktop
```

## Branch Strategy

- `main` - protected, requires passing CI
- `feat/*` - feature branches
- `fix/*` - bug fix branches

## Key Files

- PRD: `PRD.md` (test requirements in sections 7-13)
- CI: `.github/workflows/tdd.yml`
- PR Template: `.github/PULL_REQUEST_TEMPLATE.md`
- Contributing: `CONTRIBUTING.md`
- TDD Guide: `docs/TDD_GUIDE.md`
