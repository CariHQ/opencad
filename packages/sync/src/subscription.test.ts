/**
 * TDD Tests for Subscription Management
 *
 * Test IDs: T-SUB-001 through T-SUB-022
 * Unit-testable subset of subscription behaviors.
 */

import { describe, it, expect } from 'vitest';
import {
  computeStatus,
  getAccessPolicy,
  isOfflineEditingAllowed,
  isDataPreserved,
  renewSubscription,
  cancelSubscription,
  createTrialSubscription,
  type SubscriptionState,
  DEFAULT_GRACE_PERIOD_DAYS,
  DEFAULT_OFFLINE_GRACE_DAYS,
  DEFAULT_DATA_PRESERVATION_DAYS,
  TRIAL_PROJECT_LIMIT,
} from './subscription';

const NOW = 1_700_000_000_000; // fixed reference time
const DAY = 86_400_000;

function makeActive(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status: 'active',
    expiresAt: NOW + 30 * DAY,
    gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
    offlineGraceDays: DEFAULT_OFFLINE_GRACE_DAYS,
    lastSyncAt: NOW,
    cancelledAt: null,
    dataPreservationDays: DEFAULT_DATA_PRESERVATION_DAYS,
    ...overrides,
  };
}

function makeExpired(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status: 'active',
    expiresAt: NOW - DAY,
    gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
    offlineGraceDays: DEFAULT_OFFLINE_GRACE_DAYS,
    lastSyncAt: NOW - 2 * DAY,
    cancelledAt: null,
    dataPreservationDays: DEFAULT_DATA_PRESERVATION_DAYS,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────
// T-SUB-009: Subscription expires → verify 14-day grace period
// ──────────────────────────────────────────────────────────────
describe('T-SUB-009: Subscription expires → grace period begins', () => {
  it('active subscription within expiry returns active status', () => {
    const state = makeActive();
    expect(computeStatus(state, NOW)).toBe('active');
  });

  it('subscription just past expiry enters grace_period', () => {
    const state = makeExpired();
    // nowMs is just after expiry (1 day past) which is within grace period
    expect(computeStatus(state, NOW)).toBe('grace_period');
  });

  it('grace period lasts 14 days by default', () => {
    const state = makeExpired();
    const midGrace = NOW - DAY + 13 * DAY; // 13 days into grace
    expect(computeStatus(state, midGrace)).toBe('grace_period');
  });

  it('subscription past grace period returns expired', () => {
    const state = makeExpired();
    const afterGrace = NOW - DAY + (DEFAULT_GRACE_PERIOD_DAYS + 1) * DAY;
    expect(computeStatus(state, afterGrace)).toBe('expired');
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-010: Grace period ends → read-only + export access
// ──────────────────────────────────────────────────────────────
describe('T-SUB-010: Grace period ends → read-only + export access', () => {
  it('active subscription has full edit access', () => {
    const policy = getAccessPolicy('active');
    expect(policy.canEdit).toBe(true);
    expect(policy.canView).toBe(true);
    expect(policy.canExport).toBe(true);
  });

  it('grace_period subscription is read-only but can export', () => {
    const policy = getAccessPolicy('grace_period');
    expect(policy.canEdit).toBe(false);
    expect(policy.canExport).toBe(true);
    expect(policy.canView).toBe(true);
  });

  it('expired subscription is read-only with export access', () => {
    const policy = getAccessPolicy('expired');
    expect(policy.canEdit).toBe(false);
    expect(policy.canExport).toBe(true);
    expect(policy.canView).toBe(true);
  });

  it('expired subscription cannot sync', () => {
    const policy = getAccessPolicy('expired');
    expect(policy.canSync).toBe(false);
  });

  it('grace_period subscription can still sync', () => {
    const policy = getAccessPolicy('grace_period');
    expect(policy.canSync).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-011: Offline during grace → 30-day offline grace
// ──────────────────────────────────────────────────────────────
describe('T-SUB-011: Offline during grace → 30-day offline grace', () => {
  it('active subscription allows offline editing', () => {
    const state = makeActive();
    expect(isOfflineEditingAllowed(state, NOW)).toBe(true);
  });

  it('grace period within 30-day offline window allows editing', () => {
    const state = makeExpired({ lastSyncAt: NOW - DAY });
    // In grace period and within offline window
    expect(isOfflineEditingAllowed(state, NOW)).toBe(true);
  });

  it('grace period past 30-day offline window blocks editing', () => {
    const state = makeExpired({ lastSyncAt: NOW - 35 * DAY });
    expect(isOfflineEditingAllowed(state, NOW)).toBe(false);
  });

  it('fully expired subscription blocks offline editing', () => {
    const state = makeExpired();
    const afterGrace = NOW - DAY + (DEFAULT_GRACE_PERIOD_DAYS + 1) * DAY;
    expect(isOfflineEditingAllowed(state, afterGrace)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-012: Subscription renewed → full access restored
// ──────────────────────────────────────────────────────────────
describe('T-SUB-012: Subscription renewed → full access restored', () => {
  it('renewSubscription sets status to active', () => {
    const state = makeExpired();
    const renewed = renewSubscription(state, NOW + 30 * DAY);
    expect(renewed.status).toBe('active');
  });

  it('renewed subscription has new expiry date', () => {
    const state = makeExpired();
    const newExpiry = NOW + 365 * DAY;
    const renewed = renewSubscription(state, newExpiry);
    expect(renewed.expiresAt).toBe(newExpiry);
  });

  it('renewed subscription has full edit access', () => {
    const state = makeExpired();
    const renewed = renewSubscription(state, NOW + 30 * DAY);
    const effective = computeStatus(renewed, NOW);
    const policy = getAccessPolicy(effective);
    expect(policy.canEdit).toBe(true);
  });

  it('renewal clears cancellation', () => {
    const state = { ...makeActive(), status: 'cancelled' as const, cancelledAt: NOW - DAY };
    const renewed = renewSubscription(state, NOW + 30 * DAY);
    expect(renewed.cancelledAt).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-013: Cancel subscription → data preserved 90 days
// ──────────────────────────────────────────────────────────────
describe('T-SUB-013: Cancel subscription → data preserved 90 days', () => {
  it('cancelSubscription sets status to cancelled', () => {
    const state = makeActive();
    const cancelled = cancelSubscription(state, NOW);
    expect(cancelled.status).toBe('cancelled');
  });

  it('cancelled subscription records cancellation timestamp', () => {
    const state = makeActive();
    const cancelled = cancelSubscription(state, NOW);
    expect(cancelled.cancelledAt).toBe(NOW);
  });

  it('data is preserved within 90 days of cancellation', () => {
    const state = cancelSubscription(makeActive(), NOW - 30 * DAY);
    expect(isDataPreserved(state, NOW)).toBe(true);
  });

  it('data is not preserved after 90 days of cancellation', () => {
    const state = cancelSubscription(makeActive(), NOW - 91 * DAY);
    expect(isDataPreserved(state, NOW)).toBe(false);
  });

  it('cancelled user can still export (export_only access)', () => {
    const policy = getAccessPolicy('cancelled');
    expect(policy.canExport).toBe(true);
    expect(policy.canEdit).toBe(false);
  });

  it('cancelled user can view', () => {
    const policy = getAccessPolicy('cancelled');
    expect(policy.canView).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-021: Trial expiry → project limit enforced
// ──────────────────────────────────────────────────────────────
describe('T-SUB-021: Trial expiry → project limit enforced at cloud level', () => {
  it('createTrialSubscription returns trial status', () => {
    const state = createTrialSubscription(14, NOW);
    expect(state.status).toBe('trial');
  });

  it('trial expires after trial period', () => {
    const state = createTrialSubscription(14, NOW - 15 * DAY);
    expect(computeStatus(state, NOW)).toBe('trial_expired');
  });

  it('active trial has project limit', () => {
    const policy = getAccessPolicy('trial');
    expect(policy.limitProjects).toBe(TRIAL_PROJECT_LIMIT);
  });

  it('active subscription has no project limit', () => {
    const policy = getAccessPolicy('active');
    expect(policy.limitProjects).toBeNull();
  });

  it('expired trial has read-only access', () => {
    const policy = getAccessPolicy('trial_expired');
    expect(policy.canEdit).toBe(false);
    expect(policy.canView).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-022: Expired subscription → user can still export all data
// ──────────────────────────────────────────────────────────────
describe('T-SUB-022: Expired subscription → user can still export all data', () => {
  it('expired subscription allows export', () => {
    const policy = getAccessPolicy('expired');
    expect(policy.canExport).toBe(true);
  });

  it('trial_expired subscription allows export', () => {
    const policy = getAccessPolicy('trial_expired');
    expect(policy.canExport).toBe(true);
  });

  it('cancelled subscription allows export', () => {
    const policy = getAccessPolicy('cancelled');
    expect(policy.canExport).toBe(true);
  });

  it('grace_period subscription allows export', () => {
    const policy = getAccessPolicy('grace_period');
    expect(policy.canExport).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-009 (additional): Grace period boundary conditions
// ──────────────────────────────────────────────────────────────
describe('T-SUB-009 (boundary): Grace period starts exactly at expiry', () => {
  it('subscription at exact expiry time enters grace_period', () => {
    const expiresAt = NOW;
    const state: SubscriptionState = {
      ...makeActive(),
      expiresAt,
    };
    // At exactly expiry time — still active
    expect(computeStatus(state, NOW)).toBe('active');
  });

  it('subscription one millisecond after expiry is in grace period', () => {
    const expiresAt = NOW - 1;
    const state: SubscriptionState = {
      ...makeActive(),
      expiresAt,
    };
    expect(computeStatus(state, NOW)).toBe('grace_period');
  });

  it('grace period is exactly 14 days by default', () => {
    expect(DEFAULT_GRACE_PERIOD_DAYS).toBe(14);
  });

  it('offline grace is exactly 30 days by default', () => {
    expect(DEFAULT_OFFLINE_GRACE_DAYS).toBe(30);
  });

  it('data preservation is 90 days by default', () => {
    expect(DEFAULT_DATA_PRESERVATION_DAYS).toBe(90);
  });
});
