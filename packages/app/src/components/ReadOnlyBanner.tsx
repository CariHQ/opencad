/**
 * ReadOnlyBanner — renders across the top of the editor when the user's
 * subscription has lapsed (or their trial has ended). The banner is
 * purely informational; actual gating happens inside individual stores /
 * actions reading from useEntitlements.
 *
 * We keep the export path working in every state so users never lose
 * access to their own data.
 */
import React from 'react';
import { useEntitlements } from '../hooks/useEntitlements';
import { useSubscription } from '../hooks/useSubscription';

export function ReadOnlyBanner(): React.ReactElement | null {
  const { readOnly, readOnlyReason } = useEntitlements();
  const { upgrade, openPortal, tier } = useSubscription();

  if (!readOnly) return null;

  const resubscribe = async (): Promise<void> => {
    // Users whose trial ended never had a Stripe customer. They go
    // through Checkout. Users whose paid subscription lapsed usually
    // already have a customer — route them through the Portal so
    // they can update their card without re-selecting a plan.
    if (tier === 'trial' || tier === 'free') {
      await upgrade('pro');
    } else {
      await openPortal();
    }
  };

  return (
    <div
      className="readonly-banner"
      role="alert"
      aria-live="polite"
      data-testid="readonly-banner"
    >
      <div className="readonly-banner-text">
        <strong>Read-only mode.</strong>{' '}
        {readOnlyReason ?? 'Editing is temporarily disabled.'}
      </div>
      <div className="readonly-banner-actions">
        <button
          type="button"
          className="readonly-banner-cta"
          onClick={() => { void resubscribe(); }}
        >
          Resubscribe
        </button>
      </div>
    </div>
  );
}
