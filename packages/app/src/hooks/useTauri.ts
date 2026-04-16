/**
 * Tauri integration hook
 * Provides typed wrappers around Tauri invoke() commands.
 * Falls back gracefully in the browser (non-Tauri) context.
 */

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

// ─── Updates ─────────────────────────────────────────────────

export interface TauriUpdateInfo {
  available: boolean;
  version: string | null;
  notes: string | null;
  url: string | null;
}

export async function tauriCheckForUpdate(): Promise<TauriUpdateInfo> {
  return invoke<TauriUpdateInfo>('check_for_update');
}

// ─── React hook ──────────────────────────────────────────────

import { useState, useEffect } from 'react';

export interface TauriState {
  isDesktop: boolean;
  localAI: TauriLocalAIStatus | null;
  updateInfo: TauriUpdateInfo | null;
  storageUsed: number;
  storageTotal: number;
}

export function useTauri(): TauriState {
  const isDesktop = isTauri();
  const [localAI, setLocalAI] = useState<TauriLocalAIStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<TauriUpdateInfo | null>(null);
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
