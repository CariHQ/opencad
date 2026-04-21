import React, { useState, useMemo, useCallback } from 'react';
import { BUILT_IN_MATERIALS, MATERIAL_CATEGORIES, type Material } from '../lib/materials';
import { getMaterialTextureStyle } from '../utils/materialTextures';

interface MaterialLibraryProps {
  onSelect: (material: Material) => void;
  selectedCount: number;
  /** Name of the material currently applied to the selection (if any). */
  currentMaterialName?: string;
}

export function MaterialLibrary({ onSelect, selectedCount, currentMaterialName }: MaterialLibraryProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  /** Name of the most recently applied material — shown in status for 2 seconds. */
  const [justAppliedName, setJustAppliedName] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return BUILT_IN_MATERIALS.filter((m) => {
      const matchesSearch =
        search === '' || m.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || m.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const handleApply = useCallback((mat: Material) => {
    if (selectedCount === 0) return;
    onSelect(mat);
    setJustAppliedName(mat.name);
    // Clear the "just applied" message after 2 seconds — it's only a momentary
    // confirmation. The persistent current material is shown via `currentMaterialName`.
    setTimeout(() => setJustAppliedName(null), 2000);
  }, [onSelect, selectedCount]);

  const statusContent = () => {
    if (selectedCount === 0) {
      return <span className="material-status-hint">Select elements on the canvas, then click Apply</span>;
    }
    if (justAppliedName) {
      return (
        <span className="material-status-success">
          ✓ {justAppliedName} applied to {selectedCount} element{selectedCount > 1 ? 's' : ''}
        </span>
      );
    }
    if (currentMaterialName) {
      return (
        <span className="material-status-ready">
          {selectedCount} selected &nbsp;·&nbsp; Current: <strong>{currentMaterialName}</strong>
        </span>
      );
    }
    return (
      <span className="material-status-ready">
        {selectedCount} element{selectedCount > 1 ? 's' : ''} selected — click Apply to assign
      </span>
    );
  };

  return (
    <div className="material-library">
      <div className="panel-header">
        <span className="panel-title">Material Library</span>
      </div>

      <div className="material-selection-status">
        {statusContent()}
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
          {filtered.map((mat) => {
            const isCurrentMat = mat.name === currentMaterialName;
            return (
              <div
                key={mat.id}
                className={`material-card${isCurrentMat ? ' material-card--active' : ''}`}
              >
                <div
                  className="material-swatch"
                  style={getMaterialTextureStyle(mat)}
                  aria-hidden="true"
                  title={
                    mat.density !== undefined && mat.embodiedCarbon !== undefined
                      ? `${mat.name} — density: ${mat.density} kg/m³, carbon: ${mat.embodiedCarbon} kgCO2e/kg`
                      : mat.name
                  }
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
                  className={`btn-select-material${isCurrentMat ? ' applied' : ''}`}
                  onClick={() => handleApply(mat)}
                  disabled={selectedCount === 0}
                  aria-label={`Apply ${mat.name} to selected elements`}
                  title={selectedCount === 0 ? 'Select elements in the viewport first' : `Apply ${mat.name} to ${selectedCount} element${selectedCount > 1 ? 's' : ''}`}
                >
                  {isCurrentMat ? '✓ Applied' : 'Apply'}
                </button>
              </div>
            );
          })}
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
