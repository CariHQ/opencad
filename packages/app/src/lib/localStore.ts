/**
 * T-OFF-001: Offline-first auto-save — localStorage-backed OfflineStore
 *
 * A simple key-value store backed by localStorage.
 * All values are JSON-serialised so complex objects round-trip correctly.
 * The dbName is used as a namespace prefix to avoid key collisions.
 */

export interface OfflineStore {
  save(key: string, value: unknown): Promise<void>;
  load(key: string): Promise<unknown | null>;
  keys(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

export function createOfflineStore(dbName: string): OfflineStore {
  const prefix = `${dbName}::`;

  return {
    async save(key: string, value: unknown): Promise<void> {
      localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
    },

    async load(key: string): Promise<unknown | null> {
      const raw = localStorage.getItem(`${prefix}${key}`);
      if (raw === null) return null;
      return JSON.parse(raw) as unknown;
    },

    async keys(): Promise<string[]> {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== null && k.startsWith(prefix)) {
          result.push(k.slice(prefix.length));
        }
      }
      return result;
    },

    async delete(key: string): Promise<void> {
      localStorage.removeItem(`${prefix}${key}`);
    },
  };
}
