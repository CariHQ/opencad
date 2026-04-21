import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { pluginRegistry } from '../plugins/pluginRegistry';
import { validateManifest, type PluginManifest } from '../plugins/pluginManifest';
import { BUNDLED_PLUGIN_MANIFESTS } from '../plugins/pluginHost';
import {
  listPlugins,
  listInstalled,
  installPlugin,
  uninstallPlugin,
  type Plugin,
} from '../lib/marketplaceApi';

export interface MarketplaceItem {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  category: string;
  downloads: number;
  installed: boolean;
}

// ─── Hardcoded available plugins (catalogue) ──────────────────────────────────

// Inline bundled examples (actually runnable) come first; the remote catalogue
// entries below are retained for completeness but point at a CDN so they only
// load when the network fetch succeeds.
const AVAILABLE_PLUGINS: PluginManifest[] = [
  ...BUNDLED_PLUGIN_MANIFESTS,
  {
    id: 'structural-grid-tool',
    name: 'Structural Grid Tool',
    version: '1.3.0',
    description: 'Generate and manage structural grids with parametric column placement.',
    permissions: ['ui', 'document'],
    entrypoint: 'https://cdn.opencad.archi/plugins/structural-grid/index.js',
  },
  {
    id: 'energy-analysis-pro',
    name: 'Energy Analysis Pro',
    version: '2.1.0',
    description: 'Run HVAC and thermal energy simulations directly in the browser.',
    permissions: ['network', 'ui', 'document'],
    entrypoint: 'https://cdn.opencad.archi/plugins/energy-analysis/index.js',
  },
  {
    id: 'bim-clash-detector',
    name: 'BIM Clash Detector',
    version: '1.0.4',
    description: 'Detect and report clashes between building elements across disciplines.',
    permissions: ['document', 'ui'],
    entrypoint: 'https://cdn.opencad.archi/plugins/clash-detector/index.js',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MarketplacePanelProps {
  items?: MarketplaceItem[];
  onInstall?: (item: MarketplaceItem) => void;
  onPublish?: () => void;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PluginSkeleton(): React.ReactElement {
  return (
    <div className="marketplace-item skeleton" aria-busy="true">
      <div className="item-info">
        <span className="skeleton-line skeleton-name" />
        <span className="skeleton-line skeleton-desc" />
        <span className="skeleton-line skeleton-meta" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketplacePanel({
  items = [],
  onInstall,
  onPublish: _onPublish,
}: MarketplacePanelProps = {}) {
  void _onPublish;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // API state
  const [apiPlugins, setApiPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [uninstallingIds, setUninstallingIds] = useState<Set<string>>(new Set());

  // Track which plugin IDs are currently installed in the local registry.
  // Subscribe so the UI reflects installs/uninstalls from any code path
  // (including host-driven reloads after a refresh).
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(pluginRegistry.list().map((m) => m.id)),
  );
  useEffect(() => {
    return pluginRegistry.subscribe(() => {
      setRegisteredIds(new Set(pluginRegistry.list().map((m) => m.id)));
    });
  }, []);

  // ── Debounce search input 300 ms ─────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Fetch plugins from API ───────────────────────────────────────────────
  const fetchPlugins = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const [all, installed] = await Promise.all([
        listPlugins(searchTerm ? { search: searchTerm } : undefined),
        listInstalled(),
      ]);
      const installedIds = new Set(installed.map((p) => p.id));
      const merged = all.map((p) => ({ ...p, installed: p.installed || installedIds.has(p.id) }));
      setApiPlugins(merged);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plugins';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when debounced search changes
  useEffect(() => {
    void fetchPlugins(debouncedSearch);
  }, [debouncedSearch, fetchPlugins]);

  // ── Install handler ──────────────────────────────────────────────────────
  const handleApiInstall = useCallback(async (pluginId: string) => {
    // Optimistic update
    setApiPlugins((prev) => prev.map((p) => (p.id === pluginId ? { ...p, installed: true } : p)));
    setInstallingIds((prev) => new Set([...prev, pluginId]));
    try {
      await installPlugin(pluginId);
    } catch (_err) {
      // Revert on failure
      setApiPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, installed: false } : p)),
      );
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
    }
  }, []);

  // ── Uninstall handler ────────────────────────────────────────────────────
  const handleApiUninstall = useCallback(async (pluginId: string) => {
    // Optimistic update
    setApiPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, installed: false } : p)),
    );
    setUninstallingIds((prev) => new Set([...prev, pluginId]));
    try {
      await uninstallPlugin(pluginId);
    } catch (_err) {
      // Revert on failure
      setApiPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, installed: true } : p)),
      );
    } finally {
      setUninstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
    }
  }, []);

  // ── Legacy catalogue install / uninstall ─────────────────────────────────
  const handleInstallPlugin = (manifest: PluginManifest) => {
    if (!validateManifest(manifest)) return;
    pluginRegistry.register(manifest);
  };
  const _handleUninstallPlugin = (pluginId: string) => {
    pluginRegistry.unregister(pluginId);
  };

  // ── Filter legacy prop items by search ───────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q
      ? items
      : items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q),
        );
  }, [items, search]);

  const installedPlugins = pluginRegistry.list();

  // Determine what to show in the main list
  const showFallback = !loading && !!error;
  const showApiList = !loading && !error && apiPlugins.length > 0;
  const showEmpty = !loading && !error && apiPlugins.length === 0;

  return (
    <div className="marketplace-panel">
      <div className="panel-header">
        <span className="panel-title">Marketplace</span>
      </div>

      <input
        type="text"
        placeholder="Search plugins…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="marketplace-search"
        aria-label="Search plugins"
      />

      {/* Loading skeleton */}
      {loading && (
        <div className="marketplace-section" aria-label="Loading plugins">
          <PluginSkeleton />
          <PluginSkeleton />
          <PluginSkeleton />
        </div>
      )}

      {/* Fallback catalogue — shown when the remote marketplace is unreachable
          (or, currently, not yet deployed). The bundled plugins are a real
          usable set, so present them as the default list with a subtle hint
          rather than a red "error" banner that makes the feature look broken.
          No Refresh button: there's no remote catalogue to fetch yet, so it
          would lie about doing something. */}
      {showFallback && (
        <div className="marketplace-section">
          <div className="marketplace-notice">
            <span className="marketplace-notice-text">
              Bundled plugins · more coming soon
            </span>
          </div>
          {AVAILABLE_PLUGINS.map((plugin) => {
            const isInstalled = registeredIds.has(plugin.id);
            return (
              <div key={plugin.id} className="marketplace-item">
                <div className="item-info">
                  <span className="item-name">{plugin.name}</span>
                  <span className="item-desc">{plugin.description}</span>
                  <span className="item-meta">v{plugin.version}</span>
                </div>
                <div className="item-actions">
                  {isInstalled ? (
                    <span className="installed-badge">Installed</span>
                  ) : (
                    <button
                      aria-label={`Install ${plugin.name}`}
                      className="btn-install"
                      onClick={() => handleInstallPlugin(plugin)}
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API-backed list */}
      {showApiList && (
        <div className="marketplace-section">
          <h4 className="section-title">Available</h4>
          {apiPlugins.map((plugin) => {
            const isInstalling = installingIds.has(plugin.id);
            const isUninstalling = uninstallingIds.has(plugin.id);
            return (
              <div key={plugin.id} className={`marketplace-item${plugin.installed ? ' installed' : ''}`}>
                <div className="item-info">
                  {plugin.icon && <img src={plugin.icon} alt="" className="plugin-icon" />}
                  <span className="item-name">{plugin.name}</span>
                  <span className="item-desc">{plugin.description}</span>
                  <span className="item-meta">
                    v{plugin.version} · {plugin.price === 'free' ? 'Free' : `$${plugin.price}`}
                    {plugin.rating > 0 && ` · ★ ${plugin.rating.toFixed(1)}`}
                  </span>
                </div>
                <div className="item-actions">
                  {plugin.installed ? (
                    <button
                      aria-label={`Uninstall ${plugin.name}`}
                      className="btn-uninstall"
                      disabled={isUninstalling}
                      onClick={() => void handleApiUninstall(plugin.id)}
                    >
                      {isUninstalling ? 'Removing…' : 'Uninstall'}
                    </button>
                  ) : (
                    <button
                      aria-label={`Install ${plugin.name}`}
                      className="btn-install"
                      disabled={isInstalling}
                      onClick={() => void handleApiInstall(plugin.id)}
                    >
                      {isInstalling ? 'Installing…' : 'Install'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEmpty && (
        <div className="marketplace-empty">No plugins found.</div>
      )}

      {/* Legacy prop-based items (used in tests / embedded mode) */}
      {filtered.length > 0 && (
        <div className="marketplace-section">
          {filtered.map((item) => (
            <div key={item.id} className="marketplace-item">
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-desc">{item.description}</span>
                <span className="item-meta">v{item.version} · {item.category} · {item.downloads.toLocaleString()} downloads</span>
              </div>
              <div className="item-actions">
                {item.installed ? (
                  <span className="installed-badge">Installed</span>
                ) : (
                  <button aria-label={`Install ${item.name}`} className="btn-install" onClick={() => onInstall?.(item)}>
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My installed plugins */}
      <div className="marketplace-section">
        <h4 className="section-title">My Plugins</h4>
        {installedPlugins.length === 0 ? (
          <div className="marketplace-empty">No plugins installed yet.</div>
        ) : (
          installedPlugins.map((plugin) => (
            <div key={plugin.id} className="marketplace-item installed">
              <div className="item-info">
                <span className="item-name">{plugin.name}</span>
                <span className="item-meta">v{plugin.version}</span>
              </div>
              <span className="installed-badge">Installed</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
