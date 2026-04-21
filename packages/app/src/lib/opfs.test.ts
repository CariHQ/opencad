/**
 * T-OFF-010: OPFS wrapper graceful-fallback tests.
 *
 * vitest + jsdom don't ship an OPFS implementation, so these tests verify
 * the wrapper's fallback semantics (every call resolves without throwing
 * and reports unavailability cleanly). The live OPFS path is exercised in
 * the browser via e2e once an OPFS-capable target is added.
 */
import { describe, it, expect } from 'vitest';
import { opfsAvailable, opfsWrite, opfsRead, opfsDelete, opfsList } from './opfs';

describe('T-OFF-010: OPFS wrapper', () => {
  it('opfsAvailable returns false when navigator.storage.getDirectory is missing', async () => {
    expect(await opfsAvailable()).toBe(false);
  });

  it('opfsWrite resolves false when OPFS is unavailable', async () => {
    expect(await opfsWrite('demo', 'hello')).toBe(false);
  });

  it('opfsRead resolves null when OPFS is unavailable', async () => {
    expect(await opfsRead('demo')).toBeNull();
  });

  it('opfsDelete is a no-op when OPFS is unavailable', async () => {
    await expect(opfsDelete('demo')).resolves.toBeUndefined();
  });

  it('opfsList returns empty array when OPFS is unavailable', async () => {
    expect(await opfsList()).toEqual([]);
  });
});
