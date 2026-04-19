/**
 * T-TOOLBAR-001: ToolShelf expand/collapse tests
 *
 * Verifies: double-click expand/collapse behaviour for the docked toolbar.
 * Note: drag-to-float was removed — ToolShelf is always docked.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolShelf } from './ToolShelf';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

describe('T-TOOLBAR-001: ToolShelf expand/collapse', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.getState().setActiveTool('select');
  });

  it('double-click on toolshelf toggles expanded state', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(shelf).toBeInTheDocument();
    expect(shelf).not.toHaveClass('toolshelf--expanded');
    fireEvent.dblClick(shelf);
    expect(shelf).toHaveClass('toolshelf--expanded');
    fireEvent.dblClick(shelf);
    expect(shelf).not.toHaveClass('toolshelf--expanded');
  });

  it('expanded mode renders tool name labels', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    fireEvent.dblClick(shelf);
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('compact mode shows only icons (no tool-name spans)', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(document.querySelectorAll('.tool-name').length).toBe(0);
    fireEvent.dblClick(shelf);
    expect(document.querySelectorAll('.tool-name').length).toBeGreaterThan(0);
    fireEvent.dblClick(shelf);
    expect(document.querySelectorAll('.tool-name').length).toBe(0);
  });

  it('expanded state persists via localStorage', () => {
    localStorage.setItem('opencad-toolshelf-expanded', JSON.stringify(true));
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(shelf).toHaveClass('toolshelf--expanded');
  });

  it('does not render a drag handle (toolbar is always docked)', () => {
    render(<ToolShelf />);
    expect(document.querySelector('.toolshelf-drag-handle')).toBeNull();
  });

  it('never applies floating class, even when stale position exists in localStorage', () => {
    localStorage.setItem('opencad-toolshelf-pos', JSON.stringify({ x: 50, y: 60 }));
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(shelf).not.toHaveClass('toolshelf--floating');
  });
});
