/**
 * T-ROLE-006: RoleSwitcher component tests
 *
 * Verifies: all 7 role options are rendered, selecting a role calls
 * setUserRole on documentStore.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RoleSwitcher } from './RoleSwitcher';
import { useDocumentStore } from '../stores/documentStore';
import { ROLE_CONFIGS } from '../config/roles';
import type { RoleId } from '../config/roles';

function setRole(role: RoleId | null) {
  useDocumentStore.setState({ userRole: role });
}

describe('T-ROLE-006: RoleSwitcher', () => {
  beforeEach(() => {
    setRole('architect');
  });

  it('renders all 7 role options', () => {
    render(<RoleSwitcher />);
    const select = screen.getByRole('combobox', { name: /dev role override/i }) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toHaveLength(7);
    expect(optionValues).toContain('architect');
    expect(optionValues).toContain('structural');
    expect(optionValues).toContain('mep');
    expect(optionValues).toContain('contractor');
    expect(optionValues).toContain('owner');
    expect(optionValues).toContain('pm');
    expect(optionValues).toContain('admin');
  });

  it('displays the correct label for each role option', () => {
    render(<RoleSwitcher />);
    const select = screen.getByRole('combobox', { name: /dev role override/i }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.text);
    const expectedLabels = Object.values(ROLE_CONFIGS).map((c) => c.label);
    expectedLabels.forEach((label) => {
      expect(optionLabels).toContain(label);
    });
  });

  it('selecting a role calls setUserRole on documentStore', () => {
    render(<RoleSwitcher />);
    const select = screen.getByRole('combobox', { name: /dev role override/i });

    act(() => {
      fireEvent.change(select, { target: { value: 'structural' } });
    });

    expect(useDocumentStore.getState().userRole).toBe('structural');
  });

  it('shows current role as selected option', () => {
    setRole('owner');
    render(<RoleSwitcher />);
    const select = screen.getByRole('combobox', { name: /dev role override/i }) as HTMLSelectElement;
    expect(select.value).toBe('owner');
  });

  it('shows "Dev:" label prefix', () => {
    render(<RoleSwitcher />);
    expect(screen.getByText('Dev:')).toBeInTheDocument();
  });
});
