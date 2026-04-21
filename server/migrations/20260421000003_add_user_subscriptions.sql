-- Real Stripe-backed user subscriptions.
--
-- Replaces the previous users.plan column (which was UI-only; nothing
-- collected money or flipped its value) with Stripe-authoritative state.
-- The Stripe webhook is the single source of truth: checkout/portal
-- actions hand off to Stripe, Stripe fires webhooks, we persist.
--
-- Schema:
--   stripe_customer_id         set once on first checkout/upsert
--   stripe_subscription_id     set on successful checkout, null after cancel
--   subscription_status        mirrors Stripe's subscription.status
--                              (trialing / active / past_due / canceled /
--                               unpaid / incomplete / incomplete_expired /
--                               paused)
--   subscription_current_period_end   timestamptz when the paid-for
--                              period ends — read-only grace window
--                              key
--
-- Rationale for keeping 'plan' alongside these: the webhook sets
-- plan = 'pro' or 'business' on checkout success and plan = 'free'
-- on final cancellation, so the existing UI can keep reading `plan`
-- as a simple label without untangling Stripe statuses.

-- Widen the plan CHECK to match the frontend's SubscriptionTier union
-- ('free' | 'pro' | 'business') while keeping 'trial' for legacy rows.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'trial', 'pro', 'business'));

-- Remap any legacy 'team' rows to 'business' so the UI renders correctly.
UPDATE users SET plan = 'business' WHERE plan = 'team';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id              TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id          TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status             TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_idx
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_idx
  ON users (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
