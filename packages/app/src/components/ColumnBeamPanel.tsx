import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';

const COLUMN_SECTIONS = ['Circular', 'Rectangular', 'H-Section', 'I-Section', 'RHS'];
const BEAM_PROFILES = ['IPE', 'HEA', 'HEB', 'UB', 'RHS', 'CHS', 'Rectangular', 'Circular'];

export function ColumnBeamPanel() {
  const { t } = useTranslation('panels');
  const { activeTool, toolParams, setToolParam } = useDocumentStore();

  if (activeTool === 'column') {
    const p = (toolParams?.['column'] ?? {}) as Record<string, unknown>;
    const height = (p.height as number | undefined) ?? 3000;
    const sectionType = (p.sectionType as string | undefined) ?? 'Circular';
    const diameter = (p.diameter as number | undefined) ?? 300;
    const width = (p.width as number | undefined) ?? 300;
    const depth = (p.depth as number | undefined) ?? 300;
    const material = (p.material as string | undefined) ?? 'Concrete';

    return (
      <div className="tool-panel">
        <div className="tool-panel-header">{t('tool.column.title', { defaultValue: 'Column' })}</div>

        <div className="tool-panel-group">
          <div className="tool-panel-row">
            <label htmlFor="col-height">{t('tool.column.height', { defaultValue: 'Height (mm)' })}</label>
            <input
              id="col-height"
              type="number"
              className="tool-panel-input"
              defaultValue={height}
              onBlur={(e) => setToolParam('column', 'height', parseFloat(e.target.value))}
            />
          </div>

          <div className="tool-panel-row">
            <label htmlFor="col-section-type">{t('tool.column.sectionType', { defaultValue: 'Section Type' })}</label>
            <select
              id="col-section-type"
              className="tool-panel-select"
              value={sectionType}
              onChange={(e) => setToolParam('column', 'sectionType', e.target.value)}
            >
              {COLUMN_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {sectionType === 'Circular' && (
            <div className="tool-panel-row">
              <label htmlFor="col-diameter">{t('tool.column.diameter', { defaultValue: 'Diameter (mm)' })}</label>
              <input
                id="col-diameter"
                type="number"
                className="tool-panel-input"
                defaultValue={diameter}
                onBlur={(e) => setToolParam('column', 'diameter', parseFloat(e.target.value))}
              />
            </div>
          )}

          {(sectionType === 'Rectangular' || sectionType === 'RHS') && (
            <>
              <div className="tool-panel-row">
                <label htmlFor="col-width">{t('tool.column.width', { defaultValue: 'Width (mm)' })}</label>
                <input
                  id="col-width"
                  type="number"
                  className="tool-panel-input"
                  defaultValue={width}
                  onBlur={(e) => setToolParam('column', 'width', parseFloat(e.target.value))}
                />
              </div>
              <div className="tool-panel-row">
                <label htmlFor="col-depth">{t('tool.column.depth', { defaultValue: 'Depth (mm)' })}</label>
                <input
                  id="col-depth"
                  type="number"
                  className="tool-panel-input"
                  defaultValue={depth}
                  onBlur={(e) => setToolParam('column', 'depth', parseFloat(e.target.value))}
                />
              </div>
            </>
          )}

          <div className="tool-panel-row">
            <label htmlFor="col-material">{t('tool.column.material', { defaultValue: 'Material' })}</label>
            <input
              id="col-material"
              type="text"
              className="tool-panel-input"
              defaultValue={material}
              onBlur={(e) => setToolParam('column', 'material', e.target.value)}
            />
          </div>
        </div>

        <div className="placement-hint">{t('tool.column.placeHint', { defaultValue: 'Click to place column' })}</div>
      </div>
    );
  }

  // Beam
  const p = (toolParams?.['beam'] ?? {}) as Record<string, unknown>;
  const span = (p.span as number | undefined) ?? 5000;
  const sectionProfile = (p.sectionProfile as string | undefined) ?? 'IPE';
  const sectionSize = (p.sectionSize as string | undefined) ?? '200';
  const material = (p.material as string | undefined) ?? 'Steel';

  return (
    <div className="tool-panel">
      <div className="tool-panel-header">{t('tool.beam.title', { defaultValue: 'Beam' })}</div>

      <div className="tool-panel-group">
        <div className="tool-panel-row">
          <label htmlFor="beam-span">{t('tool.beam.span', { defaultValue: 'Span (mm)' })}</label>
          <input
            id="beam-span"
            type="number"
            className="tool-panel-input"
            defaultValue={span}
            onBlur={(e) => setToolParam('beam', 'span', parseFloat(e.target.value))}
          />
        </div>

        <div className="tool-panel-row">
          <label htmlFor="beam-section-profile">{t('tool.beam.sectionProfile', { defaultValue: 'Section Profile' })}</label>
          <select
            id="beam-section-profile"
            className="tool-panel-select"
            value={sectionProfile}
            onChange={(e) => setToolParam('beam', 'sectionProfile', e.target.value)}
          >
            {BEAM_PROFILES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-panel-row">
          <label htmlFor="beam-section-size">{t('tool.beam.sectionSize', { defaultValue: 'Section Size' })}</label>
          <input
            id="beam-section-size"
            type="text"
            className="tool-panel-input"
            defaultValue={sectionSize}
            onBlur={(e) => setToolParam('beam', 'sectionSize', e.target.value)}
          />
        </div>

        <div className="tool-panel-row">
          <label htmlFor="beam-material">{t('tool.beam.material', { defaultValue: 'Material' })}</label>
          <input
            id="beam-material"
            type="text"
            className="tool-panel-input"
            defaultValue={material}
            onBlur={(e) => setToolParam('beam', 'material', e.target.value)}
          />
        </div>
      </div>

      <div className="placement-hint">{t('tool.beam.placeHint', { defaultValue: 'Click start and end points to place beam' })}</div>
    </div>
  );
}
