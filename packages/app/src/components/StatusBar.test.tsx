/**
 * T-UI-003: StatusBar component tests
 *
 * Verifies: online/offline indicator, save state, selection count.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

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
});
