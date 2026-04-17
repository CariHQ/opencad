-- Add users table with Firebase UID, trial tracking, and project ownership.
-- Designed to be idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid      TEXT        NOT NULL UNIQUE,
    email             TEXT        NOT NULL,
    name              TEXT        NOT NULL DEFAULT '',
    plan              TEXT        NOT NULL DEFAULT 'trial'
                                  CHECK (plan IN ('trial', 'pro', 'team')),
    trial_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_firebase_uid_idx ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS users_email_idx        ON users (email);

-- Add optional owner FK to projects (nullable — existing projects stay ownerless)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects (owner_id);
