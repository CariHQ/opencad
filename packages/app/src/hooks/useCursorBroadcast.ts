/**
 * useCursorBroadcast — attaches a viewport-wide mousemove listener and
 * pipes throttled viewport-relative cursor positions into the sync
 * adapter's presence channel. Safe to call even when the sync-rs WASM
 * failed to load or the WebSocket isn't open — crdtUpdatePresence is a
 * no-op in both cases.
 */
import { useEffect, type RefObject } from 'react';
import { crdtUpdatePresence } from '../lib/syncAdapter';

/** Min milliseconds between presence sends. 50 ms = 20 Hz. */
const THROTTLE_MS = 50;

export function useCursorBroadcast(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastSent = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSent < THROTTLE_MS) return;
      lastSent = now;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      crdtUpdatePresence(x, y);
    };

    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
    };
  }, [containerRef]);
}
