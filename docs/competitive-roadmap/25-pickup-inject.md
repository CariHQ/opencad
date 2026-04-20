# T-MOD-025 — Pick up / inject parameters (eyedropper)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

When a user already has one element configured correctly (exterior wall, 300 mm, Concrete, composite X), they want to match other elements to it in one click rather than re-entering each field. The "pick up" / "inject" pair is how every professional tool does this: `Alt+click` captures an element's parameters into the current tool; subsequent clicks inject those params.

## Scope

### In scope
- `Alt+click` on any element → current tool's params are populated with that element's relevant params (thickness, material, composite, wallType, etc., per tool).
- `Alt+Shift+click` on a target element → inject the currently-held params into that element.
- Status bar shows "Holding: Wall 300 mm Concrete exterior" when params are held.
- Works for wall, slab, roof, column, beam, door, window.
- Clears on `Esc`.

### Out of scope
- Multi-select inject in one click (use it with marquee + drop).
- Cross-type injection (inject wall params into a slab) — nonsensical.

## Proposed approach

1. Held-params ref in document store: `heldParams: { tool: string, params: Record<string, unknown> } | null`.
2. Canvas click handlers: on `Alt+click`, read the element's props, populate `heldParams`.
3. On `Alt+Shift+click`, merge `heldParams` into the target element, respecting the element's allowed keys.
4. HUD banner reads the held-params description.

## Acceptance criteria

- [ ] `Alt+click` on a 300 mm exterior wall with Concrete populates the wall tool's params.
- [ ] Drawing a new wall uses those params.
- [ ] `Alt+Shift+click` on a 150 mm interior wall updates it to 300 mm Concrete exterior.
- [ ] `Esc` clears held params; status banner disappears.
- [ ] Does not cross types: Alt+click on a slab does not populate wall params.

## Test plan

New `packages/app/src/lib/pickupInject.test.ts`:

- `T-MOD-025-001` — `pickup(el)` for a wall returns the subset of keys relevant to wall.
- `T-MOD-025-002` — `inject(el, heldParams)` applies only keys that exist on that element type.
- `T-MOD-025-003` — cross-type inject (slab params onto wall) is a no-op.

UI:

- `T-MOD-025-004` — `Alt+click` triggers pickup; status bar updates.
- `T-MOD-025-005` — `Alt+Shift+click` triggers inject.

Harness:

- `T-MOD-025-006` — `pickup-inject-demo`: pickup wall1, inject into wall2; wall2's thickness matches wall1 after.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `p2`
