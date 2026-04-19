/**
 * T-PAY-001 / T-PAY-002: Billing Dashboard panel.
 *
 * Shown inside the settings modal under the "billing" tab.
 *
 * Features:
 * - Current plan badge (Free / Trial / Pro / Business)
 * - Trial days remaining countdown (only on trial tier)
 * - Upgrade button → opens https://opencad.archi/pricing
 * - Invoice history table (mock data)
 * - Cancel subscription button with confirmation dialog
 *   (hidden on free tier; routes through Stripe billing portal)
 *
 * data-testids:
 *   billing-loading           — loading skeleton
 *   plan-badge                — current plan label
 *   trial-countdown           — "X days remaining" (trial only)
 *   upgrade-btn               — opens pricing page
 *   invoice-table             — invoice <table>
 *   invoice-row               — each <tr> for an invoice
 *   invoice-pdf-link          — PDF download anchor per row
 *   cancel-subscription-btn   — opens cancel confirm dialog
 *   cancel-confirm-dialog     — confirmation dialog
 *   cancel-confirm-yes        — confirm cancel button
 *   cancel-confirm-no         — dismiss button
 */
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import type { SubscriptionTier } from '../lib/serverApi';

// ── Invoice mock data ────────────────────────────────────────────────────────

export interface InvoiceRow {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  pdf: string;
}

const MOCK_INVOICES: InvoiceRow[] = [
  { id: 'inv-001', date: '2026-03-01', amount: '$29.00', status: 'paid', pdf: 'https://opencad.archi/invoices/inv-001.pdf' },
  { id: 'inv-002', date: '2026-02-01', amount: '$29.00', status: 'paid', pdf: 'https://opencad.archi/invoices/inv-002.pdf' },
  { id: 'inv-003', date: '2026-01-01', amount: '$29.00', status: 'paid', pdf: 'https://opencad.archi/invoices/inv-003.pdf' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<SubscriptionTier | 'trial', string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  trial: 'Trial',
};

/** Returns days remaining until validUntil epoch (ms). Minimum 0. */
function daysRemaining(validUntil: number): number {
  const diff = validUntil - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Tiers that have an active paid/trial subscription worth cancelling. */
const CANCELLABLE_TIERS = new Set<SubscriptionTier | 'trial'>(['trial', 'pro', 'business']);

// ── Component ────────────────────────────────────────────────────────────────

interface BillingPanelProps {
  onUpgrade?: () => void;
}

export function BillingPanel({ onUpgrade }: BillingPanelProps = {}): React.ReactElement {
  const { tier, validUntil, isLoading, openPortal } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="billing-panel" data-testid="billing-loading">
        <p className="billing-loading-text">Loading billing information…</p>
      </div>
    );
  }

  // Determine the effective plan label. The authStore uses 'trial' but
  // SubscriptionTier only has 'free' | 'pro' | 'business'. Cast defensively.
  const effectiveTier = tier as SubscriptionTier | 'trial';
  const planLabel = PLAN_LABELS[effectiveTier] ?? String(effectiveTier);
  const isTrial = effectiveTier === 'trial';
  const canCancel = CANCELLABLE_TIERS.has(effectiveTier);

  const handleUpgrade = (): void => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.open('https://opencad.archi/pricing', '_blank');
    }
  };

  const handleCancelConfirm = (): void => {
    setShowCancelDialog(false);
    void openPortal();
  };

  return (
    <div className="billing-panel">
      {/* ── Plan badge ─────────────────────────────────────────────────────── */}
      <section className="billing-section billing-plan-section">
        <h3 className="billing-section-title">Current Plan</h3>
        <div className="billing-plan-row">
          <span
            className={`billing-plan-badge billing-plan-badge--${effectiveTier}`}
            data-testid="plan-badge"
          >
            {planLabel}
          </span>

          {isTrial && validUntil !== null && (
            <span className="billing-trial-countdown" data-testid="trial-countdown">
              {daysRemaining(validUntil)} days remaining in trial
            </span>
          )}
        </div>

        <button
          className="billing-upgrade-btn"
          data-testid="upgrade-btn"
          onClick={handleUpgrade}
          type="button"
        >
          Upgrade Plan
        </button>
      </section>

      {/* ── Invoice history ─────────────────────────────────────────────────── */}
      <section className="billing-section billing-invoices-section">
        <h3 className="billing-section-title">Invoice History</h3>
        <table className="billing-invoice-table" data-testid="invoice-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv) => (
              <tr key={inv.id} data-testid="invoice-row">
                <td>{inv.date}</td>
                <td>{inv.amount}</td>
                <td>
                  <span className={`invoice-status invoice-status--${inv.status}`}>
                    {inv.status}
                  </span>
                </td>
                <td>
                  <a
                    href={inv.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="invoice-pdf-link"
                    data-testid="invoice-pdf-link"
                    aria-label={`Download invoice ${inv.id}`}
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Cancel subscription ─────────────────────────────────────────────── */}
      {canCancel && (
        <section className="billing-section billing-cancel-section">
          <h3 className="billing-section-title">Cancel Subscription</h3>
          <p className="billing-cancel-description">
            You can cancel your subscription at any time. You will retain access until the
            end of the current billing period.
          </p>
          <button
            className="billing-cancel-btn"
            data-testid="cancel-subscription-btn"
            onClick={() => setShowCancelDialog(true)}
            type="button"
          >
            Cancel Subscription
          </button>
        </section>
      )}

      {/* ── Cancel confirmation dialog ──────────────────────────────────────── */}
      {showCancelDialog && (
        <div
          className="billing-cancel-dialog-overlay"
          data-testid="cancel-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Cancel subscription confirmation"
        >
          <div className="billing-cancel-dialog">
            <h4 className="billing-cancel-dialog-title">Cancel subscription?</h4>
            <p className="billing-cancel-dialog-body">
              Are you sure you want to cancel? Your plan will stay active until the end of
              the billing period.
            </p>
            <div className="billing-cancel-dialog-actions">
              <button
                className="billing-cancel-confirm-yes"
                data-testid="cancel-confirm-yes"
                onClick={handleCancelConfirm}
                type="button"
              >
                Yes, cancel
              </button>
              <button
                className="billing-cancel-confirm-no"
                data-testid="cancel-confirm-no"
                onClick={() => setShowCancelDialog(false)}
                type="button"
              >
                Keep my plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
