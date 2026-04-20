# T-PAR-009 — Parametric door and window with frame / leaf / panel

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Every door and window in the current document is a flat `Width × Height × 50 mm` box — functionally a placeholder. Schedules generated from these placeholders look fake (no panel layout, no handing, no hardware), and 3D renders betray the prototype status the moment a camera is close to a wall opening.

## Scope

### In scope
- New parametric structures for doors and windows:
  - **Door**: `frame` (material, thickness, profile), `leaf` (count 1/2, material, panel layout `flush | 2-panel | 4-panel | glass`, handing `L / R`), `threshold` (material).
  - **Window**: `frame` (material, thickness, profile), `panes` (grid: rows × cols), `sill` (material, depth), `operation` (`fixed | casement | awning | double-hung | sliding`).
- 3D geometry renders the frame + leaf + panels + hardware (a simple handle primitive) correctly for each type.
- 2D plan symbol renders the correct door swing arc, window line style, and handing.
- Properties panel shows the new parametric fields when a door or window is selected.
- Schedule (T-DOC-007) picks up the new fields as columns.
- A small library of default door/window types is seeded on new projects: `int-door-single-flush-900`, `ext-door-single-4panel-900`, `window-casement-1200x1200-2x1`, etc.

### Out of scope (this issue)
- User-authored custom symbol libraries via drag-and-drop (T-PAR-013).
- Sliding doors with rail / floor detail.
- Revolving doors.

## Proposed approach

1. Replace the flat `Width/Height/SillHeight/FrameType` schema on door + window with nested `frame`, `leaf`, `panes`, `operation` objects. Migration: any existing door → `{ frame: { material: 'Wood' }, leaf: { count: 1, panel: 'flush' } }`.
2. `useThreeViewport` gets new `buildDoorMesh(el, hostWall)` / `buildWindowMesh(el, hostWall)` helpers that produce a group of meshes.
3. 2D `useViewport` symbol rendering: door swing arc drawn from hinge point, 90° arc, dashed; window: 3 parallel lines through the opening, short perpendicular tick marks for operation type.
4. Properties panel gets a `DoorPropertiesForm` / `WindowPropertiesForm` sub-component.
5. Seed library lives in `@opencad/document` as a set of templates.

## Acceptance criteria

- [ ] A default single-leaf flush door with `handing: R` renders with a visible panel, frame on all sides, handle on the right stile, and a proper plan-view swing arc to the right.
- [ ] A 4-panel exterior door shows four raised panels on the leaf in 3D.
- [ ] A 2-leaf French door shows both leaves with correct handing.
- [ ] A double-hung window shows two panes with the operable one highlighted.
- [ ] A casement window plan view shows the "open" tick mark pointing to the hinge side.
- [ ] Switching `handing: L` ↔ `R` flips the swing arc in plan and the handle side in 3D.
- [ ] Changing `panes: { rows: 2, cols: 3 }` on a window produces a 2×3 mullion grid in 3D.
- [ ] Schedule rows now include "Panel Layout" and "Operation" columns with correct values.
- [ ] Loading an old project (before this change) migrates every door/window without errors and renders them as single flush doors / fixed windows.

## Test plan

New file `packages/document/src/door.test.ts`:

- `T-PAR-009-001` — door schema validates a minimal `{ frame, leaf }` object.
- `T-PAR-009-002` — `migrateDoorLegacy({ Width: 900, Height: 2100 })` returns the expected new shape.
- `T-PAR-009-003` — schema rejects `leaf.count > 2` (out of v1 scope).

New file `packages/app/src/hooks/useThreeViewport.door.test.ts`:

- `T-PAR-009-004` — `buildDoorMesh` on a single-leaf flush door returns a group with exactly 4 frame meshes + 1 leaf mesh + 1 handle mesh.
- `T-PAR-009-005` — `buildDoorMesh` on a 2-leaf door returns 4 frame + 2 leaves + 2 handles.
- `T-PAR-009-006` — door handle on `handing: L` sits at the left edge of the leaf (X ≤ leafMidX - leafWidth/4).

New file `packages/app/src/hooks/useViewport.doorSymbol.test.ts`:

- `T-PAR-009-007` — `drawDoorSymbol` produces an arc with `startAngle` matching the wall direction on `handing: R`.

Harness:

- `T-PAR-009-008` — new template `door-variants` places four door types in a test wall; the iso screenshot shows distinct panels / leaves / handles per type.

## Dependencies

- T-MOD-004 (composite walls) — door frame thickness should match wall composite.

## Blocks

- T-PAR-013 (parametric object library) — reuses the same parametric pattern.
- T-DOC-007 richer schedule columns.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:geometry`, `p1`
