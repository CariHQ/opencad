/**
 * Plugin Registry
 * T-PLG-001: Central registry for installed plugins
 */

import type { PluginManifest } from './pluginManifest';

// ─── Registry ─────────────────────────────────────────────────────────────────

export class PluginRegistry {
  private readonly _plugins = new Map<string, PluginManifest>();

  /** Register (or overwrite) a plugin manifest by id. */
  register(manifest: PluginManifest): void {
    this._plugins.set(manifest.id, manifest);
  }

  /** Remove a plugin by id. No-op if the id is not registered. */
  unregister(id: string): void {
    this._plugins.delete(id);
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
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Application-level singleton plugin registry. */
export const pluginRegistry = new PluginRegistry();
