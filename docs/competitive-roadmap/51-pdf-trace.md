# T-IO-051 — PDF import as trace / background

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:compat · **Complexity:** Medium

## Why

Architects are handed existing-conditions drawings as PDF constantly: survey, as-built, legacy firm drawings, zoning maps. Importing these as a tracing underlay lets the architect build a new model on top without re-drafting from scratch.

## Scope

### In scope
- Import a PDF page as a reference overlay in plan view.
- Scale calibration: pick two points, enter their real-world distance, PDF is scaled.
- Transparency / opacity slider.
- Layer toggle: show / hide PDF underlay per-view.
- Lock by default to prevent accidental selection.
- Multi-page PDFs: page picker.
- OCR-based text extraction (future) — not in v1.

### Out of scope
- Editable extraction of PDF vectors (convert PDF lines into OpenCAD lines) — hard, defer.
- Automatic scale detection from a scale bar.

## Proposed approach

1. Use `pdfjs-dist` to render PDF pages to canvas.
2. Store rendered image as a `PDFUnderlay` element with `pageIndex`, `scale`, `rotation`, `opacity`.
3. Calibration tool: 2-click + length input.
4. Viewport renders the underlay below all other elements, non-selectable.

## Acceptance criteria

- [ ] Opening a PDF produces an underlay at page 1 by default.
- [ ] Calibration: picking 2 points then typing "5000 mm" scales the PDF accordingly.
- [ ] Opacity slider adjusts overlay alpha.
- [ ] PDF locked by default; click passes through to elements underneath.
- [ ] Multi-page PDFs offer a page dropdown.

## Test plan

New `packages/app/src/lib/pdf/underlay.test.ts`:

- `T-IO-051-001` — importing a test PDF renders page 1 to a canvas at 72 dpi.
- `T-IO-051-002` — calibration: 2 points 100 px apart, entered as 5000 mm → `scale = 50`.
- `T-IO-051-003` — multi-page navigation returns the correct page.

UI:

- `T-IO-051-004` — underlay component renders beneath elements.
- `T-IO-051-005` — click passes through locked underlay.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:compat`, `area:ui`, `p2`
