-- User feedback table: stores in-app feedback and tracks GitHub issue creation.

CREATE TABLE IF NOT EXISTS feedback (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        REFERENCES users(id) ON DELETE SET NULL,
    firebase_uid        TEXT,                          -- denormalized for lookup without JOIN
    category            TEXT        NOT NULL
                                    CHECK (category IN ('bug', 'feature', 'question')),
    title               TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    prd_label           TEXT,                          -- mapped PRD area (e.g. "T-DOC", "T-2D")
    feasibility         TEXT        NOT NULL DEFAULT 'unclear'
                                    CHECK (feasibility IN ('in_scope', 'out_of_scope', 'unclear')),
    github_issue_url    TEXT,
    github_issue_number INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_firebase_uid_idx ON feedback (firebase_uid);
CREATE INDEX IF NOT EXISTS feedback_category_idx     ON feedback (category);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx   ON feedback (created_at DESC);
