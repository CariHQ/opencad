# T-MOD-010 — Rule-based stair geometry driven by story height

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Stairs today render as a single box sized by the user. A stair in a real model needs to compute its tread count, riser height, and total rise from the story height and the user's chosen tread depth — and it needs to revalidate against building-code compliance rules (already R003: riser ≤ 196 mm). Without rule-based stairs, multi-story models look silly and no compliance warning can fire meaningfully.

## Scope

### In scope
- Stair element gains the following parameters:
  - `type: 'straight' | 'L-shape' | 'U-shape' | 'spiral'` (v1: `straight` + `L-shape`)
  - `width` (mm)
  - `storyHeight` (mm) — pulled from the `Level` the stair belongs to
  - `treadDepth` (mm, user input, default 280)
  - `handedness: 'L' | 'R'` (for L-shape)
  - Computed fields (not stored, derived at render time): `riserCount`, `riserHeight`, `runLength`, `landingSize`
- Straight stair: generates `riserCount` boxes as treads, stepped in X and Y; each tread is a slab-like cuboid.
- L-shape: two straight runs plus a landing at the turn.
- 2D plan view: draws the stair with directional arrow (`UP`), numbered treads, break line between flights.
- Compliance R003 fires on every generated stair if `riserHeight > 196`.
- SEO rule: the stair automatically subtracts its footprint from the slab above (T-GEO-001 dependency).

### Out of scope
- Spiral and U-shape stairs.
- Handrails on stairs — handled by the Railing tool.
- Stringer geometry — simplified to a single bounding mass in v1.

## Proposed approach

1. Extend schema: `StairType`, `StairGeometry` with the fields above.
2. `lib/stairGeometry.ts` — pure function `computeStairGeometry(stair, storyHeight)` returns `{ treads: Box[], landings: Box[], overall: BoundingBox }`.
3. `buildStairMesh` iterates the computed treads.
4. 2D renderer draws each tread from the computed bounding boxes.

## Acceptance criteria

- [ ] A straight stair with `storyHeight=3000`, `treadDepth=280`, `width=1000` computes `riserCount = 16`, `riserHeight = 187.5 mm`, `runLength ≈ 4200 mm`.
- [ ] Lowering `treadDepth` to 180 mm makes the stair shorter; increasing it makes the stair longer.
- [ ] Raising the story height to 3500 mm adds one more tread.
- [ ] Changing `type` to `L-shape` inserts a landing at the turn.
- [ ] Plan view shows the stair with an "UP" arrow starting at tread 1.
- [ ] Compliance R003 fires if `storyHeight` is set such that `riserHeight > 196`.
- [ ] The stair is visibly subtracted from the slab above it (requires T-GEO-001).
- [ ] Changing story height on the `Level` propagates and regenerates every stair on that level.

## Test plan

New file `packages/app/src/lib/stairGeometry.test.ts`:

- `T-MOD-010-001` — `computeStairGeometry({ storyHeight: 3000, treadDepth: 280 })` returns `riserCount: 16, riserHeight: 187.5`.
- `T-MOD-010-002` — `computeStairGeometry({ storyHeight: 3500, treadDepth: 280 })` returns `riserCount: 19`.
- `T-MOD-010-003` — tread count is always the smallest integer such that `riserHeight ≤ 196`.
- `T-MOD-010-004` — L-shape stair with 16 treads and mid-flight landing produces exactly 2 flights + 1 landing box.
- `T-MOD-010-005` — treads are monotonically increasing in `Z` (elevation).

Compliance integration:

- `T-MOD-010-006` — R003 fires when `storyHeight: 4000, treadDepth: 280` yields `riserHeight: 200`.

Harness:

- `T-MOD-010-007` — new template `stair-straight` builds a single stair; iso screenshot verifies visible tread stepping and arrow in 2D.

## Dependencies

- T-GEO-001 (SEO) for slab subtraction.
- Levels with `storyHeight` field on `@opencad/document`.

## Blocks

- Nothing critical; quality of life for multi-story models.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `p2`
