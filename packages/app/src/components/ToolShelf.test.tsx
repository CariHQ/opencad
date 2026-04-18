/**
 * T-UI-001: ToolShelf component tests
 *
 * Verifies: all allowed tools render, active tool is reflected in store and UI,
 * role-based gating hides/shows tools per role.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolShelf } from './ToolShelf';
import { useDocumentStore } from '../stores/documentStore';
import type { RoleId } from '../config/roles';

function setRole(role: RoleId | null) {
  useDocumentStore.setState({ userRole: role });
}

describe('T-UI-001: ToolShelf', () => {
  beforeEach(() => {
    useDocumentStore.getState().setActiveTool('select');
    setRole(null); // architect (default)
  });

  afterEach(() => {
    setRole(null);
  });

  it('renders Select tool by default and marks it active', () => {
    render(<ToolShelf />);
    const selectBtn = screen.getByTitle('Select (V)');
    expect(selectBtn).toBeInTheDocument();
    expect(selectBtn).toHaveClass('active');
  });

  it('renders all architect tools as a flat list', () => {
    setRole('architect');
    render(<ToolShelf />);
    expect(screen.getByTitle('Wall (W)')).toBeInTheDocument();
    expect(screen.getByTitle('Line (L)')).toBeInTheDocument();
    expect(screen.getByTitle('Dimension (M)')).toBeInTheDocument();
    expect(screen.getByTitle('Door (D)')).toBeInTheDocument();
  });

  it('switches tool on click and marks it active', () => {
    render(<ToolShelf />);
    const lineBtn = screen.getByTitle('Line (L)');
    fireEvent.click(lineBtn);
    expect(useDocumentStore.getState().activeTool).toBe('line');
    expect(lineBtn).toHaveClass('active');
  });

  it('deactivates previous tool when a new one is clicked', () => {
    render(<ToolShelf />);
    const selectBtn = screen.getByTitle('Select (V)');
    const lineBtn = screen.getByTitle('Line (L)');
    fireEvent.click(lineBtn);
    expect(selectBtn).not.toHaveClass('active');
    expect(lineBtn).toHaveClass('active');
  });

  // T-ROLE-002: role-based gating
  describe('role-based tool gating (T-ROLE-002)', () => {
    it('architect sees all tools including wall', () => {
      setRole('architect');
      render(<ToolShelf />);
      expect(screen.getByTitle('Wall (W)')).toBeInTheDocument();
    });

    it('owner sees empty shelf (no tools)', () => {
      setRole('owner');
      render(<ToolShelf />);
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Select (V)')).not.toBeInTheDocument();
    });

    it('structural engineer sees dimension tool but not wall tool', () => {
      setRole('structural');
      render(<ToolShelf />);
      expect(screen.getByTitle('Dimension (M)')).toBeInTheDocument();
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
    });

    it('contractor sees select tool but not wall tool', () => {
      setRole('contractor');
      render(<ToolShelf />);
      expect(screen.getByTitle('Select (V)')).toBeInTheDocument();
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
    });
  });
});
