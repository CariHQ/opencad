/**
 * useOfflineSync tests
 * T-OFF-005: Offline sync status and queue management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentStore } from '../stores/documentStore';
import { useOfflineSync } from './useOfflineSync';

beforeEach(() => {
  useDocumentStore.getState().loadProject('sync-test', 'user-001');
  vi.stubGlobal('navigator', { ...navigator, onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('T-OFF-005: Offline sync hook', () => {
  it('should start as online when navigator.onLine is true', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.syncStatus).toBe('online');
  });

  it('should start as offline when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.syncStatus).toBe('offline');
  });

  it('pendingCount starts at 0 when no operations queued', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.pendingCount).toBe(0);
  });

  it('lastSyncedAt starts as null', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.lastSyncedAt).toBeNull();
  });

  it('syncError starts as null', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.syncError).toBeNull();
  });

  it('forceSync does not throw when online', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(() => {
      act(() => { result.current.forceSync(); });
    }).not.toThrow();
  });

  it('forceSync does not throw when offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useOfflineSync());
    expect(() => {
      act(() => { result.current.forceSync(); });
    }).not.toThrow();
  });
});
