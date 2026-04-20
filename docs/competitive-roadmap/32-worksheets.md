# T-DOC-032 — Worksheets (non-scale drawings)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Small

## Why

Not every drawing on a sheet is derived from the 3D model. Finish legends, door-hardware schedules, general notes pages, site vicinity sketches, symbol keys — all are ad-hoc 2D drawings that belong on the sheets but aren't projections of the building. Worksheets are the container for these.

## Scope

### In scope
- **Worksheet** type: a named 2D drawing canvas at any scale (or "no scale") with 2D-only tools (line, rectangle, polygon, text, hatch).
- Worksheets appear in Navigator alongside plans, sections, elevations.
- Worksheets can be dragged onto layout sheets as viewports.
- Symbol library: users can insert pre-made symbols (north arrow, scale bar, detail symbol) — these live in the parametric-object library.

### Out of scope
- Bidirectional link to model (worksheets are independent).
- CAD-style raster overlays.

## Proposed approach

1. `Worksheet` schema: a collection of 2D elements (line, rect, polygon, text) scoped to that worksheet.
2. Navigator shows Worksheets group; right-click to add new.
3. Worksheet view reuses the existing 2D viewport with the `worksheetId` filter applied to element queries.

## Acceptance criteria

- [ ] "New Worksheet" in Navigator creates a blank worksheet.
- [ ] Opening it shows an empty 2D canvas with drawing tools.
- [ ] Lines, text, polygons drawn in the worksheet do not appear in the plan view.
- [ ] Dragging the worksheet onto a layout sheet creates a viewport.
- [ ] Rename, delete, duplicate worksheets from Navigator.

## Test plan

New `packages/app/src/lib/worksheets.test.ts`:

- `T-DOC-032-001` — creating a worksheet adds a new entry to `doc.worksheets`.
- `T-DOC-032-002` — elements placed with active worksheet carry its `worksheetId`.
- `T-DOC-032-003` — plan-view queries exclude elements tagged with a worksheetId.

UI:

- `T-DOC-032-004` — Navigator shows Worksheets group, expandable.
- `T-DOC-032-005` — opening a worksheet swaps the canvas to worksheet-filtered mode.

Harness:

- `T-DOC-032-006` — `worksheet-demo` creates a finish-legend worksheet; drag-to-layout produces expected viewport count.

## Dependencies

- None hard; benefits from T-DOC-008 (layout book).

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p2`
