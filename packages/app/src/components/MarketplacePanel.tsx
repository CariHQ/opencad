import React, { useState, useMemo } from 'react';

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

interface MarketplacePanelProps {
  items: MarketplaceItem[];
  onInstall: (item: MarketplaceItem) => void;
  onPublish: () => void;
}

export function MarketplacePanel({ items, onInstall, onPublish }: MarketplacePanelProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? items : items.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="marketplace-panel">
      <div className="panel-header">
        <span className="panel-title">Marketplace</span>
        <button
          aria-label="Publish component"
          className="btn-publish"
          onClick={onPublish}
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
                onClick={() => onInstall(item)}
              >
                Install
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="marketplace-empty">No components found.</div>}
      </div>
    </div>
  );
}
