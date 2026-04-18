/**
 * T-ROLE-007: AdminPanel tests
 *
 * 8 tests covering role assignment UI — visibility, member list,
 * dropdowns, all 7 roles, self-hiding, empty state, and display.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi } from 'vitest';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPanel, type AdminMember } from './AdminPanel';
import { getCanForRole } from '../hooks/useRole';

const SAMPLE_MEMBERS: AdminMember[] = [
  { id: 'u1', name: 'Alice Mercer',  role: 'architect'  },
  { id: 'u2', name: 'Bob Tanaka',    role: 'structural' },
  { id: 'u3', name: 'Carol Osei',    role: 'owner'      },
];

describe('T-ROLE-007: AdminPanel', () => {
  /**
   * T-ROLE-007-001: Renders null when can('panel:admin') is false
   */
  it('T-ROLE-007-001: renders null when can(panel:admin) is false', () => {
    render(<AdminPanel can={getCanForRole('architect')} members={SAMPLE_MEMBERS} />);
    expect(screen.queryByTestId('admin-panel')).toBeNull();
  });

  /**
   * T-ROLE-007-002: Renders member list when admin
   */
  it('T-ROLE-007-002: renders member list when admin', () => {
    render(<AdminPanel can={getCanForRole('admin')} members={SAMPLE_MEMBERS} />);
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    expect(screen.getByTestId('member-row-u1')).toBeInTheDocument();
    expect(screen.getByTestId('member-row-u2')).toBeInTheDocument();
    expect(screen.getByTestId('member-row-u3')).toBeInTheDocument();
  });

  /**
   * T-ROLE-007-003: Each member has a role dropdown
   */
  it('T-ROLE-007-003: each member has a role dropdown', () => {
    render(<AdminPanel can={getCanForRole('admin')} members={SAMPLE_MEMBERS} />);
    expect(screen.getByTestId('role-select-u1')).toBeInTheDocument();
    expect(screen.getByTestId('role-select-u2')).toBeInTheDocument();
    expect(screen.getByTestId('role-select-u3')).toBeInTheDocument();
  });

  /**
   * T-ROLE-007-004: Saving after changing dropdown calls onSetRole
   */
  it('T-ROLE-007-004: saving after changing dropdown calls onSetRole', () => {
    const onSetRole = vi.fn();
    render(
      <AdminPanel can={getCanForRole('admin')} members={SAMPLE_MEMBERS} onSetRole={onSetRole} />
    );
    // Change the dropdown for u1
    fireEvent.change(screen.getByTestId('role-select-u1'), { target: { value: 'pm' } });
    // Click Save
    fireEvent.click(screen.getByTestId('save-role-u1'));
    expect(onSetRole).toHaveBeenCalledWith('u1', 'pm');
  });

  /**
   * T-ROLE-007-005: All 7 roles are options in the dropdown
   */
  it('T-ROLE-007-005: all 7 roles are options in the dropdown', () => {
    render(<AdminPanel can={getCanForRole('admin')} members={SAMPLE_MEMBERS} />);
    const select = screen.getByTestId('role-select-u1') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain('admin');
    expect(optionValues).toContain('architect');
    expect(optionValues).toContain('structural');
    expect(optionValues).toContain('mep');
    expect(optionValues).toContain('contractor');
    expect(optionValues).toContain('owner');
    expect(optionValues).toContain('pm');
    expect(optionValues).toHaveLength(7);
  });

  /**
   * T-ROLE-007-006: Admin role hides itself from the list (can't demote yourself)
   */
  it('T-ROLE-007-006: admin hides themselves from the list', () => {
    render(
      <AdminPanel
        can={getCanForRole('admin')}
        members={SAMPLE_MEMBERS}
        currentUserId="u1"
      />
    );
    // u1 is the current user — their row should not appear
    expect(screen.queryByTestId('member-row-u1')).toBeNull();
    // Other members still appear
    expect(screen.getByTestId('member-row-u2')).toBeInTheDocument();
    expect(screen.getByTestId('member-row-u3')).toBeInTheDocument();
  });

  /**
   * T-ROLE-007-007: Empty members list shows empty state
   */
  it('T-ROLE-007-007: empty members list shows empty state', () => {
    render(<AdminPanel can={getCanForRole('admin')} members={[]} />);
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    expect(screen.getByText(/no members/i)).toBeInTheDocument();
  });

  /**
   * T-ROLE-007-008: Member name and current role shown
   */
  it('T-ROLE-007-008: member name and current role shown', () => {
    render(<AdminPanel can={getCanForRole('admin')} members={SAMPLE_MEMBERS} />);
    // Member name visible
    expect(screen.getByText('Alice Mercer')).toBeInTheDocument();
    expect(screen.getByText('Bob Tanaka')).toBeInTheDocument();
    // Current role badge visible (role label from ROLE_CONFIGS)
    // Alice is 'architect' → label 'Architect'
    expect(screen.getAllByText('Architect').length).toBeGreaterThan(0);
  });
});
