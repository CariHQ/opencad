/**
 * T-PAY-001: useSubscription hook tests
 *
 * Tests T-PAY-001-001 through T-PAY-001-008:
 * - T-PAY-001-001: Initial tier is 'free' before fetch resolves
 * - T-PAY-001-002: After mount, calls getStatus and sets tier
 * - T-PAY-001-003: upgrade calls createCheckout with correct tier
 * - T-PAY-001-004: upgrade sets window.location.href to returned URL
 * - T-PAY-001-005: openPortal calls the portal API
 * - T-PAY-001-006: isLoading transitions correctly
 * - T-PAY-001-007: Error in getStatus leaves tier as 'free'
 * - T-PAY-001-008: Re-mount calls getStatus again
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubscription } from './useSubscription';

expect.extend(jestDomMatchers);

const mockGetStatus = vi.fn();
const mockCreateCheckout = vi.fn();
const mockOpenPortal = vi.fn();

vi.mock('../lib/serverApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/serverApi')>();
  return {
    ...real,
    subscriptionApi: {
      getStatus: () => mockGetStatus(),
      createCheckout: (tier: 'pro' | 'business') => mockCreateCheckout(tier),
      openPortal: () => mockOpenPortal(),
    },
  };
});

// The hook waits for Firebase auth to resolve before fetching status.
// Stub authStore so the tests proceed as-if the user is signed in.
vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: { status: string }) => unknown) =>
    selector({ status: 'authenticated' }),
}));

// Prevent actual window.location.assign redirects in tests
const originalLocation = window.location;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, assign: vi.fn(), href: '' },
    writable: true,
    configurable: true,
  });
});

describe('T-PAY-001: useSubscription', () => {
  it('T-PAY-001-001: initial tier is "free" before fetch resolves', () => {
    mockGetStatus.mockReturnValue(new Promise(() => { /* never resolves */ }));
    const { result } = renderHook(() => useSubscription());
    expect(result.current.tier).toBe('free');
    expect(result.current.isLoading).toBe(true);
  });

  it('T-PAY-001-002: after mount calls getStatus and sets tier', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'pro', validUntil: 9999999999 });
    const { result } = renderHook(() => useSubscription());
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
    expect(result.current.tier).toBe('pro');
    expect(result.current.validUntil).toBe(9999999999);
  });

  it('T-PAY-001-003: upgrade calls createCheckout with the correct tier', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'free', validUntil: null });
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test123' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.upgrade('pro');
    });

    expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
  });

  it('T-PAY-001-004: upgrade sets window.location.href to the returned URL', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'free', validUntil: null });
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test123' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.upgrade('pro');
    });

    expect(window.location.href).toBe('https://checkout.stripe.com/pay/test123');
  });

  it('T-PAY-001-005: openPortal calls subscriptionApi.openPortal and redirects', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'pro', validUntil: null });
    mockOpenPortal.mockResolvedValue({ url: 'https://billing.stripe.com/session/test456' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.openPortal();
    });

    expect(mockOpenPortal).toHaveBeenCalled();
    expect(window.location.href).toBe('https://billing.stripe.com/session/test456');
  });

  it('T-PAY-001-006: isLoading is true while fetching then false after', async () => {
    let resolve: (v: { tier: string; validUntil: null }) => void = () => undefined;
    mockGetStatus.mockReturnValue(
      new Promise<{ tier: string; validUntil: null }>((res) => {
        resolve = res;
      }),
    );

    const { result } = renderHook(() => useSubscription());
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ tier: 'free', validUntil: null });
    });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('T-PAY-001-007: error in getStatus leaves tier as "free"', async () => {
    mockGetStatus.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSubscription());
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe('free');
  });

  it('T-PAY-001-008: re-mounting the hook calls getStatus again', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'free', validUntil: null });

    const { result: r1, unmount } = renderHook(() => useSubscription());
    await vi.waitFor(() => expect(r1.current.isLoading).toBe(false));
    unmount();

    const { result: r2 } = renderHook(() => useSubscription());
    await vi.waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  // Backward-compat aliases
  it('startCheckout is an alias for upgrade', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'free', validUntil: null });
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test123' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.startCheckout('pro');
    });

    expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/test123');
  });
});
