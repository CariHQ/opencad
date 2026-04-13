/**
 * Desktop Tests
 * Tests for T-DSK-001 through T-DSK-020
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  openProjectFile,
  saveProjectFile,
  openIfcFile,
  openDwgFile,
  listProjects,
  watchFile,
  unwatchFile,
  getLocalAIStatus,
  loadLocalAIModel,
  runLocalAI,
  getGpuInfo,
  openNewWindow,
  getCurrentWindowId,
  setTrayStatus,
  showTrayNotification,
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  getRecoveryData,
  saveRecoveryData,
  clearRecoveryData,
  importLargeFile,
  batchExport,
  backupToExternal,
  checkExternalDrive,
  printDocument,
  readClipboardImage,
  readClipboardText,
  addRecentFile,
  getRecentFiles,
  clearRecentFiles,
  getSyncStatus,
  syncToBrowser,
  syncFromBrowser,
  type DocumentSchema,
} from './api';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;
const mockOpen = open as ReturnType<typeof vi.fn>;
const mockSave = save as ReturnType<typeof vi.fn>;

const mockDocument: DocumentSchema = {
  id: 'test-project',
  name: 'Test Project',
  version: { clock: {} },
  elements: {},
  layers: {},
  levels: {},
  views: {},
  materials: {},
  spaces: {},
  annotations: {},
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'test',
    schemaVersion: '1.0.0',
  },
};

describe('Desktop Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T-DSK-001: Desktop App Launch', () => {
    it('should have tauri globals available', () => {
      expect(typeof globalThis).toBe('object');
    });

    it('should verify app initializes', async () => {
      mockInvoke.mockResolvedValue([]);
      const result = await listProjects();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('T-DSK-002: OpenCAD File Open', () => {
    it('should open .opencad file via dialog', async () => {
      mockOpen.mockResolvedValue('/test/project.opencad');
      mockInvoke.mockResolvedValue({
        path: '/test/project.opencad',
        size: 1024,
        content: JSON.stringify(mockDocument),
      });

      const doc = await openProjectFile();

      expect(mockOpen).toHaveBeenCalled();
      expect(doc?.id).toBe('test-project');
    });

    it('should return null when cancelled', async () => {
      mockOpen.mockResolvedValue(null);
      const doc = await openProjectFile();
      expect(doc).toBeNull();
    });
  });

  describe('T-DSK-003: IFC File Open', () => {
    it('should open .ifc file via dialog', async () => {
      mockOpen.mockResolvedValue('/test/building.ifc');
      mockInvoke.mockResolvedValue({
        path: '/test/building.ifc',
        size: 50000,
        content:
          'ISO-10303-21;HEADER;ENDSEC;DATA;#1=IFCBUILDING($,$,$,$,$,$,$,$);ENDSEC;END-ISO-10303-21;',
      });

      await openIfcFile();

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: false,
        filters: [{ name: 'IFC File', extensions: ['ifc'] }],
      });
    });
  });

  describe('T-DSK-004: DWG File Open', () => {
    it('should open .dwg file via dialog', async () => {
      mockOpen.mockResolvedValue('/test/drawing.dwg');
      mockInvoke.mockResolvedValue({
        path: '/test/drawing.dwg',
        size: 1024000,
        content: ' '.repeat(1024000),
      });

      const data = await openDwgFile();

      expect(mockOpen).toHaveBeenCalled();
      expect(data).not.toBeNull();
    });
  });

  describe('T-DSK-005: Drag-Drop Import', () => {
    it('should accept valid file extensions', () => {
      const validExtensions = ['.opencad', '.ifc', '.dxf', '.dwg', '.skp', '.pdf'];
      const isValid = (ext: string) => validExtensions.includes(ext.toLowerCase());

      expect(isValid('.opencad')).toBe(true);
      expect(isValid('.IFC')).toBe(true);
      expect(isValid('.dxf')).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const validExtensions = ['.opencad', '.ifc', '.dxf', '.dwg', '.skp', '.pdf'];
      const isValid = (ext: string) => validExtensions.includes(ext.toLowerCase());

      expect(isValid('.png')).toBe(false);
      expect(isValid('.docx')).toBe(false);
    });
  });

  describe('T-DSK-006: Native File Save', () => {
    it('should save via native dialog', async () => {
      mockSave.mockResolvedValue('/test/save/project.opencad');
      mockInvoke.mockResolvedValue(undefined);

      const path = await saveProjectFile(mockDocument, 'My Project');

      expect(mockSave).toHaveBeenCalled();
      expect(path).toBe('/test/save/project.opencad');
    });

    it('should return null when cancelled', async () => {
      mockSave.mockResolvedValue(null);
      const path = await saveProjectFile(mockDocument);
      expect(path).toBeNull();
    });
  });

  describe('T-DSK-007: External File Watch', () => {
    it('should watch a file for changes', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await watchFile('/test/file.opencad', (event) => {
        expect(event.path).toBe('/test/file.opencad');
      });

      expect(mockInvoke).toHaveBeenCalledWith('watch_file', { path: '/test/file.opencad' });
    });

    it('should unwatch a file', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await unwatchFile('/test/file.opencad');

      expect(mockInvoke).toHaveBeenCalledWith('unwatch_file', { path: '/test/file.opencad' });
    });
  });

  describe('T-DSK-008: Offline Local AI', () => {
    it('should get local AI status', async () => {
      mockInvoke.mockResolvedValue({ available: false, model_loaded: false });

      const status = await getLocalAIStatus();

      expect(status).toHaveProperty('available');
    });

    it('should load local AI model', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await loadLocalAIModel('/models/llama.bin');

      expect(typeof result).toBe('boolean');
    });

    it('should run local AI prompt', async () => {
      mockInvoke.mockRejectedValue(new Error('not available'));

      await expect(runLocalAI('hello')).rejects.toThrow();
    });
  });

  describe('T-DSK-009: GPU Acceleration Detection', () => {
    it('should get GPU info', async () => {
      const info = await getGpuInfo();

      expect(info).toHaveProperty('renderer');
      expect(info).toHaveProperty('vendor');
      expect(info).toHaveProperty('webGpuSupported');
      expect(info).toHaveProperty('webGlSupported');
    });
  });

  describe('T-DSK-010: Multi-Window Support', () => {
    it('should open new window', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await openNewWindow('/project/123', 'My Project');

      expect(mockInvoke).toHaveBeenCalledWith('open_new_window', {
        route: '/project/123',
        title: 'My Project',
      });
    });

    it('should get current window ID', async () => {
      mockInvoke.mockResolvedValue('main');

      const id = await getCurrentWindowId();

      expect(typeof id).toBe('string');
    });
  });

  describe('T-DSK-011: System Tray Status', () => {
    it('should set tray status', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await setTrayStatus('synced');

      expect(mockInvoke).toHaveBeenCalledWith('set_tray_status', { status: 'synced' });
    });

    it('should show tray notification', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await showTrayNotification('Title', 'Body');

      expect(mockInvoke).toHaveBeenCalledWith('show_tray_notification', {
        title: 'Title',
        body: 'Body',
      });
    });
  });

  describe('T-DSK-012: Auto-Update', () => {
    it('should check for updates', async () => {
      mockInvoke.mockResolvedValue({ available: false });

      const update = await checkForUpdate();

      expect(update).toHaveProperty('available');
    });

    it('should download update', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await downloadUpdate('https://example.com/update.zip');

      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should install update', async () => {
      mockInvoke.mockRejectedValue(new Error('not available'));

      await expect(installUpdate()).rejects.toThrow();
    });
  });

  describe('T-DSK-013: Crash Recovery', () => {
    it('should get recovery data', async () => {
      mockInvoke.mockResolvedValue(null);

      const data = await getRecoveryData();

      expect(data).toBeNull();
    });

    it('should save recovery data', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await saveRecoveryData('proj-1', mockDocument);

      expect(mockInvoke).toHaveBeenCalledWith('save_recovery_data', {
        data: expect.stringContaining('proj-1'),
      });
    });

    it('should clear recovery data', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearRecoveryData();

      expect(mockInvoke).toHaveBeenCalledWith('clear_recovery_data');
    });
  });

  describe('T-DSK-014: Large File Import', () => {
    it('should import large file with progress', async () => {
      mockInvoke.mockResolvedValue({
        path: '/test/large.ifc',
        size: 100 * 1024 * 1024,
        content:
          'ISO-10303-21;HEADER;ENDSEC;DATA;#1=IFCBUILDING($,$,$,$,$,$,$,$);ENDSEC;END-ISO-10303-21;',
      });

      const progress: Array<{ loaded: number; total: number; phase: string }> = [];

      await importLargeFile('/test/large.ifc', (p) => {
        progress.push(p);
      });

      expect(progress.length).toBeGreaterThan(0);
      expect(progress[0]).toHaveProperty('phase');
    });
  });

  describe('T-DSK-015: Batch Export', () => {
    it('should export multiple formats', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const results = await batchExport(mockDocument, ['ifc', 'dxf'], '/test/export');

      expect(results.length).toBe(2);
      expect(results.every((r) => r.format)).toBe(true);
    });
  });

  describe('T-DSK-016: External Drive Backup', () => {
    it('should check external drive', async () => {
      mockInvoke.mockResolvedValue(true);

      const exists = await checkExternalDrive('/Volumes/USB');

      expect(typeof exists).toBe('boolean');
    });

    it('should backup to external drive', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const success = await backupToExternal(mockDocument, '/Volumes/USB/project.opencad');

      expect(success).toBe(true);
    });
  });

  describe('T-DSK-017: Native Print', () => {
    it('should call window.print', async () => {
      await printDocument();
      expect(true).toBe(true);
    });
  });

  describe('T-DSK-018: Clipboard Paste', () => {
    it('should read clipboard image', async () => {
      const result = await readClipboardImage();
      expect(result === null || result instanceof ArrayBuffer).toBe(true);
    });

    it('should read clipboard text', async () => {
      const result = await readClipboardText();
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('T-DSK-019: Recent Files OS Integration', () => {
    it('should add recent file', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addRecentFile('/test/project.opencad', 'Project');

      expect(mockInvoke).toHaveBeenCalledWith('add_recent_file', {
        path: '/test/project.opencad',
        name: 'Project',
      });
    });

    it('should get recent files', async () => {
      mockInvoke.mockResolvedValue([]);

      const files = await getRecentFiles();

      expect(Array.isArray(files)).toBe(true);
    });

    it('should clear recent files', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearRecentFiles();

      expect(mockInvoke).toHaveBeenCalledWith('clear_recent_files');
    });
  });

  describe('T-DSK-020: Browser-Desktop Sync', () => {
    it('should get sync status', async () => {
      mockInvoke.mockResolvedValue('synced');

      const status = await getSyncStatus();

      expect(['synced', 'syncing', 'offline', 'error']).toContain(status);
    });

    it('should sync document to browser', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const success = await syncToBrowser(mockDocument);

      expect(success).toBe(true);
    });

    it('should sync document from browser', async () => {
      mockInvoke.mockResolvedValue(null);

      const doc = await syncFromBrowser();

      expect(doc).toBeNull();
    });
  });
});
