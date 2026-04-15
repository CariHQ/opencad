/**
 * Close Guard
 * T-SUB-017: Prevent tab close during pending sync
 * T-SUB-018: Prevent desktop window close during pending sync
 */

const UNSAVED_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?';

export interface CloseGuardOptions {
  /** Called when a close is attempted with N pending ops. Return false to prevent. */
  onCloseAttempt?: (pendingCount: number) => boolean;
}

export interface CloseGuard {
  getPendingCount: () => number;
  handleCloseAttempt: () => boolean; // returns true if close was prevented
  _handler: (e: BeforeUnloadEvent) => void;
}

/** Returns true when a close/navigation should be blocked. */
export function shouldPreventClose(pendingCount: number): boolean {
  return pendingCount > 0;
}

/**
 * Create a close guard that wraps a live pending-count source.
 * Used for both browser (beforeunload) and desktop (Tauri window-close) scenarios.
 */
export function createCloseGuard(
  getPendingCount: () => number,
  options: CloseGuardOptions = {}
): CloseGuard {
  const handler = (e: BeforeUnloadEvent): void => {
    if (shouldPreventClose(getPendingCount())) {
      e.preventDefault();
      (e as BeforeUnloadEvent & { returnValue: string }).returnValue = UNSAVED_MESSAGE;
    }
  };

  const handleCloseAttempt = (): boolean => {
    const count = getPendingCount();
    if (!shouldPreventClose(count)) return false;

    if (options.onCloseAttempt) {
      options.onCloseAttempt(count);
    }
    return true;
  };

  return { getPendingCount, handleCloseAttempt, _handler: handler };
}

/** Register the guard's beforeunload listener on the browser window. */
export function registerBeforeUnloadGuard(guard: CloseGuard): void {
  window.addEventListener('beforeunload', guard._handler);
}

/** Remove the guard's beforeunload listener from the browser window. */
export function unregisterBeforeUnloadGuard(guard: CloseGuard): void {
  window.removeEventListener('beforeunload', guard._handler);
}
