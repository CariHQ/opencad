/**
 * T-PAY-002: Feature gate predicate hook.
 *
 * Returns { allowed: boolean; reason?: string } for a given Feature.
 * Also exposes legacy canUse(feature: string): boolean for backward compatibility.
 *
 * Feature tiers:
 *   FREE (always):     'unlimited_projects'
 *   PRO / BUSINESS:    'ai', 'collaboration', 'unlimited_projects', 'advanced_export'
 *
 * Legacy string API (hyphen form):
 *   'unlimited-projects' → paid only (old behavior preserved)
 *   'ai', 'collaboration' → paid only
 */
import { useSubscription } from './useSubscription';
import type { SubscriptionTier } from '../lib/serverApi';

export type Feature = 'ai' | 'collaboration' | 'unlimited_projects' | 'advanced_export';

/** Features always available on the free tier (underscore-form Feature type). */
const FREE_FEATURES: readonly Feature[] = ['unlimited_projects'] as const;

/** Features available on pro and business tiers (superset of FREE_FEATURES). */
const PRO_FEATURES: readonly Feature[] = [
  'ai',
  'collaboration',
  'unlimited_projects',
  'advanced_export',
] as const;

const PAID_TIERS: ReadonlySet<SubscriptionTier> = new Set(['pro', 'business']);

const FEATURE_REASONS: Record<Feature, string> = {
  ai: 'Upgrade to Pro to use AI features',
  collaboration: 'Upgrade to Pro to use real-time collaboration',
  unlimited_projects: 'Upgrade to Pro to create unlimited projects',
  advanced_export: 'Upgrade to Pro to use advanced export options',
};

export interface GateResult {
  allowed: boolean;
  reason?: string;
}

export interface UseGateResult {
  /** Legacy string-based gate check. */
  canUse: (feature: string) => boolean;
  /** Typed gate check returning { allowed, reason? }. */
  gate: (feature: Feature) => GateResult;
}

export function useGate(feature?: Feature): GateResult & UseGateResult {
  const { tier } = useSubscription();
  const isPaid = PAID_TIERS.has(tier);

  const gate = (f: Feature): GateResult => {
    // FREE_FEATURES are always allowed regardless of tier
    if ((FREE_FEATURES as readonly string[]).includes(f)) {
      return { allowed: true };
    }
    // PRO_FEATURES require a paid tier
    if ((PRO_FEATURES as readonly string[]).includes(f)) {
      if (isPaid) return { allowed: true };
      return { allowed: false, reason: FEATURE_REASONS[f] };
    }
    // Unknown features: conservative default — deny
    return { allowed: false, reason: `Upgrade to Pro to use ${f}` };
  };

  const canUse = (f: string): boolean => {
    // Legacy string-based checks (preserves old hyphen-form behavior)
    const paidOnlyLegacy = new Set<string>([
      'ai',
      'collaboration',
      'unlimited-projects', // legacy hyphen form — paid only (old behavior)
      'advanced_export',
    ]);
    if (paidOnlyLegacy.has(f)) return isPaid;
    // Unknown features
    return false;
  };

  // When called as useGate(feature), return the gate result for that feature
  const featureResult: GateResult = feature !== undefined ? gate(feature) : { allowed: true };

  return {
    ...featureResult,
    canUse,
    gate,
  };
}
