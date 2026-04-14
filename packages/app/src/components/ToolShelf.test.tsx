/**
 * T-UI-001: ToolShelf component tests
 *
 * Verifies: tool categories render, tool buttons activate on click,
 * active tool is reflected in store and UI.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolShelf } from './ToolShelf';
import { useDocumentStore } from '../stores/documentStore';

describe('T-UI-001: ToolShelf', () => {
  beforeEach(() => {
    useDocumentStore.getState().setActiveTool('select');
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

  it('displays current active tool name', () => {
    render(<ToolShelf />);
    expect(screen.getByText('select')).toBeInTheDocument();
  });

  it('marks the active category button with active class', () => {
    render(<ToolShelf />);
    const drawBtn = screen.getByTitle('Draw');
    fireEvent.click(drawBtn);
    expect(drawBtn).toHaveClass('active');
  });
});
