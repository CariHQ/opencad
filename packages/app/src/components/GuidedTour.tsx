/**
 * GuidedTour — first-visit walkthrough with spotlighted regions.
 *
 * Each step targets a CSS selector; the overlay positions a tooltip
 * next to the matched element with a soft cutout that highlights it.
 * Auto-runs on first visit (localStorage flag); replayable from the
 * Help panel.
 *
 * Designed to delight: animated cutout, friendly copy, never blocks
 * canvas interaction, Esc / overlay click skips at any time.
 */
import { useEffect, useState, useLayoutEffect, useCallback, useRef } from 'react';
import { ArrowRight, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TourStep {
  /** CSS selector for the target element. */
  selector?: string;
  /** Centred message when no selector — used for intro/outro. */
  centred?: boolean;
  title: string;
  body: string;
  /** Where to place the tooltip relative to the target. */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    centred: true,
    title: 'Welcome to OpenCAD',
    body: 'Quick 60-second tour of the workspace. Skip anytime with Esc.',
  },
  {
    selector: '[data-tour="tools"]',
    title: 'Tools',
    body: 'Wall, door, window, slab, roof — the same shortcuts you know (W/D/N/S/O). Press the icon or the letter.',
    placement: 'right',
  },
  {
    selector: '[data-tour="canvas"]',
    title: 'The canvas',
    body: 'Drag to draw. Type a length while dragging — Tab cycles to angle, Enter commits exactly.',
    placement: 'top',
  },
  {
    selector: '[data-tour="view-tabs"]',
    title: 'Floor Plan / 3D / Section',
    body: 'Toggle between views. The model is the same — only the camera changes.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="navigator"]',
    title: 'Navigator',
    body: 'Levels, layers, views, every named object. Click anything to jump.',
    placement: 'right',
  },
  {
    selector: '[data-tour="properties"]',
    title: 'Properties + Schedules',
    body: 'Selection lives here. Schedules, materials, compliance, and the layer panel share this space.',
    placement: 'left',
  },
  {
    selector: '[data-tour="help"]',
    title: 'You can always come back',
    body: 'Click Help any time for shortcuts, how-tos, and to replay this tour. Press ? from anywhere.',
    placement: 'bottom',
  },
  {
    centred: true,
    title: 'You\'re ready',
    body: 'Press W and click anywhere to draw your first wall.',
  },
];

export interface GuidedTourProps {
  open: boolean;
  steps?: TourStep[];
  onClose: () => void;
}

interface Rect { top: number; left: number; width: number; height: number }

export function GuidedTour({ open, steps = DEFAULT_TOUR_STEPS, onClose }: GuidedTourProps) {
  const { t } = useTranslation('common');
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const step = steps[stepIdx];

  const findTarget = useCallback((): HTMLElement | null => {
    if (!step?.selector) return null;
    const sel = step.selector.split(',').map((s) => s.trim());
    for (const s of sel) {
      const el = document.querySelector(s) as HTMLElement | null;
      if (el) return el;
    }
    return null;
  }, [step]);

  // Compute target rect on step change + on resize.
  useLayoutEffect(() => {
    if (!open) return;
    if (!step || step.centred || !step.selector) {
      setTargetRect(null);
      return;
    }
    const update = () => {
      const target = findTarget();
      if (!target) { setTargetRect(null); return; }
      const r = target.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, step, findTarget]);

  // Esc to skip
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIdx]);

  const next = () => {
    if (stepIdx >= steps.length - 1) { onClose(); return; }
    setStepIdx(stepIdx + 1);
  };
  const prev = () => setStepIdx(Math.max(0, stepIdx - 1));

  // Tooltip placement — clamp inside viewport.
  const tooltipStyle = (): React.CSSProperties => {
    const PADDING = 16;
    const TT_W = 320;
    const TT_H = 160;
    if (step?.centred || !targetRect) {
      return {
        top: `calc(50% - ${TT_H / 2}px)`,
        left: `calc(50% - ${TT_W / 2}px)`,
      };
    }
    const placement = step.placement ?? 'auto';
    const r = targetRect;
    let top: number, left: number;
    switch (placement) {
      case 'top':    top = r.top - TT_H - PADDING;          left = r.left + r.width / 2 - TT_W / 2; break;
      case 'left':   top = r.top + r.height / 2 - TT_H / 2; left = r.left - TT_W - PADDING;        break;
      case 'right':  top = r.top + r.height / 2 - TT_H / 2; left = r.left + r.width + PADDING;     break;
      case 'bottom':
      default:       top = r.top + r.height + PADDING;      left = r.left + r.width / 2 - TT_W / 2;
    }
    // Clamp inside viewport
    top  = Math.max(PADDING, Math.min(top,  window.innerHeight - TT_H - PADDING));
    left = Math.max(PADDING, Math.min(left, window.innerWidth  - TT_W - PADDING));
    return { top, left, width: TT_W };
  };

  if (!open || !step) return null;
  const isLast = stepIdx === steps.length - 1;

  return (
    <div className="tour-root" role="dialog" aria-label={t('tour.title', { defaultValue: 'Guided tour' })}>
      {/* Soft dimming + spotlight cutout */}
      <svg className="tour-mask" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <mask id="tour-cutout">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(8,12,20,0.55)" mask="url(#tour-cutout)" />
        {targetRect && (
          <rect
            className="tour-spotlight-stroke"
            x={targetRect.left - 6}
            y={targetRect.top - 6}
            width={targetRect.width + 12}
            height={targetRect.height + 12}
            rx="8"
            fill="none"
            stroke="var(--accent-primary, #18a0fb)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div ref={tooltipRef} className="tour-tooltip" style={tooltipStyle()}>
        <div className="tour-tooltip-header">
          <span className="tour-step-counter">{stepIdx + 1} / {steps.length}</span>
          <button className="tour-close" onClick={onClose} aria-label={t('tour.close', { defaultValue: 'Close tour' })}><X size={14} /></button>
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button className="tour-skip" onClick={onClose}>{t('tour.skip', { defaultValue: 'Skip tour' })}</button>
          <div className="tour-progress">
            {steps.map((_, i) => (
              <span key={i} className={`tour-dot ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`} />
            ))}
          </div>
          <button className="tour-next" onClick={next}>
            {isLast ? <>{t('action.done', { defaultValue: 'Done' })} <Check size={14} /></> : <>{t('action.next', { defaultValue: 'Next' })} <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Local-storage key used to track first-visit auto-launch. */
export const TOUR_SEEN_KEY = 'opencad-tour-seen';

export function hasSeenTour(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === '1'; } catch { return false; }
}
export function markTourSeen(): void {
  try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* */ }
}
