# T-DOC-033 — Angular + radial + arc + chain + ordinate dimensions

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

The current dimension tool only produces straight linear dimensions between two points. Real drawings carry angles (roof slope, bay rotation), radii (arcs, curves, corners), arc lengths (curved walls), chain dimensions (multiple collinear segments captured in one string), and ordinate dimensions (from a baseline). Permit sets without these are rejected by reviewers.

## Scope

### In scope
- **Angular dimension**: pick two non-parallel lines (or 3 points); emits the angle between them in degrees / radians (configurable).
- **Radial dimension**: pick a circle or arc; emits `R = <mm>` on a leader line.
- **Diameter dimension**: same but `Ø = <mm>`.
- **Arc-length dimension**: pick an arc; emits its arc length.
- **Chain (baseline) dimension**: pick a baseline + N targets; emits one string with cumulative dimensions from the baseline.
- **Ordinate dimension**: pick origin + N targets; emits X and Y ordinates as leader labels.
- Per-dimension settings: tolerance (e.g., `4500 ±5`), units, precision, text position, text override.
- All dimension types render in plan, section, elevation; export to SVG.

### Out of scope
- Running dimensions that auto-extend on edit.
- Tolerance stacking across chained dims.

## Proposed approach

1. `DimensionKind: 'linear' | 'angular' | 'radial' | 'diameter' | 'arc' | 'chain' | 'ordinate'`.
2. Dimension schema extended: `kind`, `points: Point[]`, `referenceElement?: elementId`, `formatOptions`.
3. Render branches per kind; new geometry helpers for angular arcs + leaders.
4. Tool UI: dimension tool with dropdown to pick kind.

## Acceptance criteria

- [ ] Angular dimension on two walls at 60° reports "60°".
- [ ] Radial on a circle of radius 1500 reports "R = 1500".
- [ ] Diameter on the same reports "Ø = 3000".
- [ ] Arc-length on an arc of radius 1500 spanning 90° reports ≈ 2356.2 mm.
- [ ] Chain dimension across walls at 0 / 3000 / 6000 / 9000 produces a single string: `| 3000 | 3000 | 3000 |`.
- [ ] Ordinate dimension from origin to 5 targets emits 5 X and 5 Y labels.
- [ ] Precision setting controls decimal places.
- [ ] Text override replaces the computed value with user text.
- [ ] Updating one of the referenced elements updates its dimension live.

## Test plan

New `packages/app/src/lib/dimensions.test.ts`:

- `T-DOC-033-001` — `angularDim((0,0)-(1,0), (0,0)-(0,1))` = 90°.
- `T-DOC-033-002` — `radialDim(circle r=1500)` = 1500.
- `T-DOC-033-003` — `arcLength(arc r=1500, Δθ=π/2)` ≈ 2356.19.
- `T-DOC-033-004` — chain of 4 points at x=0,1000,2500,4000 produces segments 1000,1500,1500.
- `T-DOC-033-005` — ordinate with origin (0,0), targets [(3,4),(5,2)] returns X=[3,5], Y=[4,2].

UI:

- `T-DOC-033-006` — dimension tool dropdown changes active kind.
- `T-DOC-033-007` — click sequence for each kind commits a dimension.

Harness:

- `T-DOC-033-008` — `dim-demo` places one of each type on the three-bedroom plan; summary.json `diag.counts.dimension` = 7.

## Dependencies

- None.

## Blocks

- Complete construction drawing output.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
