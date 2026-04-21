/**
 * T-ORG-001: Organization / team store
 */
import { describe, it, expect } from 'vitest';
import {
  createOrg,
  renameOrg,
  deleteOrg,
  setActiveOrg,
  addMember,
  removeMember,
  setMemberRole,
  assignProject,
  getProjectOrg,
  getUserRoleInProject,
  type OrgState,
} from './orgStore';

const empty = (): OrgState => ({ orgs: {}, activeOrgId: null, projectOrg: {} });

describe('T-ORG-001: orgs', () => {
  it('createOrg adds and activates when no active org', () => {
    const next = createOrg(empty(), 'Studio A');
    expect(Object.values(next.orgs)).toHaveLength(1);
    expect(next.activeOrgId).toBe(Object.keys(next.orgs)[0]);
  });

  it('createOrg keeps existing active org', () => {
    const s1 = createOrg(empty(), 'A');
    const s2 = createOrg(s1, 'B');
    expect(s2.activeOrgId).toBe(s1.activeOrgId);
  });

  it('renameOrg updates name', () => {
    const s1 = createOrg(empty(), 'Old');
    const id = s1.activeOrgId!;
    const s2 = renameOrg(s1, id, 'New');
    expect(s2.orgs[id]!.name).toBe('New');
  });

  it('deleteOrg removes org and clears project assignments', () => {
    const s1 = createOrg(empty(), 'A');
    const id = s1.activeOrgId!;
    const s2 = assignProject(s1, 'p1', id);
    const s3 = deleteOrg(s2, id);
    expect(s3.orgs[id]).toBeUndefined();
    expect(s3.projectOrg['p1']).toBeUndefined();
    expect(s3.activeOrgId).toBeNull();
  });

  it('setActiveOrg switches context', () => {
    const s1 = createOrg(empty(), 'A');
    const s2 = createOrg(s1, 'B');
    const bId = Object.keys(s2.orgs).find((k) => k !== s1.activeOrgId)!;
    const s3 = setActiveOrg(s2, bId);
    expect(s3.activeOrgId).toBe(bId);
  });
});

describe('T-ORG-001: members', () => {
  it('addMember adds a new user with a role', () => {
    const s1 = createOrg(empty(), 'A');
    const id = s1.activeOrgId!;
    const s2 = addMember(s1, id, { userId: 'u1', name: 'Alice', role: 'architect' });
    expect(s2.orgs[id]!.members).toHaveLength(1);
  });

  it('addMember is idempotent per userId', () => {
    const s1 = createOrg(empty(), 'A');
    const id = s1.activeOrgId!;
    const s2 = addMember(s1, id, { userId: 'u1', name: 'Alice', role: 'architect' });
    const s3 = addMember(s2, id, { userId: 'u1', name: 'Alice-dup', role: 'structural' });
    expect(s3.orgs[id]!.members).toHaveLength(1);
  });

  it('setMemberRole changes the role', () => {
    const s1 = createOrg(empty(), 'A');
    const id = s1.activeOrgId!;
    const s2 = addMember(s1, id, { userId: 'u1', name: 'Alice', role: 'architect' });
    const s3 = setMemberRole(s2, id, 'u1', 'admin');
    expect(s3.orgs[id]!.members[0]!.role).toBe('admin');
  });

  it('removeMember drops the user', () => {
    const s1 = createOrg(empty(), 'A');
    const id = s1.activeOrgId!;
    const s2 = addMember(s1, id, { userId: 'u1', name: 'Alice', role: 'architect' });
    const s3 = removeMember(s2, id, 'u1');
    expect(s3.orgs[id]!.members).toHaveLength(0);
  });
});

describe('T-ORG-001: project membership', () => {
  it('assignProject links project to org', () => {
    const s1 = createOrg(empty(), 'Studio');
    const id = s1.activeOrgId!;
    const s2 = assignProject(s1, 'p1', id);
    expect(getProjectOrg(s2, 'p1')?.id).toBe(id);
  });

  it('getUserRoleInProject resolves role from org membership', () => {
    const s1 = createOrg(empty(), 'Studio');
    const id = s1.activeOrgId!;
    const s2 = addMember(s1, id, { userId: 'u1', name: 'Alice', role: 'architect' });
    const s3 = assignProject(s2, 'p1', id);
    expect(getUserRoleInProject(s3, 'p1', 'u1')).toBe('architect');
    expect(getUserRoleInProject(s3, 'p1', 'u2')).toBeNull();
    expect(getUserRoleInProject(s3, 'p2', 'u1')).toBeNull();
  });
});
