/**
 * Element reserve / release — T-COL-052 (#345).
 *
 * CRDT merge semantics handle most concurrent editing, but two users
 * editing the same wall simultaneously can still produce a nonsense
 * merge (two contradictory design intents). Reservations are
 * element-level cooperative locks that sync over the same channel as
 * doc data. Pure logic here; the sync layer hooks it into the CRDT.
 */

export interface Reservation {
  elementId: string;
  userId: string;
  userName: string;
  /** Unix ms when the reservation was taken. */
  timestamp: number;
  /** Unix ms the reservation auto-expires if still idle. */
  expires: number;
}

/** Default idle timeout: 5 minutes. */
export const RESERVATION_TTL_MS = 5 * 60 * 1000;

export function reserve(
  elementId: string, userId: string, userName: string,
  now: number = Date.now(),
): Reservation {
  return {
    elementId, userId, userName,
    timestamp: now,
    expires: now + RESERVATION_TTL_MS,
  };
}

/**
 * Is the element currently reserved by someone else (not `askingUserId`)?
 * Expired reservations return false (treated as released).
 */
export function isReserved(
  reservations: Record<string, Reservation>,
  elementId: string,
  askingUserId: string,
  now: number = Date.now(),
): boolean {
  const r = reservations[elementId];
  if (!r) return false;
  if (r.expires < now) return false;
  return r.userId !== askingUserId;
}

/** Get the holder of a reservation, or null when free/expired. */
export function reserveOwner(
  reservations: Record<string, Reservation>,
  elementId: string,
  now: number = Date.now(),
): Reservation | null {
  const r = reservations[elementId];
  if (!r || r.expires < now) return null;
  return r;
}

/**
 * Release a reservation. Returns the new reservations map. Non-owner
 * releases are rejected (no change) unless `force` is true.
 */
export function release(
  reservations: Record<string, Reservation>,
  elementId: string, userId: string,
  opts?: { force?: boolean },
): Record<string, Reservation> {
  const r = reservations[elementId];
  if (!r) return reservations;
  if (r.userId !== userId && !opts?.force) return reservations;
  const next = { ...reservations };
  delete next[elementId];
  return next;
}

/**
 * Prune reservations whose `expires` is in the past. Called on every
 * sync tick so expired locks don't linger.
 */
export function pruneExpired(
  reservations: Record<string, Reservation>,
  now: number = Date.now(),
): Record<string, Reservation> {
  const next: Record<string, Reservation> = {};
  for (const [id, r] of Object.entries(reservations)) {
    if (r.expires >= now) next[id] = r;
  }
  return next;
}

/** Refresh a reservation's expiry — the UI calls this on every edit. */
export function refresh(
  reservations: Record<string, Reservation>,
  elementId: string, userId: string,
  now: number = Date.now(),
): Record<string, Reservation> {
  const r = reservations[elementId];
  if (!r || r.userId !== userId) return reservations;
  return { ...reservations, [elementId]: { ...r, expires: now + RESERVATION_TTL_MS } };
}
