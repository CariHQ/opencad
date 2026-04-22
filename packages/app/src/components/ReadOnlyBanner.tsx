/**
 * ReadOnlyBanner — renders across the top of the editor when the user's
 * subscription has lapsed (or their trial has ended). The banner is
 * purely informational; actual gating happens inside individual stores /
 * actions reading from useEntitlements.
 *
 * We keep the export path working in every state so users never lose
 * access to their own data.
 */
import React, { useState } from 'react';
import { useEntitlements } from '../hooks/useEntitlements';
import { useSubscription } from '../hooks/useSubscription';

export function ReadOnlyBanner(): React.ReactElement | null {
  const { readOnly, readOnlyReason } = useEntitlements();
  const { upgrade, openPortal, tier } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!readOnly) return null;

  const resubscribe = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      // Users whose trial ended never had a Stripe customer. They go
      // through Checkout. Users whose paid subscription lapsed usually
      // already have a customer — route them through the Portal so
      // they can update their card without re-selecting a plan.
      // upgrade() and openPortal() each call window.location.href — if
      // this function returns without that redirect, something failed.
      if (tier === 'trial' || tier === 'free') {
        await upgrade('pro');
      } else {
        await openPortal();
      }
    } catch (err) {
      // Surface the error instead of silently doing nothing. The most
      // common cause is the server not being configured with
      // STRIPE_PRICE_PRO / STRIPE_SECRET_KEY — the response body will
      // usually include that in the error.
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[resubscribe] failed:', err);
      setError(msg);
    } finally {
      setBusy(false);
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
        {error && (
          <>
            {' '}
            <span className="readonly-banner-error">Error: {error}</span>
          </>
        )}
      </div>
      <div className="readonly-banner-actions">
        <button
          type="button"
          className="readonly-banner-cta"
          onClick={() => { void resubscribe(); }}
          disabled={busy}
        >
          {busy ? 'Opening…' : 'Resubscribe'}
        </button>
      </div>
    </div>
  );
}
