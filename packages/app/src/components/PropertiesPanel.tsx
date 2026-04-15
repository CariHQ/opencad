import React, { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { PropertyValue } from '@opencad/document';

export function PropertiesPanel() {
  const { document: doc, selectedIds, updateElement, pushHistory } = useDocumentStore();
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});

  if (!doc) return null;

  if (selectedIds.length === 0) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Properties</span>
        </div>
        <div className="properties-content empty">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
            Select an element to view properties
          </p>
        </div>
      </div>
    );
  }

  const isMulti = selectedIds.length > 1;
  const selectedElements = selectedIds
    .map((id) => doc.elements[id])
    .filter(Boolean);

  if (selectedElements.length === 0) return null;

  const primaryElement = selectedElements[0]!;

  // For multi-select: only show properties shared by all selected elements
  const sharedProperties = isMulti
    ? Object.fromEntries(
        Object.entries(primaryElement.properties).filter(([key]) =>
          selectedElements.every((el) => key in el.properties)
        )
      )
    : primaryElement.properties;

  const handlePropertyChange = (propKey: string, rawValue: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [primaryElement.id]: { ...(prev[primaryElement.id] ?? {}), [propKey]: rawValue },
    }));
  };

  const handlePropertyBlur = (propKey: string, prop: PropertyValue, rawValue: string) => {
    const parsed: PropertyValue =
      prop.type === 'number'
        ? { ...prop, value: parseFloat(rawValue) || 0 }
        : { ...prop, value: rawValue };

    for (const el of selectedElements) {
      updateElement(el.id, {
        properties: { ...el.properties, [propKey]: parsed },
      });
    }
    pushHistory(`Edit ${propKey}`);

    // Clear local override
    setLocalValues((prev) => {
      const next = { ...prev };
      if (next[primaryElement.id]) {
        const copy = { ...next[primaryElement.id] };
        delete copy[propKey];
        next[primaryElement.id] = copy;
      }
      return next;
    });
  };

  const handleLocationBlur = (axis: 'x' | 'y' | 'z', rawValue: string) => {
    const num = parseFloat(rawValue) || 0;
    for (const el of selectedElements) {
      updateElement(el.id, {
        transform: {
          ...el.transform,
          translation: { ...el.transform.translation, [axis]: num },
        },
      });
    }
    pushHistory(`Move ${axis.toUpperCase()}`);
  };

  const handleAddProperty = () => {
    const newKey = 'Custom Property';
    const newProp: PropertyValue = { type: 'string', value: '' };
    for (const el of selectedElements) {
      updateElement(el.id, {
        properties: { ...el.properties, [newKey]: newProp },
      });
    }
    pushHistory('Add property');
  };

  const getDisplayValue = (propKey: string, prop: PropertyValue): string => {
    const local = localValues[primaryElement.id]?.[propKey];
    if (local !== undefined) return local;
    return String(prop.value);
  };

  const { x, y, z } = primaryElement.transform.translation;

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-title">Properties</span>
      </div>
      <div className="properties-content">
        {isMulti && (
          <div className="properties-multi-summary">{selectedIds.length} elements selected</div>
        )}

        <div className="property-group">
          <div className="property-group-title">General</div>
          <div className="property-row">
            <span className="property-label">Type</span>
            <div className="property-value">
              <span>{primaryElement.type}</span>
            </div>
          </div>
        </div>

        {!isMulti && (
          <div className="property-group">
            <div className="property-group-title">Location</div>
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="property-row">
                <label htmlFor={`loc-${axis}`} className="property-label">
                  {axis.toUpperCase()}
                </label>
                <div className="property-value">
                  <input
                    id={`loc-${axis}`}
                    type="number"
                    className="property-input"
                    defaultValue={axis === 'x' ? x.toFixed(1) : axis === 'y' ? y.toFixed(1) : z.toFixed(1)}
                    onBlur={(e) => handleLocationBlur(axis, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="property-group">
          <div className="property-group-title">Dimensions</div>
          {Object.entries(sharedProperties).map(([key, prop]) => (
            <div key={key} className="property-row">
              <span className="property-label">{key}</span>
              <div className="property-value property-value-with-unit">
                <input
                  type={prop.type === 'number' ? 'number' : 'text'}
                  className="property-input"
                  value={getDisplayValue(key, prop)}
                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                  onBlur={(e) => handlePropertyBlur(key, prop, e.target.value)}
                />
                {prop.unit && <span className="property-unit">{prop.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="property-group-actions">
          <button className="btn-add-property" onClick={handleAddProperty} aria-label="Add property">
            + Add Property
          </button>
        </div>
      </div>
    </div>
  );
}
