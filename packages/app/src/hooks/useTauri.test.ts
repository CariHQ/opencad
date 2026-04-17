/**
 * useTauri hook tests
 * T-DSK-001: Tauri integration utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTauri } from './useTauri';

describe('T-DSK-001: useTauri utilities', () => {
  describe('isTauri()', () => {
    beforeEach(() => {
      // Clean up window.__TAURI__ before each test
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
    });

    afterEach(() => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
    });

    it('returns false when __TAURI__ is not defined', () => {
      expect(isTauri()).toBe(false);
    });

    it('returns true when __TAURI__ is defined', () => {
      (window as Window & { __TAURI__?: { core: { invoke: unknown } } }).__TAURI__ = {
        core: {
          invoke: vi.fn(),
        },
      };
      expect(isTauri()).toBe(true);
    });
  });

  describe('Tauri functions throw in browser', () => {
    it('tauriSaveProject rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriSaveProject } = await import('./useTauri');
      await expect(tauriSaveProject('id', 'name', 'data')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriLoadProject rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriLoadProject } = await import('./useTauri');
      await expect(tauriLoadProject('id')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriListProjects rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriListProjects } = await import('./useTauri');
      await expect(tauriListProjects()).rejects.toThrow(/Tauri not available/);
    });

    it('tauriDeleteProject rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriDeleteProject } = await import('./useTauri');
      await expect(tauriDeleteProject('id')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriOpenFile rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriOpenFile } = await import('./useTauri');
      await expect(tauriOpenFile('/path/file.ifc')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriSaveFile rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriSaveFile } = await import('./useTauri');
      await expect(tauriSaveFile('/path/file.ifc', 'content')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriGetStorageInfo rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriGetStorageInfo } = await import('./useTauri');
      await expect(tauriGetStorageInfo()).rejects.toThrow(/Tauri not available/);
    });

    it('tauriCheckForUpdate rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriCheckForUpdate } = await import('./useTauri');
      await expect(tauriCheckForUpdate()).rejects.toThrow(/Tauri not available/);
    });

    it('tauriRunLocalAI rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriRunLocalAI } = await import('./useTauri');
      await expect(tauriRunLocalAI('What is a wall?')).rejects.toThrow(/Tauri not available/);
    });

    it('tauriOpenNewWindow rejects in non-Tauri environment', async () => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      const { tauriOpenNewWindow } = await import('./useTauri');
      await expect(tauriOpenNewWindow('/projects', 'Projects')).rejects.toThrow(/Tauri not available/);
    });
  });

  describe('Tauri invokes with __TAURI__ mock', () => {
    const mockInvoke = vi.fn();

    beforeEach(() => {
      (window as Window & { __TAURI__?: { core: { invoke: typeof mockInvoke } } }).__TAURI__ = {
        core: { invoke: mockInvoke },
      };
    });

    afterEach(() => {
      delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
      vi.clearAllMocks();
    });

    it('tauriSaveProject invokes save_project command', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { tauriSaveProject } = await import('./useTauri');
      await tauriSaveProject('proj-1', 'My Project', '{}');
      expect(mockInvoke).toHaveBeenCalledWith('save_project', { id: 'proj-1', name: 'My Project', data: '{}' });
    });

    it('tauriLoadProject invokes load_project command', async () => {
      mockInvoke.mockResolvedValue('{"id":"proj-1"}');
      const { tauriLoadProject } = await import('./useTauri');
      const result = await tauriLoadProject('proj-1');
      expect(mockInvoke).toHaveBeenCalledWith('load_project', { id: 'proj-1' });
      expect(result).toBe('{"id":"proj-1"}');
    });

    it('tauriListProjects returns array of project metas', async () => {
      const projects = [
        { id: 'p1', name: 'Project 1', created_at: 1000, updated_at: 2000 },
      ];
      mockInvoke.mockResolvedValue(projects);
      const { tauriListProjects } = await import('./useTauri');
      const result = await tauriListProjects();
      expect(result).toEqual(projects);
    });

    it('tauriGetLocalAIStatus invokes get_local_ai_status', async () => {
      mockInvoke.mockResolvedValue({ available: true, model_loaded: false, model_path: null });
      const { tauriGetLocalAIStatus } = await import('./useTauri');
      const result = await tauriGetLocalAIStatus();
      expect(result.available).toBe(true);
    });
  });
});
