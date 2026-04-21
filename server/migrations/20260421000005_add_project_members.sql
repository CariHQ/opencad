-- Project members (authoritative source for AdminPanel).
--
-- The AdminPanel used to show a hardcoded Alice/Bob/Carol/David for
-- every project, with role changes that went nowhere. This table
-- makes it real: membership is persistent, role changes are durable,
-- and listing is scoped to the requesting project.
--
-- Role values mirror the frontend RoleName enum
-- (packages/app/src/config/roles.ts). We don't constrain with a CHECK
-- clause because the set is expected to grow (e.g. civil, electrical)
-- and migration on every addition is noisy. Validation lives in the
-- route layer where the client-side enum is the source of truth.
--
-- The project creator is inserted automatically as 'owner' on project
-- creation (see routes/projects.rs patch in the same change).

CREATE TABLE IF NOT EXISTS project_members (
    project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    firebase_uid  TEXT        NOT NULL,
    email         TEXT        NOT NULL DEFAULT '',
    display_name  TEXT        NOT NULL DEFAULT '',
    role          TEXT        NOT NULL DEFAULT 'architect',
    added_by      TEXT,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, firebase_uid)
);

CREATE INDEX IF NOT EXISTS project_members_project_idx ON project_members (project_id);
CREATE INDEX IF NOT EXISTS project_members_user_idx    ON project_members (firebase_uid);
