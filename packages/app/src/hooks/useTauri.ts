/**
 * Tauri integration hook
 * Provides typed wrappers around Tauri invoke() commands.
 * Falls back gracefully in the browser (non-Tauri) context.
 *
 * T-DSK-002: openFile(path) — read a native file and return parsed DocumentSchema
 * T-DSK-005: onFileDrop(handler) — register OS drag-and-drop handler
 * T-DSK-006: saveFile(path, content), saveFileDialog, openFileDialog — native FS writes
 * T-DSK-012: checkForUpdates() — call Tauri updater plugin
 */

import type { DocumentSchema } from '@opencad/document';

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

/**
 * Programmatically start a window drag gesture.
 */
export function tauriStartDragging(): void {
  if (!isTauri()) return;
  window.__TAURI__!.core.invoke('plugin:window|start_dragging').catch(() => {});
}

/**
 * Toggle window maximized state (Tauri only).
 */
export function tauriToggleMaximize(): void {
  if (!isTauri()) return;
  window.__TAURI__!.core.invoke('plugin:window|toggle_maximize').catch(() => {});
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`Tauri not available (running in browser). Command: ${cmd}`);
  }
  return window.__TAURI__!.core.invoke<T>(cmd, args);
}

// ─── Project persistence ──────────────────────────────────────

export interface TauriProjectMeta {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export async function tauriSaveProject(id: string, name: string, data: string): Promise<void> {
  return invoke('save_project', { id, name, data });
}

export async function tauriLoadProject(id: string): Promise<string | null> {
  return invoke<string | null>('load_project', { id });
}

export async function tauriListProjects(): Promise<TauriProjectMeta[]> {
  return invoke<TauriProjectMeta[]>('list_projects');
}

export async function tauriDeleteProject(id: string): Promise<void> {
  return invoke('delete_project', { id });
}

// ─── Native file I/O ─────────────────────────────────────────

export interface TauriOpenFileResult {
  path: string;
  size: number;
  content: string;
}

export async function tauriOpenFile(path: string): Promise<TauriOpenFileResult> {
  return invoke<TauriOpenFileResult>('open_file', { path });
}

export async function tauriSaveFile(path: string, content: string): Promise<void> {
  return invoke('save_file', { path, content });
}

// ─── T-DSK-002: File association / open by path ───────────────────────────────

export async function openFile(path: string): Promise<DocumentSchema> {
  const content = await invoke<string>('open_file', { path });
  return JSON.parse(content) as DocumentSchema;
}

// ─── T-DSK-006: Native save dialog / open dialog ─────────────────────────────

export async function saveFile(path: string, content: string): Promise<void> {
  return invoke('save_file', { path, content });
}

export async function saveFileDialog(defaultName: string): Promise<string | null> {
  return invoke<string | null>('save_file_dialog', { defaultName });
}

export async function openFileDialog(): Promise<string | null> {
  return invoke<string | null>('open_file_dialog', {});
}

// ─── T-DSK-005: OS drag-and-drop ─────────────────────────────────────────────

export function onFileDrop(handler: (paths: string[]) => void): () => void {
  function listener(event: Event): void {
    const e = event as CustomEvent<{ paths: string[] }>;
    handler(e.detail.paths);
  }
  window.addEventListener('tauri://file-drop', listener);
  return () => {
    window.removeEventListener('tauri://file-drop', listener);
  };
}

// ─── Storage info ─────────────────────────────────────────────

export async function tauriGetStorageInfo(): Promise<{ used: number; total: number }> {
  const [used, total] = await invoke<[number, number]>('get_storage_info');
  return { used, total };
}

// ─── File watching ────────────────────────────────────────────

export async function tauriWatchFile(path: string): Promise<void> {
  return invoke('watch_file', { path });
}

export async function tauriUnwatchFile(path: string): Promise<void> {
  return invoke('unwatch_file', { path });
}

// ─── Local AI ────────────────────────────────────────────────

export interface TauriLocalAIStatus {
  available: boolean;
  model_loaded: boolean;
  model_path: string | null;
}

export async function tauriGetLocalAIStatus(): Promise<TauriLocalAIStatus> {
  return invoke<TauriLocalAIStatus>('get_local_ai_status');
}

export async function tauriRunLocalAI(prompt: string): Promise<string> {
  return invoke<string>('run_local_ai', { prompt });
}

// ─── Multi-window ─────────────────────────────────────────────

export async function tauriOpenNewWindow(route: string, title: string): Promise<void> {
  return invoke('open_new_window', { route, title });
}

// ─── T-DSK-012: Updates via Tauri updater plugin ─────────────────────────────

/** Shape returned by the Tauri updater plugin (plugin:updater|check). */
export interface TauriUpdateInfo {
  version: string;
  body: string;
  date: string;
}

/**
 * T-DSK-012: Check for updates via the Tauri updater plugin.
 * Returns null when not in Tauri or when the updater plugin throws.
 */
export async function checkForUpdates(): Promise<TauriUpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    return await window.__TAURI__!.core.invoke<TauriUpdateInfo>('plugin:updater|check');
  } catch {
    return null;
  }
}

/**
 * T-DSK-012: Install the pending update via the Tauri updater plugin.
 * No-op outside of Tauri.
 */
export async function installUpdate(): Promise<void> {
  if (!isTauri()) return;
  try {
    await window.__TAURI__!.core.invoke<void>('plugin:updater|install');
  } catch {
    // Ignore — app will restart on success
  }
}

/** Legacy update status from the custom check_for_update Tauri command. */
interface TauriUpdateStatus {
  available: boolean;
  version: string | null;
  notes: string | null;
  url: string | null;
}

export async function tauriCheckForUpdate(): Promise<TauriUpdateStatus> {
  return invoke<TauriUpdateStatus>('check_for_update');
}

/** T-DSK-012: Check for available app updates via the Tauri updater plugin. */
export interface UpdaterInfo {
  version: string;
  body: string;
  date: string;
}

export async function checkForUpdates(): Promise<UpdaterInfo | null> {
  if (!isTauri()) return null;
  try {
    return await window.__TAURI__!.core.invoke<UpdaterInfo>('plugin:updater|check');
  } catch {
    return null;
  }
}

// ─── React hook ──────────────────────────────────────────────

import { useState, useEffect } from 'react';

export interface TauriState {
  isDesktop: boolean;
  localAI: TauriLocalAIStatus | null;
  updateInfo: TauriUpdateStatus | null;
  storageUsed: number;
  storageTotal: number;
}

export function useTauri(): TauriState {
  const isDesktop = isTauri();
  const [localAI, setLocalAI] = useState<TauriLocalAIStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<TauriUpdateStatus | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);

  useEffect(() => {
    if (!isDesktop) return;

    tauriGetLocalAIStatus().then(setLocalAI).catch(() => null);
    tauriCheckForUpdate().then(setUpdateInfo).catch(() => null);
    tauriGetStorageInfo()
      .then(({ used, total }) => { setStorageUsed(used); setStorageTotal(total); })
      .catch(() => null);
  }, [isDesktop]);

  return { isDesktop, localAI, updateInfo, storageUsed, storageTotal };
}
