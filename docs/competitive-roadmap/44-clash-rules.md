# T-ANA-044 — Clash detection expansion (rule-based, named rules)

**Priority:** P2 · **Phase:** phase-2 · **Area:** area:bim · **Complexity:** Medium

## Why

The current clash detector is a simple structural-vs-MEP pass with a hard-coded tolerance. Real BIM coordinators need named clash rules per discipline pair (structure-vs-MEP, architecture-vs-HVAC, plumbing-vs-electrical), saved clash sets with filters, assign-to-user workflow, and a dashboard that tracks resolution status.

## Scope

### In scope
- **Clash Rule**: `{ name, setA: ElementFilter, setB: ElementFilter, tolerance, severity }`.
- Multiple rules run in parallel; results grouped by rule.
- **Clash set**: snapshot of clashes at a moment; saved with status per clash (`new | active | approved | resolved`).
- Assign clashes to team members via BCF integration.
- Filter: show only unresolved, only critical, only by rule.
- Dashboard: clash count over time, trendline, heatmap by location.
- Navigation: click a clash → fly 3D camera to the region, highlight both elements.

### Out of scope
- Scheduled / automated runs on CRDT sync.
- Dashboards that aggregate across multiple projects.

## Proposed approach

1. Extend `lib/clashDetection.ts` to accept `ClashRule[]`.
2. `doc.clashSets: ClashSet[]` with status per clash.
3. `ClashDetectionPanel` redesigned with rule list + saved sets + dashboard.
4. BCF bridge: clash → BCF topic with images and camera viewpoint.

## Acceptance criteria

- [ ] Default rules include structural-vs-MEP, architecture-vs-HVAC, plumbing-vs-electrical.
- [ ] Running a ruleset populates the panel with grouped results.
- [ ] Saving a clash set persists statuses.
- [ ] Clicking a clash in the panel flies the 3D camera and highlights both elements.
- [ ] Assigning a clash creates a BCF topic with a viewpoint.
- [ ] Dashboard shows per-rule counts and trend across saved sets.

## Test plan

New `packages/app/src/lib/clashRules.test.ts`:

- `T-ANA-044-001` — running a rule with setA filter `wall` and setB filter `pipe` against a wall+pipe intersection returns 1 clash.
- `T-ANA-044-002` — rule tolerance 50 mm treats 30 mm clearances as pass; 20 mm as clash.
- `T-ANA-044-003` — no elements matching either filter produces zero clashes.

UI:

- `T-ANA-044-004` — ClashPanel shows rule list + grouped results.
- `T-ANA-044-005` — clicking a clash emits selection + camera fly.

## Dependencies

- None hard.

## Blocks

- None.

## Suggested labels

`enhancement`, `phase-2`, `area:bim`, `p2`
