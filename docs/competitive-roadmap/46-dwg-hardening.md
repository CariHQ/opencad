# T-IO-046 — DWG / DXF adapter hardening

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:compat · **Complexity:** Medium

## Why

Every CAD office has a mountain of legacy DWG/DXF files — past projects, client deliverables, consultant drawings. We already have a `dwg.ts` adapter but it has not been tested against the variety of real-world DWG output (AutoCAD, BricsCAD, ZWCAD, vector-exported PDFs masquerading as DWG). Hardening this is pre-requisite for any architecture office to adopt us.

## Scope

### In scope
- Test corpus of ~30 DWG files from multiple sources at multiple versions (DWG 2000 through DWG 2025).
- Support entity types: LINE, POLYLINE, LWPOLYLINE, ARC, CIRCLE, ELLIPSE, SPLINE, TEXT, MTEXT, HATCH, BLOCK, INSERT, LAYER.
- Support layer-based import filtering.
- Import as "underlay" mode (background reference) vs "native" mode (convert to editable OpenCAD elements).
- Export as DWG preserving layers, line weights, colors, text styles.
- Units / scale detection (in / mm / dimensionless).

### Out of scope
- 3D DWG / 3D polymeshes (architectural DWG is almost always 2D).
- PROXY entities from vertical plugins (ignore with warning).

## Proposed approach

1. Evaluate current adapter against corpus; fix first failing 10.
2. Use `libredwg` WASM build or existing `dxf-parser` — document the choice.
3. Underlay mode: render DWG as raster/SVG overlay, not editable.
4. Native import: map LWPOLYLINE → line / polyline in doc.
5. Export: reverse mapping.

## Acceptance criteria

- [ ] All 30 corpus DWG files import without errors.
- [ ] Line weights preserved to within 0.01 mm on export/re-import.
- [ ] Layers preserved with color.
- [ ] Text rendered at correct position / rotation.
- [ ] Blocks imported as Groups (T-MOD-023).
- [ ] Underlay mode keeps the DWG non-selectable for safe tracing.
- [ ] Round-trip (import → export → compare) produces binary-equivalent output for a canonical "test sheet" DWG.

## Test plan

New `packages/app/src/lib/dwg/roundtrip.test.ts`:

- `T-IO-046-001` — each corpus file imports with no exception.
- `T-IO-046-002` — `LWPOLYLINE` with 10 vertices imports as a polyline with 10 vertices.
- `T-IO-046-003` — layer color preserved.
- `T-IO-046-004` — block INSERT imports as a Group with the block's contents as children.
- `T-IO-046-005` — export then re-import produces matching entity counts.

Harness:

- `T-IO-046-006` — `dwg-corpus-smoke` imports one DWG per version; screenshot shows non-empty canvas.

## Dependencies

- T-MOD-023 (groups).

## Blocks

- Architecture offices' adoption.

## Suggested labels

`enhancement`, `phase-2`, `area:compat`, `p1`
