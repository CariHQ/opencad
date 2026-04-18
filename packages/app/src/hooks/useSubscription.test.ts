/**
 * T-PAY-001: useSubscription hook tests
 *
 * Verifies: tier/validUntil state, startCheckout redirect, openPortal redirect
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
  it('returns tier "free" by default while loading', () => {
    mockGetStatus.mockReturnValue(new Promise(() => { /* never resolves */ }));
    const { result } = renderHook(() => useSubscription());
    expect(result.current.tier).toBe('free');
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches and exposes status on mount', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'pro', validUntil: 9999999999 });
    const { result } = renderHook(() => useSubscription());
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe('pro');
    expect(result.current.validUntil).toBe(9999999999);
  });

  it('startCheckout calls subscriptionApi.createCheckout and redirects', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'free', validUntil: null });
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test123' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.startCheckout('pro');
    });

    expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/test123');
  });

  it('openPortal calls subscriptionApi.openPortal and redirects', async () => {
    mockGetStatus.mockResolvedValue({ tier: 'pro', validUntil: null });
    mockOpenPortal.mockResolvedValue({ url: 'https://billing.stripe.com/session/test456' });

    const { result } = renderHook(() => useSubscription());
    await act(async () => {
      await result.current.openPortal();
    });

    expect(mockOpenPortal).toHaveBeenCalled();
    expect(window.location.href).toBe('https://billing.stripe.com/session/test456');
  });
});
