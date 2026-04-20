# T-DOC-037 — Stories with per-view story filters

**Priority:** P1 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Small

## Why

Multi-story buildings need stories with controlled visibility — a ground-floor plan must hide everything above, the roof plan hides everything below, the 3D view might want to show only stories 1–3. Today Levels exist but every view renders every element. Without story filters, multi-story plans become unusable soup.

## Scope

### In scope
- **Story** = extended `Level`: adds `storyHeight`, `storyNumber`.
- Each view (plan / section / elevation / 3D) gets a `visibleStories: 'all' | 'current' | 'current-and-below' | 'current-and-above' | {range}` setting.
- Plans default to `current` (only show elements on the plan's level).
- Sections default to `all`.
- 3D defaults to `all` but offers a UI dropdown to filter.
- Element "belongs to" a story if its `ElevationOffset` falls within the story's range, OR if it explicitly carries a `LevelId` pointing to that story.

### Out of scope
- Automatic "ghost" rendering of other stories (faded overlay).
- Story-scaled dimensions / labels.

## Proposed approach

1. Expand `Level` → `Story` with `storyNumber` and `storyHeight`.
2. `lib/storyFilter.ts`: `elementsForStoryFilter(doc, filter, currentStoryId)` returns the element subset.
3. Every view consults the filter before rendering.
4. UI: story dropdown in each view's toolbar.

## Acceptance criteria

- [ ] A plan for Story 1 shows only elements on Story 1.
- [ ] Switching the plan to Story 2 shows only Story 2 elements.
- [ ] 3D view `current-and-below` shows stories 1 through current.
- [ ] Elements whose `ElevationOffset` falls between Story 1's top and Story 2's bottom are classified correctly.
- [ ] No performance regression on the existing `sky-garden-tower` template — filter application takes ≤ 5 ms.

## Test plan

New `packages/app/src/lib/storyFilter.test.ts`:

- `T-DOC-037-001` — filter `current` on story 1 returns only elements with `ElevationOffset` ∈ [0, storyHeight).
- `T-DOC-037-002` — filter `current-and-below` on story 3 returns stories 1, 2, 3.
- `T-DOC-037-003` — filter `all` returns every element.
- `T-DOC-037-004` — element spanning two stories (slab at the boundary) appears in both.

UI:

- `T-DOC-037-005` — view toolbar dropdown changes filter; view rerenders.

Harness:

- `T-DOC-037-006` — `sky-garden-tower` with story filter `current` on story 3 shows only floor 3's elements.

## Dependencies

- Existing Levels (upgrade to Stories).

## Blocks

- T-DOC-008 (layout book — plan viewports need story context).

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `area:ui`, `p1`
