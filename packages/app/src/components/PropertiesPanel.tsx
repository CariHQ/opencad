import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { PropertyValue, PropertySet } from '@opencad/document';

interface PendingProp {
  name: string;
  value: string;
}

function formatPropValue(prop: PropertyValue): string {
  return `${prop.value}${prop.unit ? ' ' + prop.unit : ''}`;
}

export function PropertiesPanel() {
  const { document: doc, selectedIds, updateElement, pushHistory } = useDocumentStore();
  const [pendingProps, setPendingProps] = useState<PendingProp[]>([]);

  if (!doc) return null;

  if (selectedIds.length === 0) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Properties</span>
        </div>
        <div className="properties-content empty">
          <p className="properties-empty-hint">Select an element to view its properties</p>
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Properties</span>
        </div>
        <div className="properties-content empty">
          <p className="properties-empty-hint">{selectedIds.length} elements selected</p>
        </div>
      </div>
    );
  }

  const selectedElement = doc.content.elements[selectedIds[0]];
  if (!selectedElement) return null;

  const handleTranslationBlur = (axis: 'x' | 'y' | 'z', rawValue: string) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    pushHistory(`Move element`);
    updateElement(selectedIds[0], {
      transform: {
        ...selectedElement.transform,
        translation: {
          ...selectedElement.transform.translation,
          [axis]: num,
        },
      },
    });
  };

  const handlePropertyBlur = (key: string, rawValue: string) => {
    const existing = selectedElement.properties[key];
    if (!existing) return;

    // Parse "value unit" format
    let parsed: string | number = rawValue;
    const match = rawValue.match(/^([\d.]+)\s*(.*)$/);
    if (match && existing.type === 'number') {
      parsed = parseFloat(match[1]);
    } else if (existing.type === 'string') {
      // strip any trailing unit accidentally typed
      parsed = rawValue;
    }

    pushHistory(`Edit ${key}`);
    updateElement(selectedIds[0], {
      properties: {
        ...selectedElement.properties,
        [key]: {
          ...existing,
          value: parsed,
        },
      },
    });
  };

  const handlePsetPropertyBlur = (psetId: string, propKey: string, rawValue: string, existing: PropertyValue) => {
    let parsed: string | number | boolean = rawValue;
    if (existing.type === 'number') {
      const match = rawValue.match(/^([\d.]+)/);
      if (match) parsed = parseFloat(match[1]);
    } else if (existing.type === 'boolean') {
      parsed = rawValue.toLowerCase() === 'true';
    }

    const updatedPsets = (selectedElement.propertySets ?? []).map((pset: PropertySet) => {
      if (pset.id !== psetId) return pset;
      return {
        ...pset,
        properties: {
          ...pset.properties,
          [propKey]: { ...existing, value: parsed },
        },
      };
    });

    pushHistory(`Edit Pset property ${propKey}`);
    updateElement(selectedIds[0], { propertySets: updatedPsets });
  };

  const handleAddProperty = () => {
    setPendingProps((prev) => [...prev, { name: '', value: '' }]);
  };

  const handlePendingNameChange = (index: number, name: string) => {
    setPendingProps((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)));
  };

  const handlePendingValueChange = (index: number, value: string) => {
    setPendingProps((prev) => prev.map((p, i) => (i === index ? { ...p, value } : p)));
  };

  const handlePendingBlur = (index: number) => {
    const pending = pendingProps[index];
    if (!pending.name.trim()) return;
    pushHistory(`Add property ${pending.name}`);
    updateElement(selectedIds[0], {
      properties: {
        ...selectedElement.properties,
        [pending.name]: {
          type: 'string',
          value: pending.value,
        },
      },
    });
    setPendingProps((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-title">Properties</span>
        <div className="panel-actions">
          <button className="panel-action-btn" title="More">
            ⋮
          </button>
        </div>
      </div>
      <div className="properties-content">
        <div className="property-group">
          <div className="property-group-title">General</div>
          <div className="property-row">
            <span className="property-label">Type</span>
            <div className="property-value">
              <input type="text" className="property-input" value={selectedElement.type} readOnly />
            </div>
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">Location</div>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <div key={axis} className="property-row">
              <span className="property-label">{axis.toUpperCase()}</span>
              <div className="property-value">
                <input
                  type="number"
                  className="property-input"
                  defaultValue={selectedElement.transform.translation[axis].toFixed(1)}
                  onBlur={(e) => handleTranslationBlur(axis, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="property-group">
          <div className="property-group-title">
            Dimensions
            <button
              className="panel-action-btn"
              title="Add property"
              onClick={handleAddProperty}
              style={{ marginLeft: 'auto', fontSize: '12px' }}
            >
              +
            </button>
          </div>
          {Object.entries(selectedElement.properties).map(([key, prop]) => (
            <div key={key} className="property-row">
              <span className="property-label">{key}</span>
              <div className="property-value">
                <input
                  type="text"
                  className="property-input"
                  defaultValue={formatPropValue(prop)}
                  onBlur={(e) => handlePropertyBlur(key, e.target.value)}
                />
              </div>
            </div>
          ))}
          {pendingProps.map((pending, idx) => (
            <div key={`pending-${idx}`} className="property-row">
              <div className="property-value" style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  className="property-input"
                  placeholder="Name"
                  value={pending.name}
                  onChange={(e) => handlePendingNameChange(idx, e.target.value)}
                />
                <input
                  type="text"
                  className="property-input"
                  placeholder="Value"
                  value={pending.value}
                  onChange={(e) => handlePendingValueChange(idx, e.target.value)}
                  onBlur={() => handlePendingBlur(idx)}
                />
              </div>
            </div>
          ))}
        </div>

        {selectedElement.propertySets && selectedElement.propertySets.length > 0 && (
          <div className="property-group">
            <div className="property-group-title">IFC Property Sets</div>
            {selectedElement.propertySets.map((pset) => (
              <div key={pset.id} className="pset-group">
                <div className="pset-name">{pset.name}</div>
                {Object.entries(pset.properties).map(([key, prop]) => (
                  <div key={key} className="property-row pset-row">
                    <span className="property-label">{key}</span>
                    <div className="property-value">
                      <input
                        type="text"
                        className="property-input"
                        defaultValue={formatPropValue(prop)}
                        onBlur={(e) => handlePsetPropertyBlur(pset.id, key, e.target.value, prop)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
