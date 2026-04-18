import React, { useEffect, useRef, useCallback } from 'react';
import {
  Trash2, Copy, CopyPlus, SlidersHorizontal, Layers, Layers2, Clipboard,
  Minus, SquareStack, SquareDashed, Maximize2, Grid2x2, MousePointer,
  FileUp, GitCommit, DoorOpen, AppWindow, Scissors, ArrowUpDown,
  ChevronsLeftRight, Link, FlipHorizontal2, Scaling, FlipVertical2,
  MoveHorizontal, Group, Lock, BringToFront, SendToBack, AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween, AlignCenter, Pipette, Box, Focus, EyeOff, ScanLine,
  ArrowDown, Maximize, type LucideProps,
} from 'lucide-react';
import { computeMenuPosition, radialItemAngle, RADIAL_RADIUS } from './contextMenuPosition';
import type { ContextMenuGroup } from './contextMenuItems';

// ── Icon registry ─────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<LucideProps>;

const ICONS: Record<string, IconComponent> = {
  Trash2, Copy, CopyPlus, SlidersHorizontal, Layers, Layers2, Clipboard,
  Minus, SquareStack, SquareDashed, Maximize2, Grid2x2, MousePointer,
  FileUp, GitCommit, DoorOpen, AppWindow, Scissors, ArrowUpDown,
  ChevronsLeftRight, Link, FlipHorizontal2, Scaling, FlipVertical2,
  MoveHorizontal, Group, Lock, BringToFront, SendToBack,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, AlignCenter,
  Pipette, Box, Focus, EyeOff, ScanLine, ArrowDown, Maximize,
};

function Icon({ name, size = 14 }: { name: string; size?: number }): React.ReactElement {
  const C = ICONS[name];
  if (!C) return <span style={{ width: size, height: size, display: 'inline-block' }} />;
  return <C size={size} strokeWidth={1.8} />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ContextMenuProps {
  x: number;
  y: number;
  viewportW: number;
  viewportH: number;
  items: ContextMenuGroup;
  onAction: (actionId: string) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContextMenu({
  x, y, viewportW, viewportH, items, onAction, onClose,
}: ContextMenuProps): React.ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = computeMenuPosition(x, y, viewportW, viewportH);
  const { radial, list } = items;

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const handleAction = useCallback((action: string) => {
    onAction(action);
    onClose();
  }, [onAction, onClose]);

  // Radial button positions
  const radialButtons = radial.map((item, i) => {
    const angle = radialItemAngle(i, radial.length, pos.quadrant);
    const bx = pos.cx + Math.cos(angle) * RADIAL_RADIUS;
    const by = pos.cy + Math.sin(angle) * RADIAL_RADIUS;
    return { item, bx, by, angle };
  });

  // Panel anchor style
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1100,
    ...pos.panelAnchor,
  };

  return (
    <div className="ctx-menu-root" role="menu" aria-label="Context menu">
      {/* ── SVG layer: origin crosshair + connector lines ── */}
      <svg
        className="ctx-menu-svg"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 1099 }}
        aria-hidden="true"
      >
        {/* Subtle connector lines from origin to each button */}
        {radialButtons.map(({ item, bx, by }) => (
          <line
            key={`line-${item.id}`}
            x1={pos.cx} y1={pos.cy}
            x2={bx}    y2={by}
            className="ctx-menu-connector"
          />
        ))}
        {/* Origin dot */}
        <circle cx={pos.cx} cy={pos.cy} r={4} className="ctx-menu-origin" />
      </svg>

      {/* ── Radial buttons ── */}
      {radialButtons.map(({ item, bx, by }, i) => (
        <button
          key={item.id}
          role="menuitem"
          className={`ctx-radial-btn${item.destructive ? ' ctx-radial-btn--danger' : ''}`}
          style={{
            position: 'fixed',
            left: bx,
            top:  by,
            transform: 'translate(-50%, -50%)',
            zIndex: 1100,
            animationDelay: `${i * 28}ms`,
          }}
          title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
          aria-label={item.label}
          onClick={() => handleAction(item.action)}
        >
          <Icon name={item.icon} size={16} />
          <span className="ctx-radial-label">{item.label}</span>
        </button>
      ))}

      {/* ── Secondary panel ── */}
      {list.length > 0 && (
        <div ref={panelRef} className="ctx-panel" style={panelStyle} role="group">
          {list.map((item, i) => (
            <React.Fragment key={item.id}>
              {item.separator && i > 0 && <hr className="ctx-panel-divider" />}
              <button
                role="menuitem"
                className={`ctx-panel-item${item.destructive ? ' ctx-panel-item--danger' : ''}${item.disabled ? ' ctx-panel-item--disabled' : ''}`}
                disabled={item.disabled}
                onClick={() => handleAction(item.action)}
              >
                <span className="ctx-panel-item__icon"><Icon name={item.icon} size={13} /></span>
                <span className="ctx-panel-item__label">{item.label}</span>
                {item.shortcut && (
                  <span className="ctx-panel-item__shortcut">{item.shortcut}</span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
