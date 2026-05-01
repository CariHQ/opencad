/**
 * T-SITE-02: Landscape tool panel — tabbed thumbnail grid for placing
 * trees, shrubs, rocks, site furniture, and entourage.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore, isDocumentReadOnly } from '../stores/documentStore';

type LandscapeTab = 'trees' | 'shrubs' | 'rocks' | 'furniture' | 'people';
const TABS: LandscapeTab[] = ['trees', 'shrubs', 'rocks', 'furniture', 'people'];

/** Shape of one entry in the starter manifest. */
interface ManifestAsset {
  id: string;
  displayNameKey: string;
  tab: LandscapeTab;
  path: string;
  lods: { hi: string; mid: string; lo: string };
  impostor: { image: string; meta: string } | null;
  triangleBudget: { hi: number; mid: number; lo: number };
  license: string;
  source: string;
  author: string;
  thumbnail: string | null;
}

interface Manifest {
  version: string;
  assets: ManifestAsset[];
}

/** Tab → ElementType for newly placed elements. */
const TAB_ELEMENT_TYPE: Record<LandscapeTab, string> = {
  trees: 'planting',
  shrubs: 'planting',
  rocks: 'rock',
  furniture: 'site_furniture',
  people: 'person',
};

export function LandscapeToolPanel(): React.ReactElement {
  const { t } = useTranslation();
  const document = useDocumentStore((s) => s.document);
  const addElement = useDocumentStore((s) => s.addElement);
  const pushHistory = useDocumentStore((s) => s.pushHistory);
  const isReadOnly = isDocumentReadOnly();

  const [activeTab, setActiveTab] = useState<LandscapeTab>('trees');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<ManifestAsset | null>(null);
  const [rotation, setRotation] = useState(0);
  const placingRef = useRef(placing);
  placingRef.current = placing;

  // Load manifest on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/assets/landscape/starter/manifest.json')
      .then((r) => r.json())
      .then((data: Manifest) => { if (!cancelled) { setManifest(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Handle keyboard while in placing mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!placingRef.current) return;
    if (e.key === 'Escape') { setPlacing(null); setRotation(0); }
    if (e.key === 'r' || e.key === 'R') {
      const delta = e.shiftKey ? -45 : 45;
      setRotation((r) => (r + delta + 360) % 360);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleThumbnailClick = useCallback((asset: ManifestAsset) => {
    if (isReadOnly) return;
    setPlacing((prev) => (prev?.id === asset.id ? null : asset));
    setRotation(0);
  }, [isReadOnly]);

  /** Called when user clicks in the viewport while placing mode is armed. */
  const handleViewportPlace = useCallback((x: number, y: number, z: number) => {
    const asset = placingRef.current;
    if (!asset || !document || isReadOnly) return;

    const layers = Object.values(document.organization.layers);
    const layerId = layers[0]?.id ?? 'default';
    const elementType = TAB_ELEMENT_TYPE[activeTab as LandscapeTab] ?? 'planting';

    pushHistory('Place landscape element');
    addElement({
      type: elementType,
      layerId,
      properties: {
        SpeciesId: { type: 'string', value: asset.id },
        LibraryId: { type: 'string', value: 'starter' },
        Scale: { type: 'number', value: 1.0 },
        Rotation: { type: 'number', value: rotation },
        Variation: { type: 'number', value: 0 },
        X: { type: 'number', value: x },
        Y: { type: 'number', value: y },
        Z: { type: 'number', value: z },
        Name: { type: 'string', value: t(asset.displayNameKey, asset.id) },
      },
    });
  }, [document, isReadOnly, addElement, pushHistory, activeTab, rotation, t]);

  // Expose the place handler so the viewport can call it
  // (In a real integration useThreeViewport would subscribe via a store action)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__landscapePlaceHandler = handleViewportPlace;
    return () => { delete (window as unknown as Record<string, unknown>).__landscapePlaceHandler; };
  }, [handleViewportPlace]);

  const tabAssets = manifest?.assets.filter((a) => a.tab === activeTab) ?? [];

  if (!document) return <div className="landscape-panel__empty">{t('panels.landscape.noAssets')}</div>;
  if (isReadOnly) return <div className="landscape-panel__empty">{t('panels.landscape.readOnly')}</div>;

  return (
    <div className="landscape-panel" role="region" aria-label={t('panels.landscape.title')}>
      {/* Tab bar */}
      <div className="landscape-panel__tabs" role="tablist" aria-label="Landscape categories">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`landscape-panel__tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => { setActiveTab(tab); setPlacing(null); }}
          >
            {t(`panels.landscape.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Placing status bar */}
      {placing && (
        <div className="landscape-panel__status" role="status" aria-live="polite">
          {t('panels.landscape.placePrompt', { name: t(placing.displayNameKey, placing.id) })}
          {' '}<span className="landscape-panel__rotation">↻ {rotation}°</span>
          <span className="landscape-panel__hint"> · R to rotate · Esc to cancel</span>
        </div>
      )}

      {/* Thumbnail grid */}
      <div
        className="landscape-panel__grid"
        role="listbox"
        aria-label={t(`panels.landscape.tabs.${activeTab}`)}
        aria-multiselectable="false"
      >
        {loading && (
          <div className="landscape-panel__loading">{t('panels.landscape.loadingManifest')}</div>
        )}
        {!loading && tabAssets.length === 0 && (
          <div className="landscape-panel__empty-tab">{t('panels.landscape.noAssets')}</div>
        )}
        {tabAssets.map((asset) => {
          const isArmed = placing?.id === asset.id;
          const label = t(asset.displayNameKey, asset.id);
          return (
            <button
              key={asset.id}
              role="option"
              aria-selected={isArmed}
              className={`landscape-panel__thumb${isArmed ? ' armed' : ''}`}
              onClick={() => handleThumbnailClick(asset)}
              title={label}
              aria-label={label}
            >
              {asset.thumbnail ? (
                <img
                  src={asset.thumbnail}
                  alt={label}
                  className="landscape-panel__thumb-img"
                  loading="lazy"
                />
              ) : (
                <div className="landscape-panel__thumb-placeholder" aria-hidden="true">
                  {label.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="landscape-panel__thumb-label">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Rotation hint when armed */}
      {placing && (
        <div className="landscape-panel__footer">
          <kbd>R</kbd> rotate +45° &nbsp; <kbd>⇧R</kbd> rotate −45° &nbsp; <kbd>Esc</kbd> cancel
        </div>
      )}
    </div>
  );
}
