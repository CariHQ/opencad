-- Plugin marketplace: catalogue, per-user installs, reports, moderation.
--
-- Design notes:
--   - plugins.id is a client-readable slug (e.g. "hello-opencad"), not a
--     UUID. This matches the manifest.id that the frontend already uses
--     and makes the /api/v1/marketplace/plugins/:id path stable.
--   - permissions is a JSONB array of strings. The enum lives in code
--     (see manifest validator) so we don't have to migrate every time we
--     add a new permission.
--   - publisher_uid NULL means this row is OpenCAD-curated (seeded from
--     the catalogue JSON). A non-NULL value identifies a third-party
--     publisher once the submission flow ships.
--   - moderation_status + revoked give us two independent levers:
--     * moderation_status gates whether a plugin shows up in listings
--       (default 'approved' for curated / legacy inserts).
--     * revoked is a kill switch that forces installed clients to
--       uninstall on next load, regardless of moderation state.
--   - price_cents stored as INTEGER so Stripe integration is a drop-in
--     later; 0 means free.

CREATE TABLE IF NOT EXISTS plugins (
    id                TEXT        PRIMARY KEY,
    name              TEXT        NOT NULL,
    description       TEXT        NOT NULL DEFAULT '',
    version           TEXT        NOT NULL,
    author            TEXT        NOT NULL DEFAULT '',
    category          TEXT        NOT NULL DEFAULT 'misc',
    icon              TEXT,
    entrypoint        TEXT        NOT NULL,
    sri_hash          TEXT,
    permissions       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    price_cents       INTEGER     NOT NULL DEFAULT 0,
    rating            REAL        NOT NULL DEFAULT 0,
    download_count    BIGINT      NOT NULL DEFAULT 0,
    publisher_uid     TEXT,
    moderation_status TEXT        NOT NULL DEFAULT 'approved'
                                  CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderation_notes  TEXT,
    revoked           BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_reason    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugins_moderation_idx ON plugins (moderation_status);
CREATE INDEX IF NOT EXISTS plugins_category_idx   ON plugins (category);
CREATE INDEX IF NOT EXISTS plugins_publisher_idx  ON plugins (publisher_uid);

CREATE TABLE IF NOT EXISTS plugin_installs (
    firebase_uid TEXT        NOT NULL,
    plugin_id    TEXT        NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version      TEXT        NOT NULL,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (firebase_uid, plugin_id)
);

CREATE INDEX IF NOT EXISTS plugin_installs_user_idx   ON plugin_installs (firebase_uid);
CREATE INDEX IF NOT EXISTS plugin_installs_plugin_idx ON plugin_installs (plugin_id);

CREATE TABLE IF NOT EXISTS plugin_reports (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id    TEXT        NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    reporter_uid TEXT        NOT NULL,
    reason       TEXT        NOT NULL
                             CHECK (reason IN ('malware', 'broken', 'spam', 'policy', 'other')),
    details      TEXT,
    resolved     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugin_reports_plugin_idx ON plugin_reports (plugin_id);
CREATE INDEX IF NOT EXISTS plugin_reports_open_idx   ON plugin_reports (resolved) WHERE resolved = FALSE;
