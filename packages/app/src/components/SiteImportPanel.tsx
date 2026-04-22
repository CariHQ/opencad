import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type SiteLayer = 'terrain' | 'buildings' | 'roads' | 'trees' | 'waterways' | 'boundaries';

interface SiteImportParams {
  query: string;
  source: 'osm' | 'ordnance-survey';
  layers: SiteLayer[];
  radius: number;
}

interface SiteImportPanelProps {
  onImport?: (params: SiteImportParams) => void;
  onSearch?: (query: string) => void;
}

const LAYERS: { id: SiteLayer; label: string }[] = [
  { id: 'terrain', label: 'Terrain / Elevation' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'roads', label: 'Roads & Paths' },
  { id: 'trees', label: 'Trees & Vegetation' },
  { id: 'waterways', label: 'Waterways' },
  { id: 'boundaries', label: 'Site Boundaries' },
];

export function SiteImportPanel({ onImport, onSearch }: SiteImportPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'osm' | 'ordnance-survey'>('osm');
  const [selectedLayers, setSelectedLayers] = useState<SiteLayer[]>(['terrain', 'buildings', 'roads']);
  const [radius, setRadius] = useState(500);

  const toggleLayer = (layer: SiteLayer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  const handleSearch = () => {
    if (query.trim()) onSearch?.(query.trim());
  };

  const handleImport = () => {
    onImport?.({ query, source, layers: selectedLayers, radius });
  };

  return (
    <div className="site-import-panel">
      <div className="panel-header">
        <span className="panel-title">{t('site.title')}</span>
      </div>

      <div className="site-search-row">
        <input
          type="text"
          placeholder={t('site.searchPlaceholder', { defaultValue: 'Enter address, coordinates, or location…' })}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          className="site-search-input"
        />
        <button
          aria-label={t('site.searchAria', { defaultValue: 'Search location' })}
          className="btn-search"
          onClick={handleSearch}
        >
          {t('site.search', { defaultValue: 'Search' })}
        </button>
      </div>

      <div className="site-source-row">
        <label>{t('site.source', { defaultValue: 'Source:' })}</label>
        <select value={source} onChange={(e) => setSource(e.target.value as 'osm' | 'ordnance-survey')}>
          <option value="osm">OpenStreetMap / OSM</option>
          <option value="ordnance-survey">Ordnance Survey</option>
        </select>
      </div>

      <div className="site-layers">
        <label>{t('site.dataLayers', { defaultValue: 'Data Layers:' })}</label>
        {LAYERS.map((layer) => (
          <label key={layer.id} className="layer-checkbox-label">
            <input
              type="checkbox"
              checked={selectedLayers.includes(layer.id)}
              onChange={() => toggleLayer(layer.id)}
            />
            {layer.label}
          </label>
        ))}
      </div>

      <div className="site-radius-row">
        <label htmlFor="site-radius">{t('site.radius', { defaultValue: 'Radius (m):' })}</label>
        <input
          id="site-radius"
          type="number"
          min={50}
          max={5000}
          step={50}
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value) || 500)}
        />
      </div>

      <button
        aria-label={t('site.importAria', { defaultValue: 'Import site data' })}
        className="btn-import-site"
        onClick={handleImport}
      >
        {t('site.importBtn', { defaultValue: 'Import Site Data' })}
      </button>
    </div>
  );
}
