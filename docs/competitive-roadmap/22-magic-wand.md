# T-MOD-022 — Magic wand polygon-from-boundary

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Architects constantly draw a slab, roof, or zone whose outline should exactly match a room boundary already formed by walls. Drawing it by hand is tedious and error-prone. A magic wand — click inside a wall-bounded region, get the outline polygon — solves this in one click.

## Scope

### In scope
- A new tool `Magic Wand` (shortcut: `Shift+W`).
- When the user clicks inside any closed region formed by walls, lines, or polylines, the tool traces the region's boundary polygon and commits it.
- Commit target is driven by the currently-active tool: if Slab tool active, commit a slab; if Roof active, a roof; if Zone active, a zone; if Polygon active, a raw polygon.
- Works on L, S, courtyard, and donut-shaped regions.
- Handles walls with doors/windows (treats them as continuous).

### Out of scope
- Magic wand on 3D faces.
- Partial-boundary selection (ceiling-lift style); v1 full-boundary only.

## Proposed approach

1. `lib/boundaryTracer.ts`: pure function. Build a planar graph from wall centerlines, run point-location for the click, extract the bounding face's polygon.
2. Use an existing pure-JS planar-subdivision library or roll a simple half-edge walker (for rectilinear cases it's straightforward).
3. Wire it to the active-tool commit path.

## Acceptance criteria

- [ ] Click inside a 4-wall rectangular room → a rectangular polygon is committed.
- [ ] Click inside the L-shape template's L region → the 6-vertex L polygon is committed.
- [ ] Click inside the courtyard template's atrium → the inner rectangle polygon is committed (not the outer + inner donut).
- [ ] Click in empty space (no bounding walls) → no commit; shows a toast "no bounded region at click point".
- [ ] Tool preserves wall centerlines (wall geometry unchanged).

## Test plan

New `packages/app/src/lib/boundaryTracer.test.ts`:

- `T-MOD-022-001` — 4 walls forming a rectangle with a click inside returns the 4-vertex outline.
- `T-MOD-022-002` — L-shape walls with click in the corner region returns the 6-vertex L polygon.
- `T-MOD-022-003` — courtyard walls with click in the atrium returns the inner rectangle.
- `T-MOD-022-004` — click with no bounding walls returns `null`.
- `T-MOD-022-005` — walls forming two disjoint rooms with click in room 1 returns only room-1 polygon.

Harness:

- `T-MOD-022-006` — new template `magic-wand-slab` traces a slab using the wand; element count matches the walls-first approach.

## Dependencies

- T-MOD-001 (wall junctions) — need clean wall graph.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p2`
