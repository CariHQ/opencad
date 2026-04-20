/**
 * T-MOD-003 coord-box integration test (GitHub issue #296).
 *
 *   T-MOD-003-012 — start-point + length + angle commits a wall of that
 *                   exact length at that angle.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from './useViewport';
import { useDocumentStore } from '../stores/documentStore';

describe('T-MOD-003: useViewport.commitFromCoordBox', () => {
  beforeEach(() => {
    // Seed a fresh document via the store's own initProject so model + doc
    // are both set (addElement needs model non-null).
    useDocumentStore.getState().initProject('t-mod-003-test', 'u1');
  });

  it('T-MOD-003-012: commits a wall of exact length at exact angle', () => {
    const { result } = renderHook(() => useViewport());

    // Activate wall tool + set a fake drawingState with a start point.
    act(() => {
      useDocumentStore.getState().setActiveTool('wall');
    });

    // Fake a drag in progress by directly using the hook's exposed method
    // is not possible — drawingState is internal. Instead we simulate the
    // pointerdown by calling handleCanvasMouseDown; but that needs a DOM
    // canvas. For the integration we monkey-patch the hook's return to
    // call commitFromCoordBox with a known start point set via mousedown.
    //
    // Simpler: assert commitFromCoordBox is callable and tolerates a
    // missing start point (no-op), and that after a mousedown + coord
    // commit the document contains a wall of the expected geometry.

    // Begin drawing at (0,0) by calling handleCanvasMouseDown on a stub
    // canvas element.
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 }),
    });
    // @ts-expect-error — forcing ref for test
    result.current.canvasRef.current = canvas;

    act(() => {
      result.current.handleCanvasMouseDown({
        button: 0, clientX: 100, clientY: 100,
        preventDefault: () => {}, stopPropagation: () => {},
      } as unknown as React.MouseEvent<HTMLCanvasElement>);
    });

    // Now commit from the coord box with length 4500, angle 0.
    act(() => {
      result.current.commitFromCoordBox({ length: 4500, angle: 0 });
    });

    const elements = useDocumentStore.getState().document?.content.elements ?? {};
    const walls = Object.values(elements).filter((e) => e.type === 'wall');
    expect(walls).toHaveLength(1);
    const w = walls[0]!;
    const sx = (w.properties as Record<string, { value: number }>)['StartX']!.value;
    const sy = (w.properties as Record<string, { value: number }>)['StartY']!.value;
    const ex = (w.properties as Record<string, { value: number }>)['EndX']!.value;
    const ey = (w.properties as Record<string, { value: number }>)['EndY']!.value;
    // End should be exactly 4500 mm along +X from start.
    expect(ex - sx).toBeCloseTo(4500, 1);
    expect(ey - sy).toBeCloseTo(0,    1);
  });
});
