-- Enforce project isolation: all project reads/writes are now scoped to
-- project_members. This migration backfills existing orphaned projects
-- (created before membership tracking) to their owner via the owner_id FK.
--
-- Projects with no owner_id and no existing member row are left without
-- members — they will be invisible on the dashboard until an admin
-- re-assigns them. This is intentional: we'd rather hide data than leak it.

-- Backfill: for projects that have an owner_id but no member row yet,
-- insert the owner as 'owner' in project_members.
INSERT INTO project_members (project_id, firebase_uid, email, display_name, role, added_by)
SELECT
    p.id,
    u.firebase_uid,
    u.email,
    u.name,
    'owner',
    u.firebase_uid
FROM projects p
JOIN users u ON u.id = p.owner_id
WHERE NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = p.id AND pm.firebase_uid = u.firebase_uid
)
AND p.owner_id IS NOT NULL;
