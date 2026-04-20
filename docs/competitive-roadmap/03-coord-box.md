# T-MOD-003 — Coordinate box with numeric input during any draw / edit

**Priority:** P0 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Medium

## Why

Professionals draw by typing dimensions, not by eyeballing mouse positions. Every competitive tool offers a floating coordinate tracker during *any* drawing or editing operation — type `4500` + TAB + `Enter` and the element commits at exactly that length. Today OpenCAD only supports drag-to-size, which produces a ~0.5 mm error on every operation and makes it impossible to draw to spec.

## Scope

### In scope
- A floating, semi-transparent overlay that appears next to the cursor whenever a drawing or modification operation is in progress (wall, line, rectangle, slab, door, window, column, dimension, plus edit handles on selection).
- Fields shown depend on the active tool / operation:
  - Point placement: `X`, `Y`, optional `Z`
  - Line / wall draw: `Length`, `Angle` (absolute); `ΔX`, `ΔY` (relative) — toggle
  - Rectangle / slab: `Width`, `Height`
  - Circle / arc: `Radius`, `StartAngle`, `EndAngle`
  - Move / stretch edit: `ΔX`, `ΔY`, `Distance`, `Angle`
- `TAB` cycles focus between fields; active field is highlighted and traps cursor input.
- `Enter` on any field commits the operation with the currently-typed values.
- `Shift` held during drag locks the operation to the current primary axis (`X`, `Y`, or along the wall direction) and disables the perpendicular field.
- `Esc` cancels the operation without committing.
- Entry accepts bare numbers (mm), explicit units (`4.5m`, `15'-3"`, `900mm`) via an existing or new `parseLength` utility.
- Every field pushes state into the same drawing-state ref the viewport already reads so the commit path does not change.

### Out of scope (this issue)
- Relative-reference drawing (`@4500,0` from previous point) — nice follow-up, not core.
- Constraint-based parametric drafting (distance constraints, angle constraints). Separate effort.
- Imperial fraction parsing edge cases (`5 1/16"`) — document as a future refinement.

## Proposed approach

1. Add a new component `packages/app/src/components/CoordBox.tsx` rendered conditionally by `Viewport.tsx` whenever `useViewport().drawingState.isDrawing` is true.
2. Wire up a new hook `useCoordBox()` that observes `drawingState`, `activeTool`, and exposes `{ fields, activeField, setField, cycle, commit, cancel }`.
3. Route key events from the canvas' keydown handler to `useCoordBox` first; only fall through to existing shortcuts if no field is active.
4. Extract `parseLength(input: string): number | null` into `packages/shared` so both 2D and 3D viewport (and later properties panel) share unit parsing.

## Acceptance criteria

- [ ] Selecting the wall tool, clicking once to set the start point, typing `4500`, pressing `Enter` commits a wall of exactly 4500 mm in the current cursor direction.
- [ ] While drawing a wall, pressing `TAB` moves focus from `Length` to `Angle`; pressing `TAB` again wraps back.
- [ ] Typing `4.5m` in `Length` evaluates to 4500 mm.
- [ ] Holding `Shift` while the cursor is more horizontal than vertical locks Y and hides the Y field.
- [ ] `Esc` while a field is focused cancels the draw and leaves the document unchanged.
- [ ] No keystroke typed into a coord-box field triggers a tool-shortcut side effect (typing `w` in a field does not switch to wall tool).
- [ ] The coord box does not block view navigation — the user can middle-click-pan while the box is visible.
- [ ] Coord box auto-hides when no operation is active.
- [ ] Keyboard-only workflow: select wall tool, click once to set origin, `4500 TAB 0 Enter` draws the wall without a second mouse movement.

## Test plan

New file `packages/shared/src/parseLength.test.ts`:

- `T-MOD-003-001` — `parseLength('4500')` = 4500.
- `T-MOD-003-002` — `parseLength('4.5m')` = 4500.
- `T-MOD-003-003` — `parseLength('15\'')` ≈ 4572 (15 ft).
- `T-MOD-003-004` — `parseLength('15\'-3\"')` ≈ 4648.2.
- `T-MOD-003-005` — `parseLength('abc')` = `null`.

New file `packages/app/src/components/CoordBox.test.tsx`:

- `T-MOD-003-006` — renders `Length` and `Angle` inputs when `activeTool === 'wall'` and `drawingState.isDrawing === true`.
- `T-MOD-003-007` — typing `4500` into `Length` and pressing `Enter` fires `onCommit({ length: 4500, ... })`.
- `T-MOD-003-008` — `TAB` rotates focus between declared fields.
- `T-MOD-003-009` — `Esc` fires `onCancel` and clears field state.
- `T-MOD-003-010` — does not render when `drawingState.isDrawing === false`.
- `T-MOD-003-011` — `Shift` held changes the exposed field set from `{ΔX, ΔY}` to `{Distance}` for a move operation.

New file `packages/app/src/hooks/useCoordBox.test.ts`:

- `T-MOD-003-012` — start-point click followed by a numeric `Length` + `Enter` commit produces a wall of that length in the direction of the current cursor offset from the start point.
- `T-MOD-003-013` — typing while no field is focused bubbles up (does not swallow tool shortcuts).

Harness / e2e:

- `T-MOD-003-014` — a new Playwright template `precise-draw` drives the coord box via keyboard: click once, type length, tab, type angle, enter. Resulting wall matches exactly to within 0.1 mm.

## Dependencies

- None — can land in parallel with T-MOD-001.

## Blocks

- Nothing directly — but unlocks better test harness templates that can target exact sizes instead of pixel-approximated coordinates.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `area:bim`, `p0`
