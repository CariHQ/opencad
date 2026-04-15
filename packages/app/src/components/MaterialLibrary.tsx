import React, { useState, useMemo } from 'react';
import { BUILT_IN_MATERIALS, MATERIAL_CATEGORIES, type Material } from '../lib/materials';

interface MaterialLibraryProps {
  onSelect: (material: Material) => void;
}

export function MaterialLibrary({ onSelect }: MaterialLibraryProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return BUILT_IN_MATERIALS.filter((m) => {
      const matchesSearch =
        search === '' || m.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || m.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <div className="material-library">
      <div className="panel-header">
        <span className="panel-title">Material Library</span>
      </div>

      <div className="material-library-controls">
        <input
          type="text"
          className="material-search"
          placeholder="Search materials…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label htmlFor="material-category" className="sr-only">
          Category
        </label>
        <select
          id="material-category"
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="material-category-select"
        >
          <option value="All">All Categories</option>
          {MATERIAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="material-empty">No materials found</div>
      ) : (
        <div className="material-grid">
          {filtered.map((mat) => (
            <div key={mat.id} className="material-card">
              <div
                className="material-swatch"
                style={{ backgroundColor: mat.color }}
                aria-hidden="true"
              />
              <div className="material-info">
                <span className="material-name">{mat.name}</span>
                <span className="material-category-tag">{mat.category}</span>
                <span className="material-roughness">roughness: {mat.roughness.toFixed(2)}</span>
                <span className="material-cost">
                  ${mat.costPerM2}/m²
                </span>
              </div>
              <button
                className="btn-select-material"
                onClick={() => onSelect(mat)}
                aria-label={`Select ${mat.name}`}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="material-library-footer">
        <button
          className="btn-secondary"
          aria-label="Add custom material"
        >
          + Add Custom
        </button>
      </div>
    </div>
  );
}
