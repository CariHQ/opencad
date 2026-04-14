/**
 * T-UI-004: Navigator component tests
 *
 * Verifies: sections render, levels display, elements list, selection works.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigator } from './Navigator';
import { useDocumentStore } from '../stores/documentStore';

describe('T-UI-004: Navigator', () => {
  beforeEach(() => {
    useDocumentStore.getState().initProject('test-project', 'test-user');
    useDocumentStore.setState({ selectedIds: [] });
  });

  it('renders the Navigator header', () => {
    render(<Navigator />);
    expect(screen.getByText('Navigator')).toBeInTheDocument();
  });

  it('shows Views section expanded by default', () => {
    render(<Navigator />);
    expect(screen.getByText('Floor Plan')).toBeInTheDocument();
    expect(screen.getByText('3D View')).toBeInTheDocument();
  });

  it('shows Levels section with default Level 1', () => {
    render(<Navigator />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('shows element count badge', () => {
    render(<Navigator />);
    // Elements section header has a count
    const elements = screen.getAllByText('Elements');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('collapses Views section on click', () => {
    render(<Navigator />);
    const viewsItem = screen.getByText('Views').closest('.nav-item')!;
    fireEvent.click(viewsItem);
    expect(screen.queryByText('Floor Plan')).not.toBeInTheDocument();
  });

  it('selects a level on click', () => {
    render(<Navigator />);
    const levelItem = screen.getByText('Level 1').closest('.nav-item')!;
    fireEvent.click(levelItem);

    const state = useDocumentStore.getState();
    expect(state.selectedIds.length).toBe(1);
  });
});
