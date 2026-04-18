/**
 * T-SUB-017: Tab close during pending sync → verify prevented
 * T-SUB-018: Desktop close during pending sync → verify prevented
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCloseGuard,
  shouldPreventClose,
  registerBeforeUnloadGuard,
  unregisterBeforeUnloadGuard,
} from './close-guard';

// ──────────────────────────────────────────────────────────────
// T-SUB-017: Tab close during pending sync
// ──────────────────────────────────────────────────────────────
describe('T-SUB-017: Tab close during pending sync', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addEventListenerSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let removeEventListenerSpy: any;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shouldPreventClose returns false when no pending ops', () => {
    expect(shouldPreventClose(0)).toBe(false);
  });

  it('shouldPreventClose returns true when there are pending ops', () => {
    expect(shouldPreventClose(1)).toBe(true);
    expect(shouldPreventClose(10)).toBe(true);
  });

  it('registerBeforeUnloadGuard attaches a beforeunload listener', () => {
    const guard = createCloseGuard(() => 1);
    registerBeforeUnloadGuard(guard);
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unregisterBeforeUnloadGuard(guard);
  });

  it('unregisterBeforeUnloadGuard removes the beforeunload listener', () => {
    const guard = createCloseGuard(() => 1);
    registerBeforeUnloadGuard(guard);
    unregisterBeforeUnloadGuard(guard);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('beforeunload handler sets returnValue when pending ops exist', () => {
    const guard = createCloseGuard(() => 3);
    registerBeforeUnloadGuard(guard);

    const event = new Event('beforeunload') as BeforeUnloadEvent & { returnValue: string };
    event.returnValue = '';

    // Simulate the beforeunload event
    window.dispatchEvent(event);
    expect(event.returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');

    unregisterBeforeUnloadGuard(guard);
  });

  it('beforeunload handler does NOT set returnValue when no pending ops', () => {
    const guard = createCloseGuard(() => 0);
    registerBeforeUnloadGuard(guard);

    const event = new Event('beforeunload') as BeforeUnloadEvent & { returnValue: string };
    event.returnValue = '';

    window.dispatchEvent(event);
    expect(event.returnValue).toBe('');

    unregisterBeforeUnloadGuard(guard);
  });

  it('createCloseGuard returns guard with getPendingCount', () => {
    const guard = createCloseGuard(() => 5);
    expect(guard.getPendingCount()).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────
// T-SUB-018: Desktop close during pending sync
// ──────────────────────────────────────────────────────────────
describe('T-SUB-018: Desktop close during pending sync', () => {
  it('createCloseGuard with custom handler calls handler on close attempt', () => {
    const onClose = vi.fn().mockReturnValue(false); // false = prevent close
    const guard = createCloseGuard(() => 2, { onCloseAttempt: onClose });

    const prevented = guard.handleCloseAttempt();
    expect(onClose).toHaveBeenCalledWith(2);
    expect(prevented).toBe(true);
  });

  it('createCloseGuard allows close when no pending ops even with handler', () => {
    const onClose = vi.fn().mockReturnValue(false);
    const guard = createCloseGuard(() => 0, { onCloseAttempt: onClose });

    const prevented = guard.handleCloseAttempt();
    // 0 pending ops → not prevented, handler not called
    expect(onClose).not.toHaveBeenCalled();
    expect(prevented).toBe(false);
  });

  it('handleCloseAttempt returns false when no pending ops', () => {
    const guard = createCloseGuard(() => 0);
    expect(guard.handleCloseAttempt()).toBe(false);
  });

  it('handleCloseAttempt returns true when pending ops exist (default handler)', () => {
    const guard = createCloseGuard(() => 5);
    expect(guard.handleCloseAttempt()).toBe(true);
  });

  it('guard reflects live pending count changes', () => {
    let count = 0;
    const guard = createCloseGuard(() => count);

    expect(guard.handleCloseAttempt()).toBe(false);

    count = 3;
    expect(guard.handleCloseAttempt()).toBe(true);

    count = 0;
    expect(guard.handleCloseAttempt()).toBe(false);
  });
});
