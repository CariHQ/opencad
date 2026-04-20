/**
 * T-COL-052 reservation tests (GitHub issue #345).
 *
 *   T-COL-052-001 — reserve updates the map
 *   T-COL-052-002 — isReserved(otherUser) returns true while held
 *   T-COL-052-003 — release by owner clears
 *   T-COL-052-004 — release by non-owner rejected unless forced
 *   T-COL-052-005 — expired reservations auto-clear via pruneExpired
 */
import { describe, it, expect } from 'vitest';
import {
  reserve, isReserved, reserveOwner, release, pruneExpired, refresh, RESERVATION_TTL_MS,
} from './reservations';

describe('T-COL-052: reservations', () => {
  it('T-COL-052-001: reserve records a Reservation', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    expect(r.elementId).toBe('el-1');
    expect(r.userId).toBe('u1');
    expect(r.expires).toBe(1000 + RESERVATION_TTL_MS);
  });

  it('T-COL-052-002: isReserved returns true for another user', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    const map = { [r.elementId]: r };
    expect(isReserved(map, 'el-1', 'u2', 1100)).toBe(true);
    expect(isReserved(map, 'el-1', 'u1', 1100)).toBe(false);
  });

  it('T-COL-052-003: release by owner clears', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    const out = release({ 'el-1': r }, 'el-1', 'u1');
    expect(out['el-1']).toBeUndefined();
  });

  it('T-COL-052-004: release by non-owner is rejected unless forced', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    const out = release({ 'el-1': r }, 'el-1', 'u2');
    expect(out['el-1']).toBeDefined();
    const forced = release({ 'el-1': r }, 'el-1', 'u2', { force: true });
    expect(forced['el-1']).toBeUndefined();
  });

  it('T-COL-052-005: pruneExpired removes expired reservations', () => {
    const r = reserve('el-1', 'u1', 'Alice', 0);
    const future = RESERVATION_TTL_MS + 1000; // past the expiry
    const out = pruneExpired({ 'el-1': r }, future);
    expect(out['el-1']).toBeUndefined();
  });

  it('reserveOwner returns holder while active', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    expect(reserveOwner({ 'el-1': r }, 'el-1', 1100)?.userId).toBe('u1');
  });

  it('reserveOwner returns null once expired', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    expect(reserveOwner({ 'el-1': r }, 'el-1', 1000 + RESERVATION_TTL_MS + 1)).toBeNull();
  });

  it('refresh by owner pushes expiry forward', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    const out = refresh({ 'el-1': r }, 'el-1', 'u1', 5000);
    expect(out['el-1']!.expires).toBe(5000 + RESERVATION_TTL_MS);
  });

  it('refresh by non-owner is a no-op', () => {
    const r = reserve('el-1', 'u1', 'Alice', 1000);
    const out = refresh({ 'el-1': r }, 'el-1', 'u2', 5000);
    expect(out['el-1']!.expires).toBe(r.expires);
  });
});
