/**
 * T-PAY-001: Subscription state hook.
 *
 * Fetches subscription status on mount.
 * Exposes: tier, validUntil, isLoading, upgrade(tier), startCheckout(tier), openPortal()
 *
 * upgrade / startCheckout redirect to Stripe Checkout URL
 * openPortal redirects to Stripe Billing Portal
 */
import { useEffect, useState, useCallback } from 'react';
import { subscriptionApi, type SubscriptionTier } from '../lib/serverApi';

export interface UseSubscriptionResult {
  tier: SubscriptionTier;
  validUntil: number | null;
  isLoading: boolean;
  /** Alias for startCheckout — initiates Stripe Checkout and redirects. */
  upgrade: (tier: 'pro' | 'business') => Promise<void>;
  startCheckout: (tier: 'pro' | 'business') => Promise<void>;
  openPortal: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [validUntil, setValidUntil] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void subscriptionApi
      .getStatus()
      .then((status) => {
        if (!active) return;
        setTier(status.tier);
        setValidUntil(status.validUntil);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        // On error keep free tier defaults
        setTier('free');
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const startCheckout = useCallback(async (checkoutTier: 'pro' | 'business'): Promise<void> => {
    const { url } = await subscriptionApi.createCheckout(checkoutTier);
    window.location.href = url;
  }, []);

  const upgrade = startCheckout;

  const openPortal = useCallback(async (): Promise<void> => {
    const { url } = await subscriptionApi.openPortal();
    window.location.href = url;
  }, []);

  return { tier, validUntil, isLoading, upgrade, startCheckout, openPortal };
}
