/**
 * T-UI-003: StatusBar component tests
 *
 * Verifies: online/offline indicator, save state, selection count.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useDocumentStore } from '../stores/documentStore';

describe('T-UI-003: StatusBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.setState({
      isOnline: true,
      isSaving: false,
      lastSaved: null,
      selectedIds: [],
    });
    useDocumentStore.getState().initProject('test-project', 'test-user');
  });

  it('shows Online when connected', () => {
    render(<StatusBar />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows Offline when disconnected', () => {
    useDocumentStore.setState({ isOnline: false });
    render(<StatusBar />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows Saving... when isSaving is true', () => {
    useDocumentStore.setState({ isSaving: true });
    render(<StatusBar />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
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
});
