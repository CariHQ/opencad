/**
 * T-PAY-003: Subscription management modal.
 *
 * Displays three plan cards (Free / Pro / Business) with pricing,
 * feature bullets, and upgrade CTAs. The current plan card is
 * highlighted with a "Current plan" badge.
 *
 * data-testids:
 *   tier-free, tier-pro, tier-business
 *   upgrade-pro, upgrade-business
 *   manage-billing
 *   current-plan-badge
 */
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';

type PlanKey = 'free' | 'pro' | 'business';

/** Static plan metadata — only the tier and whether it has a badge
 *  stay in code. Everything user-visible (label, price, features) comes
 *  from the `dialogs:subscription.plans.<tier>.*` translation keys so a
 *  translator can localise the price format if they need to. */
const PLAN_TIERS: { tier: PlanKey; badge?: boolean }[] = [
  { tier: 'free' },
  { tier: 'pro' },
  { tier: 'business', badge: true },
];

interface SubscriptionModalProps {
  onClose: () => void;
}

export function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  const { t } = useTranslation('dialogs');
  const { tier: currentTier, upgrade, openPortal } = useSubscription();

  return (
    <div
      className="subscription-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('subscription.title')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="subscription-modal">
        <button aria-label={t('subscription.close', { defaultValue: 'Close' })} className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2 className="subscription-title">{t('subscription.title')}</h2>
        <p className="subscription-subtitle">{t('subscription.subtitle')}</p>

        <div className="subscription-plans">
          {PLAN_TIERS.map(({ tier, badge }) => {
            const isCurrent = tier === (currentTier as PlanKey);
            const showUpgrade =
              !isCurrent && tier !== 'free' && currentTier !== 'business';
            const planLabel = t(`subscription.plans.${tier}.label`);
            const price = t(`subscription.plans.${tier}.price`);
            const priceDetail = tier === 'free'
              ? t(`subscription.plans.free.priceDetail`)
              : t('subscription.perUserMonth');
            const features = [
              t(`subscription.plans.${tier}.features.f1`),
              t(`subscription.plans.${tier}.features.f2`),
              t(`subscription.plans.${tier}.features.f3`),
              t(`subscription.plans.${tier}.features.f4`),
            ];

            return (
              <div
                key={tier}
                className={`subscription-plan-card${isCurrent ? ' subscription-plan-card--current' : ''}`}
                data-testid={`tier-${tier}`}
                data-tier={tier}
              >
                {badge && (
                  <span className="subscription-plan-badge">{t('subscription.mostPopular')}</span>
                )}

                <h3 className="subscription-plan-name">{planLabel}</h3>
                <div className="subscription-plan-price">
                  <span className="subscription-plan-amount">{price}</span>
                  <span className="subscription-plan-period">{priceDetail}</span>
                </div>

                <ul className="subscription-plan-features">
                  {features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>

                {isCurrent && (
                  <button
                    className="subscription-plan-cta subscription-plan-cta--current"
                    data-testid="current-plan-badge"
                    disabled
                  >
                    {t('subscription.currentPlan')}
                  </button>
                )}

                {showUpgrade && (
                  <button
                    className="subscription-plan-cta subscription-plan-cta--upgrade"
                    data-testid={`upgrade-${tier}`}
                    onClick={() => {
                      void upgrade(tier as 'pro' | 'business');
                    }}
                  >
                    {t('subscription.upgradeTo', { plan: planLabel })}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="subscription-footer">
          <button
            className="subscription-manage-billing"
            data-testid="manage-billing"
            onClick={() => {
              void openPortal();
            }}
          >
            {t('subscription.manageBilling')}
          </button>
        </div>
      </div>
    </div>
  );
}
