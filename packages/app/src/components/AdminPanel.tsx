/**
 * AdminPanel — project-member role management.
 *
 * Only rendered when the current user has `can('panel:admin')`.
 * Displays a list of project members with a role-assignment dropdown per member.
 * Role changes call the optional `onSetRole` callback when Save is clicked.
 *
 * data-testids:
 *   admin-panel               — root element
 *   member-row-{userId}       — table row per member
 *   role-select-{userId}      — role dropdown per member
 *   save-role-{userId}        — save button per member
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoleName } from '../config/roles';
import { ROLE_CONFIGS } from '../config/roles';

/** Member record — mock data is provided when no external source is wired. */
export interface AdminMember {
  id: string;
  name: string;
  role: RoleName;
}

/**
 * Demo-only fallback used when the caller passes no `members` prop.
 * Real callers (AppLayout) load server-backed members and pass them in.
 * Kept as a short array so test fixtures / Storybook work without a
 * network stub, but never shown to real users because AppLayout always
 * supplies the `members` prop.
 */
const DEMO_MEMBERS: AdminMember[] = [
  { id: 'u1', name: 'Project owner (demo)', role: 'owner' },
];

/** All 7 role IDs available in the system */
const ALL_ROLES: RoleName[] = ['admin', 'architect', 'structural', 'mep', 'contractor', 'owner', 'pm'];

interface AdminPanelProps {
  /** Role-capability predicate from useRole() */
  can: (action: string) => boolean;
  /** Initial member list — falls back to MOCK_MEMBERS when omitted */
  members?: AdminMember[];
  /** Called when a member's role save button is clicked */
  onSetRole?: (userId: string, role: RoleName) => void;
  /** @deprecated Use onSetRole. Kept for backwards compat. */
  setMemberRole?: (userId: string, role: RoleName) => void;
  /** The ID of the currently logged-in admin user (that row is hidden) */
  currentUserId?: string;
}

export function AdminPanel({
  can,
  members: propMembers,
  onSetRole,
  setMemberRole,
  currentUserId,
}: AdminPanelProps) {
  const { t } = useTranslation('panels');
  const [members, setMembers] = useState<AdminMember[]>(propMembers ?? DEMO_MEMBERS);
  const [pendingRoles, setPendingRoles] = useState<Record<string, RoleName>>({});

  // Only visible to admins
  if (!can('panel:admin')) return null;

  const handleRoleDropdown = (id: string, newRole: RoleName) => {
    setPendingRoles((prev) => ({ ...prev, [id]: newRole }));
  };

  const handleSave = (id: string) => {
    const newRole = pendingRoles[id];
    if (!newRole) return;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    // Support both callback names for backwards compatibility
    onSetRole?.(id, newRole);
    setMemberRole?.(id, newRole);
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Admin hides itself from the list (can't demote yourself)
  const visibleMembers = members.filter((m) => m.id !== currentUserId);

  if (visibleMembers.length === 0) {
    return (
      <div className="admin-panel" data-testid="admin-panel">
        <div className="panel-header">
          <span className="panel-title">{t('admin.title')}</span>
        </div>
        <p className="admin-empty-state">{t('admin.empty')}</p>
      </div>
    );
  }

  return (
    <div className="admin-panel" data-testid="admin-panel">
      <div className="panel-header">
        <span className="panel-title">{t('admin.title')}</span>
      </div>

      <table className="members-table" aria-label={t('settings.admin.projectMembers', { defaultValue: 'Project members' })}>
        <thead>
          <tr>
            <th>{t('admin.headerName')}</th>
            <th>{t('admin.headerRole')}</th>
            <th>{t('admin.headerNewRole')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleMembers.map((m) => (
            <tr key={m.id} data-testid={`member-row-${m.id}`}>
              <td className="member-name">{m.name}</td>
              <td className="member-current-role">
                <span className={`role-badge role-badge--${m.role}`}>
                  {ROLE_CONFIGS[m.role]?.label ?? m.role}
                </span>
              </td>
              <td>
                <select
                  data-testid={`role-select-${m.id}`}
                  aria-label={`Role for ${m.name}`}
                  value={pendingRoles[m.id] ?? m.role}
                  onChange={(e) => handleRoleDropdown(m.id, e.target.value as RoleName)}
                  className="role-select"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIGS[r]?.label ?? r}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  data-testid={`save-role-${m.id}`}
                  onClick={() => handleSave(m.id)}
                  className="save-role-btn"
                  disabled={!pendingRoles[m.id] || pendingRoles[m.id] === m.role}
                >
                  {t('admin.save')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
