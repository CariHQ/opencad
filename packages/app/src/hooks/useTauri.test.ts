/**
 * useTauri hook tests
 * T-DSK-001: Tauri integration utilities
 * T-DSK-002: Open .opencad file via file association
 * T-DSK-005: Drag-and-drop from OS
 * T-DSK-006: Save file → writes to native filesystem (not download)
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

// ─── T-DSK-002: Open .opencad file via file association ───────────────────────

describe('T-DSK-002: openFile', () => {
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

  it('openFile(path) calls invoke("open_file", { path }) and returns parsed DocumentSchema', async () => {
    const schema = {
      id: 'proj-1',
      name: 'Test Project',
      version: { clock: {} },
      metadata: { createdAt: 0, updatedAt: 0, createdBy: 'user', schemaVersion: '1' },
      content: { elements: {}, spaces: {} },
      organization: { layers: {}, levels: {} },
      presentation: { views: {}, annotations: {} },
      library: { materials: {} },
    };
    mockInvoke.mockResolvedValue(JSON.stringify(schema));
    const { openFile } = await import('./useTauri');
    const result = await openFile('/path/to/project.opencad');
    expect(mockInvoke).toHaveBeenCalledWith('open_file', { path: '/path/to/project.opencad' });
    expect(result).toEqual(schema);
  });

  it('openFile("nonexistent.opencad") rejects with an error message', async () => {
    mockInvoke.mockRejectedValue(new Error('File not found: nonexistent.opencad'));
    const { openFile } = await import('./useTauri');
    await expect(openFile('nonexistent.opencad')).rejects.toThrow('File not found');
  });

  it('openFile rejects with invalid JSON content', async () => {
    mockInvoke.mockResolvedValue('not valid json');
    const { openFile } = await import('./useTauri');
    await expect(openFile('/path/to/broken.opencad')).rejects.toThrow();
  });
});

// ─── T-DSK-005: Drag-and-drop from OS ──────────────────────────────────────

describe('T-DSK-005: onFileDrop', () => {
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

  it('onFileDrop(handler) registers a drop handler and returns an unlisten function', async () => {
    const { onFileDrop } = await import('./useTauri');
    const handler = vi.fn();
    const unlisten = onFileDrop(handler);
    expect(typeof unlisten).toBe('function');
  });

  it('when "tauri://file-drop" fires with paths, handler is called with the paths', async () => {
    const { onFileDrop } = await import('./useTauri');
    const handler = vi.fn();

    // Register the drop handler — this sets up a window event listener
    onFileDrop(handler);

    // Simulate the tauri://file-drop event with a payload
    const dropEvent = new CustomEvent('tauri://file-drop', {
      detail: { paths: ['path/to/file.opencad'] },
    });
    window.dispatchEvent(dropEvent);

    expect(handler).toHaveBeenCalledWith(['path/to/file.opencad']);
  });

  it('when dropped file is .ifc, handler is called with the .ifc path (not filtered out)', async () => {
    const { onFileDrop } = await import('./useTauri');
    const handler = vi.fn();
    onFileDrop(handler);

    const dropEvent = new CustomEvent('tauri://file-drop', {
      detail: { paths: ['path/to/model.ifc'] },
    });
    window.dispatchEvent(dropEvent);

    expect(handler).toHaveBeenCalledWith(['path/to/model.ifc']);
  });

  it('unlisten function removes the handler so it no longer fires', async () => {
    const { onFileDrop } = await import('./useTauri');
    const handler = vi.fn();
    const unlisten = onFileDrop(handler);
    unlisten();

    const dropEvent = new CustomEvent('tauri://file-drop', {
      detail: { paths: ['file.dwg'] },
    });
    window.dispatchEvent(dropEvent);

    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── T-DSK-006: Save file → writes to native filesystem (not download) ────────

describe('T-DSK-006: saveFile and saveFileDialog', () => {
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

  it('saveFile(path, content) calls invoke("save_file", { path, content })', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { saveFile } = await import('./useTauri');
    await saveFile('/Users/me/project.opencad', '{"id":"proj-1"}');
    expect(mockInvoke).toHaveBeenCalledWith('save_file', {
      path: '/Users/me/project.opencad',
      content: '{"id":"proj-1"}',
    });
  });

  it('saveFileDialog(defaultName) calls invoke("save_file_dialog", { defaultName }) and returns chosen path', async () => {
    mockInvoke.mockResolvedValue('/Users/me/Desktop/my-project.opencad');
    const { saveFileDialog } = await import('./useTauri');
    const result = await saveFileDialog('my-project.opencad');
    expect(mockInvoke).toHaveBeenCalledWith('save_file_dialog', { defaultName: 'my-project.opencad' });
    expect(result).toBe('/Users/me/Desktop/my-project.opencad');
  });

  it('saveFileDialog returns null when user cancels', async () => {
    mockInvoke.mockResolvedValue(null);
    const { saveFileDialog } = await import('./useTauri');
    const result = await saveFileDialog('untitled.opencad');
    expect(result).toBeNull();
  });

  it('openFileDialog calls invoke("open_file_dialog") and returns chosen path', async () => {
    mockInvoke.mockResolvedValue('/Users/me/Documents/building.opencad');
    const { openFileDialog } = await import('./useTauri');
    const result = await openFileDialog();
    expect(mockInvoke).toHaveBeenCalledWith('open_file_dialog', {});
    expect(result).toBe('/Users/me/Documents/building.opencad');
  });

  it('openFileDialog returns null when user cancels', async () => {
    mockInvoke.mockResolvedValue(null);
    const { openFileDialog } = await import('./useTauri');
    const result = await openFileDialog();
    expect(result).toBeNull();
  });
});
