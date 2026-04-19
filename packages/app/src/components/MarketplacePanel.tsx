import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { pluginRegistry } from '../plugins/pluginRegistry';
import { validateManifest, type PluginManifest } from '../plugins/pluginManifest';
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

const AVAILABLE_PLUGINS: PluginManifest[] = [
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
  onPublish,
}: MarketplacePanelProps = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // API state
  const [apiPlugins, setApiPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [uninstallingIds, setUninstallingIds] = useState<Set<string>>(new Set());

  // Track which plugin IDs have been installed via the registry during this session
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(pluginRegistry.list().map((m) => m.id)),
  );

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

  // ── Legacy catalogue install ─────────────────────────────────────────────
  const handleInstallPlugin = (manifest: PluginManifest) => {
    if (!validateManifest(manifest)) return;
    pluginRegistry.register(manifest);
    setRegisteredIds((prev) => new Set([...prev, manifest.id]));
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

  return (
    <div className="marketplace-panel">
      <div className="panel-header">
        <span className="panel-title">Marketplace</span>
        <button
          aria-label="Publish component"
          className="btn-publish"
          onClick={() => onPublish?.()}
        >
          Publish
        </button>
      </div>

      <input
        type="text"
        placeholder="Search components…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="marketplace-search"
        aria-label="Search plugins"
      />

      {/* Legacy prop-based items list */}
      <div className="marketplace-list">
        {filtered.map((item) => (
          <div key={item.id} className="marketplace-item">
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="item-author">by {item.author}</span>
              <span className="item-desc">{item.description}</span>
              <span className="item-meta">
                v{item.version} · {item.category} · {item.downloads.toLocaleString('en-US')}{' '}
                downloads
              </span>
            </div>
            {item.installed ? (
              <span className="installed-badge">Installed</span>
            ) : (
              <button
                aria-label={`Install ${item.name}`}
                className="btn-install"
                onClick={() => onInstall?.(item)}
              >
                Install
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && items.length > 0 && (
          <div className="marketplace-empty">No components found.</div>
        )}
      </div>

      {/* API-backed plugins section */}
      <div className="marketplace-section">
        <h4 className="section-title">Available Plugins</h4>

        {/* Error state */}
        {error && !loading && (
          <div className="marketplace-error" role="alert">
            <span>{error}</span>
            <button className="btn-retry" onClick={() => void fetchPlugins(debouncedSearch)}>
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div aria-label="Loading plugins">
            <PluginSkeleton />
            <PluginSkeleton />
            <PluginSkeleton />
          </div>
        )}

        {/* Plugin list */}
        {!loading &&
          !error &&
          apiPlugins.map((plugin) => {
            const isInstalling = installingIds.has(plugin.id);
            const isUninstalling = uninstallingIds.has(plugin.id);
            return (
              <div
                key={plugin.id}
                className={`marketplace-item${plugin.installed ? ' installed' : ''}`}
              >
                <div className="item-info">
                  {plugin.icon && (
                    <img src={plugin.icon} alt={plugin.name} className="plugin-icon" />
                  )}
                  <span className="item-name">{plugin.name}</span>
                  <span className="item-author">by {plugin.author}</span>
                  <span className="item-desc">{plugin.description}</span>
                  <span className="item-meta">
                    v{plugin.version} · {plugin.category} ·{' '}
                    {plugin.downloadCount.toLocaleString('en-US')} downloads ·{' '}
                    {plugin.price === 'free' ? 'Free' : `$${plugin.price}`}
                    {plugin.rating > 0 && ` · ★ ${plugin.rating.toFixed(1)}`}
                  </span>
                </div>
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
            );
          })}

        {/* Empty state after loading */}
        {!loading && !error && apiPlugins.length === 0 && (
          <div className="marketplace-empty">No plugins found.</div>
        )}

        {/* Fallback catalogue when API failed */}
        {!loading &&
          error &&
          AVAILABLE_PLUGINS.map((plugin) => {
            const isInstalled = registeredIds.has(plugin.id);
            return (
              <div key={plugin.id} className="marketplace-item">
                <div className="item-info">
                  <span className="item-name">{plugin.name}</span>
                  <span className="item-desc">{plugin.description}</span>
                  <span className="item-meta">v{plugin.version}</span>
                </div>
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
            );
          })}
      </div>

      {/* Registered Plugins section */}
      <div className="marketplace-section">
        <h4 className="section-title">My Plugins</h4>
        {installedPlugins.length === 0 ? (
          <div className="marketplace-empty">No plugins registered yet.</div>
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
