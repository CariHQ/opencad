-- Version history for project documents.
-- Each saved snapshot is stored here so users can restore previous states.

CREATE TABLE IF NOT EXISTS version_history (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER     NOT NULL,
    data           TEXT        NOT NULL,
    message        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS version_history_project_idx ON version_history (project_id, version_number DESC);
