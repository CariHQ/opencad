import React, { useState, useMemo } from 'react';
import { pluginRegistry } from '../plugins/pluginRegistry';
import { validateManifest, type PluginManifest } from '../plugins/pluginManifest';

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

// ─── Component ────────────────────────────────────────────────────────────────

export function MarketplacePanel({ items = [], onInstall, onPublish }: MarketplacePanelProps = {}) {
  const [search, setSearch] = useState('');
  // Track which plugin IDs have been installed via the registry during this session
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(pluginRegistry.list().map((m) => m.id))
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? items : items.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleInstallPlugin = (manifest: PluginManifest) => {
    if (!validateManifest(manifest)) return;
    pluginRegistry.register(manifest);
    setRegisteredIds((prev) => new Set([...prev, manifest.id]));
  };

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
                v{item.version} · {item.category} · {item.downloads.toLocaleString('en-US')} downloads
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

      {/* Available Plugins (catalogue) */}
      <div className="marketplace-section">
        <h4 className="section-title">Available Plugins</h4>
        {AVAILABLE_PLUGINS.map((plugin) => {
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
