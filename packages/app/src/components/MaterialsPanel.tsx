/**
 * MaterialsPanel — T-BIM-001
 *
 * Browse and assign BIM materials (MATERIAL_LIBRARY) to selected elements.
 */
import React, { useState, useMemo } from 'react';
import { MATERIAL_LIBRARY, type BIMMaterial } from '../lib/materials';
import { useDocumentStore } from '../stores/documentStore';
import { getBIMMaterialTextureStyle } from '../utils/materialTextures';

const ALL_CATEGORIES = ['structural', 'envelope', 'finish', 'mep'] as const;

export function MaterialsPanel() {
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BIMMaterial | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return MATERIAL_LIBRARY;
    return MATERIAL_LIBRARY.filter((m) => m.name.toLowerCase().includes(q));
  }, [search]);

  // Group filtered materials by category
  const grouped = useMemo(() => {
    return ALL_CATEGORIES.map((cat) => ({
      category: cat,
      materials: filtered.filter((m) => m.category === cat),
    })).filter((g) => g.materials.length > 0);
  }, [filtered]);

  const canAssign = selectedIds.length > 0 && selected !== null;

  const handleAssign = () => {
    if (!canAssign) return;
    // Assignment logic: update selected elements' material property
    // (wired to the document store when needed)
  };

  return (
    <div className="materials-panel">
      <div className="panel-header">
        <span className="panel-title">Materials</span>
      </div>

      {/* Search */}
      <input
        data-testid="materials-search"
        type="text"
        className="materials-search"
        placeholder="Search materials…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Grouped material list */}
      <div className="materials-list">
        {grouped.map(({ category, materials }) => (
          <div key={category} className="materials-group">
            <h3 className="materials-category-heading">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            {materials.map((m) => (
              <div
                key={m.id}
                data-testid={`material-item-${m.id}`}
                className={`material-item${selected?.id === m.id ? ' material-item--selected' : ''}`}
                onClick={() => setSelected(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(m)}
              >
                <span
                  className="material-swatch"
                  style={getBIMMaterialTextureStyle(m)}
                  aria-hidden="true"
                />
                <span className="material-name">{m.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Detail panel for selected material */}
      {selected && (
        <div data-testid="material-detail" className="material-detail">
          <strong>{selected.name}</strong>
          <dl>
            <dt>Category</dt>
            <dd>{selected.category}</dd>
            <dt>Density</dt>
            <dd>{selected.density} kg/m³</dd>
            <dt>Thermal Conductivity</dt>
            <dd>{selected.thermalConductivity} W/(m·K)</dd>
            <dt>Embodied Carbon</dt>
            <dd>{selected.embodiedCarbon} kgCO₂e/kg</dd>
          </dl>
        </div>
      )}

      {/* Assign button */}
      <button
        data-testid="assign-material-btn"
        className="btn-primary"
        onClick={handleAssign}
        disabled={!canAssign}
        aria-label="Assign to Selection"
      >
        Assign to Selection
      </button>
    </div>
  );
}
