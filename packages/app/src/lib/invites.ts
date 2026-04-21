/**
 * Invite queue — Phase-3 team invitations.
 *
 * Pending invites are stored locally until the org backend lands. An
 * invite becomes a real member the next time the invited email signs in
 * or when an admin marks it "accepted" manually from AdminPanel.
 */

import type { RoleId } from '../config/roles';
import { opfsRead, opfsWrite } from './opfs';

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: RoleId;
  invitedAt: number;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'revoked';
}

const LS_KEY = 'opencad-invites';
const OPFS_KEY = 'invites.json';

export async function loadInvites(): Promise<Invite[]> {
  try {
    const fromOpfs = await opfsRead(OPFS_KEY);
    if (fromOpfs) return JSON.parse(fromOpfs) as Invite[];
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Invite[];
  } catch { /* fall through */ }
  return [];
}

export async function saveInvites(invites: Invite[]): Promise<void> {
  const s = JSON.stringify(invites);
  await opfsWrite(OPFS_KEY, s);
  try { localStorage.setItem(LS_KEY, s); } catch { /* quota */ }
}

export function createInvite(
  params: { orgId: string; email: string; role: RoleId; invitedBy: string },
): Invite {
  return {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    email: params.email.toLowerCase().trim(),
    role: params.role,
    invitedAt: Date.now(),
    invitedBy: params.invitedBy,
    status: 'pending',
  };
}

export function revoke(invites: Invite[], id: string): Invite[] {
  return invites.map((i) => (i.id === id ? { ...i, status: 'revoked' as const } : i));
}

export function accept(invites: Invite[], id: string): Invite[] {
  return invites.map((i) => (i.id === id ? { ...i, status: 'accepted' as const } : i));
}

export function findPendingForEmail(invites: Invite[], email: string): Invite[] {
  const needle = email.toLowerCase().trim();
  return invites.filter((i) => i.status === 'pending' && i.email === needle);
}
