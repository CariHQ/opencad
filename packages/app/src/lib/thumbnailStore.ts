/**
 * thumbnailStore — per-project 3D preview thumbnails kept out of localStorage.
 *
 * Thumbnails are JPEG data URLs at ~60-80KB each. Fifty of them would blow
 * half of localStorage's 5MB/origin budget, so they live in their own
 * IndexedDB database instead. `opencad-projects` in localStorage stores only
 * metadata (no thumbnail field); the dashboard hydrates thumbnails from here
 * on mount.
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'opencad-thumbnails';
const STORE_NAME = 'thumbnails';
const DB_VERSION = 1;

interface ThumbnailRecord {
  projectId: string;
  dataUrl: string;
  savedAt: number;
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
      }
    },
  });
  return _db;
}

export async function saveThumbnail(projectId: string, dataUrl: string): Promise<void> {
  try {
    const db = await getDb();
    const rec: ThumbnailRecord = { projectId, dataUrl, savedAt: Date.now() };
    await db.put(STORE_NAME, rec);
  } catch {
    // IDB unavailable (private mode, quota) — best-effort only.
  }
}

export async function loadThumbnail(projectId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const rec = (await db.get(STORE_NAME, projectId)) as ThumbnailRecord | undefined;
    return rec?.dataUrl ?? null;
  } catch {
    return null;
  }
}

export async function loadAllThumbnails(): Promise<Record<string, string>> {
  try {
    const db = await getDb();
    const all = (await db.getAll(STORE_NAME)) as ThumbnailRecord[];
    return Object.fromEntries(all.map((r) => [r.projectId, r.dataUrl]));
  } catch {
    return {};
  }
}

export async function deleteThumbnail(projectId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, projectId);
  } catch {
    // ignore
  }
}
