# T-GEO-001 — Solid Element Operations (SEO), minimal subset

**Priority:** P0 · **Phase:** phase-2 · **Area:** area:geometry · **Complexity:** Large

## Why

Today walls pass through roofs, beams float above the columns that support them, and stairs stop short of the slab they're meant to land on. Real BIM applications describe these relationships parametrically: one element is declared as a *target* and another as an *operator*, the operator boolean-subtracts or boolean-adds geometry from the target, and the relationship survives edits on either side. Without this, every 3D render exposes the model as an assembly of disjoint boxes rather than a building.

This issue delivers the *minimum* SEO subset needed to fix the ugliest visible cases. Full SEO (intersections, additions, SUBTRACT-with-priority, user-defined pairs) is a separate future issue.

## Scope

### In scope
- A new `operations` array on `DocumentSchema` storing `{ id, operatorId, targetId, type: 'subtract' | 'add', enabled }`.
- Three built-in default rules, applied automatically when elements meet the right spatial condition:
  1. **Wall top clipped by roof underside** — any wall whose top plane passes through a roof polygon is clipped to the roof's sloped underside.
  2. **Slab cut by stair** — slab polygon subtracts the footprint of any stair whose `ElevationOffset` matches the slab's top plane.
  3. **Column intersection with beam** — beam trims its length at the column face so the column reads as continuous and the beam as butting into it.
- `useThreeViewport` reads `operations` and applies boolean CSG at mesh build time using `three-bvh-csg` (or equivalent; leave kernel choice to the implementer — document the decision in an ADR).
- Operations recomputed when either operator or target is moved/rotated/resized.

### Out of scope (this issue)
- User-authored SEO pairs in the UI — built-in default rules only. UI for this is a follow-up.
- Priority-based wall/slab intersections (composite layer priority) — handled by T-MOD-004.
- SUBTRACT with SUBTRACT-from-shell, DIVIDE, INTERSECT — only SUBTRACT in v1.

## Proposed approach

1. Add `operations: Operation[]` to the schema in `@opencad/document`, with a permissive default `[]`.
2. Add `lib/seoResolver.ts` that takes the document and emits a resolved operation list by running the three built-in rules. Each rule is a pure function `(doc) => Operation[]`.
3. Integrate `three-bvh-csg` into `packages/geometry` behind a minimal wrapper so the 3D viewport does not depend directly on it.
4. In `buildWallMesh` and the slab/roof builders, after assembling the base geometry, loop through operations where the element is a target and apply `evaluator.evaluate(target, operator, SUBTRACTION)`.
5. Cache resolved meshes by `(elementId, operationFingerprint)` so unrelated edits don't re-CSG every frame.

## Acceptance criteria

- [ ] On the `three-bedroom` template, the four exterior walls are visibly clipped to the sloped underside of the roof — no wall penetrates above the roof plane in any rendered view.
- [ ] In the `mountain-cabin` template with its steep roof, the wall tops follow the roof slope correctly rather than staying flat at `Height = 3000`.
- [ ] Any stair element sitting on a slab creates a visible hole in the slab polygon at the stair's footprint.
- [ ] A beam ending inside a column's volume is visually trimmed at the column's outer face — the column reads as continuous.
- [ ] Moving a roof up by 500 mm re-clips every wall under it without requiring a page reload; visible change is within 1 frame.
- [ ] Disabling an operation (`enabled: false`) restores the target element's original geometry within 1 frame.
- [ ] Re-rendering the `modern-villa` template (54 elements + ~10 auto-operations) does not exceed 50 ms per rebuild on the baseline machine.

## Test plan

New file `packages/app/src/lib/seoResolver.test.ts`:

- `T-GEO-001-001` — a document with a wall and a roof whose footprint overlaps the wall produces exactly one `subtract` operation with roof as operator, wall as target.
- `T-GEO-001-002` — a document with a wall whose footprint is outside the roof polygon produces no operation.
- `T-GEO-001-003` — changing a roof's `ElevationOffset` re-resolves the operation set deterministically.
- `T-GEO-001-004` — a stair whose base matches a slab elevation produces a slab-subtract operation with slab as target.
- `T-GEO-001-005` — removing either the operator or the target removes the operation from the resolved set.

New file `packages/geometry/src/csg.test.ts` (node, fast):

- `T-GEO-001-006` — subtracting a 100 × 100 × 100 box from a 200 × 200 × 200 box at origin leaves a mesh with the expected 10 cavity vertices and the hole facing the right direction.
- `T-GEO-001-007` — CSG result is deterministic across two runs of the same input (byte-identical vertex buffer).
- `T-GEO-001-008` — CSG completes on a 5 000-triangle target × 500-triangle operator pair in ≤ 200 ms.

Visual regression in `e2e/house-build.spec.ts`:

- `T-GEO-001-009` — mountain-cabin iso screenshot now has zero pixels above the roof polygon's upper envelope.
- `T-GEO-001-010` — three-bedroom iso shows each wall ending at the roof soffit, verified by sampling the pixel column above each wall mid-span.

## Dependencies

- T-MOD-001 (wall junctions) — wall ends must resolve to a clean plane before a roof can clip them.

## Blocks

- T-MOD-010 (rule-based stairs — stair-slab subtract is an SEO op)
- T-MOD-011 (multi-plane roof — more complex wall-roof intersections)
- T-MOD-012 (curtain wall — frame/panel subtract relationship)

## Suggested labels

`enhancement`, `phase-2`, `area:geometry`, `area:bim`, `p0`
