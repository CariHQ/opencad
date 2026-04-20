# T-MOD-028 — Surfaces separated from Building Materials (render vs construction)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Today a wall carries a single `Material` string used for both its 3D render appearance *and* its cost / takeoff calculation. These are conceptually different:
- **Building Material**: what the element is made of (Concrete, Plasterboard). Drives cost, carbon, thickness, thermal.
- **Surface**: how it looks in the rendered image (matte white paint, oak veneer, polished concrete). Drives PBR material properties (roughness, metalness, color, texture).

Real workflows change surface finishes per elevation (exterior brick + interior paint) without changing the construction material. Baking them together means painting a room requires editing its structural assignment.

## Scope

### In scope
- Split the current `Material` concept into two:
  - `buildingMaterialId`: references `doc.buildingMaterials[]` (existing concept, renamed + isolated to construction/cost/thermal).
  - `surfaces: { exterior?: surfaceId, interior?: surfaceId, both?: surfaceId }`: per-face surface override.
- Seed ~30 surfaces: paints, plasters, woods, stones, metals, glazings, tiles. Each has PBR properties + optional texture URL.
- 3D rendering uses surface (if present) else falls back to building material's default appearance.
- Cost takeoff always uses building material — surface changes never affect cost.
- Properties panel: separate "Construction" and "Surfaces" sections.

### Out of scope
- PBR texture uploads by user (v1 ships textures from a bundled library).
- Per-layer surface overrides within composites — v1 is per-element per-face.

## Proposed approach

1. Rename current `BUILT_IN_MATERIALS` → `BUILT_IN_BUILDING_MATERIALS` for construction.
2. New `BUILT_IN_SURFACES` list with PBR properties + bundled textures.
3. Schema change: wall/slab/roof/etc. gain `surfaces: { exterior?, interior?, both? }`.
4. `useThreeViewport` resolves `surface[face] || buildingMaterial.defaultSurface` when building mesh materials.
5. Cost / takeoff code updated to use `buildingMaterialId` only.
6. Properties panel split into Construction + Surfaces tabs.

## Acceptance criteria

- [ ] A wall with buildingMaterialId `Concrete` and exterior surface `Red Brick` renders red brick on the outside and bare concrete (default) on the inside in 3D.
- [ ] Changing the exterior surface to `White Paint` updates the render, leaves cost unchanged.
- [ ] Cost takeoff for that wall still booked against Concrete.
- [ ] A wall without a surface override renders using the building material's default PBR.
- [ ] Migrating an old document where `Material = 'Concrete'` sets both `buildingMaterialId = 'Concrete'` and leaves surfaces empty.

## Test plan

New `packages/app/src/lib/surfaces.test.ts`:

- `T-MOD-028-001` — surface schema: each surface has `{ id, name, color, roughness, metalness, textureUrl?, normalMapUrl? }`.
- `T-MOD-028-002` — resolving surface for a wall face: explicit `surfaces.exterior` wins over default.
- `T-MOD-028-003` — no surface override → building material's default used.
- `T-MOD-028-004` — migration from old single-`Material` elements populates `buildingMaterialId`.

UI:

- `T-MOD-028-005` — Properties panel shows "Construction" (building material) and "Surfaces" (per face) sections.

3D:

- `T-MOD-028-006` — rendering the same wall with two different surfaces produces different colors but identical geometry.

Harness:

- `T-MOD-028-007` — `surfaces-demo` paints the exterior of each wall differently; iso shows visible facade variation.

## Dependencies

- None hard.

## Blocks

- T-VIZ-040 (photoreal render) — photoreal depends on rich PBR surfaces.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p2`
