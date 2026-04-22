import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import { OBJECT_LIBRARY, OBJECT_CATEGORIES, type ObjectDefinition } from '../lib/objectLibrary';

export function ObjectLibraryPanel() {
  const { t } = useTranslation('panels');
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const { document: doc, addElement, pushHistory } = useDocumentStore();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return OBJECT_LIBRARY.filter((obj) => {
      const matchSearch   = q === '' || obj.name.toLowerCase().includes(q)
        || obj.subcategory.toLowerCase().includes(q);
      const matchCategory = category === 'All' || obj.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  const handlePlace = useCallback((obj: ObjectDefinition) => {
    if (!doc) return;

    // Resolve the default layer (first layer in document)
    const layers     = doc.organization.layers;
    const layerIds   = Object.keys(layers);
    const layerId    = layerIds[0] ?? 'default';

    addElement({
      type:       obj.elementType,
      layerId,
      properties: obj.defaultProperties as Record<string, unknown>,
    });

    pushHistory(`Place ${obj.name}`);
  }, [doc, addElement, pushHistory]);

  return (
    <div className="object-library-panel">
      <div className="panel-header">
        <span className="panel-title">{t('tool.objectLibrary.title', { defaultValue: 'Object Library' })}</span>
      </div>

      <div className="object-library-controls">
        <input
          type="text"
          className="object-library-search"
          placeholder={t('tool.objectLibrary.searchPlaceholder', { defaultValue: 'Search objects…' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('tool.objectLibrary.searchPlaceholder', { defaultValue: 'Search objects' })}
        />

        <label htmlFor="obj-category-select" className="sr-only">{t('tool.objectLibrary.category', { defaultValue: 'Category' })}</label>
        <select
          id="obj-category-select"
          aria-label={t('tool.objectLibrary.category', { defaultValue: 'Category' })}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="object-library-category-select"
        >
          <option value="All">{t('tool.objectLibrary.allCategories', { defaultValue: 'All Categories' })}</option>
          {OBJECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="object-library-empty">{t('tool.objectLibrary.noObjects', { defaultValue: 'No objects found' })}</div>
      ) : (
        <div className="object-library-grid">
          {filtered.map((obj) => (
            <div key={obj.id} data-testid="object-card" className="object-card">
              <div className="object-card-icon" aria-hidden="true">
                {obj.icon}
              </div>
              <div className="object-card-info">
                <span className="object-card-name">{obj.name}</span>
                <span className="object-card-sub">{obj.subcategory}</span>
                <span className="object-card-dims">
                  {obj.dimensions.width}×{obj.dimensions.depth} mm
                </span>
              </div>
              <button
                className="btn-place-object"
                onClick={() => handlePlace(obj)}
                aria-label={`Place ${obj.name}`}
                disabled={!doc}
              >
                Place
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
