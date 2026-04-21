import { describe, it, expect } from 'vitest';
import {
  createInvite, revoke, accept, findPendingForEmail,
} from './invites';

describe('T-INVITE-001: invite queue', () => {
  it('createInvite normalises email and sets pending status', () => {
    const i = createInvite({ orgId: 'o1', email: '  User@Example.com ', role: 'architect', invitedBy: 'admin' });
    expect(i.email).toBe('user@example.com');
    expect(i.status).toBe('pending');
  });

  it('revoke transitions to revoked', () => {
    const i = createInvite({ orgId: 'o1', email: 'a@x', role: 'architect', invitedBy: 'admin' });
    const next = revoke([i], i.id);
    expect(next[0]!.status).toBe('revoked');
  });

  it('accept transitions to accepted', () => {
    const i = createInvite({ orgId: 'o1', email: 'a@x', role: 'architect', invitedBy: 'admin' });
    const next = accept([i], i.id);
    expect(next[0]!.status).toBe('accepted');
  });

  it('findPendingForEmail returns only matching pending invites', () => {
    const a = createInvite({ orgId: 'o1', email: 'a@x', role: 'architect', invitedBy: 'admin' });
    const b = createInvite({ orgId: 'o1', email: 'b@x', role: 'architect', invitedBy: 'admin' });
    const c = createInvite({ orgId: 'o1', email: 'a@x', role: 'architect', invitedBy: 'admin' });
    const accepted = accept([a, b, c], a.id);
    const pending = findPendingForEmail(accepted, 'a@x');
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe(c.id);
  });
});
