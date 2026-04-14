/**
 * Recent Files Hook
 * Persists a list of recently opened files to storage
 * Issue #2: IFC import/export file dialogs
 */

export interface RecentFile {
  name: string;
  path: string;
  format: 'ifc' | 'dxf' | 'dwg' | 'pdf' | 'revit' | 'opencad';
  lastOpened: number;
}

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const STORAGE_KEY = 'opencad-recent-files';
const MAX_RECENT = 10;

export class RecentFilesStore {
  private readonly _storage: StorageAdapter;
  private _files: RecentFile[];

  constructor(storage: StorageAdapter) {
    this._storage = storage;
    this._files = this._load();
  }

  getFiles(): RecentFile[] {
    return [...this._files];
  }

  addFile(file: Omit<RecentFile, 'lastOpened'>): void {
    // Remove existing entry for same path (if any)
    this._files = this._files.filter((f) => f.path !== file.path);
    // Prepend new entry
    this._files.unshift({ ...file, lastOpened: Date.now() });
    // Trim to max
    if (this._files.length > MAX_RECENT) {
      this._files = this._files.slice(0, MAX_RECENT);
    }
    this._save();
  }

  removeFile(path: string): void {
    this._files = this._files.filter((f) => f.path !== path);
    this._save();
  }

  private _load(): RecentFile[] {
    const raw = this._storage.get(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as RecentFile[];
    } catch {
      return [];
    }
  }

  private _save(): void {
    this._storage.set(STORAGE_KEY, JSON.stringify(this._files));
  }
}

/** Browser localStorage adapter */
export const localStorageAdapter: StorageAdapter = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  },
};
