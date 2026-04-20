# T-COL-052 — Element reserve / release for CRDT collaboration

**Priority:** P2 · **Phase:** phase-3 · **Area:** area:sync · **Complexity:** Medium

## Why

Two designers editing the same wall simultaneously is a hazard even with CRDT merge semantics — the merge may succeed technically but produce nonsense (two contradictory design intents merged into a frankenwall). Professional collaboration requires **element-level reservation**: the user announces "I'm editing this wall," others can see it's being edited, merges are blocked until release.

CRDT + reserve / release is the hybrid that scales: fine-grained locking only where it matters, free-for-all merge everywhere else.

## Scope

### In scope
- **Reserve**: when a user starts editing an element, a lightweight lock is broadcast. Other users see a badge on the element ("🔒 Alice is editing").
- **Release**: explicit user action, or automatic after a timeout, or on selection change.
- **Force release**: privileged user (admin / project owner) can revoke any lock.
- **Read-only for others**: editors attempting a write on a reserved element get a toast "Element is reserved by Alice".
- **BCF integration**: if a user reserves for more than 10 minutes, offer to convert the intent into a BCF issue.
- **Sync**: reservations travel over the same CRDT channel as document data, but with a separate namespace.

### Out of scope
- Per-layer reservations.
- Per-property reservations (lock just the material, not geometry).
- Offline reservations (requires global server authority).

## Proposed approach

1. Schema: `doc.reservations: Record<elementId, { userId, userName, timestamp, expires }>`.
2. `lib/sync/reservations.ts`: `reserve`, `release`, `isReserved`, `reserveOwner`.
3. Lock indicator rendered as a small badge in both 2D and 3D viewports.
4. Commit path checks reservation; rejects with a toast if another user owns it.
5. Auto-release on `selectedIds` change or 5-min idle.

## Acceptance criteria

- [ ] User A selects a wall → reservation broadcast.
- [ ] User B sees a lock badge on that wall within 500 ms.
- [ ] User B's attempt to edit the wall shows a rejection toast.
- [ ] User A deselects → reservation released → badge disappears on B's side.
- [ ] Admin can force-release any reservation.
- [ ] Reservation expires after 5 minutes of idle.
- [ ] Offline user's reservation is invalidated on reconnect (last-write-wins on timestamp).

## Test plan

New `packages/app/src/lib/sync/reservations.test.ts`:

- `T-COL-052-001` — `reserve(elId, userId)` updates the reservations map.
- `T-COL-052-002` — `isReserved(elId, anotherUser)` returns true when held.
- `T-COL-052-003` — `release(elId, userId)` clears the reservation if caller matches owner.
- `T-COL-052-004` — `release` by non-owner is rejected unless forced.
- `T-COL-052-005` — expired reservations are automatically cleared on read.

UI:

- `T-COL-052-006` — reserved element renders lock badge.
- `T-COL-052-007` — write attempt on reserved element shows rejection toast.

Integration:

- `T-COL-052-008` — two simulated users: B sees A's reservation within 500 ms.

## Dependencies

- Existing CRDT sync.

## Blocks

- Multi-user production projects.

## Suggested labels

`enhancement`, `phase-3`, `area:sync`, `p2`
