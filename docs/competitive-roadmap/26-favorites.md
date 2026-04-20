# T-MOD-026 — Favorites (saved parameter presets)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:ui · **Complexity:** Small

## Why

Every office has its "standard" elements: the exterior wall type they always use, the door they always spec, the window size that matches their preferred supplier. Favorites are saved parameter presets the user recalls by name — persisted per project and per user — dramatically cutting the clicks needed to place consistent elements.

## Scope

### In scope
- A Favorites palette (or sub-panel) for each tool-type.
- "Save as Favorite" action from Properties panel: captures current element's parameters into a named preset.
- Apply favorite: activates the tool with those parameters loaded.
- Per-project favorites (stored on document) + per-user favorites (stored in localStorage / account).
- Rename / delete favorites.
- Seed with a small shipped set of favorites per tool.

### Out of scope
- Organization / team-shared favorites across users.
- Importing favorites from file.

## Proposed approach

1. Schema: `doc.favorites: Favorite[]`; user-level favorites in localStorage `opencad-favorites-user`.
2. New panel section `FavoritesPanel` showing tool-grouped list.
3. "Save as Favorite" from Properties panel opens a name input.

## Acceptance criteria

- [ ] Saving the current wall (300 mm exterior Concrete) as "Exterior Concrete 300" creates a favorite.
- [ ] Clicking the favorite activates the wall tool with those params.
- [ ] User-level favorites persist across projects (localStorage).
- [ ] Project-level favorites persist with the document (CRDT sync).
- [ ] Renaming / deleting favorites works with undo.

## Test plan

New `packages/app/src/lib/favorites.test.ts`:

- `T-MOD-026-001` — `saveFavorite({ tool: 'wall', name: 'X', params: {…} })` adds to the store.
- `T-MOD-026-002` — `applyFavorite(id)` returns `{ tool, params }`.
- `T-MOD-026-003` — deleting a favorite removes it.

UI:

- `T-MOD-026-004` — `FavoritesPanel` lists favorites grouped by tool.
- `T-MOD-026-005` — clicking a favorite sets the active tool + toolParams.

Harness:

- `T-MOD-026-006` — `favorites-demo` saves one, places walls using it; all walls have identical params.

## Dependencies

- None.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:ui`, `p2`
