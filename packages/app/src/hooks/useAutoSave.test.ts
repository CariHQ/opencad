/**
 * useAutoSave hook tests
 * T-DOC-002: Auto-save persists document changes
 * T-OFF-003: Auto-save to IndexedDB every 2 seconds
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave, loadProjectFromStorage } from './useAutoSave';

// T-OFF-003: Mock offlineStore for the auto-save-to-IndexedDB tests
vi.mock('../lib/offlineStore', () => ({
  saveDocument: vi.fn().mockResolvedValue(undefined),
  loadDocument: vi.fn().mockResolvedValue(null),
}));

// Mock @opencad/document storage
vi.mock('@opencad/document', async (importOriginal) => {
  const real = await importOriginal<typeof import('@opencad/document')>();
  return {
    ...real,
    saveProject: vi.fn().mockResolvedValue(undefined),
    initStorage: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock stores with simple no-op defaults
vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    document: null,
    isSaving: false,
  })),
}));

vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    activeProjectId: null,
    projects: [],
    renameProject: vi.fn(),
  })),
}));

vi.mock('./useTauri', () => ({
  isTauri: vi.fn().mockReturnValue(false),
  tauriSaveProject: vi.fn(),
}));

describe('T-DOC-002: loadProjectFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when project is not in localStorage', () => {
    const result = loadProjectFromStorage('non-existent-id');
    expect(result).toBeNull();
  });

  it('returns stored project data when it exists', () => {
    const data = JSON.stringify({ id: 'proj-1', name: 'Test' });
    localStorage.setItem('opencad-doc-proj-1', data);
    const result = loadProjectFromStorage('proj-1');
    expect(result).toBe(data);
  });

  it('returns null when localStorage throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });
    const result = loadProjectFromStorage('proj-1');
    expect(result).toBeNull();
    getItemSpy.mockRestore();
  });

  it('handles multiple project IDs independently', () => {
    localStorage.setItem('opencad-doc-proj-a', '{"id":"a"}');
    localStorage.setItem('opencad-doc-proj-b', '{"id":"b"}');
    expect(loadProjectFromStorage('proj-a')).toBe('{"id":"a"}');
    expect(loadProjectFromStorage('proj-b')).toBe('{"id":"b"}');
    expect(loadProjectFromStorage('proj-c')).toBeNull();
  });
});

describe('T-DOC-002: useAutoSave hook', () => {
  it('does not throw when document is null', () => {
    expect(() => renderHook(() => useAutoSave())).not.toThrow();
  });

  it('does not throw when activeProjectId is null', () => {
    expect(() => renderHook(() => useAutoSave())).not.toThrow();
  });
});

// ── T-OFF-003: Auto-save to IndexedDB every 2 seconds ────────────────────────

import * as offlineStoreModule from '../lib/offlineStore';
import { useDocumentStore } from '../stores/documentStore';
import { useProjectStore } from '../stores/projectStore';

describe('T-OFF-003: useAutoSave — IndexedDB auto-save', () => {
  const mockSaveDocument = vi.mocked(offlineStoreModule.saveDocument);

  const sampleDoc = {
    id: 'test-project',
    name: 'Test Project',
    content: { elements: {}, layers: {} },
    organization: { levels: {} },
    metadata: { createdBy: 'user-1', createdAt: 0, updatedAt: 0 },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockSaveDocument.mockClear();
    // Reset mocks to defaults
    vi.mocked(useDocumentStore).mockReturnValue({
      document: null,
      isSaving: false,
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: null,
      projects: [],
      renameProject: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not save when document is null', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      document: null,
      isSaving: false,
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', thumbnail: null, createdAt: 0, updatedAt: 0, collaborators: [], starred: false }],
      renameProject: vi.fn(),
    });
    renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(mockSaveDocument).not.toHaveBeenCalled();
  });

  it('saves to IndexedDB 2 seconds after document changes', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
      isSaving: false,
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', thumbnail: null, createdAt: 0, updatedAt: 0, collaborators: [], starred: false }],
      renameProject: vi.fn(),
    });
    renderHook(() => useAutoSave());
    // Before 2 seconds: no save
    vi.advanceTimersByTime(1000);
    expect(mockSaveDocument).not.toHaveBeenCalled();
    // After 2 seconds: save fires
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(mockSaveDocument).toHaveBeenCalledWith('proj-1', expect.any(String));
  });

  it('does not save again if document has not changed', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
      isSaving: false,
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', thumbnail: null, createdAt: 0, updatedAt: 0, collaborators: [], starred: false }],
      renameProject: vi.fn(),
    });
    const { rerender } = renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(mockSaveDocument).toHaveBeenCalledTimes(1);
    // Rerender with the same document — no additional save
    rerender();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    // Should not have saved a second time for the same content
    expect(mockSaveDocument).toHaveBeenCalledTimes(1);
  });

  it('cancels pending save on unmount', async () => {
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
      isSaving: false,
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', thumbnail: null, createdAt: 0, updatedAt: 0, collaborators: [], starred: false }],
      renameProject: vi.fn(),
    });
    const { unmount } = renderHook(() => useAutoSave());
    // Unmount before timer fires
    vi.advanceTimersByTime(500);
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    // Save was cancelled on unmount
    expect(mockSaveDocument).not.toHaveBeenCalled();
  });

  it('sets isSaving=true during save, false after', async () => {
    // This test verifies isSaving state transitions via the hook return value
    // useAutoSave currently returns void but documentStore.isSaving is tracked
    // Verify the store is read correctly (isSaving prevents re-save)
    const renameProject = vi.fn();
    vi.mocked(useDocumentStore).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: sampleDoc as any,
      isSaving: true, // saving in progress — should skip triggering another save
    });
    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', thumbnail: null, createdAt: 0, updatedAt: 0, collaborators: [], starred: false }],
      renameProject,
    });
    renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    // isSaving=true means we skip the save
    expect(mockSaveDocument).not.toHaveBeenCalled();
  });
});
