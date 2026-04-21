-- Publisher profile + Stripe Connect link for paid plugins.
--
-- plugins.price_cents already exists from 20260421000001, but paying a
-- publisher out requires a Stripe Connect Express account associated
-- with their Firebase UID. Rather than overloading the users table with
-- marketplace-specific fields, we keep it in its own relation so the
-- publisher flow can evolve independently.

CREATE TABLE IF NOT EXISTS plugin_publishers (
    firebase_uid         TEXT        PRIMARY KEY,
    display_name         TEXT        NOT NULL DEFAULT '',
    contact_email        TEXT        NOT NULL,
    stripe_account_id    TEXT,                               -- 'acct_…' from Stripe
    stripe_onboarded     BOOLEAN     NOT NULL DEFAULT FALSE, -- flipped when details_submitted=true
    payouts_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revenue records: one row per successful installation of a paid plugin,
-- so we can compute publisher payouts without needing to query Stripe for
-- historical data on every report.
CREATE TABLE IF NOT EXISTS plugin_revenue (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id            TEXT        NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    publisher_uid        TEXT        NOT NULL,
    buyer_uid            TEXT        NOT NULL,
    amount_cents         INTEGER     NOT NULL,
    platform_fee_cents   INTEGER     NOT NULL,       -- 30% of amount_cents
    stripe_charge_id     TEXT,                        -- 'ch_…'
    stripe_transfer_id   TEXT,                        -- 'tr_…' once paid out
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugin_revenue_plugin_idx    ON plugin_revenue (plugin_id);
CREATE INDEX IF NOT EXISTS plugin_revenue_publisher_idx ON plugin_revenue (publisher_uid);
