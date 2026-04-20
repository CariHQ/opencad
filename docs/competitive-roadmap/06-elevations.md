# T-DOC-006 — Named orthographic elevations

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Small

## Why

Elevations are the set of orthographic drawings every construction document pack requires: north / south / east / west (plus any angled views). Today we only have a generic 3D view with hotkey-switchable presets (0/1/2/3/4 → iso / top / front / right / left). That's a viewing aid, not a named, titled, exportable, sheetable drawing.

## Scope

### In scope
- A new `Elevation` element type: a named view with a `viewDirection`, `cameraDistance`, and optional `cropBox`.
- The Navigator gains an "Elevations" group; users can add a new named elevation ("North", "South", "East", "West") from a right-click menu.
- Each elevation opens a dedicated view: orthographic camera, named, with a title bar showing "N", "S", "E", "W" and the elevation name.
- Elevation view renders elements projected onto the view plane, with no perspective distortion.
- The elevation can be exported to SVG for layout-book inclusion (T-DOC-008).

### Out of scope (this issue)
- Shaded / photoreal elevations — plain-line first.
- Angled / rotated elevations from arbitrary angles — start with 4 cardinal + any user-entered degree angle via a number field.

## Proposed approach

1. Extend the schema to include `Elevation` elements stored under `doc.organization.views`.
2. Refactor the 3D viewport's existing "view preset" keyboard handler to iterate these named views instead of a hard-coded list.
3. A new right-click group in the Navigator sidebar produces the four built-in elevations on demand. They are document-level elements, not ephemeral viewport state, so they survive reloads and sync over CRDT.
4. Reuse the section slicer from T-DOC-005: an elevation is effectively a section whose plane sits far outside the building's envelope, so "behind the plane" never matters.
5. Add an `exportElevationSVG(elevationId)` helper mirroring `exportSectionSVG`.

## Acceptance criteria

- [ ] Creating a new project seeds four named elevations (North, South, East, West).
- [ ] Opening "North Elevation" shows the model in orthographic projection looking south.
- [ ] The elevation name shows in the view's title bar.
- [ ] Exporting the elevation as SVG produces a file that opens and renders correctly.
- [ ] Switching between elevations happens in ≤ 50 ms.
- [ ] Resizing an element in plan reflects in the open elevation view live.
- [ ] An elevation's `cropBox` constrains rendering to that box — useful for focused partial elevations.

## Test plan

New file `packages/app/src/components/Elevation.test.tsx`:

- `T-DOC-006-001` — mounts `ElevationView` with a "North" elevation; camera position is `(0, Y, +far)` looking toward `-Z`.
- `T-DOC-006-002` — camera is orthographic (not perspective).
- `T-DOC-006-003` — camera frustum is sized to the model bounding box plus 10% margin.

New file `packages/app/src/stores/documentStore.elevation.test.ts`:

- `T-DOC-006-004` — `createDefaultElevations()` seeds exactly four elevations.
- `T-DOC-006-005` — elevations are persisted to localStorage and reload intact.

Harness:

- `T-DOC-006-006` — add a Playwright step after building the three-bedroom: click the "South Elevation" Navigator item, screenshot to `07-south-elevation.png`, verify non-zero drawing content.

## Dependencies

- T-DOC-005 (section cuts) — elevation reuses the slicer.

## Blocks

- T-DOC-008 (layout book) — elevations are the thing layout sheets embed.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
