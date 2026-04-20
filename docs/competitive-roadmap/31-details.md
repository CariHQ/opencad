# T-DOC-031 — Detail drawings with source-view callouts

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

Detail drawings (wall head / sill, foundation-to-slab, roof edge, typical stair section) are the drawings contractors look at during construction. They live at larger scale (1:10, 1:5) and show the layered build-up with annotations. Every deliverable pack has a sheet of details. Without a detail mechanism linked back to its location in the building, construction drawings are incomplete.

## Scope

### In scope
- **Detail marker**: a new element placed on plans / sections that points at a region of the model; it has a number and a link to a Detail view.
- **Detail view**: a named view that shows a zoomed-in portion of a source view, with its own annotation layer, additional drawn lines, and text notes.
- When placed on a layout sheet, the detail view carries its marker number and sheet cross-reference (e.g., "2 / A-301").
- Detail drawings can be linked to template "typical" details the user reuses across projects.

### Out of scope
- Automatic 2D hatching derived from composites in the detail (handled by T-MOD-030 hatches).
- Parametric detail libraries per vendor.

## Proposed approach

1. Schema: `doc.details: Detail[]` and `DetailMarker` element type placed on any view.
2. `components/DetailView.tsx`: reuses section slicing, zoomed + cropped.
3. Marker-to-layout cross-reference resolved at layout-render time (updates automatically).

## Acceptance criteria

- [ ] Placing a detail marker on a plan creates a new entry in Details.
- [ ] Opening the detail view shows the marker's region at 1:10 scale.
- [ ] Adding annotations in the detail view persists to the doc.
- [ ] Dragging the detail view onto a layout sheet assigns it a number + sheet reference.
- [ ] The plan's marker updates to show "2 / A-301" after the detail lands on sheet A-301 as viewport 2.
- [ ] Moving the marker on the plan updates the detail view's source region live.

## Test plan

New `packages/app/src/lib/details.test.ts`:

- `T-DOC-031-001` — creating a detail marker at `(x, y)` with radius 500 mm creates a Detail entry.
- `T-DOC-031-002` — marker deletion removes the Detail.
- `T-DOC-031-003` — detail view sliced from its region returns the expected polygons.

Cross-reference:

- `T-DOC-031-004` — assigning a detail to layout A-301 viewport 2 updates the marker's `displayLabel` to "2 / A-301".

UI:

- `T-DOC-031-005` — detail view renders at the specified scale.
- `T-DOC-031-006` — annotations in a detail view persist across reloads.

## Dependencies

- T-DOC-005 (section cuts).
- T-DOC-008 (layout book) for cross-reference.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
