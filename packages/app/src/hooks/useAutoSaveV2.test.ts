/**
 * T-OFF-003: Auto-save to localStorage/IndexedDB every 2 seconds
 * Tests for the useAutoSaveV2 hook (with return value: lastSaved + isSaving)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSaveV2 } from './useAutoSaveV2';

// Mock the document store
vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(),
}));

import { useDocumentStore } from '../stores/documentStore';

const sampleDoc = {
  id: 'proj-abc',
  name: 'Sample Project',
  content: { elements: { 'el-1': { id: 'el-1', type: 'wall' } }, layers: {} },
  organization: { levels: {} },
  metadata: { createdBy: 'user-1', createdAt: 1000, updatedAt: 2000 },
};

function mockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    _store: store,
  };
}

describe('T-OFF-003: useAutoSaveV2', () => {
  let storage: ReturnType<typeof mockStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = mockStorage();
    vi.mocked(useDocumentStore).mockReturnValue({
      document: null,
    } as ReturnType<typeof useDocumentStore>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('T-OFF-003-001: returns null lastSaved initially', () => {
    const { result } = renderHook(() => useAutoSaveV2(2000, storage));
    expect(result.current.lastSaved).toBeNull();
  });

  it('T-OFF-003-002: triggers a save after the interval when document changes', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    const { result } = renderHook(() => useAutoSaveV2(2000, storage));

    // Before interval elapses: no save
    vi.advanceTimersByTime(1999);
    expect(result.current.lastSaved).toBeNull();

    // After 2 seconds: lastSaved should be set
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
    expect(storage.setItem).toHaveBeenCalled();
  });

  it('T-OFF-003-003: isSaving transitions true then false', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    let resolveSave!: () => void;
    storage.setItem = vi.fn((_key: string, _value: string) => {
      // synchronous, but we capture the call
      resolveSave?.();
    });

    const { result } = renderHook(() => useAutoSaveV2(2000, storage));

    // Before save fires: isSaving should be false
    expect(result.current.isSaving).toBe(false);

    // After interval: isSaving momentarily true then resolves to false
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    // After synchronous save: isSaving is false again
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).not.toBeNull();
  });

  it('T-OFF-003-004: saves to the correct storage key', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    renderHook(() => useAutoSaveV2(2000, storage));

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      'opencad:autosave:proj-abc',
      expect.any(String),
    );
  });

  it('T-OFF-003-005: does not save if document has not changed', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    const { rerender } = renderHook(() => useAutoSaveV2(2000, storage));

    // First save
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    // Rerender with same document — no second save
    rerender();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('T-OFF-003-006: saves correct JSON content', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    renderHook(() => useAutoSaveV2(2000, storage));

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    const savedValue = storage.setItem.mock.calls[0]?.[1];
    expect(savedValue).toBeDefined();

    const parsed = JSON.parse(savedValue as string);
    expect(parsed).toMatchObject({
      id: 'proj-abc',
      name: 'Sample Project',
    });
  });

  it('T-OFF-003-007: multiple rapid changes only produce one save (debounce)', async () => {
    // Start with first version of the doc
    const docV1 = { ...sampleDoc, name: 'Version 1' };
    const docV2 = { ...sampleDoc, name: 'Version 2' };
    const docV3 = { ...sampleDoc, name: 'Version 3' };

    const mockStore = vi.mocked(useDocumentStore);
    mockStore.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: docV1 as any,
    } as ReturnType<typeof useDocumentStore>);

    const { rerender } = renderHook(() => useAutoSaveV2(2000, storage));

    // Rapidly change the document multiple times (each within the debounce window)
    vi.advanceTimersByTime(500);
    mockStore.mockReturnValue({ document: docV2 as any } as ReturnType<typeof useDocumentStore>); // eslint-disable-line @typescript-eslint/no-explicit-any
    rerender();

    vi.advanceTimersByTime(500);
    mockStore.mockReturnValue({ document: docV3 as any } as ReturnType<typeof useDocumentStore>); // eslint-disable-line @typescript-eslint/no-explicit-any
    rerender();

    // Still under 2s from last change — no save yet
    vi.advanceTimersByTime(500);
    expect(storage.setItem).not.toHaveBeenCalled();

    // Complete the debounce
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Only one save should have fired
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('T-OFF-003-008: handles storage errors gracefully', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
    } as ReturnType<typeof useDocumentStore>);

    storage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useAutoSaveV2(2000, storage));

    // Should not throw even when storage errors
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    // lastSaved remains null on error (save failed)
    expect(result.current.lastSaved).toBeNull();
    // isSaving is false (not stuck in saving state)
    expect(result.current.isSaving).toBe(false);
  });
});
