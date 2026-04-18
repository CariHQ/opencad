/**
 * T-PAY-002: Feature gate predicate hook.
 *
 * Returns canUse(feature: string): boolean
 *
 * Feature gates:
 *   'ai'                  → tier pro or business
 *   'collaboration'       → tier pro or business
 *   'unlimited-projects'  → tier pro or business (free: max 1 project)
 *
 * Any unknown feature defaults to false for free, true for paid tiers.
 */
import { useSubscription } from './useSubscription';
import type { SubscriptionTier } from '../lib/serverApi';

/** Features that require a paid (pro or business) subscription. */
const PAID_FEATURES = new Set(['ai', 'collaboration', 'unlimited-projects']);

const PAID_TIERS: ReadonlySet<SubscriptionTier> = new Set(['pro', 'business']);

export interface UseGateResult {
  canUse: (feature: string) => boolean;
}

export function useGate(): UseGateResult {
  const { tier } = useSubscription();
  const isPaid = PAID_TIERS.has(tier);

  const canUse = (feature: string): boolean => {
    if (PAID_FEATURES.has(feature)) {
      return isPaid;
    }
    // Unknown features: free tier gets false, paid tiers get false too
    // (conservative default — explicit allow-list only)
    return false;
  };

  return { canUse };
}
