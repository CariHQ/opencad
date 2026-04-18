/**
 * AdminPanel — project-member role management.
 *
 * Only rendered when the current user has `can('panel:admin')`.
 * Displays a list of project members with a role-assignment dropdown per member.
 * Role changes call the optional `setMemberRole` stub.
 */
import React, { useState } from 'react';
import type { RoleName } from '../config/roles';

/** Member record — mock data is provided when no external source is wired. */
export interface AdminMember {
  id: string;
  name: string;
  role: RoleName;
}

const MOCK_MEMBERS: AdminMember[] = [
  { id: 'u1', name: 'Alice Mercer',   role: 'architect'  },
  { id: 'u2', name: 'Bob Tanaka',     role: 'structural' },
  { id: 'u3', name: 'Carol Osei',     role: 'owner'      },
  { id: 'u4', name: 'David Park',     role: 'architect'  },
];

const ALL_ROLES: RoleName[] = ['admin', 'architect', 'structural', 'owner'];

interface AdminPanelProps {
  /** Role-capability predicate from useRole() */
  can: (action: string) => boolean;
  /** Initial member list — falls back to MOCK_MEMBERS when omitted */
  members?: AdminMember[];
  /** Called when a member's role is changed */
  setMemberRole?: (userId: string, role: RoleName) => void;
}

export function AdminPanel({ can, members: propMembers, setMemberRole }: AdminPanelProps) {
  const [members, setMembers] = useState<AdminMember[]>(propMembers ?? MOCK_MEMBERS);

  // Only visible to admins
  if (!can('panel:admin')) return null;

  const handleRoleChange = (id: string, newRole: RoleName) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    setMemberRole?.(id, newRole);
  };

  return (
    <div className="admin-panel" data-testid="admin-panel">
      <div className="panel-header">
        <span className="panel-title">Admin — Project Members</span>
      </div>

      <table className="members-table" aria-label="Project members">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} data-testid={`member-row-${m.id}`}>
              <td className="member-name">{m.name}</td>
              <td>
                <select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value as RoleName)}
                  className="role-select"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
