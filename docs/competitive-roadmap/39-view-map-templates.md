# T-VIZ-039 — Named View Map + view templates

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

A project's drawings are dozens of views — every plan per level, every section, every elevation, every detail, every 3D angle. The View Map is the single organized tree of these views with folders and templates ("1:100 Plan", "1:50 Plan", "1:10 Detail") that batch-apply settings (scale, visible layers, graphic overrides, annotations).

## Scope

### In scope
- **View Map** tab in Navigator (sibling to Layers, Levels).
- Folder tree: Plans / Sections / Elevations / Details / 3D / Renderings / Worksheets.
- **View Template**: saved bundle of `{ scale, visibleStories, layerCombination, graphicOverride, annotationLayer }`.
- Apply template to any view — replaces its settings.
- Seed templates: "Working Plan 1:100", "Presentation Plan 1:50", "Detail 1:10", "Construction Section 1:100".

### Out of scope
- Multi-user shared templates (v1 per-project).

## Proposed approach

1. `doc.views` already exists; add a `folderId` to views.
2. `doc.viewTemplates: ViewTemplate[]` with the bundled settings.
3. Navigator's Views panel becomes the View Map with folder tree.
4. Apply-template menu item on each view.

## Acceptance criteria

- [ ] View Map tab lists all views in folders.
- [ ] Drag-drop reorders / reparents views.
- [ ] "Apply Template" on a plan view updates scale + layer combination.
- [ ] Templates are editable — changing a template updates the last-applied views (ask the user first).
- [ ] New project seeds the 4 default templates.

## Test plan

New `packages/app/src/lib/viewMap.test.ts`:

- `T-VIZ-039-001` — folder tree builds correctly from views' `folderId`.
- `T-VIZ-039-002` — applying a template to a view sets its settings.
- `T-VIZ-039-003` — template edit prompts for re-apply.

UI:

- `T-VIZ-039-004` — ViewMapPanel renders tree; drag-drop reorders.

Harness:

- `T-VIZ-039-005` — `view-map-demo` — applies the "1:50" template; scale field reads 50.

## Dependencies

- T-VIZ-014 (layer combinations).
- T-DOC-037 (stories).

## Blocks

- T-DOC-008 (layout book).

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `p2`
