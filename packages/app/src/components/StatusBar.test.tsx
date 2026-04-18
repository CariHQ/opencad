/**
 * T-UI-003: StatusBar component tests
 *
 * Verifies: online/offline indicator, save state, selection count.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useDocumentStore } from '../stores/documentStore';
import type { RoleId } from '../config/roles';

function setRole(role: RoleId | null) {
  useDocumentStore.setState({ userRole: role });
}

describe('T-UI-003: StatusBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.setState({
      isOnline: true,
      isSaving: false,
      lastSaved: null,
      selectedIds: [],
      userRole: null,
    });
    useDocumentStore.getState().initProject('test-project', 'test-user');
  });

  afterEach(() => {
    setRole(null);
  });

  it('shows Connected when online', () => {
    render(<StatusBar />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Offline when disconnected', () => {
    useDocumentStore.setState({ isOnline: false });
    render(<StatusBar />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows Syncing when isSaving is true', () => {
    useDocumentStore.setState({ isSaving: true });
    render(<StatusBar />);
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('shows element count from document', () => {
    render(<StatusBar />);
    expect(screen.getByText(/elements/)).toBeInTheDocument();
  });

  it('shows selection count when items are selected', () => {
    useDocumentStore.setState({ selectedIds: ['a', 'b', 'c'] });
    render(<StatusBar />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('does not show selection count when nothing is selected', () => {
    useDocumentStore.setState({ selectedIds: [] });
    render(<StatusBar />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  // T-ROLE-006: role badge (query by CSS class to avoid matching dropdown options)
  it('shows Architect role badge by default (T-ROLE-006)', () => {
    setRole(null); // defaults to architect
    render(<StatusBar />);
    const badge = document.querySelector('.role-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Architect');
  });

  it('shows structural engineer role badge when role is structural', () => {
    setRole('structural');
    render(<StatusBar />);
    const badge = document.querySelector('.role-badge');
    expect(badge?.textContent).toBe('Structural Engineer');
  });

  it('shows Owner / Client role badge for owner role', () => {
    setRole('owner');
    render(<StatusBar />);
    const badge = document.querySelector('.role-badge');
    expect(badge?.textContent).toBe('Owner / Client');
  });
});
