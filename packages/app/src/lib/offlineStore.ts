/**
 * offlineStore — IndexedDB persistence for offline editing
 * T-OFF-002
 *
 * DB name  : opencad-offline
 * Store    : documents
 * Schema   : { projectId: string, data: string, pendingSync: boolean, savedAt: number }
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'opencad-offline';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

interface OfflineDocRecord {
  projectId: string;
  data: string;
  pendingSync: boolean;
  savedAt: number;
}

// Lazily initialised singleton — avoids opening the DB at module load time
// which would fail in environments without IndexedDB (e.g. SSR, some tests).
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

/**
 * Persist a serialised document for the given project.
 * Marks the project as pending sync so it can be re-pushed when the app comes
 * back online.
 */
export async function saveDocument(projectId: string, data: string): Promise<void> {
  const db = await getDb();
  const record: OfflineDocRecord = {
    projectId,
    data,
    pendingSync: true,
    savedAt: Date.now(),
  };
  await db.put(STORE_NAME, record);
}

/**
 * Retrieve a previously saved document string for the given project.
 * Returns null if no record exists.
 */
export async function loadDocument(projectId: string): Promise<string | null> {
  const db = await getDb();
  const record = await db.get(STORE_NAME, projectId) as OfflineDocRecord | undefined;
  return record?.data ?? null;
}

/**
 * List the IDs of all projects that have unsynchronised local edits.
 */
export async function listPendingSync(): Promise<string[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME) as OfflineDocRecord[];
  return all.filter((r) => r.pendingSync).map((r) => r.projectId);
}

/**
 * Mark a project as synchronised — clears the pendingSync flag so it no
 * longer appears in `listPendingSync()`.
 * No-op when the project is not found in the store.
 */
export async function markSynced(projectId: string): Promise<void> {
  const db = await getDb();
  const record = await db.get(STORE_NAME, projectId) as OfflineDocRecord | undefined;
  if (!record) return;
  await db.put(STORE_NAME, { ...record, pendingSync: false });
}
