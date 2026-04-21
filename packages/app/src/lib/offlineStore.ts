/**
 * offlineStore — offline document persistence (T-OFF-002, PRD §9.2).
 *
 * Primary path is OPFS (navigator.storage.getDirectory) so large documents
 * don't churn the IndexedDB quota. IndexedDB stays as the fallback for
 * browsers / environments that don't expose OPFS, and also holds the
 * pendingSync metadata that OPFS can't encode on its own.
 *
 * DB name  : opencad-offline
 * Store    : documents
 * Schema   : { projectId: string, data: string, pendingSync: boolean, savedAt: number }
 */
import { openDB, type IDBPDatabase } from 'idb';
import { opfsWrite, opfsRead } from './opfs';
import { registerBackgroundSyncTag } from './backgroundSync';

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

function opfsKey(projectId: string): string {
  return `doc-${projectId}.json`;
}

/**
 * Persist a serialised document for the given project.
 * Marks the project as pending sync so it can be re-pushed when the app comes
 * back online.
 *
 * Strategy: the document bytes go to OPFS when available (keeps IndexedDB
 * quota free for structured small-object data); the pendingSync metadata
 * always goes to IndexedDB. IDB also keeps the full payload as a fallback
 * so environments without OPFS still work end-to-end.
 */
export async function saveDocument(projectId: string, data: string): Promise<void> {
  const db = await getDb();
  const opfsOk = await opfsWrite(opfsKey(projectId), data);
  const record: OfflineDocRecord = {
    projectId,
    // When OPFS is the primary, keep a small marker in IDB instead of
    // duplicating the payload. Fall back to storing the full string when
    // OPFS failed.
    data: opfsOk ? '' : data,
    pendingSync: true,
    savedAt: Date.now(),
  };
  await db.put(STORE_NAME, record);
  // Ask the browser's SyncManager (if available) to wake our Service
  // Worker later so the pending edit syncs even after the tab closes.
  void registerBackgroundSyncTag();
}

/**
 * Retrieve a previously saved document string for the given project.
 * Returns null if no record exists.
 */
export async function loadDocument(projectId: string): Promise<string | null> {
  const fromOpfs = await opfsRead(opfsKey(projectId));
  if (fromOpfs !== null) return fromOpfs;
  const db = await getDb();
  const record = await db.get(STORE_NAME, projectId) as OfflineDocRecord | undefined;
  return record?.data && record.data.length > 0 ? record.data : null;
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
