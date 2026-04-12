/**
 * Storage Operations
 * IndexedDB storage for browser persistence
 */

import { DocumentSchema, SaveEventData } from './types';

const DB_NAME = 'opencad';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const SYNC_QUEUE_STORE = 'syncQueue';
const SETTINGS_STORE = 'settings';

let dbInstance: IDBDatabase | null = null;

export async function initStorage(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('projectId', 'projectId', { unique: false });
        syncStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
  });
}

export async function saveProject(project: DocumentSchema): Promise<void> {
  const db = await initStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);

    const data = {
      id: project.id,
      ...project,
      savedAt: Date.now(),
    };

    const request = store.put(data);

    request.onerror = () => reject(new Error('Failed to save project'));
    request.onsuccess = () => resolve();
  });
}

export async function loadProject(projectId: string): Promise<DocumentSchema | null> {
  const db = await initStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(projectId);

    request.onerror = () => reject(new Error('Failed to load project'));
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const { savedAt, ...project } = result;
        resolve(project as DocumentSchema);
      } else {
        resolve(null);
      }
    };
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await initStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(projectId);

    request.onerror = () => reject(new Error('Failed to delete project'));
    request.onsuccess = () => resolve();
  });
}

export async function listProjects(): Promise<{ id: string; name: string; savedAt: number }[]> {
  const db = await initStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(new Error('Failed to list projects'));
    request.onsuccess = () => {
      const results = request.result.map((item: { id: string; name: string; savedAt: number }) => ({
        id: item.id,
        name: item.name,
        savedAt: item.savedAt,
      }));
      resolve(results);
    };
  });
}

export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}

export function isStorageQuotaWarning(used: number, quota: number, threshold = 0.8): boolean {
  return quota > 0 && used / quota >= threshold;
}
