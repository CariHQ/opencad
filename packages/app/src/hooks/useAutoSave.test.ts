/**
 * useAutoSave hook tests
 * T-DOC-002: Auto-save persists document changes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSave, loadProjectFromStorage } from './useAutoSave';

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
