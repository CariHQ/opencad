# T-DOC-005 — Section views that cut live 3D geometry

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

The current Section tab shows a view but does not *cut* anything — it is a separate mode with no live relationship to the model. Architects need to drop a section line on the plan, see everything beyond the line clipped away, see cut poché on every element the plane crosses, and have the section update the moment the model changes. Without this, detail drawings and construction documents cannot be produced from the model.

## Scope

### In scope
- A new `Section` element type: a line on the plan with an `extent` depth behind it and a `viewDirection` vector.
- Clicking "Create section" drops a two-click section line on the plan. The line immediately becomes a named view in the Navigator.
- Opening the section view swaps the 3D viewport into an orthographic clipped mode: a `THREE.Plane` clips everything on the near side of the line; a depth clamp clips everything beyond `extent`.
- Cut elements render their cut profile with heavy outline + hatch (the poché): walls show composite layers, slabs show the slab cross-section, doors/windows show lintel + sill.
- Un-cut (elevation-visible) elements render normally but projected onto the section plane.
- The section updates within 1 frame of any model edit.
- Exports as SVG via the existing 2D drawing export path.

### Out of scope (this issue)
- Multi-segment / stepped sections.
- Detail callouts inside sections (that's T-DOC-008 layout-book territory).
- Annotation on sections — lands after the section itself works.

## Proposed approach

1. Add `Section` element type to `@opencad/document` schema.
2. Reuse Three's `clippingPlanes` on the materials used by all meshes. The viewport toggles a rendering mode when the active view is a section: (a) set a single clipping plane on all opaque materials, (b) walk the scene and for every mesh intersecting the plane, compute the cross-section polyline with `three-csg`-style slicing, and render the resulting polyline in the poché overlay pass.
3. The poché pass is an additional `THREE.LineSegments` + filled polygon pass, sorted by the material's layer colour (so composite-wall layers show through).
4. A 2D SVG export path walks the same slicing results and emits a scalable drawing.

## Acceptance criteria

- [ ] Dropping a section line across the `three-bedroom` plan creates a new entry in the Navigator.
- [ ] Opening the section view shows only elements on the viewing side of the section line; everything behind is hidden.
- [ ] A wall crossed by the section line shows its composite layers as a hatched cross-section.
- [ ] A door in a wall crossed by the section line shows the lintel and hardware at the correct elevation.
- [ ] Moving the section line on the plan updates the section view live.
- [ ] Deleting the section element removes the view from the Navigator; deleting the Navigator entry deletes the element.
- [ ] SVG export of the section produces valid SVG that opens in a browser and in Inkscape.
- [ ] No performance regression: switching from plan to section on a 100-element project takes ≤ 200 ms.

## Test plan

New file `packages/app/src/lib/sectionSlice.test.ts`:

- `T-DOC-005-001` — slicing a 1 × 1 × 1 box with a plane perpendicular to X at `x=0.5` returns a rectangle with the expected four vertices.
- `T-DOC-005-002` — slicing the same box with a plane that does not intersect returns an empty result.
- `T-DOC-005-003` — slicing a composite wall (three layers) returns three polygons, one per layer, stacked along the perpendicular axis.
- `T-DOC-005-004` — slicing is deterministic across repeated calls.

New file `packages/app/src/components/SectionView.test.tsx`:

- `T-DOC-005-005` — mounting `SectionView` with a section element whose plane cuts a wall renders exactly one `<svg>` containing the wall's cut polygon.
- `T-DOC-005-006` — toggling `section.extent` from 1000 to 5000 changes the number of included elements in the view.
- `T-DOC-005-007` — updating a wall's position triggers a re-slice of that wall only, not all walls.

Harness / e2e:

- `T-DOC-005-008` — new Playwright step after drawing the three-bedroom: drop a section through the corridor, open the view, screenshot to `06-section.png`, assert the image has both heavy poché lines and non-zero "behind the cut" pixel coverage below threshold.

## Dependencies

- T-MOD-004 (composite walls) — sections only look right when walls are multi-layer.
- T-GEO-001 (SEO) — wall tops clipped to roofs must resolve before sections cut through the clipped geometry.

## Blocks

- T-DOC-006 (elevations) — elevations are a special case of sections with the plane far outside the building.
- T-DOC-008 (layout book) — the thing layout pages reference.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
