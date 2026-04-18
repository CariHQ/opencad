/**
 * T-MOB-002: useTouchGestures hook tests
 *
 * Verifies touch gesture detection: pan, pinch-zoom, tap, double-tap.
 * Uses synthetic Touch/TouchEvent construction compatible with jsdom.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTouchGestures } from './useTouchGestures';

expect.extend(jestDomMatchers);

// ─── Touch event helpers ────────────────────────────────────────────────────

function makeTouch(id: number, x: number, y: number): Touch {
  return {
    identifier: id,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
    target: document.createElement('div'),
    altitudeAngle: 0,
    azimuthAngle: 0,
    touchType: 'direct',
  } as unknown as Touch;
}

function fireTouchEvent(
  el: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: Touch[],
  changedTouches?: Touch[],
): void {
  // jsdom accepts Touch[] for TouchList slots in TouchEventInit, even though
  // the TypeScript DOM lib types them as TouchList. Cast via unknown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init: any = {
    bubbles: true,
    cancelable: true,
    touches,
    changedTouches: changedTouches ?? touches,
  };
  const evt = new TouchEvent(type, init as TouchEventInit);
  el.dispatchEvent(evt);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('T-MOB-002: useTouchGestures — single-finger pan', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('detects single-finger pan from touchmove', () => {
    const onPan = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPan }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 115, 125)]);

    expect(onPan).toHaveBeenCalledWith({ x: 15, y: 25 });
  });

  it('does not fire onPan when second finger is also active (pinch mode)', () => {
    const onPan = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPan }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100), makeTouch(1, 200, 200)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 110, 110), makeTouch(1, 210, 210)]);

    expect(onPan).not.toHaveBeenCalled();
  });

  it('accumulates pan deltas across multiple touchmove events', () => {
    const onPan = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPan }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 110, 110)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 120, 120)]);

    expect(onPan).toHaveBeenCalledTimes(2);
    expect(onPan).toHaveBeenNthCalledWith(1, { x: 10, y: 10 });
    expect(onPan).toHaveBeenNthCalledWith(2, { x: 10, y: 10 });
  });
});

describe('T-MOB-002: useTouchGestures — pinch-zoom', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calculates pinch scale from two touch points', () => {
    const onPinch = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPinch }));

    // Start: 100px apart (50, 50) → (150, 50)
    fireTouchEvent(el, 'touchstart', [makeTouch(0, 50, 50), makeTouch(1, 150, 50)]);
    // Move: 200px apart (0, 50) → (200, 50)  → scale = 200/100 = 2.0
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 0, 50), makeTouch(1, 200, 50)]);

    expect(onPinch).toHaveBeenCalled();
    const [scale] = onPinch.mock.calls[0] as [number, { x: number; y: number }];
    expect(scale).toBeCloseTo(2.0, 1);
  });

  it('reports pinch center as midpoint of two touches', () => {
    const onPinch = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPinch }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 50, 100), makeTouch(1, 150, 100)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 40, 100), makeTouch(1, 160, 100)]);

    expect(onPinch).toHaveBeenCalled();
    const [, center] = onPinch.mock.calls[0] as [number, { x: number; y: number }];
    expect(center.x).toBeCloseTo(100, 0);
    expect(center.y).toBeCloseTo(100, 0);
  });

  it('does not fire onPinch with only one touch', () => {
    const onPinch = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onPinch }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 120, 120)]);

    expect(onPinch).not.toHaveBeenCalled();
  });
});

describe('T-MOB-002: useTouchGestures — tap detection', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('detects tap within 200ms and <10px movement', () => {
    const onTap = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onTap }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    // Advance time to 100ms (within 200ms threshold)
    vi.advanceTimersByTime(100);
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 103, 102)]); // <10px movement

    expect(onTap).toHaveBeenCalledWith({ x: 100, y: 100 });
  });

  it('does not detect tap if touch lasted more than 200ms', () => {
    const onTap = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onTap }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    vi.advanceTimersByTime(300); // exceeds 200ms threshold
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 100, 100)]);

    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not detect tap if finger moved more than 10px', () => {
    const onTap = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onTap }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    vi.advanceTimersByTime(50);
    fireTouchEvent(el, 'touchmove', [makeTouch(0, 115, 100)]); // 15px movement
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 115, 100)]);

    expect(onTap).not.toHaveBeenCalled();
  });
});

describe('T-MOB-002: useTouchGestures — double-tap detection', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('detects double tap within 300ms', () => {
    const onDoubleTap = vi.fn();
    const onTap = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onTap, onDoubleTap }));

    // First tap
    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    vi.advanceTimersByTime(50);
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 100, 100)]);

    // Second tap within 300ms
    vi.advanceTimersByTime(150);
    fireTouchEvent(el, 'touchstart', [makeTouch(0, 102, 101)]);
    vi.advanceTimersByTime(50);
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 102, 101)]);

    expect(onDoubleTap).toHaveBeenCalledWith({ x: 102, y: 101 });
  });

  it('does not detect double tap if second tap is after 300ms', () => {
    const onDoubleTap = vi.fn();
    const ref = { current: el };
    renderHook(() => useTouchGestures(ref, { onDoubleTap }));

    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    vi.advanceTimersByTime(50);
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 100, 100)]);

    vi.advanceTimersByTime(400); // too slow for double-tap
    fireTouchEvent(el, 'touchstart', [makeTouch(0, 100, 100)]);
    vi.advanceTimersByTime(50);
    fireTouchEvent(el, 'touchend', [], [makeTouch(0, 100, 100)]);

    expect(onDoubleTap).not.toHaveBeenCalled();
  });
});

describe('T-MOB-002: useTouchGestures — cleanup', () => {
  it('removes event listeners on unmount', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ref = { current: el };
    const removeSpy = vi.spyOn(el, 'removeEventListener');

    const { unmount } = renderHook(() => useTouchGestures(ref, {}));
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.anything());
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.anything());
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function), expect.anything());

    document.body.removeChild(el);
  });
});
