/**
 * Desktop Platform API
 * Tauri desktop integration for file operations, window management, etc.
 */

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { DocumentSchema } from '@opencad/document';

export type { DocumentSchema } from '@opencad/document';

export interface FileResult {
  path: string;
  size: number;
  content: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface StorageInfo {
  used: number;
  quota: number;
}

export interface GpuInfo {
  renderer: string;
  vendor: string;
  webGpuSupported: boolean;
  webGlSupported: boolean;
}

export interface FileChangeEvent {
  path: string;
  kind: 'modify' | 'remove' | 'create';
}

export type FileChangeCallback = (event: FileChangeEvent) => void;

let fileWatchUnsubscribe: (() => void) | null = null;

// ============ File Operations ============

export async function openProjectFile(): Promise<DocumentSchema | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: 'OpenCAD Project', extensions: ['opencad'] },
      { name: 'IFC File', extensions: ['ifc'] },
      { name: 'DXF File', extensions: ['dxf'] },
    ],
  });

  if (!selected) return null;

  const path = typeof selected === 'string' ? selected : selected[0];
  const result = await invoke<FileResult>('open_file', { path });

  if (path.endsWith('.opencad')) {
    return JSON.parse(result.content) as DocumentSchema;
  }

  if (path.endsWith('.ifc')) {
    const { DocumentModel } = await import('@opencad/document');
    return DocumentModel.fromIFC(result.content).documentData;
  }

  return null;
}

export async function saveProjectFile(
  document: DocumentSchema,
  suggestedName?: string
): Promise<string | null> {
  const path = await save({
    defaultPath: suggestedName || `${document.name}.opencad`,
    filters: [{ name: 'OpenCAD Project', extensions: ['opencad'] }],
  });

  if (!path) return null;

  const content = JSON.stringify(document, null, 2);
  await invoke('save_file', { path, content });

  return path;
}

export async function openIfcFile(): Promise<DocumentSchema | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'IFC File', extensions: ['ifc'] }],
  });

  if (!selected) return null;

  const path = typeof selected === 'string' ? selected : selected[0];
  const result = await invoke<FileResult>('open_file', { path });

  const { DocumentModel } = await import('@opencad/document');
  return DocumentModel.fromIFC(result.content).documentData;
}

export async function openDwgFile(): Promise<ArrayBuffer | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'DWG File', extensions: ['dwg'] }],
  });

  if (!selected) return null;

  const path = typeof selected === 'string' ? selected : selected[0];
  const result = await invoke<FileResult>('open_file', { path });

  const bytes = new Uint8Array(result.size);
  for (let i = 0; i < result.size; i++) {
    bytes[i] = result.content.charCodeAt(i) & 0xff;
  }

  return bytes.buffer;
}

export async function saveToPath(path: string, content: string): Promise<void> {
  await invoke('save_file', { path, content });
}

export async function readFile(path: string): Promise<FileResult> {
  return invoke<FileResult>('open_file', { path });
}

export async function readFileChunked(
  path: string,
  _chunkSize: number,
  onChunk: (chunk: string, progress: number) => void
): Promise<void> {
  const result = await invoke<FileResult>('open_file', { path });
  const totalSize = result.size;
  let offset = 0;

  while (offset < totalSize) {
    const chunk = result.content.slice(offset, offset + 1000);
    const progress = (offset + chunk.length) / totalSize;
    onChunk(chunk, progress);
    offset += 1000;
  }
}

// ============ Project Storage ============

