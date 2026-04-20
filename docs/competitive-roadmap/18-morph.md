# T-MOD-018 — Morph tool for free-form modeling

**Priority:** P3 · **Phase:** phase-3 · **Area:** area:geometry · **Complexity:** Large

## Why

Not every element is a wall, slab, or roof. Built-in furniture, niches, custom chimneys, one-off architectural details — the kind of thing an architect models once for a specific project — need a catch-all "just let me push and pull vertices" tool. Without it, every non-standard shape requires either a compromise or a workaround through another tool.

## Scope

### In scope
- Morph schema: a mesh described as `vertices: Point3D[]`, `faces: FaceIndex[][]`, `edges: EdgeRef[]`, plus UV and material refs.
- Construction primitives to seed a morph: Box, Prism, Pyramid, Cone, Cylinder.
- **Push/Pull face**: click a face, drag perpendicular — face translates, adjacent faces re-form.
- **Vertex drag**: click a vertex, drag anywhere — vertex moves, incident faces update.
- **Edge bevel / chamfer**: click an edge, type offset, edge replaced by a chamfer strip.
- **Split face**: click two points on a face, face splits along the line.
- **Extrude face**: click face, type height, face extruded.
- Selection: vertex / edge / face modes (like Blender).
- Historyless (non-parametric) for v1.

### Out of scope
- Parametric history tree.
- Subdivision surfaces, smooth shading control.
- Boolean ops with morph (defer to SEO).

## Proposed approach

1. Schema `Morph` with raw mesh data.
2. `lib/morphOps/` set of pure functions: `pushPull`, `bevel`, `split`, `extrude`.
3. New interaction mode in viewport: element-edit mode vs. element-select mode.
4. Three.js uses `BufferGeometry` built from the mesh; selection overlays draw vertex dots, edge lines, face highlights.

## Acceptance criteria

- [ ] Inserting a box morph creates a 6-face element.
- [ ] Push-pull on the top face extrudes it upward; vertex count increases accordingly.
- [ ] Vertex drag moves exactly one vertex; adjacent face normals recompute.
- [ ] Edge bevel on a box produces a 7-face element (original 6 + 1 chamfer strip).
- [ ] Split face produces two faces on the plane where the split was drawn.
- [ ] Undo/redo reverses every morph op.
- [ ] Face areas update in the Properties panel live.
- [ ] Morphs participate in cost takeoff by surface area per material.

## Test plan

New `packages/app/src/lib/morphOps.test.ts`:

- `T-MOD-018-001` — seed box has 8 vertices, 12 edges, 6 faces.
- `T-MOD-018-002` — push-pull +1000 on the +Y face of a unit box moves 4 vertices, adds 0 new vertices, keeps face count at 6.
- `T-MOD-018-003` — bevel with offset 0.1 on one box edge adds 2 vertices, 1 new face.
- `T-MOD-018-004` — splitting a square face along the diagonal produces 2 triangles.
- `T-MOD-018-005` — extrude face creates 1 new face per edge of the extruded face (4 side faces for a quad).

UI:

- `T-MOD-018-006` — clicking a vertex in edit mode highlights it and exposes drag handles.
- `T-MOD-018-007` — face drag commits a single undoable action.

Harness:

- `T-MOD-018-008` — template `morph-niche` pushes a wall section inward to create a niche; iso shows the recess.

## Dependencies

- None hard.

## Blocks

- Nothing critical.

## Suggested labels

`enhancement`, `phase-3`, `area:geometry`, `area:bim`, `p3`
