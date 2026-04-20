# T-MOD-024 — Mirror / rotate / array multi-copy transforms

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Symmetrical plans (duplicated apartments, repeated office modules, barracks, classrooms) need one-operation replication. Current workflow is copy-paste one at a time. Mirror, rotate-around-axis, linear array, and polar array cover 90 % of real-world replication needs.

## Scope

### In scope
- **Mirror**: pick two points defining the mirror axis; duplicate selection mirrored across it. Option to keep original or replace.
- **Rotate**: pick pivot; type angle (numeric entry); selection rotated. Option to make copies at intermediate angles (e.g., 4 × 90° = polar array).
- **Linear Array**: type count + spacing vector; selection replicated N times.
- **Polar Array**: pick center + count; selection replicated around the center.
- All operations respect groups (T-MOD-023).
- All operations undoable as single actions.

### Out of scope
- Radial-path array (following an arbitrary curve).
- Parametric arrays (edit one, all update).

## Proposed approach

1. `lib/transforms.ts`: pure `mirror(el, axis)`, `rotate(el, pivot, angle)`, `translate(el, dx, dy)`.
2. UI: toolbar buttons + shortcuts `Shift+M` mirror, `Shift+R` rotate, `Shift+A` array.
3. Array dialog: number input for count, coordinate input for spacing / center + angle.

## Acceptance criteria

- [ ] Mirror: select a wall, pick axis, wall is duplicated mirrored.
- [ ] Rotate 45°: wall rotated by 45° around pivot; lengths preserved; properties unchanged.
- [ ] Linear Array with count 5, spacing (2000, 0): 5 walls at 0, 2000, 4000, 6000, 8000.
- [ ] Polar Array count 6, center (0,0): 6 copies at 60° intervals.
- [ ] Groups: array of a group replicates all members per copy.
- [ ] Undo collapses the entire array back into the original single element.

## Test plan

New `packages/app/src/lib/transforms.test.ts`:

- `T-MOD-024-001` — mirror a wall `[(0,0)→(5,0)]` across axis `x=5` produces a wall `[(10,0)→(5,0)]`.
- `T-MOD-024-002` — rotate a wall by 90° around origin produces endpoints rotated correctly.
- `T-MOD-024-003` — linear array count 3 spacing (1,0) on a wall `[0,0]→[1,0]` produces 3 walls at x=0, 1, 2.
- `T-MOD-024-004` — polar array count 4 around center `(0,0)` produces 4 copies at 0°, 90°, 180°, 270°.
- `T-MOD-024-005` — array of a group produces one group per copy with `children` populated.

UI:

- `T-MOD-024-006` — `RotateDialog` accepts angle, commits a single undoable action.

Harness:

- `T-MOD-024-007` — `array-demo` creates a 5 × 5 grid of columns; count = 25.

## Dependencies

- T-MOD-023 (groups) — array respects groups.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p2`
