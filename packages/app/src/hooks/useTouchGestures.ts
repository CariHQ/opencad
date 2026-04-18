import { useEffect, useRef } from 'react';

// ─── Public API ────────────────────────────────────────────────────────────

export interface TouchGestureState {
  isPinching: boolean;
  scale: number;       // current pinch scale (1.0 = no zoom)
  rotation: number;    // rotation in radians (two-finger rotate)
  panDelta: { x: number; y: number };
}

export interface UseTouchGesturesOptions {
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  onPan?: (delta: { x: number; y: number }) => void;
  onRotate?: (angle: number) => void;
  onTap?: (point: { x: number; y: number }) => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TAP_MAX_DURATION_MS  = 200;
const TAP_MAX_MOVEMENT_PX  = 10;
const DOUBLE_TAP_MAX_GAP_MS = 300;

// ─── Helpers ───────────────────────────────────────────────────────────────

function pinchDistance(t0: Touch, t1: Touch): number {
  return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
}

function pinchCenter(t0: Touch, t1: Touch): { x: number; y: number } {
  return {
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  };
}

function pinchAngle(t0: Touch, t1: Touch): number {
  return Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  options: UseTouchGesturesOptions,
): void {
  // Keep a stable ref to the latest options so event handlers never go stale.
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // ── Per-gesture mutable state (no React re-renders needed) ────────────

    // Single-finger pan
    let panActive     = false;
    let panLastX      = 0;
    let panLastY      = 0;
    let panMaxMovePx  = 0;      // track total movement for tap detection
    let panStartX     = 0;
    let panStartY     = 0;
    let touchStartTime = 0;

    // Two-finger pinch / rotate
    let pinchActive       = false;
    let pinchStartDist    = 0;
    let pinchLastAngle    = 0;

    // Double-tap
    let lastTapTime   = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let lastTapPoint  = { x: 0, y: 0 };

    // ── touchstart ────────────────────────────────────────────────────────

    const handleTouchStart = (ev: TouchEvent): void => {
      ev.preventDefault();

      if (ev.touches.length === 1) {
        const t = ev.touches[0]!;
        panActive      = true;
        panLastX       = t.clientX;
        panLastY       = t.clientY;
        panStartX      = t.clientX;
        panStartY      = t.clientY;
        panMaxMovePx   = 0;
        touchStartTime = Date.now();
        pinchActive    = false;
      } else if (ev.touches.length === 2) {
        panActive   = false;
        pinchActive = true;
        const t0    = ev.touches[0]!;
        const t1    = ev.touches[1]!;
        pinchStartDist  = pinchDistance(t0, t1);
        pinchLastAngle  = pinchAngle(t0, t1);
      }
    };

    // ── touchmove ─────────────────────────────────────────────────────────

    const handleTouchMove = (ev: TouchEvent): void => {
      ev.preventDefault();

      if (ev.touches.length === 1 && panActive) {
        const t  = ev.touches[0]!;
        const dx = t.clientX - panLastX;
        const dy = t.clientY - panLastY;

        // Track maximum movement for tap classification
        const totalDx = t.clientX - panStartX;
        const totalDy = t.clientY - panStartY;
        panMaxMovePx = Math.hypot(totalDx, totalDy);

        panLastX = t.clientX;
        panLastY = t.clientY;

        optsRef.current.onPan?.({ x: dx, y: dy });

      } else if (ev.touches.length === 2 && pinchActive) {
        const t0 = ev.touches[0]!;
        const t1 = ev.touches[1]!;

        const newDist  = pinchDistance(t0, t1);
        const newAngle = pinchAngle(t0, t1);
        const center   = pinchCenter(t0, t1);

        if (pinchStartDist > 0) {
          const scale = newDist / pinchStartDist;
          optsRef.current.onPinch?.(scale, center);
        }

        const angleDelta = newAngle - pinchLastAngle;
        pinchLastAngle = newAngle;
        if (Math.abs(angleDelta) > 0.01) {
          optsRef.current.onRotate?.(angleDelta);
        }
      }
    };

    // ── touchend ──────────────────────────────────────────────────────────

    const handleTouchEnd = (ev: TouchEvent): void => {
      ev.preventDefault();

      if (ev.changedTouches.length === 1 && panActive) {
        panActive = false;

        const duration = Date.now() - touchStartTime;
        const t        = ev.changedTouches[0]!;

        const isShortEnough  = duration <= TAP_MAX_DURATION_MS;
        const isSmallEnough  = panMaxMovePx <= TAP_MAX_MOVEMENT_PX;

        if (isShortEnough && isSmallEnough) {
          const tapPoint = { x: panStartX, y: panStartY };

          // Double-tap check
          const gap = Date.now() - lastTapTime;
          if (gap <= DOUBLE_TAP_MAX_GAP_MS && lastTapTime > 0) {
            lastTapTime = 0;
            optsRef.current.onDoubleTap?.({ x: t.clientX, y: t.clientY });
          } else {
            lastTapTime  = Date.now();
            lastTapPoint = tapPoint;
            optsRef.current.onTap?.(tapPoint);
          }
        }
      }

      if (ev.touches.length < 2) {
        pinchActive    = false;
        pinchStartDist = 0;
      }
    };

    // ── Register events ───────────────────────────────────────────────────

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd,   { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart, false);
      el.removeEventListener('touchmove',  handleTouchMove,  false);
      el.removeEventListener('touchend',   handleTouchEnd,   false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementRef]);
}
