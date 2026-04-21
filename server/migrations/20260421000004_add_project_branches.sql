-- Project design branches.
--
-- A branch is a named snapshot of a project's document. Previously these
-- lived in the browser only (OPFS + localStorage fallback), so clearing
-- browser storage or opening on a second device destroyed every branch.
-- This migration makes them server-authoritative: the browser treats its
-- local copy as a cache that reconciles with the server on every load.
--
-- Schema notes:
--   - snapshot is TEXT (serialized DocumentSchema JSON), matching how
--     the documents table stores current document state. No schema version
--     column — we trust the loader to handle older-shape snapshots
--     alongside the live document's migration logic.
--   - base_branch_id enables "branch from branch X at time Y"; nullable
--     so the legacy "forked from main" default stays valid.
--   - (project_id, id) composite PK so branch ids are scoped per project
--     and the well-known 'main' id is implicit (never stored; the live
--     document IS main).

CREATE TABLE IF NOT EXISTS project_branches (
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    id              TEXT        NOT NULL,
    name            TEXT        NOT NULL,
    message         TEXT,
    snapshot        TEXT        NOT NULL,
    base_branch_id  TEXT,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, id)
);

CREATE INDEX IF NOT EXISTS project_branches_project_idx ON project_branches (project_id);
CREATE INDEX IF NOT EXISTS project_branches_updated_idx ON project_branches (project_id, updated_at DESC);
