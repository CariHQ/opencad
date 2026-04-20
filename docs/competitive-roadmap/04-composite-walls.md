# T-MOD-004 — Composite wall structures (multi-layer construction)

**Priority:** P0 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Every real wall is a composite: an exterior brick leaf, a cavity, an insulation layer, a blockwork inner leaf, a plasterboard finish. Today every wall is a single homogeneous box with one material, so cost takeoffs, carbon calcs, thermal analyses, and detail drawings are all wrong. Composites are table stakes for BIM.

## Scope

### In scope
- A new `Composite` definition object: ordered list of layers, each with `{ material: string, thickness: number, core: boolean, finish: 'exterior' | 'interior' | 'both' }`.
- Composites are stored in `DocumentSchema.composites: Record<string, Composite>`; walls reference a composite by id (`CompositeId` property) *instead of* a flat thickness + material.
- Backward compatibility: walls without `CompositeId` keep their existing `Width`/`Material` as a single-layer composite.
- 3D rendering: the wall mesh is built from N stacked boxes along the perpendicular axis, one per layer, each with its own material + thickness.
- 2D rendering: the wall draws as multiple parallel lines with each region filled per layer material's hatch pattern.
- Cost takeoff iterates each layer's `qty = length × height × layerThickness / totalThickness` and sums per-material.
- A small UI in the Materials panel (reuse existing panel tab) to author composites: add/remove/reorder layers.
- Built-in composites shipped: `ext-300-brick-cavity-blockwork-plaster`, `int-150-plasterboard-stud-plasterboard`, `part-100-lightweight-partition`, `curt-60-glazing`.

### Out of scope (this issue)
- Layer-priority intersection at junctions (which layers pass through at a joint) — handled separately once T-MOD-001 is in.
- Sloped / tapered composites.
- User-authored hatch patterns per material.

## Proposed approach

1. Extend `packages/document` schema: add `CompositeLayer`, `Composite` types, `composites: Record<string, Composite>` on the document, and a migration that upgrades any existing wall with `Width + Material` into an auto-named `legacy-<thickness>-<material>` composite.
2. Seed the four built-in composites on new-project creation.
3. Wall commit path: replace `Width` + `Material` with `CompositeId`; compute total width on the fly from `sum(layer.thickness)`.
4. `buildWallMesh`: iterate composite layers; build one Box per layer, offset along wall perpendicular by cumulative thickness.
5. `useViewport.ts` (2D): the existing oriented rectangle becomes N-1 parallel offset lines between layers.
6. `complianceEngine` R007 continues to use total thickness (no change needed).
7. `costAndCarbon` iterates composite layers instead of the single `Material`.

## Acceptance criteria

- [ ] A new project ships with four built-in composites in `doc.composites`.
- [ ] A wall drawn with wallType `exterior` is assigned `CompositeId = 'ext-300-brick-cavity-blockwork-plaster'`.
- [ ] The 3D view of an exterior wall shows four visually distinct layers (brick, cavity as transparent gap, blockwork, plaster) at the correct thicknesses.
- [ ] The 2D plan view shows the wall with four parallel lines delineating the layers, with a hatch fill per layer.
- [ ] Cost takeoff for a wall 5 m × 3 m = 15 m² reports each layer separately with costs summing to the same total the single-material cost would have reported.
- [ ] Removing the composite panel and editing a composite's layer thickness updates every referencing wall's geometry within one frame.
- [ ] Loading an existing project without composites auto-migrates every wall to an inferred composite; no document is broken.
- [ ] Compliance R007 (wall on slab) still passes on the three-bedroom template after migration.

## Test plan

New file `packages/document/src/composite.test.ts`:

- `T-MOD-004-001` — `compositeThickness({ layers: [{ thickness: 100 }, { thickness: 50 }] })` returns 150.
- `T-MOD-004-002` — schema validator rejects a composite with zero layers.
- `T-MOD-004-003` — schema validator rejects a composite whose layer thickness is not positive.
- `T-MOD-004-004` — document migration on a wall with `Width=300, Material='Concrete'` produces a one-layer composite and points `CompositeId` at it.
- `T-MOD-004-005` — migrated composite id is stable across repeated loads of the same document.

New file `packages/app/src/hooks/useThreeViewport.composite.test.ts`:

- `T-MOD-004-006` — rendering a wall whose composite has three layers produces a group with exactly three child meshes.
- `T-MOD-004-007` — layer offsets along perpendicular sum to `totalThickness/2 + layerThickness/2 - previousLayersOffsetSum`, i.e. the wall centerline passes through the "core" layer when `core: true` is set on one layer.

New file `packages/app/src/lib/quantityTakeoff.composite.test.ts`:

- `T-MOD-004-008` — takeoff on a 10 m × 3 m = 30 m² wall with a 3-layer composite reports 30 m² for each layer, and the sum of layer costs equals the same total a single-layer wall would have yielded for the core material.

Harness:

- `T-MOD-004-009` — a new template `composite-demo` renders three back-to-back exterior / interior / partition walls; visible layer count in the 2D floor plan equals expected (4 / 3 / 2 lines respectively).

## Dependencies

- T-MOD-001 (wall junctions) — composite layer priority at junctions needs a working joint.

## Blocks

- Proper detail drawings, thermal-envelope analysis, accurate carbon / cost reporting.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p0`
