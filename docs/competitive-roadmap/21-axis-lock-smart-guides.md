# T-MOD-021 — Axis lock + smart guides (inference lines)

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

Drawing should reward intent. If the user is dragging mostly along the X axis, hold Shift and the system locks X. Pass the cursor near an existing wall's endpoint, and a transient inference line appears so the user can snap to "aligned with that endpoint" or "at the same X coordinate as that point". These inference guides are how professional tools turn sloppy mouse motion into exact geometry — separate from the grid snap we already have.

## Scope

### In scope
- **Axis lock**: while dragging, `Shift` locks to the dominant axis (X / Y / along the active wall's direction). Locked axis draws a colored line through the drag start. `Shift+Shift` cycles through X → Y → free.
- **Smart guides (inference lines)**:
  - When cursor comes within N px of an existing vertex's X or Y, a dotted inference line appears aligned with that vertex, and snapping engages.
  - When cursor is near a line's extension, an inference line appears extending it.
  - When cursor is near a midpoint or perpendicular foot of an existing segment, snap there.
  - Inference lines disappear after 200 ms of cursor leaving the snap zone.
- Status bar or HUD shows which snap/guide is currently active in plain English ("aligned to endpoint of Wall-014").

### Out of scope
- Distance-constraint lines between points (that's parametric constraints; separate).
- Polar tracking at custom angles beyond X, Y, wall-parallel.

## Proposed approach

1. Extend `lib/snapping.ts` already present: add `inferenceGuides()` that returns transient guide lines for the current cursor.
2. Render guides in viewport drawing pass as dashed coloured lines (color coded per guide type).
3. Shift-key state lives in `drawingState.axisLock: null | 'x' | 'y' | 'along'`.
4. Snap resolver preferences: inference guide > grid > free.

## Acceptance criteria

- [ ] Holding `Shift` while drawing a wall more horizontal than vertical locks the Y coordinate.
- [ ] Cursor near (±20 px) an existing wall's endpoint X shows a vertical dotted line and snaps.
- [ ] Cursor near a line's extension shows an extension inference line and snaps.
- [ ] Mid-point snap engages when cursor is within tolerance of a segment's midpoint.
- [ ] Perpendicular foot snap engages when dragging perpendicular to an existing segment.
- [ ] A status hint reads the snap type in English.
- [ ] Disabling snapping via hotkey (`S`) removes all guides.

## Test plan

New `packages/app/src/lib/snapping.inference.test.ts`:

- `T-MOD-021-001` — cursor at `(100, 0)` when a vertex exists at `(99, 500)` returns an inference guide aligning X = 99.
- `T-MOD-021-002` — cursor on the extension of a line from `(0, 0)` to `(100, 0)` at point `(150, 1)` returns an extension guide and snaps Y to 0.
- `T-MOD-021-003` — midpoint snap on a segment `[(0,0)→(100,0)]` engages at `(50, 1)` within tolerance.
- `T-MOD-021-004` — perpendicular foot snap from `(50, 20)` to segment `[(0,0)→(100,0)]` returns `(50, 0)`.

UI:

- `T-MOD-021-005` — `Shift` down during drag sets `axisLock`.
- `T-MOD-021-006` — inference line renders as dashed, disappears after 200 ms idle.

Harness:

- `T-MOD-021-007` — `precise-inference-draw` template drags a wall near a reference vertex; inference guide engages and the resulting wall has the snapped coordinate.

## Dependencies

- None.

## Blocks

- None, but dramatically improves usability of T-MOD-003 (coord box).

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `area:bim`, `p1`
