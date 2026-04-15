/**
 * T-DOC-007: Keyboard shortcuts for undo/redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
 */
import { useEffect } from 'react';

export interface UseUndoRedoOptions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo({ undo, redo, canUndo, canRedo }: UseUndoRedoOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        if (canUndo) { e.preventDefault(); undo(); }
      } else if (e.key === 'z' && e.shiftKey) {
        if (canRedo) { e.preventDefault(); redo(); }
      } else if (e.key === 'y') {
        if (canRedo) { e.preventDefault(); redo(); }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, canUndo, canRedo]);
}
