# T-MOD-011 — Multi-plane roof with hip / valley / ridge

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Large

## Why

The current roof tool produces a flat polygon extruded by `Thickness`. Every real residential roof is multi-plane (gable, hip, shed, mansard, gambrel), with defined ridges, hips, and valleys. Without multi-plane roofs, the tool cannot produce a credible single-family house.

## Scope

### In scope
- Roof builder gains a `planes: RoofPlane[]` array; each plane defines an outline polygon (in XY), a slope angle, and a pitch direction vector.
- A "Roof by footprint" helper auto-generates four hip planes from a rectangular footprint at a user-chosen slope.
- A "Gable" toggle collapses two opposing hips into vertical gables.
- The resulting geometry is a polyhedral mesh with computed ridges, hips, and valleys as edges.
- 2D plan view shows the roof as the footprint with dashed lines for ridges / hips / valleys and slope arrows.
- SEO automatically clips every wall below the roof to the roof underside (T-GEO-001 dependency; this issue defines the operator polygon).

### Out of scope
- Dormers and skylights.
- Curved roofs.
- Green roofs (slabs with vegetation) — cosmetic later.

## Proposed approach

1. Add `RoofPlane` to schema: `outline: Point[]`, `slopeAngle`, `pitchDir`, `ridgeZ`.
2. `lib/roofGeometry.ts` — given a footprint polygon and slope, compute hips, valleys, ridges using a straight-skeleton algorithm (or brute-force for v1: only convex footprints, then extend).
3. `buildRoofMesh` iterates planes, builds one tilted polygon per plane, stitches at shared edges.
4. 2D renderer draws the footprint plus dashed edge lines.

## Acceptance criteria

- [ ] A rectangular footprint + "Roof by footprint, hip, 30°" produces a hip roof with 4 planes meeting at a ridge.
- [ ] Toggling "Gable" on the north/south sides converts those two planes to vertical gable triangles.
- [ ] Changing slope angle updates every plane's pitch.
- [ ] Walls beneath the roof clip to the underside (requires T-GEO-001).
- [ ] 2D plan shows ridges and hips as dashed lines with slope arrows.
- [ ] An L-shape footprint produces a hip roof with correctly-computed valleys at the L's inside corner.
- [ ] No geometry regression on the existing flat-polygon roof path — unchanged single-plane roofs continue to render as before.

## Test plan

New file `packages/app/src/lib/roofGeometry.test.ts`:

- `T-MOD-011-001` — a rectangular footprint produces exactly 4 planes for a hip roof.
- `T-MOD-011-002` — the same footprint produces 2 planes + 2 gables when `gable: true`.
- `T-MOD-011-003` — slope 30° produces the expected ridge height `Z = footprintHalfWidth × tan(30°)`.
- `T-MOD-011-004` — L-shape produces a valley at the inside corner with the correct valley-line vector.
- `T-MOD-011-005` — ridges, hips, valleys are identified correctly by edge-classification function.

Harness:

- `T-MOD-011-006` — `mountain-cabin` template reruns with a hip roof; iso screenshot shows 4 visible roof planes meeting at a ridge.

## Dependencies

- T-GEO-001 (SEO) for wall-top clipping.

## Blocks

- Nothing critical; unlocks residential typologies.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p2`
