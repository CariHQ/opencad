# T-DOC-034 — Labels with autotext tokens

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Small

## Why

A label attached to a door that reads "Door" is useless. A label that reads "D-103 / 900×2100 / Oak / 45 min fire" is a permit-set-grade callout. Autotext tokens (like `{{Tag}}`, `{{Width}}`, `{{Material}}`) bind label contents to element properties so they update automatically when the element changes. This is labelling done right.

## Scope

### In scope
- **Label** element type: text attached to another element via leader, or free-floating.
- Label content supports autotext tokens that resolve from the host element's properties.
- Token library: per element-type, the available tokens (`{{Tag}}`, `{{Width}}`, `{{Height}}`, `{{Material}}`, `{{Level}}`, etc.).
- UI: label editor with a token picker.
- Leader lines auto-reroute when either endpoint moves.
- Formatting: prefix/suffix text, number format (mm / m / ft-in), case (upper / lower / original).

### Out of scope
- Multi-line rich text (v1 is single-line with tokens).
- Labels with embedded schedules.

## Proposed approach

1. `Label` schema: `hostElementId?`, `position`, `leaderAnchor?`, `template` (string with `{{tokens}}`), `formatOptions`.
2. `lib/labelRenderer.ts`: `renderLabelText(template, hostEl)` resolves tokens.
3. UI: label tool click on element creates a label; Properties panel has a template field + token-picker dropdown.
4. Leader lines recompute when host moves.

## Acceptance criteria

- [ ] Inserting a label on a door with template `{{Tag}} {{Width}}×{{Height}}` renders `D-103 900×2100`.
- [ ] Resizing the door updates the label to match.
- [ ] Moving the door drags the leader anchor along.
- [ ] Token picker in the editor shows only tokens valid for the host element type.
- [ ] Labels export to SVG.

## Test plan

New `packages/app/src/lib/labelRenderer.test.ts`:

- `T-DOC-034-001` — `renderLabelText('{{Width}}', door with Width:900)` = "900".
- `T-DOC-034-002` — missing token renders empty string, not literal `{{...}}`.
- `T-DOC-034-003` — format option `mmToMeters` changes `900` → `0.9 m`.
- `T-DOC-034-004` — case `upper` uppercases the literal + token output.

UI:

- `T-DOC-034-005` — token picker lists only keys present on the host element type.
- `T-DOC-034-006` — editing label template commits and re-renders within 1 frame.

Harness:

- `T-DOC-034-007` — `label-demo` places 5 labels with autotext; screenshot verifies rendered text.

## Dependencies

- T-DOC-007 (schedules) — labels and schedules share the Tag concept.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
