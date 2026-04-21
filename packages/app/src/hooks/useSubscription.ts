/**
 * Subscription state hook.
 *
 * Fetches /api/v1/subscription/status on mount and exposes:
 *   tier          — current plan label ('free' | 'trial' | 'pro' | 'business')
 *   subscriptionStatus — Stripe's subscription.status, or null
 *   validUntil    — ms-epoch for paid/trial period end, or null
 *   cancelAtPeriodEnd — true if user cancelled but still has grace time
 *   accessMode    — 'active' | 'trial' | 'grace' | 'expired' (drives gating)
 *   isLoading
 *   refresh       — re-fetch status (call after returning from Stripe Checkout)
 *   startCheckout(tier) — redirects the window to Stripe Checkout
 *   openPortal()        — redirects the window to the Customer Portal
 */
import { useEffect, useState, useCallback } from 'react';
import {
  subscriptionApi,
  type AccessMode,
  type StripeSubscriptionStatus,
  type SubscriptionTier,
} from '../lib/serverApi';

export interface UseSubscriptionResult {
  tier: SubscriptionTier;
  subscriptionStatus: StripeSubscriptionStatus | null;
  validUntil: number | null;
  cancelAtPeriodEnd: boolean;
  accessMode: AccessMode;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upgrade: (tier: 'pro' | 'business') => Promise<void>;
  startCheckout: (tier: 'pro' | 'business') => Promise<void>;
  openPortal: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<StripeSubscriptionStatus | null>(null);
  const [validUntil, setValidUntil] = useState<number | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [accessMode, setAccessMode] = useState<AccessMode>('expired');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const s = await subscriptionApi.getStatus();
      setTier(s.tier);
      setSubscriptionStatus(s.subscriptionStatus);
      setValidUntil(s.validUntil);
      setCancelAtPeriodEnd(s.cancelAtPeriodEnd);
      setAccessMode(s.accessMode);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription status');
      // Fall back to expired so gating defaults to safe (read-only).
      setTier('free');
      setAccessMode('expired');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (checkoutTier: 'pro' | 'business'): Promise<void> => {
    const { url } = await subscriptionApi.createCheckout(checkoutTier);
    window.location.href = url;
  }, []);

  const upgrade = startCheckout;

  const openPortal = useCallback(async (): Promise<void> => {
    const { url } = await subscriptionApi.openPortal();
    window.location.href = url;
  }, []);

  return {
    tier,
    subscriptionStatus,
    validUntil,
    cancelAtPeriodEnd,
    accessMode,
    isLoading,
    error,
    refresh,
    upgrade,
    startCheckout,
    openPortal,
  };
}
