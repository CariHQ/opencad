/**
 * useDraggable — drag-to-reposition hook.
 *
 * Returns `pos` (the current absolute position), `isDragging`, and
 * `dragHandleProps` (attach to the drag-handle element).
 *
 * Position is persisted to localStorage under `'opencad-toolshelf-pos'`.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface Position {
  x: number;
  y: number;
}

export interface DraggableOptions {
  /** Initial position; ignored when a saved position exists in localStorage. */
  initialPos?: Position;
  /** localStorage key to persist the position. Defaults to 'opencad-toolshelf-pos'. */
  storageKey?: string;
}

export interface DraggableResult {
  pos: Position | null;
  isDragging: boolean;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent | MouseEvent) => void;
  };
  resetPos: () => void;
}

const DEFAULT_KEY = 'opencad-toolshelf-pos';

function readStoredPos(key: string): Position | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'x' in parsed &&
      'y' in parsed &&
      typeof (parsed as Record<string, unknown>).x === 'number' &&
      typeof (parsed as Record<string, unknown>).y === 'number'
    ) {
      return parsed as Position;
    }
    return null;
  } catch {
    return null;
  }
}

export function useDraggable(options?: DraggableOptions): DraggableResult {
  const storageKey = options?.storageKey ?? DEFAULT_KEY;

  const [pos, setPos] = useState<Position | null>(() => {
    const saved = readStoredPos(storageKey);
    return saved ?? options?.initialPos ?? null;
  });

  const [isDragging, setIsDragging] = useState(false);

  // Track the offset between pointer-down position and current pos during drag
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newPos: Position = {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      };
      setPos(newPos);
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    // Persist final position
    setPos((current) => {
      if (current !== null) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
          // ignore storage errors
        }
      }
      return current;
    });
  }, [storageKey]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      // Calculate offset: pointer position relative to current element position
      const currentPos = pos ?? { x: 0, y: 0 };
      dragOffset.current = {
        x: e.clientX - currentPos.x,
        y: e.clientY - currentPos.y,
      };
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    [pos],
  );

  const resetPos = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setPos(null);
    setIsDragging(false);
    isDraggingRef.current = false;
  }, [storageKey]);

  return {
    pos,
    isDragging,
    dragHandleProps: { onMouseDown },
    resetPos,
  };
}
