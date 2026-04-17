/**
 * useLocalStorage hook tests
 * T-OFF-002: Local storage persists data across renders
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('T-OFF-002: useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the initial value when nothing in storage', () => {
    const { result } = renderHook(() => useLocalStorage('key1', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('returns stored value when key exists in localStorage', () => {
    localStorage.setItem('key2', JSON.stringify('stored-value'));
    const { result } = renderHook(() => useLocalStorage('key2', 'initial'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates stored value when setter is called', () => {
    const { result } = renderHook(() => useLocalStorage('key3', 42));
    act(() => {
      result.current[1](99);
    });
    expect(result.current[0]).toBe(99);
  });

  it('persists updated value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key4', 'hello'));
    act(() => {
      result.current[1]('world');
    });
    expect(localStorage.getItem('key4')).toBe('"world"');
  });

  it('accepts functional updater', () => {
    const { result } = renderHook(() => useLocalStorage('key5', 10));
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(15);
  });

  it('works with object values', () => {
    const initial = { x: 1, y: 2 };
    const { result } = renderHook(() => useLocalStorage('key6', initial));
    act(() => {
      result.current[1]({ x: 3, y: 4 });
    });
    expect(result.current[0]).toEqual({ x: 3, y: 4 });
  });

  it('works with array values', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('key7', []));
    act(() => {
      result.current[1](['a', 'b', 'c']);
    });
    expect(result.current[0]).toEqual(['a', 'b', 'c']);
  });

  it('works with boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('key8', false));
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
  });

  it('recovers gracefully from corrupted localStorage', () => {
    localStorage.setItem('key9', 'NOT_VALID_JSON{{{');
    const { result } = renderHook(() => useLocalStorage('key9', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('two instances with same key share localStorage but not state', () => {
    const { result: r1 } = renderHook(() => useLocalStorage('shared-key', 0));
    const { result: r2 } = renderHook(() => useLocalStorage('shared-key', 0));

    act(() => {
      r1.current[1](42);
    });
    // r2 still has its own state (0), but localStorage has 42
    expect(r1.current[0]).toBe(42);
    expect(localStorage.getItem('shared-key')).toBe('42');
    // r2 should still return 0 (its own state; it doesn't auto-sync)
    expect(r2.current[0]).toBe(0);
  });
});
