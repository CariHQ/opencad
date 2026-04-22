import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import type { PropertyValue, PropertySet } from '@opencad/document';
import { getSharedSelectedCoords } from '../hooks/useThreeViewport';

interface PendingProp {
  name: string;
  value: string;
}

/**
 * Extracts Pset_ prefixed properties from an element's properties dict,
 * grouping them by Pset name. Used for the T-BIM-003 inline Psets display.
 * Property keys follow the pattern `Pset_<Name>.<propName>`.
 */
function extractInlinePsets(
  properties: Record<string, PropertyValue>
): Array<{ name: string; props: Array<{ key: string; fullKey: string; prop: PropertyValue }> }> {
  const groups: Record<string, Array<{ key: string; fullKey: string; prop: PropertyValue }>> = {};

  for (const [fullKey, prop] of Object.entries(properties)) {
    const match = fullKey.match(/^(Pset_[^.]+)\.(.+)$/);
    if (!match) continue;
    const [, psetName, propKey] = match;
    if (!groups[psetName]) groups[psetName] = [];
    groups[psetName].push({ key: propKey, fullKey, prop });
  }

  return Object.entries(groups).map(([name, props]) => ({ name, props }));
}

function formatPropValue(prop: PropertyValue): string {
  return `${prop.value}${prop.unit ? ' ' + prop.unit : ''}`;
}

/**
 * Detects structured JSON-array values (like Points / Vertices) whose raw
 * JSON string is unreadable inside a single-line text input. Returns a
 * short human summary like "6 points" / "12 vertices". null = not structured.
 */
function summarizeStructuredValue(key: string, prop: PropertyValue): string | null {
  if (prop.type !== 'string' || typeof prop.value !== 'string') return null;
  const v = prop.value.trim();
  if (!v.startsWith('[') && !v.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(v) as unknown;
    if (Array.isArray(parsed)) {
      const n = parsed.length;
      const lower = key.toLowerCase();
      if (lower === 'points')   return `${n} ${n === 1 ? 'point' : 'points'}`;
      if (lower === 'vertices') return `${n} ${n === 1 ? 'vertex' : 'vertices'}`;
      if (lower === 'layers')   return `${n} ${n === 1 ? 'layer' : 'layers'}`;
      return `${n} ${n === 1 ? 'item' : 'items'}`;
    }
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed as Record<string, unknown>);
      return `{ ${keys.length} ${keys.length === 1 ? 'field' : 'fields'} }`;
    }
    return null;
  } catch {
    return null;
  }
}

export function PropertiesPanel() {
  const { t } = useTranslation('panels');
  const { document: doc, selectedIds, updateElement, pushHistory } = useDocumentStore();
  const [pendingProps, setPendingProps] = useState<PendingProp[]>([]);
  // Live-polled position from the 3D viewport so the Location X/Y/Z inputs
  // update while the user drags the TransformControls gizmo — otherwise we'd
  // only see the value after the drag commits.
  const [liveCoords, setLiveCoords] = useState<{ x: number; y: number; z: number; elementId: string } | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCoords(getSharedSelectedCoords());
    }, 100);
    return () => clearInterval(id);
  }, []);

  if (!doc) return null;

  if (selectedIds.length === 0) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">{t('properties.title')}</span>
        </div>
        <div className="properties-content empty">
          <p className="properties-empty-hint">{t('properties.noSelection')}</p>
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">{t('properties.title')}</span>
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
          <div className="property-group-title">Location (mm)</div>
          {(['x', 'y', 'z'] as const).map((axis) => {
            // Prefer the live 3D-viewport coords for the currently selected
            // element — these update in real time while TransformControls is
            // dragging. Fall back to the persisted transform.translation.
            const live =
              liveCoords && liveCoords.elementId === selectedIds[0]
                ? liveCoords[axis]
                : null;
            const value =
              live !== null
                ? live.toFixed(0)
                : selectedElement.transform.translation[axis].toFixed(1);
            return (
              <div key={axis} className="property-row">
                <span className="property-label">{axis.toUpperCase()}</span>
                <div className="property-value">
                  <input
                    type="number"
                    className="property-input"
                    // key forces re-render when the backing value changes,
                    // letting the user still type and commit on blur
                    key={`${selectedIds[0]}-${axis}-${live ?? selectedElement.transform.translation[axis]}`}
                    defaultValue={value}
                    onBlur={(e) => handleTranslationBlur(axis, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
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
          {Object.entries(selectedElement.properties).map(([key, prop]) => {
            const summary = summarizeStructuredValue(key, prop);
            return (
              <div key={key} className="property-row">
                <span className="property-label">{key}</span>
                <div className="property-value">
                  {summary !== null ? (
                    <span
                      className="property-structured"
                      title={typeof prop.value === 'string' ? prop.value : String(prop.value)}
                    >
                      {summary}
                    </span>
                  ) : (
                    <input
                      type="text"
                      className="property-input"
                      defaultValue={formatPropValue(prop)}
                      onBlur={(e) => handlePropertyBlur(key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
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

        {(() => {
          const inlinePsets = extractInlinePsets(selectedElement.properties);
          if (inlinePsets.length === 0) return null;
          return (
            <div className="property-group">
              <div className="property-group-title">
                Psets
                <button
                  className="panel-action-btn"
                  aria-label="Add Pset"
                  title="Add Pset"
                  onClick={() => {
                    const name = window.prompt('Enter Pset name (e.g. Pset_WallCommon):');
                    if (!name?.trim()) return;
                    const psetName = name.trim().startsWith('Pset_') ? name.trim() : `Pset_${name.trim()}`;
                    const key = `${psetName}.NewProperty`;
                    pushHistory(`Add Pset ${psetName}`);
                    updateElement(selectedIds[0], {
                      properties: {
                        ...selectedElement.properties,
                        [key]: { type: 'string', value: '' },
                      },
                    });
                  }}
                  style={{ marginLeft: 'auto', fontSize: '12px' }}
                >
                  Add Pset
                </button>
              </div>
              {inlinePsets.map(({ name, props }) => (
                <div key={name} className="pset-group">
                  <div className="pset-name">{name}</div>
                  {props.map(({ key, fullKey, prop }) => (
                    <div key={fullKey} className="property-row pset-row">
                      <span className="property-label">{key}</span>
                      <div className="property-value">
                        <input
                          type="text"
                          className="property-input"
                          defaultValue={formatPropValue(prop)}
                          onBlur={(e) => {
                            pushHistory(`Edit Pset property ${fullKey}`);
                            updateElement(selectedIds[0], {
                              properties: {
                                ...selectedElement.properties,
                                [fullKey]: { ...prop, value: e.target.value },
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