export async function getStorageInfo(): Promise<StorageInfo> {
  const [used, quota] = await invoke<[number, number]>('get_storage_info');
  return { used, quota };
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  const projects = await invoke<
    Array<{
      id: string;
      name: string;
      created_at: number;
      updated_at: number;
    }>
  >('list_projects');

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function loadProject(id: string): Promise<DocumentSchema | null> {
  const data = await invoke<string | null>('load_project', { id });
  if (!data) return null;
  return JSON.parse(data) as DocumentSchema;
}

export async function saveProject(
  id: string,
  name: string,
  document: DocumentSchema
): Promise<void> {
  const data = JSON.stringify(document);
  await invoke('save_project', { id, name, data });
}

export async function deleteProject(id: string): Promise<void> {
  await invoke('delete_project', { id });
}

// ============ T-DSK-007: External File Watch ============

export async function watchFile(path: string, callback: FileChangeCallback): Promise<void> {
  if (fileWatchUnsubscribe) {
    fileWatchUnsubscribe();
  }

  const { listen } = await import('@tauri-apps/api/event');

  const unlisten = await listen<{ path: string; kind: string }>('file-change', (event) => {
    callback({
      path: event.payload.path,
      kind: event.payload.kind as FileChangeEvent['kind'],
    });
  });

  await invoke('watch_file', { path });
  fileWatchUnsubscribe = unlisten;
}

export async function unwatchFile(path: string): Promise<void> {
  if (fileWatchUnsubscribe) {
    fileWatchUnsubscribe();
    fileWatchUnsubscribe = null;
  }
  await invoke('unwatch_file', { path });
}

// ============ T-DSK-008: Offline Local AI ============

export async function getLocalAIStatus(): Promise<{
  available: boolean;
  modelLoaded: boolean;
  modelPath?: string;
}> {
  return invoke<{ available: boolean; model_loaded: boolean; model_path?: string }>(
    'get_local_ai_status'
  ).then((r) => ({
    available: r.available,
    modelLoaded: r.model_loaded,
    modelPath: r.model_path,
  }));
}

export async function loadLocalAIModel(path: string): Promise<boolean> {
  return invoke<boolean>('load_local_ai_model', { path });
}

export async function runLocalAI(prompt: string): Promise<string> {
  return invoke<string>('run_local_ai', { prompt });
}

// ============ T-DSK-009: GPU Acceleration Detection ============

export async function getGpuInfo(): Promise<GpuInfo> {
  if (typeof document === 'undefined') {
    return {
      renderer: 'Unknown',
      vendor: 'Unknown',
      webGpuSupported: false,
      webGlSupported: false,
    };
  }

  const canvas = document?.createElement?.('canvas');
  const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');

  if (!gl) {
    return {
      renderer: 'Unknown',
      vendor: 'Unknown',
      webGpuSupported: false,
      webGlSupported: false,
    };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

  return {
    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
    webGpuSupported: 'gpu' in navigator,
    webGlSupported: true,
  };
}

// ============ T-DSK-010: Multi-Window Support ============

export async function openNewWindow(route: string, title?: string): Promise<void> {
  await invoke('open_new_window', { route, title: title || 'OpenCAD' });
}

export async function getCurrentWindowId(): Promise<string> {
  return invoke<string>('get_current_window_id');
}

// ============ T-DSK-011: System Tray Status ============

export type TrayStatus = 'synced' | 'syncing' | 'offline' | 'error';

export async function setTrayStatus(status: TrayStatus): Promise<void> {
  await invoke('set_tray_status', { status });
}

export async function showTrayNotification(title: string, body: string): Promise<void> {
  await invoke('show_tray_notification', { title, body });
}

// ============ T-DSK-012: Auto-Update ============

export interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  url?: string;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  return invoke<{
    available: boolean;
    version?: string;
    notes?: string;
    url?: string;
  }>('check_for_update');
}

export async function downloadUpdate(url: string): Promise<void> {
  await invoke('download_update', { url });
}

export async function installUpdate(): Promise<void> {
  await invoke('install_update');
}

// ============ T-DSK-013: Crash Recovery ============

export interface RecoveryData {
  projectId: string;
  timestamp: number;
  document: DocumentSchema;
}

export async function getRecoveryData(): Promise<RecoveryData | null> {
  const data = await invoke<string | null>('get_recovery_data');
  if (!data) return null;
  return JSON.parse(data) as RecoveryData;
}

export async function saveRecoveryData(projectId: string, document: DocumentSchema): Promise<void> {
  const data: RecoveryData = {
    projectId,
    timestamp: Date.now(),
    document,
  };
  await invoke('save_recovery_data', { data: JSON.stringify(data) });
}

export async function clearRecoveryData(): Promise<void> {
  await invoke('clear_recovery_data');
}

// ============ T-DSK-014: Large File Import ============

export interface ImportProgress {
  loaded: number;
  total: number;
  phase: 'reading' | 'parsing' | 'building';
}

export async function importLargeFile(
  path: string,
  onProgress: (progress: ImportProgress) => void
): Promise<DocumentSchema | null> {
  const result = await invoke<{
    size: number;
    content: string;
  }>('open_file', { path });

  const totalSize = result.size;

  onProgress({ loaded: 0, total: totalSize, phase: 'reading' });

  if (path.endsWith('.ifc')) {
    onProgress({ loaded: totalSize * 0.5, total: totalSize, phase: 'parsing' });
    const { DocumentModel } = await import('@opencad/document');
    const model = DocumentModel.fromIFC(result.content);
    onProgress({ loaded: totalSize, total: totalSize, phase: 'building' });
    return model.documentData;
  }

  if (path.endsWith('.opencad')) {
    onProgress({ loaded: totalSize * 0.5, total: totalSize, phase: 'parsing' });
    const doc = JSON.parse(result.content) as DocumentSchema;
    onProgress({ loaded: totalSize, total: totalSize, phase: 'building' });
    return doc;
  }

  return null;
}

// ============ T-DSK-015: Batch Export ============

export interface ExportResult {
  format: string;
  path: string;
  success: boolean;
  error?: string;
}

export async function batchExport(
  document: DocumentSchema,
  formats: string[],
  outputDir: string
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  for (const format of formats) {
    try {
      let content: string;
      let ext: string;

      switch (format.toLowerCase()) {
        case 'ifc':
          const { DocumentModel } = await import('@opencad/document');
          content = DocumentModel.toIFC(document);
          ext = 'ifc';
          break;
        case 'dxf':
          content = '0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\n';
          ext = 'dxf';
          break;
        default:
          content = JSON.stringify(document, null, 2);
          ext = 'opencad';
      }

      const path = `${outputDir}/${document.name}.${ext}`;
      await invoke('save_file', { path, content });
      results.push({ format, path, success: true });
    } catch (e) {
      results.push({
        format,
        path: '',
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ============ T-DSK-016: External Drive Backup ============

export async function backupToExternal(
  document: DocumentSchema,
  externalPath: string
): Promise<boolean> {
  try {
    const content = JSON.stringify(document, null, 2);
    await invoke('save_file', { path: externalPath, content });
    return true;
  } catch {
    return false;
  }
}

export async function checkExternalDrive(path: string): Promise<boolean> {
  return invoke<boolean>('check_external_drive', { path });
}

// ============ T-DSK-017: Native Print ============

export interface PrintOptions {
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: number;
}

export async function printDocument(_options?: Partial<PrintOptions>): Promise<void> {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

// ============ T-DSK-018: Clipboard Paste ============

export async function readClipboardImage(): Promise<ArrayBuffer | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return await blob.arrayBuffer();
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function readClipboardText(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

// ============ T-DSK-019: Recent Files OS Integration ============

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export async function addRecentFile(path: string, name: string): Promise<void> {
  await invoke('add_recent_file', { path, name });
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  const files =
    await invoke<Array<{ path: string; name: string; last_opened: number }>>('get_recent_files');

  return files.map((f) => ({
    path: f.path,
    name: f.name,
    lastOpened: f.last_opened,
  }));
}

export async function clearRecentFiles(): Promise<void> {
  await invoke('clear_recent_files');
}

// ============ T-DSK-020: Browser-Desktop Sync ============

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export async function getSyncStatus(): Promise<SyncStatus> {
  return invoke<SyncStatus>('get_sync_status');
}

export async function syncToBrowser(document: DocumentSchema): Promise<boolean> {
  try {
    await invoke('sync_document', { document: JSON.stringify(document) });
    return true;
  } catch {
    return false;
  }
}

export async function syncFromBrowser(): Promise<DocumentSchema | null> {
  const data = await invoke<string | null>('get_synced_document');
  if (!data) return null;
  return JSON.parse(data) as DocumentSchema;
}
