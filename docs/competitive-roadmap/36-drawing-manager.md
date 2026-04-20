# T-DOC-036 — Drawing Manager with auto-numbering cross-references

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

A drawing set has a numbering system: A-101 = first floor plan, A-201 = second floor plan, A-301 = building sections, A-401 = elevations, etc. When a section marker on a plan says "2 / A-301", that's a cross-reference: viewport 2 on sheet A-301. Hand-numbering these is error-prone; when a sheet moves, every marker needs updating. A Drawing Manager owns the numbering and cross-referencing.

## Scope

### In scope
- A **Drawing Manager** panel lists all drawings grouped by category (plans, sections, elevations, details, schedules, 3D views, renderings).
- Layouts get automatic sheet numbers based on category prefix + sequence (`A-101`, `A-102`, …); user-editable.
- Viewports on layout sheets get automatic per-sheet viewport numbers (1, 2, 3…); user-editable.
- Section / elevation / detail markers on plans show their destination: "2 / A-301".
- Moving a section view to a different layout updates every marker that points to it.
- Drawing Manager shows the cross-reference graph: "A-101 references A-301 viewport 2".

### Out of scope
- Multi-project drawing numbering (per-project in v1).
- Revision tracking (nice-to-have follow-up).

## Proposed approach

1. Schema: `doc.drawingIndex: DrawingIndex` with sheet-number + category mappings.
2. `lib/drawingManager.ts`: resolves `(viewId) → "<N> / <sheetId>"` for any marker.
3. `DrawingManagerPanel.tsx` tabbed by category.
4. Markers render their label from the index, not hardcoded.

## Acceptance criteria

- [ ] Creating a new layout auto-numbers it based on category.
- [ ] Section marker on a plan shows "2 / A-301" after the section lands on layout A-301 as viewport 2.
- [ ] Moving the section to layout A-302 changes the marker label automatically.
- [ ] Drawing Manager panel lists all drawings with a cross-reference count.
- [ ] Exporting a drawing-list table to CSV works.

## Test plan

New `packages/app/src/lib/drawingManager.test.ts`:

- `T-DOC-036-001` — `autoSheetNumber('plan')` returns `'A-101'` on first use, `'A-102'` next.
- `T-DOC-036-002` — `resolveMarker(sectionId)` returns `'2 / A-301'` given the index state.
- `T-DOC-036-003` — moving the section between sheets updates the cross-reference.
- `T-DOC-036-004` — deleting a layout with assigned viewports clears the referenced markers.

UI:

- `T-DOC-036-005` — Drawing Manager panel shows all drawings categorised.
- `T-DOC-036-006` — CSV export produces a valid file.

Harness:

- `T-DOC-036-007` — `drawing-manager-demo` produces a project with 3 layouts; marker label cycles correctly.

## Dependencies

- T-DOC-008 (layout book).

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p2`
