/**
 * T-PAY-002: useGate hook tests
 *
 * Tests T-PAY-002-001 through T-PAY-002-006 (new typed Feature API):
 * - T-PAY-002-001: free tier: unlimited_projects allowed
 * - T-PAY-002-002: free tier: ai not allowed
 * - T-PAY-002-003: free tier: collaboration not allowed
 * - T-PAY-002-004: pro tier: all features allowed
 * - T-PAY-002-005: reason string is human-readable
 * - T-PAY-002-006: business tier: all features allowed
 *
 * Plus legacy canUse string API tests (backward compatibility).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGate, type Feature } from './useGate';

// Mock useSubscription so we can control tier in each test
const mockUseSubscription = vi.fn();

vi.mock('./useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

describe('T-PAY-002: useGate', () => {
  // ── New typed Feature API ────────────────────────────────────────────────────

  it('T-PAY-002-001: free tier: unlimited_projects allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate('unlimited_projects' as Feature));
    expect(result.current.allowed).toBe(true);
  });

  it('T-PAY-002-002: free tier: ai not allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate('ai' as Feature));
    expect(result.current.allowed).toBe(false);
  });

  it('T-PAY-002-003: free tier: collaboration not allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate('collaboration' as Feature));
    expect(result.current.allowed).toBe(false);
  });

  it('T-PAY-002-004: pro tier: all features allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'pro', validUntil: null, isLoading: false });
    const features: Feature[] = ['ai', 'collaboration', 'unlimited_projects', 'advanced_export'];
    for (const f of features) {
      const { result } = renderHook(() => useGate(f));
      expect(result.current.allowed).toBe(true);
    }
  });

  it('T-PAY-002-005: reason string is human-readable when not allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'free', validUntil: null, isLoading: false });
    const { result } = renderHook(() => useGate('ai' as Feature));
    expect(result.current.allowed).toBe(false);
    expect(typeof result.current.reason).toBe('string');
    expect(result.current.reason!.length).toBeGreaterThan(0);
    expect(result.current.reason).toMatch(/upgrade/i);
  });

  it('T-PAY-002-006: business tier: all features allowed', () => {
    mockUseSubscription.mockReturnValue({ tier: 'business', validUntil: null, isLoading: false });
    const features: Feature[] = ['ai', 'collaboration', 'unlimited_projects', 'advanced_export'];
    for (const f of features) {
      const { result } = renderHook(() => useGate(f));
      expect(result.current.allowed).toBe(true);
    }
  });

  // ── Legacy canUse string API ─────────────────────────────────────────────────

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
