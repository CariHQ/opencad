# T-MOD-023 — Group / ungroup / suspend groups

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

Users routinely want to treat a collection of elements as a single unit — a window wall assembly (frame + panels + mullions), a stair + railing combo, a kitchen island (counters + cabinets + sink). Without groups, every selection is manual, every move is one-by-one, and organizing complex models becomes painful.

## Scope

### In scope
- A **Group** schema: an element with `children: elementId[]` and a displayed name.
- Group creation from selection (`Ctrl+G`).
- Ungroup (`Ctrl+Shift+G`).
- Suspend groups toggle (`Alt+G`): temporarily unblocks individual-element selection inside groups without destroying the group.
- Selecting any member selects the whole group (unless suspended).
- Move / rotate / mirror / copy apply to all members as a unit.
- Nested groups supported.
- Group shows as a row in the Layers / Navigator tree with expand/collapse.

### Out of scope
- Instance-based groups (edits to one replicate to all copies). Defer — it's a big scope expansion.

## Proposed approach

1. Extend document: `doc.groups: Group[]`, and each element gets optional `groupId`.
2. Selection hook: if `suspendGroups === false` and clicked element has `groupId`, select all siblings with the same `groupId`.
3. Group creation from selection wraps current selection in a new `Group` entry.
4. Group suspension is a UI-only ref; no schema change.

## Acceptance criteria

- [ ] Selecting 3 walls + pressing `Ctrl+G` creates a group entry; subsequent click on any of the 3 selects all 3.
- [ ] `Ctrl+Shift+G` on a grouped element disbands the group; members revert to individual elements.
- [ ] `Alt+G` toggles a visible "group suspended" banner; clicks select individual members.
- [ ] Moving the group moves all members by the same delta.
- [ ] Nested groups: selecting an inner group member selects the inner group; outer group click selects both inner + outer.
- [ ] Navigator shows groups as collapsible tree nodes.
- [ ] Undo/redo correctly reverses group operations.

## Test plan

New `packages/app/src/lib/groups.test.ts`:

- `T-MOD-023-001` — `createGroup([id1, id2, id3])` returns a group with those children and sets `groupId` on each.
- `T-MOD-023-002` — `ungroup(groupId)` removes the group and clears children's `groupId`.
- `T-MOD-023-003` — nested group: inner group's children carry its id; outer group contains the inner group id.

Selection:

- `T-MOD-023-004` — clicking a grouped member with groups active selects all members.
- `T-MOD-023-005` — clicking with suspension active selects only the clicked member.

Harness:

- `T-MOD-023-006` — template `group-demo` selects, groups, moves the group; all members end at the same new position.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `area:bim`, `p2`
