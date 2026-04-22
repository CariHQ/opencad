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
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { subscriptionApi, type Invoice, type SubscriptionTier } from '../lib/serverApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  trial: 'Trial',
};

/** Format a cents amount into a localised currency string. */
function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    // Unknown ISO code → fall back to raw number + upper-cased code.
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatInvoiceDate(createdSeconds: number): string {
  const d = new Date(createdSeconds * 1000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, locale-safe
}

/** Returns days remaining until validUntil epoch (ms). Minimum 0. */
function daysRemaining(validUntil: number): number {
  const diff = validUntil - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Tiers that have an active paid/trial subscription worth cancelling. */
const CANCELLABLE_TIERS = new Set<SubscriptionTier>(['trial', 'pro', 'business']);

// ── Component ────────────────────────────────────────────────────────────────

interface BillingPanelProps {
  onUpgrade?: () => void;
}

export function BillingPanel({ onUpgrade }: BillingPanelProps = {}): React.ReactElement {
  const { t } = useTranslation('panels');
  const {
    tier,
    subscriptionStatus,
    validUntil,
    cancelAtPeriodEnd,
    accessMode,
    isLoading,
    openPortal,
  } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Real invoices from Stripe. Empty array until loaded (or when the user
  // has no Stripe customer yet). Errors are swallowed into an empty list
  // so the rest of the panel still renders.
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState<boolean>(true);
  useEffect(() => {
    let active = true;
    setInvoicesLoading(true);
    subscriptionApi
      .listInvoices()
      .then((list) => { if (active) setInvoices(list); })
      .catch(() => { if (active) setInvoices([]); })
      .finally(() => { if (active) setInvoicesLoading(false); });
    return () => { active = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="billing-panel" data-testid="billing-loading">
        <p className="billing-loading-text">Loading billing information…</p>
      </div>
    );
  }

  const planLabel = PLAN_LABELS[tier] ?? String(tier);
  const isTrial = tier === 'trial' || accessMode === 'trial';
  // Show Cancel when the user has a live Stripe subscription to cancel,
  // OR when they're on a trial they can end early. Free users with no
  // subscription have nothing to cancel.
  const canCancel =
    CANCELLABLE_TIERS.has(tier) &&
    subscriptionStatus !== null &&
    subscriptionStatus !== 'canceled' &&
    !cancelAtPeriodEnd;

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
        <h3 className="billing-section-title">{t('billing.currentPlan')}</h3>
        <div className="billing-plan-row">
          <span
            className={`billing-plan-badge billing-plan-badge--${tier}`}
            data-testid="plan-badge"
          >
            {planLabel}
          </span>

          {isTrial && validUntil !== null && (
            <span className="billing-trial-countdown" data-testid="trial-countdown">
              {t('billing.daysRemaining', { days: daysRemaining(validUntil) })}
            </span>
          )}
        </div>

        <button
          className="billing-upgrade-btn"
          data-testid="upgrade-btn"
          onClick={handleUpgrade}
          type="button"
        >
          {t('billing.upgradePlan')}
        </button>
      </section>

      {/* ── Invoice history ─────────────────────────────────────────────────── */}
      <section className="billing-section billing-invoices-section">
        <h3 className="billing-section-title">{t('billing.invoiceHistory')}</h3>
        {invoicesLoading ? (
          <p className="billing-loading-text">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="billing-empty-text">{t('billing.noInvoices')}</p>
        ) : (
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
              {invoices.map((inv) => (
                <tr key={inv.id} data-testid="invoice-row">
                  <td>{formatInvoiceDate(inv.created)}</td>
                  <td>{formatMoney(inv.amountPaid, inv.currency)}</td>
                  <td>
                    <span className={`invoice-status invoice-status--${inv.status}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    {inv.invoicePdf || inv.hostedInvoiceUrl ? (
                      <a
                        href={inv.invoicePdf ?? inv.hostedInvoiceUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="invoice-pdf-link"
                        data-testid="invoice-pdf-link"
                        aria-label={`Download invoice ${inv.number ?? inv.id}`}
                      >
                        Download
                      </a>
                    ) : (
                      <span className="billing-empty-text">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Cancel subscription ─────────────────────────────────────────────── */}
      {canCancel && (
        <section className="billing-section billing-cancel-section">
          <h3 className="billing-section-title">{t('billing.cancelSubscription')}</h3>
          <p className="billing-cancel-description">{t('billing.cancelDescription')}</p>
          <button
            className="billing-cancel-btn"
            data-testid="cancel-subscription-btn"
            onClick={() => setShowCancelDialog(true)}
            type="button"
          >
            {t('billing.cancelSubscription')}
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
            <h4 className="billing-cancel-dialog-title">{t('billing.cancelConfirmTitle')}</h4>
            <p className="billing-cancel-dialog-body">{t('billing.cancelConfirmBody')}</p>
            <div className="billing-cancel-dialog-actions">
              <button
                className="billing-cancel-confirm-yes"
                data-testid="cancel-confirm-yes"
                onClick={handleCancelConfirm}
                type="button"
              >
                {t('billing.cancelYes')}
              </button>
              <button
                className="billing-cancel-confirm-no"
                data-testid="cancel-confirm-no"
                onClick={() => setShowCancelDialog(false)}
                type="button"
              >
                {t('billing.cancelKeep')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
