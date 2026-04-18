/**
 * T-PAY-003: Subscription management modal.
 *
 * Displays three plan cards (Free / Pro / Business) with pricing,
 * feature bullets, and upgrade CTAs. The current plan card is
 * highlighted with a disabled "Current plan" button.
 */
import { useSubscription } from '../hooks/useSubscription';
import type { SubscriptionTier } from '../lib/serverApi';

interface PlanConfig {
  tier: SubscriptionTier;
  label: string;
  price: string;
  priceDetail: string;
  features: string[];
  badge?: string;
}

const PLANS: PlanConfig[] = [
  {
    tier: 'free',
    label: 'Free',
    price: '$0',
    priceDetail: 'forever',
    features: [
      '1 project',
      'Basic 2D drafting tools',
      'Local storage only',
      'Community support',
    ],
  },
  {
    tier: 'pro',
    label: 'Pro',
    price: '$29',
    priceDetail: 'per user / month',
    features: [
      'Unlimited projects',
      'Real-time collaboration',
      'AI design assistant',
      'Priority email support',
    ],
  },
  {
    tier: 'business',
    label: 'Business',
    price: '$99',
    priceDetail: 'per user / month',
    features: [
      'Everything in Pro',
      'Admin roles & permissions',
      'SSO / SAML',
      'Priority phone support',
    ],
    badge: 'Most popular',
  },
];

interface SubscriptionModalProps {
  onClose: () => void;
}

export function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const { tier: currentTier, startCheckout, openPortal } = useSubscription();

  return (
    <div
      className="subscription-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your plan"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="subscription-modal">
        <button aria-label="Close" className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2 className="subscription-title">Choose your plan</h2>
        <p className="subscription-subtitle">
          Upgrade anytime — no long-term commitment required.
        </p>

        <div className="subscription-plans">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            return (
              <div
                key={plan.tier}
                className={`subscription-plan-card${isCurrent ? ' subscription-plan-card--current' : ''}`}
                data-tier={plan.tier}
              >
                {plan.badge && (
                  <span className="subscription-plan-badge">{plan.badge}</span>
                )}

                <h3 className="subscription-plan-name">{plan.label}</h3>
                <div className="subscription-plan-price">
                  <span className="subscription-plan-amount">{plan.price}</span>
                  <span className="subscription-plan-period">{plan.priceDetail}</span>
                </div>

                <ul className="subscription-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    className="subscription-plan-cta subscription-plan-cta--current"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    className="subscription-plan-cta subscription-plan-cta--upgrade"
                    onClick={() => {
                      if (plan.tier !== 'free') {
                        void startCheckout(plan.tier);
                      }
                    }}
                  >
                    Upgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="subscription-footer">
          <button
            className="subscription-manage-billing"
            onClick={() => { void openPortal(); }}
          >
            Manage billing
          </button>
        </div>
      </div>
    </div>
  );
}
