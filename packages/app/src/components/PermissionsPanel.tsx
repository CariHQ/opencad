import React, { useState } from 'react';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
}

interface PermissionsPanelProps {
  members?: ProjectMember[];
  onUpdateRole?: (userId: string, role: ProjectRole) => void;
  onInvite?: (params: { email: string; role: ProjectRole }) => void;
  onRemove?: (userId: string) => void;
}

const ROLES: ProjectRole[] = ['owner', 'editor', 'viewer'];

export function PermissionsPanel({ members: propMembers = [], onUpdateRole, onInvite, onRemove }: PermissionsPanelProps = {}) {
  const [members, setMembers] = useState<ProjectMember[]>(propMembers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('viewer');

  const handleUpdateRole = (userId: string, role: ProjectRole) => {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
    onUpdateRole?.(userId, role);
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    const newMember: ProjectMember = {
      userId: `user-${Date.now()}`,
      name: email.split('@')[0] ?? email,
      email,
      role: inviteRole,
    };
    setMembers((prev) => [...prev, newMember]);
    onInvite?.({ email, role: inviteRole });
    setInviteEmail('');
  };

  const handleRemove = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    onRemove?.(userId);
  };

  return (
    <div className="permissions-panel">
      <div className="panel-header">
        <span className="panel-title">Team Members &amp; Permissions</span>
      </div>

      <div className="members-list">
        {members.map((m) => (
          <div key={m.userId} className="member-row">
            <div className="member-info">
              <span className="member-name">{m.name}</span>
              <span className="member-email">{m.email}</span>
            </div>
            {m.role === 'owner' ? (
              <span className="role-badge owner">Owner</span>
            ) : (
              <>
                <select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  onChange={(e) => handleUpdateRole(m.userId, e.target.value as ProjectRole)}
                  className="role-select"
                >
                  {ROLES.filter((r) => r !== 'owner').map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  aria-label={`Remove ${m.name}`}
                  className="btn-remove"
                  onClick={() => handleRemove(m.userId)}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="invite-row">
        <input
          type="email"
          placeholder="Invite by email…"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="invite-email-input"
        />
        <select
          aria-label="Role for invite"
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
          className="invite-role-select"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          aria-label="Invite member"
          className="btn-invite"
          onClick={handleInvite}
        >
          Invite
        </button>
      </div>
    </div>
  );
}
