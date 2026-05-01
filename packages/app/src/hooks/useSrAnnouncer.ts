/**
 * T-A11Y-01: Screen reader announcer.
 *
 * Returns a ref-backed `announce(message)` function that pushes updates
 * into the aria-live="polite" region rendered by AppLayout. Calls are
 * throttled to 500 ms so rapid selection changes don't flood the AT.
 */
import { useCallback, useRef } from 'react';

const THROTTLE_MS = 500;

export function useSrAnnouncer(): (message: string) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string>('');

  const announce = useCallback((message: string) => {
    pendingRef.current = message;
    if (timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const el = document.getElementById('sr-announcer');
      if (!el) return;
      // Toggle empty → message so the live region fires even for repeated
      // identical strings (e.g. "1 element selected" twice in a row).
      el.textContent = '';
      requestAnimationFrame(() => { el.textContent = pendingRef.current; });
    }, THROTTLE_MS);
  }, []);

  return announce;
}
