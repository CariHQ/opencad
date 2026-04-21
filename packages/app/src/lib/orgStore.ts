/**
 * Organization / team model — Phase-3 enterprise layer.
 *
 * Holds a list of organizations, each with a member roster. A project is
 * tagged with an orgId + per-user role so RBAC applies at the project
 * level rather than globally. Persists to OPFS (primary) + localStorage
 * (fallback) until a real server-backed endpoint lands.
 */

import type { RoleId } from '../config/roles';
import { opfsRead, opfsWrite } from './opfs';

export interface OrgMember {
  userId: string;
  name: string;
  email?: string;
  role: RoleId;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: number;
  members: OrgMember[];
}

export interface OrgState {
  orgs: Record<string, Organization>;
  /** The org the signed-in user is currently acting under. */
  activeOrgId: string | null;
  /** Project → orgId mapping so each project belongs to one org. */
  projectOrg: Record<string, string>;
}

const LS_KEY = 'opencad-org-state';
const OPFS_KEY = 'org-state.json';

export async function loadOrgState(): Promise<OrgState> {
  try {
    const fromOpfs = await opfsRead(OPFS_KEY);
    if (fromOpfs) return JSON.parse(fromOpfs) as OrgState;
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as OrgState;
  } catch { /* fall through */ }
  return { orgs: {}, activeOrgId: null, projectOrg: {} };
}

export async function saveOrgState(state: OrgState): Promise<void> {
  const s = JSON.stringify(state);
  await opfsWrite(OPFS_KEY, s);
  try { localStorage.setItem(LS_KEY, s); } catch { /* quota */ }
}

// ─── Mutations (pure) ────────────────────────────────────────────────────────

export function createOrg(state: OrgState, name: string): OrgState {
  const id = crypto.randomUUID();
  const org: Organization = { id, name, createdAt: Date.now(), members: [] };
  return {
    ...state,
    orgs: { ...state.orgs, [id]: org },
    activeOrgId: state.activeOrgId ?? id,
  };
}

export function renameOrg(state: OrgState, orgId: string, name: string): OrgState {
  const org = state.orgs[orgId];
  if (!org) return state;
  return {
    ...state,
    orgs: { ...state.orgs, [orgId]: { ...org, name } },
  };
}

export function deleteOrg(state: OrgState, orgId: string): OrgState {
  const { [orgId]: _removed, ...rest } = state.orgs;
  void _removed;
  const nextProjectOrg = Object.fromEntries(
    Object.entries(state.projectOrg).filter(([, oid]) => oid !== orgId),
  );
  return {
    ...state,
    orgs: rest,
    projectOrg: nextProjectOrg,
    activeOrgId: state.activeOrgId === orgId ? null : state.activeOrgId,
  };
}

export function setActiveOrg(state: OrgState, orgId: string | null): OrgState {
  if (orgId && !state.orgs[orgId]) return state;
  return { ...state, activeOrgId: orgId };
}

export function addMember(state: OrgState, orgId: string, member: OrgMember): OrgState {
  const org = state.orgs[orgId];
  if (!org) return state;
  if (org.members.some((m) => m.userId === member.userId)) return state;
  return {
    ...state,
    orgs: { ...state.orgs, [orgId]: { ...org, members: [...org.members, member] } },
  };
}

export function removeMember(state: OrgState, orgId: string, userId: string): OrgState {
  const org = state.orgs[orgId];
  if (!org) return state;
  return {
    ...state,
    orgs: {
      ...state.orgs,
      [orgId]: { ...org, members: org.members.filter((m) => m.userId !== userId) },
    },
  };
}

export function setMemberRole(
  state: OrgState,
  orgId: string,
  userId: string,
  role: RoleId,
): OrgState {
  const org = state.orgs[orgId];
  if (!org) return state;
  return {
    ...state,
    orgs: {
      ...state.orgs,
      [orgId]: {
        ...org,
        members: org.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
      },
    },
  };
}

export function assignProject(state: OrgState, projectId: string, orgId: string): OrgState {
  if (!state.orgs[orgId]) return state;
  return {
    ...state,
    projectOrg: { ...state.projectOrg, [projectId]: orgId },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getProjectOrg(state: OrgState, projectId: string): Organization | null {
  const oid = state.projectOrg[projectId];
  return oid ? (state.orgs[oid] ?? null) : null;
}

export function getUserRoleInProject(
  state: OrgState,
  projectId: string,
  userId: string,
): RoleId | null {
  const org = getProjectOrg(state, projectId);
  if (!org) return null;
  return org.members.find((m) => m.userId === userId)?.role ?? null;
}
