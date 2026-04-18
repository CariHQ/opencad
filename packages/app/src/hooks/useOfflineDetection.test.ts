/**
 * T-OFF-001: PWA installable + works offline — useOfflineDetection hook tests
 *
 * Verifies:
 * - Returns { isOnline: boolean, wasOffline: boolean }
 * - isOnline starts as navigator.onLine
 * - Switches to false when 'offline' event fires on window
 * - Switches back to true when 'online' event fires
 * - wasOffline becomes true once offline has been visited and stays true for the session
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineDetection } from './useOfflineDetection';

expect.extend(jestDomMatchers);

beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('T-OFF-001: useOfflineDetection', () => {
  it('returns isOnline and wasOffline fields', () => {
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current).toHaveProperty('isOnline');
    expect(result.current).toHaveProperty('wasOffline');
  });

  it('isOnline starts as true when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.isOnline).toBe(true);
  });

  it('isOnline starts as false when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.isOnline).toBe(false);
  });

  it('isOnline switches to false when offline event fires on window', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('isOnline switches back to true when online event fires after being offline', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('wasOffline starts as false when starting online', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.wasOffline).toBe(false);
  });

  it('wasOffline starts as true when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.wasOffline).toBe(true);
  });

  it('wasOffline becomes true once offline event fires', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current.wasOffline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.wasOffline).toBe(true);
  });

  it('wasOffline stays true after coming back online', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { result } = renderHook(() => useOfflineDetection());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // isOnline is true again but wasOffline remains true for the session
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOfflineDetection());
    unmount();

    const addCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'online' || event === 'offline'
    );
    const removeCalls = removeSpy.mock.calls.filter(
      ([event]) => event === 'online' || event === 'offline'
    );

    expect(addCalls.length).toBe(2);
    expect(removeCalls.length).toBe(2);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
