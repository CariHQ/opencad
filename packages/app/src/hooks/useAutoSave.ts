/**
 * Auto-save hook
 * Saves the current document every 2 seconds when dirty.
 * On desktop (Tauri): persists via tauriSaveProject command.
 * On browser: persists via IndexedDB (primary) + localStorage (fast fallback).
 */
import { useEffect, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useProjectStore } from '../stores/projectStore';
import { isTauri, tauriSaveProject } from './useTauri';
import { saveDocument as offlineSaveDocument } from '../lib/offlineStore';

const AUTO_SAVE_INTERVAL_MS = 2000;

function saveToLocalStorage(id: string, data: string): void {
  try {
    localStorage.setItem(`opencad-doc-${id}`, data);
    localStorage.setItem(`opencad-doc-${id}-ts`, String(Date.now()));
  } catch {
    // storage quota exceeded — silently skip
  }
}

export function useAutoSave(): void {
  const { document, isSaving } = useDocumentStore();
  const { activeProjectId, projects, renameProject } = useProjectStore();
  const lastSavedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!document || !activeProjectId) return;

    const serialized = JSON.stringify(document);

    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) return;
    if (isSaving) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const project = projects.find((p) => p.id === activeProjectId);
      const name = project?.name ?? 'Untitled Project';

      try {
        if (isTauri()) {
          await tauriSaveProject(activeProjectId, name, serialized);
        } else {
          // Primary: IndexedDB via offlineStore (survives storage quota pressure)
          await offlineSaveDocument(activeProjectId, serialized);
          // Secondary: localStorage for fast synchronous access during page load
          saveToLocalStorage(activeProjectId, serialized);
        }
        lastSavedRef.current = serialized;

        // Update project updatedAt timestamp
        renameProject(activeProjectId, name); // triggers updatedAt refresh
      } catch {
        // IndexedDB failed — fall back to localStorage only
        try {
          saveToLocalStorage(activeProjectId, serialized);
          lastSavedRef.current = serialized;
        } catch {
          // Both storage paths failed — non-fatal, retry next interval
        }
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [document, activeProjectId, isSaving, projects, renameProject]);
}

/** Load a project from storage (browser fallback) */
export function loadProjectFromStorage(id: string): string | null {
  try {
    return localStorage.getItem(`opencad-doc-${id}`);
  } catch {
    return null;
  }
}
