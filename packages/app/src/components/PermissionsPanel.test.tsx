import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionsPanel, type ProjectMember } from './PermissionsPanel';
expect.extend(jestDomMatchers);

describe('T-AUTH-003: PermissionsPanel', () => {
  const onUpdateRole = vi.fn();
  const onInvite = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const members: ProjectMember[] = [
    { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: 'owner' },
    { userId: 'u2', name: 'Bob', email: 'bob@example.com', role: 'editor' },
    { userId: 'u3', name: 'Carol', email: 'carol@example.com', role: 'viewer' },
  ];

  it('renders Permissions header', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    expect(screen.getByText(/permissions|team members/i)).toBeInTheDocument();
  });

  it('shows member names', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('shows role for each member', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    expect(screen.getAllByText(/owner/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/editor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/viewer/i).length).toBeGreaterThan(0);
  });

  it('shows role selector for non-owner members', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('calls onUpdateRole when role changed', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'viewer' } });
    expect(onUpdateRole).toHaveBeenCalled();
  });

  it('shows Remove button for non-owner members', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    expect(screen.getAllByRole('button', { name: /remove/i }).length).toBeGreaterThan(0);
  });

  it('calls onRemove when Remove clicked', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]!);
    expect(onRemove).toHaveBeenCalled();
  });

  it('shows invite email input', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('calls onInvite with email and role', () => {
    render(<PermissionsPanel members={members} onUpdateRole={onUpdateRole} onInvite={onInvite} onRemove={onRemove} />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /invite/i }));
    expect(onInvite).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
  });
});
