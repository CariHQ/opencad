/**
 * T-DOC-007: Undo/redo keyboard shortcut hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUndoRedo } from './useUndoRedo';

describe('T-DOC-007: useUndoRedo', () => {
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls undo on Ctrl+Z when canUndo is true', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: true, canRedo: false }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(mockUndo).toHaveBeenCalledTimes(1);
  });

  it('calls undo on Meta+Z (Mac) when canUndo is true', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: true, canRedo: false }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }));
    expect(mockUndo).toHaveBeenCalledTimes(1);
  });

  it('does not call undo when canUndo is false', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: false, canRedo: false }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Y when canRedo is true', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: false, canRedo: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('calls redo on Ctrl+Shift+Z when canRedo is true', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: false, canRedo: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }));
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('calls redo on Meta+Shift+Z (Mac) when canRedo is true', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: false, canRedo: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true, bubbles: true }));
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('does not call redo when canRedo is false', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: false, canRedo: false }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));
    expect(mockRedo).not.toHaveBeenCalled();
  });

  it('does not fire on plain z key', () => {
    renderHook(() => useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: true, canRedo: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useUndoRedo({ undo: mockUndo, redo: mockRedo, canUndo: true, canRedo: true })
    );
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
