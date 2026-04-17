/**
 * useIndexedDB hook
 * Low-level IndexedDB access for the OpenCAD document store.
 * Wraps the @opencad/document storage layer with React state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initStorage,
  saveProject,
  loadProject,
  deleteProject,
  listProjects,
  type DocumentSchema,
} from '@opencad/document';

export type IDBStatus = 'idle' | 'initializing' | 'ready' | 'error';

export interface UseIndexedDBResult {
  status: IDBStatus;
  error: string | null;
  save: (doc: DocumentSchema) => Promise<void>;
  load: (id: string) => Promise<DocumentSchema | null>;
  remove: (id: string) => Promise<void>;
  list: () => Promise<Array<{ id: string; name: string; updatedAt: number }>>;
}

export function useIndexedDB(): UseIndexedDBResult {
  const [status, setStatus] = useState<IDBStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setStatus('initializing');
    initStorage()
      .then(() => setStatus('ready'))
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'IndexedDB init failed');
      });
  }, []);

  const save = useCallback(async (doc: DocumentSchema): Promise<void> => {
    await saveProject(doc);
  }, []);

  const load = useCallback(async (id: string): Promise<DocumentSchema | null> => {
    const result = await loadProject(id);
    return result ?? null;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteProject(id);
  }, []);

  const list = useCallback(async () => {
    const projects = await listProjects();
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.savedAt,
    }));
  }, []);

  return { status, error, save, load, remove, list };
}
