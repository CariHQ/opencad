/**
 * T-COL-001: Presence hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresence } from './usePresence';

describe('T-COL-001: usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns localUser with correct userId', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    expect(result.current.localUser.userId).toBe('user-1');
  });

  it('returns localUser with correct displayName', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    expect(result.current.localUser.displayName).toBe('Alice');
  });

  it('starts with empty remote users list', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    expect(result.current.users).toHaveLength(0);
  });

  it('starts with isOnline reflecting navigator.onLine', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    expect(typeof result.current.isOnline).toBe('boolean');
  });

  it('updateCursor updates localUser cursor', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    act(() => {
      result.current.updateCursor(100, 200);
    });
    expect(result.current.localUser.cursor).toEqual({ x: 100, y: 200 });
  });

  it('updateTool updates localUser activeTool', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    act(() => {
      result.current.updateTool('line');
    });
    expect(result.current.localUser.activeTool).toBe('line');
  });

  it('accepts custom color', () => {
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice', color: '#ff0000' })
    );
    expect(result.current.localUser.color).toBe('#ff0000');
  });

  it('localUser has lastSeen timestamp', () => {
    const before = Date.now();
    const { result } = renderHook(() =>
      usePresence({ userId: 'user-1', displayName: 'Alice' })
    );
    expect(result.current.localUser.lastSeen).toBeGreaterThanOrEqual(before);
  });
});
