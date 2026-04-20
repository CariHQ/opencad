# T-MOD-019 — Mesh for terrain / site topography

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:gis · **Complexity:** Medium

## Why

Every site starts with ground. Today the 3D viewport has an infinite flat grid — no contours, no site slope, no cut/fill calculation. Site analysis, grading, retaining wall heights, and drainage all require a terrain mesh derived from either imported survey data (points / contours / DEM) or hand-edited triangles.

## Scope

### In scope
- Terrain schema: triangulated mesh of `Point3D[]` and `FaceIndex[][]`.
- Import sources:
  - CSV of `x, y, z` survey points → Delaunay triangulation.
  - DXF contour lines → sample along each, triangulate.
  - GeoTIFF DEM (later — flag as nice-to-have).
- Edit ops: move a vertex's Z, add point at XY, delete point.
- Cut/fill calculation: given a building footprint + finish-floor elevation, compute cubic metres cut and cubic metres fill.
- Site context panel: tool-shelf icon, edit mode, cut/fill readout.
- Contour line generator: given the mesh, produce lines at every `contourInterval` (1 m default) for plan overlay.

### Out of scope
- GeoTIFF DEM import (separate follow-up).
- OpenStreetMap site import (already partial via `osmApi.ts`; expand later).
- Retaining wall auto-generation from topo.

## Proposed approach

1. New schema `Terrain` element at doc level (singleton or multiple for complex sites).
2. `lib/terrain/delaunay.ts` using `delaunator` (small pure-JS lib).
3. `lib/terrain/cutFill.ts`: pure calc.
4. `lib/terrain/contours.ts`: marching squares on mesh.
5. UI: terrain tool, import button, edit handles for vertex Z.

## Acceptance criteria

- [ ] CSV with 100 (x, y, z) points generates a mesh of ~196 triangles covering the convex hull.
- [ ] DXF with 5 contours at 1 m intervals samples and triangulates producing a mesh whose contour plot matches the input.
- [ ] Cut/fill of a 10 × 10 m flat slab at z = 1 on sloped terrain correctly reports cubic metres.
- [ ] Contour lines drawn in 2D plan view at 1 m intervals.
- [ ] Vertex Z edit updates the mesh + contours + any cut/fill readouts live.

## Test plan

New `packages/app/src/lib/terrain/delaunay.test.ts`:

- `T-MOD-019-001` — 4 corner points produce 2 triangles.
- `T-MOD-019-002` — regular grid of 5 × 5 points produces (4 × 4 × 2) = 32 triangles.
- `T-MOD-019-003` — all triangles respect the Delaunay property (no point in any circumscribed circle).

New `packages/app/src/lib/terrain/cutFill.test.ts`:

- `T-MOD-019-004` — flat terrain at z=0, slab at z=1, 10 × 10 m → cut = 100 m³, fill = 0.
- `T-MOD-019-005` — sloped terrain from z=0 to z=2 over 10 m, slab at z=1 10 × 10 → cut ≈ fill ≈ 50 m³.

New `packages/app/src/lib/terrain/contours.test.ts`:

- `T-MOD-019-006` — contour at z = 1 on a 2 × 2 mesh sloping 0→2 produces a single line crossing the middle.

## Dependencies

- None hard.

## Blocks

- Proper site analysis, shadow analysis over terrain, drainage tools.

## Suggested labels

`enhancement`, `phase-3`, `area:gis`, `area:bim`, `p2`
