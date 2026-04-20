# T-DOC-008 — Layout book + title blocks + drawing numbering

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Large

## Why

Architects deliver drawing sets — PDFs containing plans, elevations, sections, schedules, and details on standard-size sheets with a title block. No construction happens without this deliverable. A BIM tool without a sheet / layout system is a modeller, not a production tool.

## Scope

### In scope
- A new top-level document object: `layouts: Layout[]`, where each layout is a named sheet.
- Layout sizes: ISO A0 / A1 / A2 / A3 / A4 and ANSI A / B / C / D / E at true scale.
- A **title block** — a reusable header/footer overlay bound to fields from the project (project name, client, sheet title, sheet number, date, drawn-by, revision). Ships with one built-in template; users can edit it.
- A **Layout Editor** view — a sheet canvas with a title block, onto which users drag existing views (plan, sections, elevations, schedules) as rectangular "viewports."
- Each viewport on a layout shows its source view at a chosen scale (`1:50`, `1:100`, `1:200`, `1:500`, custom).
- Sheet-level drawing numbering: each viewport auto-numbers (`1`, `2`, `3` …) per sheet; these numbers feed back into section / elevation markers on plans.
- Export the entire layout book to a single multi-page PDF.

### Out of scope (this issue)
- PDF import as template / background. Use-case but complex; defer.
- User-authored title block templates via drag-and-drop — v1 edits through a JSON dialog.
- Revision clouds / markup.

## Proposed approach

1. New schema: `Layout`, `LayoutViewport`, `TitleBlock`, stored under `doc.layouts`.
2. `components/LayoutEditor.tsx` — a top-level view reachable from the view switcher (`Floor Plan / 3D View / Section / Layout`).
3. Each LayoutViewport renders its source view inside a transformed `<svg>` group at the chosen scale.
4. Title block is an SVG template with `{{tokens}}` for project fields; a `renderTitleBlock(template, fields)` pure function fills them.
5. PDF export: compose per-sheet SVGs, use `svg-to-pdfkit` or similar to flatten and page.

## Acceptance criteria

- [ ] The View switcher has a fourth option: **Layouts**.
- [ ] Clicking it opens a list of layouts; a new project has one default A3 layout named "A-001".
- [ ] Opening a layout shows an A3 sheet with the default title block populated from project fields.
- [ ] Dragging an existing view (e.g., "Floor Plan") onto the sheet creates a viewport at 1:100 by default.
- [ ] Each viewport auto-numbers starting at 1.
- [ ] The plan view's section markers reference their layout + viewport number (e.g., `Section A-A / 2 / A-002`) the moment a section view is placed on a layout.
- [ ] Changing a viewport's scale reflows its contents.
- [ ] Exporting the layout book produces a multi-page PDF with one page per layout.
- [ ] Printing the PDF at 100% produces correctly-scaled drawings (1:100 actually measures 1:100 on paper).

## Test plan

New file `packages/app/src/lib/layouts/titleBlock.test.ts`:

- `T-DOC-008-001` — `renderTitleBlock('Project: {{name}}', { name: 'Villa' })` returns `Project: Villa`.
- `T-DOC-008-002` — missing token renders as empty string, not the literal `{{name}}`.
- `T-DOC-008-003` — `autotext` tokens (`{{date}}`, `{{sheet-count}}`) resolve from context.

New file `packages/app/src/components/LayoutEditor.test.tsx`:

- `T-DOC-008-004` — empty layout renders an A3 sheet container at 420 × 297 mm at 100% scale.
- `T-DOC-008-005` — adding a viewport increments the viewport number.
- `T-DOC-008-006` — dragging a viewport moves its stored position but does not change the source view.
- `T-DOC-008-007` — scale change rerenders the viewport's projected content.

New file `packages/app/src/lib/layouts/pdfExport.test.ts`:

- `T-DOC-008-008` — exporting a one-layout book produces a single-page PDF of exactly the layout's sheet size in points.
- `T-DOC-008-009` — exporting a three-layout book produces a three-page PDF.

## Dependencies

- T-DOC-005 (sections) and T-DOC-006 (elevations) — the views that layouts reference.
- T-DOC-007 (schedules) — tables that layouts embed.

## Blocks

- Nothing critical after this; this is the shipping piece.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
