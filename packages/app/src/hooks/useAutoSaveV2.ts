/**
 * useAutoSaveV2
 * T-OFF-003: Auto-save hook that persists document state every `intervalMs`
 * milliseconds (default 2 s) using a debounce strategy.
 *
 * Accepts an optional `storage` parameter (defaults to `localStorage`) so
 * that tests can inject a mock without touching real browser storage.
 *
 * Returns `{ lastSaved: Date | null; isSaving: boolean }`.
 */
import { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';

export interface AutoSaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AutoSaveResult {
  lastSaved: Date | null;
  isSaving: boolean;
}

export function useAutoSaveV2(
  intervalMs: number = 2000,
  storage: AutoSaveStorage = localStorage,
): AutoSaveResult {
  const { document } = useDocumentStore();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lastSavedDocRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!document) return;

    const serialized = JSON.stringify(document);

    // Skip if nothing has changed since last successful save
    if (serialized === lastSavedDocRef.current) return;

    // Clear any pending debounce
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsSaving(true);

      try {
        const key = `opencad:autosave:${document.id}`;
        storage.setItem(key, serialized);
        lastSavedDocRef.current = serialized;
        setLastSaved(new Date());
      } catch {
        // Storage error (e.g. QuotaExceededError) — non-fatal, skip this save
      } finally {
        setIsSaving(false);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [document, intervalMs, storage]);

  return { lastSaved, isSaving };
}
