# T-DOC-007 — Interactive schedules (door / window / room / finish)

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Schedules are non-negotiable deliverables for permit sets and construction documents. A door schedule lists every door in the building with its size, material, hardware, fire rating, host wall, and location. The same for windows and rooms. Hand-authoring these is the single biggest source of construction-document errors in practice; a BIM tool that produces them automatically and keeps them synchronized is the headline reason to use BIM at all.

## Scope

### In scope
- A new right-panel tab, **Schedules**, with three tables by default:
  - **Door Schedule** — rows: every door. Columns: tag, width, height, material, host wall, level, fire rating (optional), cost.
  - **Window Schedule** — rows: every window. Columns: tag, width, height, sill height, material, host wall, level, U-value (optional), cost.
  - **Room Schedule** — rows: every space. Columns: number, name, area, occupancy, finish floor, finish walls, finish ceiling.
- Tags are auto-generated on element create (`D-001`, `D-002`, `W-001`, `R-101`), user-editable, unique per type.
- Clicking a row selects the element in the 3D and 2D viewports.
- Schedule updates within 1 frame of any model edit.
- Export each schedule as CSV and as SVG (for layout-book inclusion).
- Custom user-authored columns via the Properties panel — add a property on a door and it appears as a column the next time the schedule renders.

### Out of scope (this issue)
- Finish Schedule (per-room wall/floor/ceiling finishes) — deferred; depends on composite-wall finish tracking.
- Window / door hardware sub-schedules.
- User-authored schedule definitions (new table types) — v1 ships the three fixed types.

## Proposed approach

1. Add `lib/schedules/` with one module per schedule: `doorSchedule.ts`, `windowSchedule.ts`, `roomSchedule.ts`. Each exports `(doc) => ScheduleRow[]`.
2. Tag generator lives in `@opencad/document`, invoked at element-commit time. Tags survive element moves, regenerate only if deleted.
3. New `ScheduleTable.tsx` component — data-grid with sortable columns, bound to the schedule function.
4. A new tab component `SchedulesPanel.tsx` switches between the three schedules.
5. CSV export reuses the `papaparse` dependency; SVG export reuses the drawing-export infrastructure from T-DOC-006.

## Acceptance criteria

- [ ] Drawing a door adds a row to the Door Schedule with tag `D-XXX` (monotonically numbered).
- [ ] Deleting a door removes its row.
- [ ] Editing a door's width via the Properties panel updates the schedule row within 1 frame.
- [ ] Clicking a schedule row selects the element in the 3D viewport and highlights it in the 2D plan.
- [ ] Door Schedule CSV export yields a valid RFC-4180 file opening in Excel / Numbers / LibreOffice.
- [ ] Window and Room schedules populate automatically from the same document.
- [ ] A plan with 12 doors, 14 windows, 5 rooms produces rows count 12 / 14 / 5; numbers update on add/delete.
- [ ] Tag uniqueness is preserved even across undo/redo.
- [ ] Changing a door's property via schedule inline-edit commits the change back to the element.

## Test plan

New file `packages/app/src/lib/schedules/doorSchedule.test.ts`:

- `T-DOC-007-001` — an empty document produces `[]`.
- `T-DOC-007-002` — a document with 3 doors produces 3 rows with tags `D-001, D-002, D-003`.
- `T-DOC-007-003` — deleting door `D-002` from a 3-door document and then adding a new door reuses `D-002` (or uses `D-004`, depending on policy — test asserts current policy).
- `T-DOC-007-004` — door on wall with composite composite shows host-wall composite name in the row.

Similar file `roomSchedule.test.ts`:

- `T-DOC-007-005` — a space with `spaceType: 'bedroom'` and explicit `Area: 12.5` produces a row with the correct area.

New file `packages/app/src/components/SchedulesPanel.test.tsx`:

- `T-DOC-007-006` — panel mounts and shows 3 tab buttons.
- `T-DOC-007-007` — clicking a door row emits `setSelectedIds([doorId])`.
- `T-DOC-007-008` — adding a new door updates the row count within one render.
- `T-DOC-007-009` — CSV export button triggers a download with an .csv blob whose first row is the header.

## Dependencies

- None hard. But benefits from T-PAR-009 (parametric doors/windows) for richer columns.

## Blocks

- T-DOC-008 (layout book) — schedules are a thing layout pages can embed.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
