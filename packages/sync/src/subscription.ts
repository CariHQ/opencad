/**
 * Subscription Management
 * Handles subscription state, grace periods, access control, and offline grace.
 */

export type SubscriptionStatus =
  | 'active'
  | 'grace_period'
  | 'expired'
  | 'trial'
  | 'trial_expired'
  | 'cancelled';

export type AccessLevel = 'full' | 'read_only' | 'export_only' | 'none';

export interface SubscriptionState {
  status: SubscriptionStatus;
  expiresAt: number; // Unix ms
  gracePeriodDays: number;
  offlineGraceDays: number;
  lastSyncAt: number | null;
  cancelledAt: number | null;
  dataPreservationDays: number; // days data kept after cancellation
}

export interface AccessPolicy {
  level: AccessLevel;
  canEdit: boolean;
  canExport: boolean;
  canView: boolean;
  canSync: boolean;
  limitProjects: number | null; // null = unlimited
}

export const DEFAULT_GRACE_PERIOD_DAYS = 14;
export const DEFAULT_OFFLINE_GRACE_DAYS = 30;
export const DEFAULT_DATA_PRESERVATION_DAYS = 90;
export const TRIAL_PROJECT_LIMIT = 3;

/**
 * Compute effective subscription status considering grace period.
 */
export function computeStatus(state: SubscriptionState, nowMs: number): SubscriptionStatus {
  if (state.status === 'cancelled') {
    return 'cancelled';
  }

  if (state.status === 'trial' || state.status === 'trial_expired') {
    if (nowMs > state.expiresAt) {
      return 'trial_expired';
    }
    return 'trial';
  }

  if (state.status === 'active') {
    if (nowMs <= state.expiresAt) {
      return 'active';
    }
    // Expired — check grace period
    const graceCutoff = state.expiresAt + state.gracePeriodDays * 86_400_000;
    if (nowMs <= graceCutoff) {
      return 'grace_period';
    }
    return 'expired';
  }

  if (state.status === 'grace_period') {
    const graceCutoff = state.expiresAt + state.gracePeriodDays * 86_400_000;
    if (nowMs <= graceCutoff) {
      return 'grace_period';
    }
    return 'expired';
  }

  return state.status;
}

/**
 * Determine access level based on subscription status.
 */
export function getAccessPolicy(status: SubscriptionStatus): AccessPolicy {
  switch (status) {
    case 'active':
      return {
        level: 'full',
        canEdit: true,
        canExport: true,
        canView: true,
        canSync: true,
        limitProjects: null,
      };

    case 'trial':
      return {
        level: 'full',
        canEdit: true,
        canExport: true,
        canView: true,
        canSync: true,
        limitProjects: TRIAL_PROJECT_LIMIT,
      };

    case 'grace_period':
      return {
        level: 'read_only',
        canEdit: false,
        canExport: true,
        canView: true,
        canSync: true,
        limitProjects: null,
      };

    case 'expired':
    case 'trial_expired':
      return {
        level: 'read_only',
        canEdit: false,
        canExport: true,
        canView: true,
        canSync: false,
        limitProjects: null,
      };

    case 'cancelled':
      return {
        level: 'export_only',
        canEdit: false,
        canExport: true,
        canView: true,
        canSync: false,
        limitProjects: null,
      };

    default:
      return {
        level: 'none',
        canEdit: false,
        canExport: false,
        canView: false,
        canSync: false,
        limitProjects: 0,
      };
  }
}

/**
 * Check whether offline editing is allowed.
 * Uses offline grace period from last sync timestamp.
 */
export function isOfflineEditingAllowed(state: SubscriptionState, nowMs: number): boolean {
  const effectiveStatus = computeStatus(state, nowMs);

  // Expired or cancelled cannot edit offline
  if (effectiveStatus === 'expired' || effectiveStatus === 'cancelled' || effectiveStatus === 'trial_expired') {
    return false;
  }

  // Active or trial: allowed
  if (effectiveStatus === 'active' || effectiveStatus === 'trial') {
    return true;
  }

  // Grace period: check offline grace window from last sync
  if (effectiveStatus === 'grace_period') {
    if (!state.lastSyncAt) return false;
    const offlineCutoff = state.lastSyncAt + state.offlineGraceDays * 86_400_000;
    return nowMs <= offlineCutoff;
  }

  return false;
}

/**
 * Check whether user data is still preserved after cancellation.
 */
export function isDataPreserved(state: SubscriptionState, nowMs: number): boolean {
  if (!state.cancelledAt) return true;
  const cutoff = state.cancelledAt + state.dataPreservationDays * 86_400_000;
  return nowMs <= cutoff;
}

/**
 * Renew a subscription by extending the expiry date.
 */
export function renewSubscription(
  state: SubscriptionState,
  newExpiresAt: number
): SubscriptionState {
  return {
    ...state,
    status: 'active',
    expiresAt: newExpiresAt,
    cancelledAt: null,
  };
}

/**
 * Cancel a subscription.
 */
export function cancelSubscription(
  state: SubscriptionState,
  nowMs: number
): SubscriptionState {
  return {
    ...state,
    status: 'cancelled',
    cancelledAt: nowMs,
  };
}

/**
 * Create a default trial subscription state.
 */
export function createTrialSubscription(trialDays: number, nowMs: number): SubscriptionState {
  return {
    status: 'trial',
    expiresAt: nowMs + trialDays * 86_400_000,
    gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
    offlineGraceDays: DEFAULT_OFFLINE_GRACE_DAYS,
    lastSyncAt: nowMs,
    cancelledAt: null,
    dataPreservationDays: DEFAULT_DATA_PRESERVATION_DAYS,
  };
}
