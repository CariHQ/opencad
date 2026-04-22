/**
 * CoordBox — T-MOD-003 (#296).
 *
 * Floating numeric-input overlay shown while a drag-based drawing tool is
 * in progress. Users type a length + angle (or width + height) and press
 * Enter to commit at exact values. TAB cycles fields, Esc cancels.
 *
 * Field set per tool:
 *   wall / line / dimension : { length, angle }
 *   rectangle / slab        : { width, height }
 *
 * Unit input accepts anything parseLength understands: "4500", "4.5m",
 * "15'-3"". Angle is in degrees.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseLength } from '@opencad/shared';

export type CoordField = 'length' | 'angle' | 'width' | 'height';

export interface CoordBoxValues {
  length?: number;  // mm
  angle?: number;   // degrees
  width?: number;   // mm
  height?: number;  // mm
}

export interface CoordBoxProps {
  /** Screen-pixel position of the cursor / drag end — the overlay floats near this. */
  x: number;
  y: number;
  /** Live preview values from the in-progress drag. */
  preview: CoordBoxValues;
  /** Which fields to expose, in TAB order. */
  fields: CoordField[];
  /** Commit typed values; parent forces the active drawing tool to use them. */
  onCommit: (values: CoordBoxValues) => void;
  /** Cancel without committing — same as Esc on the canvas. */
  onCancel: () => void;
}

const FIELD_LABEL: Record<CoordField, string> = {
  length: 'L',
  angle:  '∠',
  width:  'W',
  height: 'H',
};

const FIELD_SUFFIX: Record<CoordField, string> = {
  length: 'mm',
  angle:  '°',
  width:  'mm',
  height: 'mm',
};

function formatPreview(field: CoordField, v: number | undefined): string {
  if (v == null || !isFinite(v)) return '';
  if (field === 'angle') return v.toFixed(1);
  return Math.round(v).toString();
}

export function CoordBox({ x, y, preview, fields, onCommit, onCancel }: CoordBoxProps) {
  const { t } = useTranslation('common');
  const [values, setValues] = useState<Record<CoordField, string>>(() => ({
    length: '', angle: '', width: '', height: '',
  }));
  const [activeIdx, setActiveIdx] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Focus the active field whenever it changes.
  useEffect(() => {
    const el = inputsRef.current[activeIdx];
    if (el) {
      el.focus();
      el.select();
    }
  }, [activeIdx]);

  const commit = () => {
    const out: CoordBoxValues = {};
    for (const f of fields) {
      const typed = values[f];
      if (!typed.trim()) continue;
      if (f === 'angle') {
        const n = parseFloat(typed);
        if (!isNaN(n)) out.angle = n;
      } else {
        const mm = parseLength(typed);
        if (mm != null) out[f] = mm;
      }
    }
    if (Object.keys(out).length === 0) {
      onCancel();
      return;
    }
    onCommit(out);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Don't let these keys propagate to the canvas' tool-shortcut handler.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const next = e.shiftKey
        ? (activeIdx - 1 + fields.length) % fields.length
        : (activeIdx + 1) % fields.length;
      setActiveIdx(next);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else {
      // Any other keystroke stays in the input; don't bubble to shortcuts.
      e.stopPropagation();
    }
  };

  // Render relative to viewport container, slightly offset down-right of cursor.
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x + 14,
    top:  y + 14,
    zIndex: 30,
    display: 'flex',
    gap: 4,
    padding: '4px 6px',
    background: 'var(--bg-elevated, #1e1f24)',
    border: '1px solid var(--border-color, #33343a)',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    fontSize: 12,
    color: 'var(--text-primary, #e6e6e6)',
    fontFamily: 'inherit',
    pointerEvents: 'auto',
  };

  return (
    <div className="coord-box" style={style} role="group" aria-label={t('coord.inputAria', { defaultValue: 'Coordinate input' })}>
      {fields.map((f, i) => (
        <label key={f} className="coord-box-field" style={{
          display: 'flex', alignItems: 'center', gap: 3,
          borderRight: i < fields.length - 1 ? '1px solid var(--border-color, #33343a)' : 'none',
          paddingRight: i < fields.length - 1 ? 6 : 0,
        }}>
          <span style={{ fontWeight: 600, opacity: 0.8 }}>{FIELD_LABEL[f]}</span>
          <input
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            value={values[f]}
            placeholder={formatPreview(f, preview[f])}
            onChange={(e) => setValues((prev) => ({ ...prev, [f]: e.target.value }))}
            onKeyDown={handleKeyDown}
            onFocus={() => setActiveIdx(i)}
            aria-label={f}
            style={{
              background: 'transparent',
              border: 'none',
              outline: i === activeIdx ? '2px solid var(--accent-primary, #18a0fb)' : 'none',
              outlineOffset: 1,
              borderRadius: 3,
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 12,
              width: 54,
              padding: '2px 4px',
            }}
          />
          <span style={{ opacity: 0.5, fontSize: 10 }}>{FIELD_SUFFIX[f]}</span>
        </label>
      ))}
    </div>
  );
}
