# T-MOD-001 — Automatic wall junction cleanup (T/L/X intersections)

**Priority:** P0 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Every screenshot and walkthrough of the current app shows walls that overlap as independent boxes at corners and T-junctions rather than merging into clean, mitered joints. Anyone familiar with professional drafting tools notices this in the first five seconds and concludes the software is a prototype. No single feature has a higher ratio of credibility-per-line-of-code than clean joints.

## Scope

### In scope
- Detect L-, T-, and X-junctions between two or more walls sharing an endpoint or a point along one wall's length (within a 20 mm snap radius).
- Produce a mitered, butted, or cross-cleaned joint in 3D and 2D that respects each wall's `Width` (and, once T-MOD-004 lands, composite layer priorities).
- Recompute joints incrementally when a wall is moved, stretched, deleted, or its thickness changes.
- Ensure openings (doors, windows) near a junction don't cut through the joint cleanly — the joint region should remain solid wall.

### Out of scope (this issue)
- Composite layer priority matching (handled by T-MOD-004 once composites exist).
- Sloped-wall junctions (walls today are all vertical).
- Non-orthogonal junctions where three or more walls meet at arbitrary angles (initial pass handles 2 walls cleanly; the general N-way miter is a follow-up).

## Proposed approach

1. Add a `wallGraph.ts` pure module next to `useThreeViewport.ts` that takes the doc's wall elements and returns a map `wallId → Array<JoinInfo>`, where `JoinInfo` describes the joining wall, the parameter `t ∈ [0, 1]` along the host wall, and the resolved join angle + type (L / T / X).
2. `buildWallMesh` consumes `JoinInfo` to trim each end of the wall to the miter plane instead of the current fixed half-thickness overshoot.
3. 2D renderer in `useViewport.ts` already uses oriented rectangles (T-028); extend it to consume the same `JoinInfo` and draw a clipped quad so the 2D joint matches.
4. Cache the graph on the doc and invalidate only walls within a bounding box of the moved wall on edits (not a full recompute).

## Acceptance criteria

- [ ] Two perpendicular exterior walls that share an endpoint produce a single mitered corner with no gap, no overlap, and no visible seam in both 2D and 3D (verified on the `simple` harness template).
- [ ] A T-junction between an exterior (300 mm) and an interior (150 mm) wall shows the interior wall butting cleanly into the face of the exterior wall; the exterior wall passes through uninterrupted.
- [ ] An X-junction (two interior walls crossing) produces four clean quadrants with no duplicated geometry at the crossing.
- [ ] Moving one wall of a joint by dragging preserves the joint — the other wall's geometry updates within the same frame without visual flicker.
- [ ] Deleting one wall of a joint restores the other wall's full untrimmed length.
- [ ] The joint is *not* defeated by a nearby door or window — openings within 100 mm of a junction shift away from the junction automatically, or emit a compliance warning if forced to overlap.
- [ ] No performance regression: rendering a 50-wall plan completes a full rebuild in ≤ 16 ms on the harness baseline machine.
- [ ] All existing unit tests remain green; the new wall-graph module has ≥ 90 % line coverage.

## Test plan (TDD — write these first, watch them fail, then implement)

New file `packages/app/src/hooks/wallGraph.test.ts`:

- `T-MOD-001-001` — `buildWallGraph` returns an empty map when the document has zero walls.
- `T-MOD-001-002` — two walls sharing an exact endpoint produce an L-junction for both walls.
- `T-MOD-001-003` — two walls sharing an endpoint within 15 mm but not exactly produce an L-junction (snap tolerance).
- `T-MOD-001-004` — two walls sharing an endpoint 25 mm apart do *not* form a junction (outside tolerance).
- `T-MOD-001-005` — three walls forming a T produce one T-junction record on the through-wall at `t ≈ 0.5` and two L-junctions on the stub walls.
- `T-MOD-001-006` — four walls crossing at a point produce an X-junction with exactly four join records at the crossing.
- `T-MOD-001-007` — wall removed from the doc invalidates only its neighbours in the cached graph, not every wall.
- `T-MOD-001-008` — moving a wall by 1 mm does not change the graph; moving by 10 mm past a neighbour's endpoint detaches the junction.

New file `packages/app/src/hooks/useThreeViewport.junction.test.ts`:

- `T-MOD-001-009` — a two-wall L-corner renders as exactly two meshes whose mitered faces share vertices with epsilon 0.01 mm.
- `T-MOD-001-010` — the vertex count of a two-wall joint does not increase when the joint re-resolves on re-render (no memory growth).

Harness visual check added to `e2e/house-build.spec.ts`:

- `T-MOD-001-011` — running the `simple` template, counting light-coloured pixels inside the corner overshoot region in `02-iso-3d.png` must be ≤ 5 (no visible corner seam).

## Dependencies

- Nothing — should land first.

## Blocks

- T-MOD-004 (composite walls — needs a working junction before it can resolve layer priorities)
- T-GEO-001 (SEO — needs a coherent wall-end plane before a roof can trim to it)

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p0`
