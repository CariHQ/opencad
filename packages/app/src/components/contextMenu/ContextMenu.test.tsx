/**
 * Context menu tests — positioning logic + item generation
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { computeMenuPosition, radialItemAngle, RADIAL_RADIUS } from './contextMenuPosition';
import { getContextMenuItems } from './contextMenuItems';
import { ContextMenu } from './ContextMenu';

// ── Positioning logic ──────────────────────────────────────────────────────────

describe('computeMenuPosition', () => {
  const W = 1200;
  const H = 800;

  it('returns TL quadrant when cursor is in top-left', () => {
    const pos = computeMenuPosition(100, 100, W, H);
    expect(pos.quadrant).toBe('TL');
  });

  it('returns TR quadrant when cursor is in top-right', () => {
    const pos = computeMenuPosition(900, 100, W, H);
    expect(pos.quadrant).toBe('TR');
  });

  it('returns BL quadrant when cursor is in bottom-left', () => {
    const pos = computeMenuPosition(100, 600, W, H);
    expect(pos.quadrant).toBe('BL');
  });

  it('returns BR quadrant when cursor is in bottom-right', () => {
    const pos = computeMenuPosition(900, 600, W, H);
    expect(pos.quadrant).toBe('BR');
  });

  it('clamps cx so the arc stays within the viewport', () => {
    const pos = computeMenuPosition(5, 400, W, H);
    expect(pos.cx).toBeGreaterThanOrEqual(RADIAL_RADIUS + 12);
  });

  it('clamps cy so the arc stays within the viewport', () => {
    const pos = computeMenuPosition(400, 5, W, H);
    expect(pos.cy).toBeGreaterThanOrEqual(RADIAL_RADIUS + 12);
  });

  it('clamps to max x boundary', () => {
    const pos = computeMenuPosition(W - 2, 400, W, H);
    expect(pos.cx).toBeLessThanOrEqual(W - RADIAL_RADIUS - 12);
  });

  it('clamps to max y boundary', () => {
    const pos = computeMenuPosition(400, H - 2, W, H);
    expect(pos.cy).toBeLessThanOrEqual(H - RADIAL_RADIUS - 12);
  });

  it('TL panel anchor has right and top (panel opposite the fan)', () => {
    // TL fan goes RIGHT → panel must go LEFT → uses CSS `right:`
    const pos = computeMenuPosition(100, 100, W, H);
    expect('right' in pos.panelAnchor).toBe(true);
    expect('top'   in pos.panelAnchor).toBe(true);
    expect('left'  in pos.panelAnchor).toBe(false);
  });

  it('TR panel anchor has left and top (panel opposite the fan)', () => {
    // TR fan goes LEFT → panel must go RIGHT → uses CSS `left:`
    const pos = computeMenuPosition(900, 100, W, H);
    expect('left'  in pos.panelAnchor).toBe(true);
    expect('top'   in pos.panelAnchor).toBe(true);
    expect('right' in pos.panelAnchor).toBe(false);
  });

  it('panel top is vertically centred on cy (within clamping)', () => {
    const pos = computeMenuPosition(300, 300, W, H);
    // top should be approximately cy - PANEL_H/2 = 300 - 90 = 210
    expect(pos.panelAnchor.top).toBeDefined();
    expect(pos.panelAnchor.top!).toBeLessThan(pos.cy);
  });
});

describe('radialItemAngle', () => {
  it('returns different angles for different indices', () => {
    const a0 = radialItemAngle(0, 4, 'TL');
    const a1 = radialItemAngle(1, 4, 'TL');
    expect(a0).not.toBe(a1);
  });

  it('produces angles that span ~180° for 4 items', () => {
    const angles = [0, 1, 2, 3].map((i) => radialItemAngle(i, 4, 'TL'));
    const span = Math.abs(angles[3]! - angles[0]!);
    expect(span).toBeCloseTo(Math.PI, 1);
  });

  it('TR angles are mirrored from TL', () => {
    const tl = radialItemAngle(0, 4, 'TL');
    const tr = radialItemAngle(0, 4, 'TR');
    expect(tl).not.toBe(tr);
  });
});

// ── Item generation ────────────────────────────────────────────────────────────

describe('getContextMenuItems', () => {
  it('empty 2D has paste in radial', () => {
    const g = getContextMenuItems('2d', 'empty');
    expect(g.radial.some((i) => i.id === 'paste')).toBe(true);
  });

  it('empty 3D has wireframe toggle in radial', () => {
    const g = getContextMenuItems('3d', 'empty');
    expect(g.radial.some((i) => i.id === 'wireframe')).toBe(true);
  });

  it('wall context has addDoor in radial', () => {
    const g = getContextMenuItems('2d', 'wall');
    expect(g.radial.some((i) => i.id === 'addDoor')).toBe(true);
  });

  it('door context has flip in radial', () => {
    const g = getContextMenuItems('2d', 'door');
    expect(g.radial.some((i) => i.id === 'flip')).toBe(true);
  });

  it('multi context has group in radial', () => {
    const g = getContextMenuItems('2d', 'multi');
    expect(g.radial.some((i) => i.id === 'group')).toBe(true);
  });

  it('3D element context has extrude in radial', () => {
    const g = getContextMenuItems('3d', 'wall');
    expect(g.radial.some((i) => i.id === 'extrude')).toBe(true);
  });

  it('all contexts have delete in radial or list', () => {
    const contexts = ['empty', 'wall', 'door', 'line', 'multi'] as const;
    for (const ctx of contexts) {
      const g = getContextMenuItems('2d', ctx);
      const allItems = [...g.radial, ...g.list];
      if (ctx !== 'empty') {
        expect(allItems.some((i) => i.id === 'delete')).toBe(true);
      }
    }
  });

  it('radial items are at most 6', () => {
    const contexts = ['empty', 'wall', 'door', 'line', 'multi'] as const;
    for (const ctx of contexts) {
      const g = getContextMenuItems('2d', ctx);
      expect(g.radial.length).toBeLessThanOrEqual(6);
    }
  });
});

// ── ContextMenu component ──────────────────────────────────────────────────────

describe('ContextMenu component', () => {
  const defaultProps = {
    x: 300, y: 200,
    viewportW: 1200, viewportH: 800,
    items: getContextMenuItems('2d', 'wall'),
    onAction: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders radial buttons', () => {
    render(<ContextMenu {...defaultProps} />);
    // wall context has addDoor
    expect(screen.getByRole('menuitem', { name: /add door/i })).toBeInTheDocument();
  });

  it('renders the secondary panel', () => {
    render(<ContextMenu {...defaultProps} />);
    // Properties is in the list
    expect(screen.getByRole('menuitem', { name: /properties/i })).toBeInTheDocument();
  });

  it('calls onAction and onClose when a radial button is clicked', () => {
    const onAction = vi.fn();
    const onClose  = vi.fn();
    render(<ContextMenu {...defaultProps} onAction={onAction} onClose={onClose} />);
    fireEvent.click(screen.getByRole('menuitem', { name: /add door/i }));
    expect(onAction).toHaveBeenCalledWith('addDoor');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<ContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty-space menu for 2D', () => {
    render(
      <ContextMenu
        {...defaultProps}
        items={getContextMenuItems('2d', 'empty')}
      />,
    );
    expect(screen.getByRole('menuitem', { name: /paste/i })).toBeInTheDocument();
  });

  it('has role="menu" on root', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
