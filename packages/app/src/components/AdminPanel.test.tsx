/**
 * T-ROLE-007: AdminPanel tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi } from 'vitest';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPanel } from './AdminPanel';
import { getCanForRole } from '../hooks/useRole';

describe('T-ROLE-007: AdminPanel', () => {
  it('renders a list of project members', () => {
    render(<AdminPanel can={getCanForRole('admin')} />);
    // At least one member row should appear
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('renders a role dropdown per member', () => {
    render(<AdminPanel can={getCanForRole('admin')} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('is visible when role is admin (can panel:admin)', () => {
    render(<AdminPanel can={getCanForRole('admin')} />);
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });

  it('is not visible when role is not admin', () => {
    render(<AdminPanel can={getCanForRole('architect')} />);
    expect(screen.queryByTestId('admin-panel')).toBeNull();
  });

  it('calls setMemberRole when dropdown changed', () => {
    const setMemberRole = vi.fn();
    render(<AdminPanel can={getCanForRole('admin')} setMemberRole={setMemberRole} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'architect' } });
    expect(setMemberRole).toHaveBeenCalled();
  });

  it('shows member names in the list', () => {
    render(<AdminPanel can={getCanForRole('admin')} />);
    // Should show at least one name (from mock data)
    const panel = screen.getByTestId('admin-panel');
    expect(panel.textContent).not.toBe('');
  });
});
