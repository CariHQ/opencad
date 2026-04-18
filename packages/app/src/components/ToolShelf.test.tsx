/**
 * T-UI-001: ToolShelf component tests
 *
 * Verifies: tool categories render, tool buttons activate on click,
 * active tool is reflected in store and UI, role-based gating.
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

  it('renders all category buttons', () => {
    render(<ToolShelf />);
    expect(screen.getByTitle('Modify')).toBeInTheDocument();
    expect(screen.getByTitle('Draw')).toBeInTheDocument();
    expect(screen.getByTitle('Structure')).toBeInTheDocument();
    expect(screen.getByTitle('Openings')).toBeInTheDocument();
    expect(screen.getByTitle('Annotate')).toBeInTheDocument();
  });

  it('shows Select tool by default in Modify category', () => {
    render(<ToolShelf />);
    const selectBtn = screen.getByTitle('Select (V)');
    expect(selectBtn).toBeInTheDocument();
    expect(selectBtn).toHaveClass('active');
  });

  it('switches tools when a tool button is clicked', () => {
    render(<ToolShelf />);

    // Switch to Draw category first
    fireEvent.click(screen.getByTitle('Draw'));
    const lineBtn = screen.getByTitle('Line (L)');
    fireEvent.click(lineBtn);

    expect(useDocumentStore.getState().activeTool).toBe('line');
    expect(lineBtn).toHaveClass('active');
  });

  it('switches category and shows filtered tools', () => {
    render(<ToolShelf />);

    fireEvent.click(screen.getByTitle('Structure'));

    expect(screen.getByTitle('Wall (W)')).toBeInTheDocument();
    expect(screen.getByTitle('Column (K)')).toBeInTheDocument();
    // Draw tools should not be visible
    expect(screen.queryByTitle('Line (L)')).not.toBeInTheDocument();
  });


  it('marks the active category button with active class', () => {
    render(<ToolShelf />);
    const drawBtn = screen.getByTitle('Draw');
    fireEvent.click(drawBtn);
    expect(drawBtn).toHaveClass('active');
  });

  // T-ROLE-002: role-based gating
  describe('role-based tool gating (T-ROLE-002)', () => {
    it('architect sees all categories and all tools', () => {
      setRole('architect');
      render(<ToolShelf />);
      // Structure category should exist
      fireEvent.click(screen.getByTitle('Structure'));
      expect(screen.getByTitle('Wall (W)')).toBeInTheDocument();
    });

    it('owner sees empty shelf (no tools, no categories)', () => {
      setRole('owner');
      render(<ToolShelf />);
      // No category buttons with known names
      expect(screen.queryByTitle('Structure')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
    });

    it('structural engineer sees dimension tool but not wall tool', () => {
      setRole('structural');
      render(<ToolShelf />);
      // Structural has no 'structure' category tools — that category button should be absent
      expect(screen.queryByTitle('Structure')).not.toBeInTheDocument();
      // Dimension is in annotation category
      fireEvent.click(screen.getByTitle('Annotate'));
      expect(screen.getByTitle('Dimension (M)')).toBeInTheDocument();
      // Wall tool must never appear
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
    });

    it('contractor sees select tool but not wall tool', () => {
      setRole('contractor');
      render(<ToolShelf />);
      // Contractor has no 'structure' category tools
      expect(screen.queryByTitle('Structure')).not.toBeInTheDocument();
      // Modify category has select
      fireEvent.click(screen.getByTitle('Modify'));
      expect(screen.getByTitle('Select (V)')).toBeInTheDocument();
      // Wall tool must never appear
      expect(screen.queryByTitle('Wall (W)')).not.toBeInTheDocument();
    });
  });
});
