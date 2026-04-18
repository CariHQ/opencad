/**
 * T-PAY-002: useGate hook tests
 *
 * Verifies: feature gates based on subscription tier
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGate } from './useGate';

// Mock useSubscription so we can control tier in each test
const mockUseSubscription = vi.fn();

vi.mock('./useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

describe('T-PAY-002: useGate', () => {
  it('free tier: canUse("ai") returns false', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('ai')).toBe(false);
  });

  it('pro tier: canUse("ai") returns true', () => {
    mockUseSubscription.mockReturnValue({ tier: 'pro', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('ai')).toBe(true);
  });

  it('free tier: canUse("collaboration") returns false', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('collaboration')).toBe(false);
  });

  it('business tier: canUse("unlimited-projects") returns true', () => {
    mockUseSubscription.mockReturnValue({ tier: 'business', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('unlimited-projects')).toBe(true);
  });

  it('business tier: canUse("ai") returns true', () => {
    mockUseSubscription.mockReturnValue({ tier: 'business', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('ai')).toBe(true);
  });

  it('free tier: canUse("unlimited-projects") returns false', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('unlimited-projects')).toBe(false);
  });

  it('pro tier: canUse("collaboration") returns true', () => {
    mockUseSubscription.mockReturnValue({ tier: 'pro', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('collaboration')).toBe(true);
  });

  it('unknown feature returns false for free tier', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate());
    expect(result.current.canUse('unknown-feature')).toBe(false);
  });
});
