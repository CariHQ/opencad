/**
 * Plugin Registry
 * T-PLG-001: Central registry for installed plugins
 *
 * Manifests are persisted to localStorage so installed plugins survive a
 * refresh. Change subscribers are notified on any mutation so React views
 * can re-render when the user installs/uninstalls a plugin.
 */

import { validateManifest, type PluginManifest } from './pluginManifest';

const STORAGE_KEY = 'opencad-plugin-registry';

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface PluginRegistryOptions {
  /** When true, load from and write to localStorage. Off by default so
   *  unit tests can instantiate isolated registries without cross-test leakage. */
  persist?: boolean;
}

export class PluginRegistry {
  private readonly _plugins = new Map<string, PluginManifest>();
  private readonly _subscribers = new Set<() => void>();
  private readonly _persistEnabled: boolean;

  constructor(options: PluginRegistryOptions = {}) {
    this._persistEnabled = options.persist ?? false;
    if (this._persistEnabled) this._load();
  }

  private _load(): void {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        if (validateManifest(entry)) this._plugins.set(entry.id, entry);
      }
    } catch {
      /* corrupted payload — start fresh */
    }
  }

  private _persist(): void {
    if (this._persistEnabled) {
      try {
        globalThis.localStorage?.setItem(
          STORAGE_KEY,
          JSON.stringify(Array.from(this._plugins.values())),
        );
      } catch {
        /* storage quota / disabled — non-fatal */
      }
    }
    for (const sub of this._subscribers) sub();
  }

  /** Register (or overwrite) a plugin manifest by id. */
  register(manifest: PluginManifest): void {
    this._plugins.set(manifest.id, manifest);
    this._persist();
  }

  /** Remove a plugin by id. No-op if the id is not registered. */
  unregister(id: string): void {
    if (this._plugins.delete(id)) this._persist();
  }

  /** Retrieve a manifest by id, or undefined if not registered. */
  get(id: string): PluginManifest | undefined {
    return this._plugins.get(id);
  }

  /** Return all registered manifests as an array. */
  list(): PluginManifest[] {
    return Array.from(this._plugins.values());
  }

  /** Return true if a manifest with the given id is registered. */
  isRegistered(id: string): boolean {
    return this._plugins.has(id);
  }

  /** Subscribe to registry changes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this._subscribers.add(fn);
    return () => { this._subscribers.delete(fn); };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Application-level singleton plugin registry — persists to localStorage. */
export const pluginRegistry = new PluginRegistry({ persist: true });
