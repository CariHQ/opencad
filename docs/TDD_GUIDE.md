# Test-Driven Development (TDD) Guide

This document outlines the TDD workflow for OpenCAD, following the principles defined in the PRD.

## Overview

> **"We do not write production code without a failing test first."**

Every feature is defined by its test requirements before implementation. The workflow is:

1. **Red** - Write a failing test
2. **Green** - Write minimal code to pass the test
3. **Refactor** - Clean up while keeping tests passing
4. **Repeat** - Continue with new tests

## TDD Cycle

```
┌─────────────┐
│  Write Test │  (Red - test fails)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Run Tests   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Test Fails? │
└──────┬──────┘
       │ Yes
       ▼
┌─────────────┐
│ Write Code  │  (Green - minimal code)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Run Tests   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Test Passes?│
└──────┬──────┘
       │ Yes
       ▼
┌─────────────┐
│ Refactor    │  (Blue - improve code)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Tests Pass? │
└──────┬──────┘
       │ Yes
       ▼
    ┌─────┐
    │ Done│
    └─────┘
```

## Test Categories

### 1. Unit Tests (Vitest)

- **Location**: `packages/*/src/**/*.test.ts`
- **Purpose**: Pure functions, data structures
- **Speed**: < 10ms per test
- **Execution**: Every commit, CI

### 2. Integration Tests (Vitest)

- **Location**: `packages/*/src/**/*.integration.test.ts`
- **Purpose**: Multi-module, component + API
- **Speed**: < 100ms per test
- **Execution**: Every PR

### 3. E2E Tests (Playwright)

- **Location**: `e2e/**/*.spec.ts`
- **Purpose**: Full user workflows
- **Speed**: < 30s per test
- **Execution**: Every PR, nightly

### 4. Geometry Tests (Vitest + Custom)

- **Location**: `packages/geometry/src/**/*.test.ts`
- **Purpose**: WASM-specific, numerical precision
- **Special**: Tolerance-based assertions

### 5. Property-Based Tests (fast-check)

- **Location**: Alongside unit tests
- **Purpose**: Generate thousands of inputs
- **Execution**: Every PR

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# E2E tests with UI
pnpm test:e2e:ui

# Coverage report
pnpm test:coverage

# Watch mode (during development)
pnpm test:watch
```

## Test Requirements from PRD

### Document & Storage Tests (T-DOC-001 to T-DOC-006)

| ID        | Test                                                     | Priority |
| --------- | -------------------------------------------------------- | -------- |
| T-DOC-001 | Create project → verify document model initialized       | P0       |
| T-DOC-002 | Auto-save → verify data persisted within 2s              | P0       |
| T-DOC-003 | Offline edit → verify sync completes on reconnect        | P0       |
| T-DOC-004 | Import IFC → verify model renders with correct hierarchy | P0       |
| T-DOC-005 | Export IFC → verify exported file validates              | P0       |
| T-DOC-006 | Version history → restore version → verify state         | P1       |

### 2D Drafting Tests (T-2D-001 to T-2D-005)

| ID       | Test                                           | Priority |
| -------- | ---------------------------------------------- | -------- |
| T-2D-001 | Draw line → verify geometry stored correctly   | P0       |
| T-2D-002 | Snap to endpoint → verify within 5px tolerance | P0       |
| T-2D-003 | Dimension → verify updates dynamically         | P0       |
| T-2D-004 | Layer visibility → toggle off → verify hidden  | P0       |
| T-2D-005 | Undo/redo → 20 actions → undo 10 → redo 5      | P0       |

### 3D Modeling Tests (T-3D-001 to T-3D-005)

| ID       | Test                                            | Priority |
| -------- | ----------------------------------------------- | -------- |
| T-3D-001 | Extrude → verify volume = area × height (±0.1%) | P0       |
| T-3D-002 | Boolean → verify resulting topology is manifold | P0       |
| T-3D-003 | Wall → verify IFC export contains IfcWall       | P0       |
| T-3D-004 | Door insertion → verify wall opening created    | P0       |
| T-3D-005 | Orbit/pan/zoom → verify camera transforms       | P0       |

### AI Tests (T-AI-001 to T-AI-024)

See PRD for complete AI test specifications.

### Offline Tests (T-OFF-001 to T-OFF-007)

| ID        | Test                                           | Priority |
| --------- | ---------------------------------------------- | -------- |
| T-OFF-001 | Install PWA → offline → verify functionality   | P0       |
| T-OFF-002 | Offline edit → verify saved to IndexedDB       | P0       |
| T-OFF-003 | Go online → verify sync completes within 10s   | P0       |
| T-OFF-004 | Simultaneous offline edits → verify CRDT merge | P0       |
| T-OFF-006 | Offline code compliance → verify rule engine   | P0       |

### Collaboration Tests (T-COL-001 to T-COL-005)

| ID        | Test                                                   | Priority |
| --------- | ------------------------------------------------------ | -------- |
| T-COL-001 | Two users edit same element → verify CRDT resolves     | P0       |
| T-COL-002 | Two users edit different elements → verify both appear | P0       |
| T-COL-003 | Offline + concurrent edit → verify merge               | P0       |
| T-COL-004 | 10 concurrent users → verify latency < 200ms           | P0       |

## Test Coverage Requirements

| Module           | Minimum Coverage | Critical Coverage |
| ---------------- | ---------------- | ----------------- |
| Document Model   | 95%              | 100%              |
| Geometry Kernel  | 90%              | 100%              |
| CRDT Sync Engine | 95%              | 100%              |
| Storage Layer    | 90%              | 100%              |
| AI Services      | 80%              | 95%               |
| UI Components    | 85%              | 90%               |
| Plugin Runtime   | 95%              | 100%              |
| Import/Export    | 90%              | 95%               |

## Geometry Testing Special Considerations

The geometry kernel requires specialized testing due to numerical precision:

```typescript
// Tolerance-based assertions
expect(result.volume()).toBeCloseTo(expectedVolume, 1); // ±0.1 tolerance

// Topological correctness
expect(result.isManifold()).toBe(true);

// Euler-Poincaré formula: V - E + F = 2 (for solid)
const { vertices, edges, faces } = result.topology();
expect(vertices - edges + faces).toBe(2);

// Property-based testing
fc.assert(
  fc.property(convexPolygon(), fc.float({ min: 0.1, max: 1000 }), (polygon, height) => {
    const solid = Extrude.create(polygon, height);
    expect(solid.volume()).toBeCloseTo(polygon.area() * height, 2);
  })
);
```

## Writing Tests

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = setup();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Naming Conventions

- **Files**: `*.test.ts` for unit tests, `*.integration.test.ts` for integration
- **Tests**: Use descriptive names: `it('should calculate volume correctly for extruded polygon')`
- **IDs**: Include PRD test ID: `it('[T-3D-001] should verify volume calculation')`

## CI/CD Pipeline

### On Every Commit

1. Type check (tsc --noEmit)
2. Lint (ESLint + Prettier)
3. Unit tests (Vitest)
4. Geometry kernel tests
5. Build (Vite production build)

### On Every PR

1. All commit checks
2. Integration tests
3. E2E tests (critical paths)
4. Visual regression tests
5. Accessibility tests
6. Performance benchmarks

### Nightly

1. Full E2E suite
2. Property-based tests (extended iterations)
3. Performance benchmarks
4. Dependency audit
5. WASM kernel stress tests

## References

- [PRD.md](../PRD.md) - Product Requirements Document
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [fast-check Documentation](https://fast-check.dev/)
