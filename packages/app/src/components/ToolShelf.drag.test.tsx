/**
 * T-TOOLBAR-001: ToolShelf drag and expand/collapse tests
 *
 * Verifies: drag-to-reposition and double-click expand/collapse behaviours.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ToolShelf } from './ToolShelf';
import { useDraggable } from '../hooks/useDraggable';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

describe('T-TOOLBAR-001: ToolShelf drag and expand/collapse', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocumentStore.getState().setActiveTool('select');
  });

  // ── useDraggable hook ──────────────────────────────────────────────

  it('toolbar starts in default position (not floating)', () => {
    const { result } = renderHook(() => useDraggable());
    expect(result.current.isDragging).toBe(false);
    // No saved position → pos is null
    expect(result.current.pos).toBeNull();
  });

  it('mousedown + mousemove on drag handle starts drag', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.dragHandleProps.onMouseDown(
        new MouseEvent('mousedown', { clientX: 50, clientY: 100 }) as unknown as React.MouseEvent,
      );
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 130 }));
    });

    expect(result.current.isDragging).toBe(true);
  });

  it('position updates during drag', () => {
    const { result } = renderHook(() => useDraggable({ initialPos: { x: 10, y: 20 } }));

    act(() => {
      result.current.dragHandleProps.onMouseDown(
        new MouseEvent('mousedown', { clientX: 10, clientY: 20 }) as unknown as React.MouseEvent,
      );
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 80 }));
    });

    expect(result.current.pos).not.toBeNull();
    expect(result.current.pos?.x).toBe(50);
    expect(result.current.pos?.y).toBe(80);
  });

  it('drag ends on mouseup and position is persisted to localStorage', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.dragHandleProps.onMouseDown(
        new MouseEvent('mousedown', { clientX: 0, clientY: 0 }) as unknown as React.MouseEvent,
      );
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 200 }));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.isDragging).toBe(false);
    const stored = JSON.parse(localStorage.getItem('opencad-toolshelf-pos') ?? 'null');
    expect(stored).toMatchObject({ x: 120, y: 200 });
  });

  // ── ToolShelf component ────────────────────────────────────────────

  it('double-click on toolshelf toggles expanded state', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(shelf).toBeInTheDocument();

    // Initially compact (not expanded)
    expect(shelf).not.toHaveClass('toolshelf--expanded');

    // First double-click → expanded
    fireEvent.dblClick(shelf);
    expect(shelf).toHaveClass('toolshelf--expanded');

    // Second double-click → compact again
    fireEvent.dblClick(shelf);
    expect(shelf).not.toHaveClass('toolshelf--expanded');
  });

  it('expanded mode renders tool name labels', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;

    // Expand
    fireEvent.dblClick(shelf);

    // Tool names should now be visible (at least "Select" in default Modify category)
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('compact mode shows only icons (no tool-name spans)', () => {
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;

    // Start compact
    expect(document.querySelectorAll('.tool-name').length).toBe(0);

    // Expand then collapse
    fireEvent.dblClick(shelf);
    expect(document.querySelectorAll('.tool-name').length).toBeGreaterThan(0);

    fireEvent.dblClick(shelf);
    expect(document.querySelectorAll('.tool-name').length).toBe(0);
  });

  it('position resets to dock when double-clicked from expanded mode', () => {
    // Simulate a saved floating position
    localStorage.setItem('opencad-toolshelf-pos', JSON.stringify({ x: 200, y: 300 }));
    localStorage.setItem('opencad-toolshelf-expanded', JSON.stringify(true));

    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;

    // Should start expanded and floating
    expect(shelf).toHaveClass('toolshelf--expanded');
    expect(shelf).toHaveClass('toolshelf--floating');

    // Double-click while expanded → collapse AND reset position
    fireEvent.dblClick(shelf);
    expect(shelf).not.toHaveClass('toolshelf--expanded');
    expect(shelf).not.toHaveClass('toolshelf--floating');

    const stored = localStorage.getItem('opencad-toolshelf-pos');
    expect(stored).toBeNull();
  });

  it('renders a drag handle element', () => {
    render(<ToolShelf />);
    const handle = document.querySelector('.toolshelf-drag-handle');
    expect(handle).toBeInTheDocument();
  });

  it('floating class is applied when a saved position exists', () => {
    localStorage.setItem('opencad-toolshelf-pos', JSON.stringify({ x: 50, y: 60 }));
    render(<ToolShelf />);
    const shelf = document.querySelector('.toolshelf') as HTMLElement;
    expect(shelf).toHaveClass('toolshelf--floating');
  });
});
