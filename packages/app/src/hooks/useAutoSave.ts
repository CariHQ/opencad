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
import { captureProjectThumbnail } from './useThreeViewport';

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
  const { activeProjectId, projects, renameProject, updateThumbnail } = useProjectStore();
  const lastSavedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Throttle thumbnail captures to at most once every 20s — a save fires
  // every 2s while drafting, but re-encoding the JPEG that often is wasted
  // work for a card that most users won't look at until they navigate away.
  const lastThumbAtRef = useRef<number>(0);

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

        // Capture a preview from the live 3D viewport for the dashboard card.
        // No-op when the user is in 2D mode (the 3D renderer isn't mounted,
        // so captureProjectThumbnail returns null).
        const nowTs = Date.now();
        if (nowTs - lastThumbAtRef.current > 20_000) {
          const dataUrl = captureProjectThumbnail(1024, 768, 0.85);
          if (dataUrl) {
            lastThumbAtRef.current = nowTs;
            updateThumbnail(activeProjectId, dataUrl);
          }
        }
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
  }, [document, activeProjectId, isSaving, projects, renameProject, updateThumbnail]);
}

/** Load a project from storage (browser fallback) */
export function loadProjectFromStorage(id: string): string | null {
  try {
    return localStorage.getItem(`opencad-doc-${id}`);
  } catch {
    return null;
  }
}
