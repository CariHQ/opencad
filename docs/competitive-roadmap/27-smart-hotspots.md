# T-MOD-027 — Smart hotspots on element edges

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Medium

## Why

When an element is selected, users want editable control points along every edge: endpoint hotspots to drag an endpoint, midpoint hotspots to stretch the centre, perpendicular hotspots to move the whole side. Today selection only exposes a bounding-box with translate handles — there is no way to grab an edge and pull it. This is the difference between "drawing" and "modelling".

## Scope

### In scope
- When an element is selected, render hotspot dots at:
  - Each vertex (editable: drag that vertex).
  - Each edge midpoint (editable: move edge perpendicular to itself).
  - Each face center (for slab/roof: offset face).
- Hover state: hotspot highlights, cursor changes.
- Drag: constrained to what makes sense for the element type (wall endpoint in 2D; slab vertex in 2D; shell vertex in 3D).
- Hotspots respect the axis-lock / smart-guide system (T-MOD-021).
- Numeric entry via coord box (T-MOD-003).

### Out of scope
- 3D hotspots on walls (walls edited in plan only in v1).
- Rotation hotspots (use dedicated rotate gizmo instead).

## Proposed approach

1. `lib/hotspots/elementHotspots.ts`: pure function `hotspots(el)` returns an array of `{ type: 'vertex' | 'midpoint' | 'face', position, edit: (delta) => Patch }`.
2. Overlay pass in viewport renders hotspots on the selected element.
3. `pointerdown` on a hotspot starts a drag whose `pointermove` applies the hotspot's `edit` function.

## Acceptance criteria

- [ ] Selecting a wall shows hotspots at both endpoints + midpoint.
- [ ] Dragging an endpoint hotspot moves that endpoint; the other end stays.
- [ ] Dragging the midpoint moves the entire wall perpendicular to its axis.
- [ ] Selecting a slab shows hotspots at every polygon vertex + edge midpoints.
- [ ] Dragging a slab vertex edits one vertex; others stay.
- [ ] Dragging a slab edge midpoint moves that edge parallel to itself.
- [ ] Hotspot drags respect axis lock when Shift is held.

## Test plan

New `packages/app/src/lib/hotspots/elementHotspots.test.ts`:

- `T-MOD-027-001` — wall returns 3 hotspots (start, end, midpoint).
- `T-MOD-027-002` — slab with 4 vertices returns 8 hotspots (4 vertex + 4 edge midpoints).
- `T-MOD-027-003` — vertex hotspot's `edit(delta)` translates one endpoint by `delta`.
- `T-MOD-027-004` — midpoint hotspot's `edit` translates both endpoints by `delta`.
- `T-MOD-027-005` — slab edge midpoint's `edit` translates the two endpoints of that edge.

UI:

- `T-MOD-027-006` — viewport renders hotspots when element is selected.
- `T-MOD-027-007` — hover hotspot changes cursor to `crosshair`.

Harness:

- `T-MOD-027-008` — `hotspot-demo` selects a wall, drags endpoint 500 mm; final length matches expected.

## Dependencies

- T-MOD-003 (coord box) for numeric entry during drag.
- T-MOD-021 (axis lock) for constrained drag.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `area:bim`, `p2`
