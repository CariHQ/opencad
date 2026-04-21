/**
 * useEntitlements — single source of truth for what the current user is
 * allowed to do, given their plan + Stripe subscription state + trial
 * expiry.
 *
 * Rules, in order:
 *   1. `accessMode === 'expired'` → read-only. The user can view and
 *      export but cannot edit. This is the graceful downgrade when a
 *      subscription lapses: no data is lost, export always works.
 *   2. `accessMode === 'grace'` (past_due or cancel_at_period_end with
 *      time remaining) → full edit access. Stripe's dunning window is
 *      honored; we only cut off access when the period actually ends.
 *   3. `accessMode === 'active' | 'trial'` → entitlements derived from
 *      the current tier.
 *
 * Feature matrix:
 *   free / trial / pro / business have different caps. Read-only is a
 *   separate lever that wins over tier — a Pro subscriber with an
 *   expired card still can't edit.
 *
 * This hook is the ONLY place per-feature gating should live. Every
 * UI / store should read from here, not re-derive from tier.
 */
import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import type { AccessMode, SubscriptionTier } from '../lib/serverApi';

export interface Entitlements {
  /** Current tier label (for display). */
  tier: SubscriptionTier;
  /** Read-only mode: editing is disabled, exports still work. Set when
   *  access has lapsed. */
  readOnly: boolean;
  /** Reason we put the user in read-only, for a banner. */
  readOnlyReason: string | null;
  /** Maximum projects this user can create. Infinity on paid tiers. */
  projectCap: number;
  /** Real-time collaboration over CRDTs. */
  collabEnabled: boolean;
  /** AI assistant (prompt → model, code compliance checks). */
  aiEnabled: boolean;
  /** Version history beyond the last 5 entries. */
  versionHistoryEnabled: boolean;
  /** SSO / SAML (Business tier). */
  ssoEnabled: boolean;
  /** Plugin marketplace install access. Free-tier users can browse but
   *  not install. */
  marketplaceInstallEnabled: boolean;
  /** Publish to plugin marketplace (Pro+). */
  publisherEnabled: boolean;
  /** True while status is still loading from the server — callers may
   *  want to treat this as "pessimistically allowed" (not gate yet) or
   *  "pessimistically denied" depending on context. */
  isLoading: boolean;
  /** accessMode pass-through, for components that want the raw value. */
  accessMode: AccessMode;
}

/** Per-tier entitlement baselines. Overlaid with the read-only lever. */
const TIER_DEFAULTS: Record<SubscriptionTier, Omit<Entitlements, 'tier' | 'readOnly' | 'readOnlyReason' | 'isLoading' | 'accessMode'>> = {
  free: {
    projectCap: 1,
    collabEnabled: false,
    aiEnabled: false,
    versionHistoryEnabled: false,
    ssoEnabled: false,
    marketplaceInstallEnabled: false,
    publisherEnabled: false,
  },
  trial: {
    // Trial = full feature access so the user can evaluate. Drops to
    // free-level when the trial expires (handled by accessMode=expired).
    projectCap: Number.POSITIVE_INFINITY,
    collabEnabled: true,
    aiEnabled: true,
    versionHistoryEnabled: true,
    ssoEnabled: false,
    marketplaceInstallEnabled: true,
    publisherEnabled: true,
  },
  pro: {
    projectCap: Number.POSITIVE_INFINITY,
    collabEnabled: true,
    aiEnabled: true,
    versionHistoryEnabled: true,
    ssoEnabled: false,
    marketplaceInstallEnabled: true,
    publisherEnabled: true,
  },
  business: {
    projectCap: Number.POSITIVE_INFINITY,
    collabEnabled: true,
    aiEnabled: true,
    versionHistoryEnabled: true,
    ssoEnabled: true,
    marketplaceInstallEnabled: true,
    publisherEnabled: true,
  },
};

function readOnlyReasonFor(accessMode: AccessMode, tier: SubscriptionTier): string | null {
  if (accessMode !== 'expired') return null;
  if (tier === 'trial') return 'Your free trial has ended. Subscribe to keep editing.';
  return 'Your subscription has ended. Renew to keep editing — your projects are safe and exports still work.';
}

export function useEntitlements(): Entitlements {
  const { tier, accessMode, isLoading } = useSubscription();

  return useMemo<Entitlements>(() => {
    const base = TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.free;
    const readOnly = accessMode === 'expired';
    return {
      tier,
      readOnly,
      readOnlyReason: readOnlyReasonFor(accessMode, tier),
      isLoading,
      accessMode,
      // When in read-only mode we strip all write-capable entitlements
      // too — otherwise a stale UI could still offer an AI prompt that
      // would then 402 at the server.
      projectCap: readOnly ? 0 : base.projectCap,
      collabEnabled: !readOnly && base.collabEnabled,
      aiEnabled: !readOnly && base.aiEnabled,
      versionHistoryEnabled: !readOnly && base.versionHistoryEnabled,
      ssoEnabled: !readOnly && base.ssoEnabled,
      marketplaceInstallEnabled: !readOnly && base.marketplaceInstallEnabled,
      publisherEnabled: !readOnly && base.publisherEnabled,
    };
  }, [tier, accessMode, isLoading]);
}
