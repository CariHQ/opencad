/**
 * Contextual menu item definitions.
 *
 * Items are grouped by context: the active viewport type and the selected element type.
 * Each item has an icon name (lucide), label, keyboard shortcut hint, and action key.
 */

export type ViewportType = '2d' | '3d';

export type ElementContext =
  | 'empty'        // nothing selected, clicked on canvas
  | 'wall'
  | 'door'
  | 'window'
  | 'slab'
  | 'column'
  | 'beam'
  | 'stair'
  | 'roof'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arc'
  | 'polygon'
  | 'polyline'
  | 'dimension'
  | 'text'
  | 'space'
  | 'multi';        // multiple elements selected

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: string;       // lucide icon name
  shortcut?: string;
  action: string;     // dispatched to action handler
  destructive?: boolean;
  separator?: boolean; // render a divider before this item
  disabled?: boolean;
}

export interface ContextMenuGroup {
  /** Primary radial items — shown as arcs around the cursor (max 6) */
  radial: ContextMenuItem[];
  /** Secondary list items — shown in the panel that extends from the radial */
  list: ContextMenuItem[];
}

// ── Shared actions ────────────────────────────────────────────────────────────

const DELETE_ITEM: ContextMenuItem = {
  id: 'delete', label: 'Delete', icon: 'Trash2', shortcut: 'Del', action: 'delete', destructive: true,
};
const COPY_ITEM: ContextMenuItem = {
  id: 'copy', label: 'Copy', icon: 'Copy', shortcut: '⌘C', action: 'copy',
};
const DUPLICATE_ITEM: ContextMenuItem = {
  id: 'duplicate', label: 'Duplicate', icon: 'CopyPlus', shortcut: '⌘J', action: 'duplicate',
};
const PROPERTIES_ITEM: ContextMenuItem = {
  id: 'properties', label: 'Properties', icon: 'SlidersHorizontal', shortcut: '⌘I', action: 'properties',
};
const SELECT_SIMILAR_ITEM: ContextMenuItem = {
  id: 'selectSimilar', label: 'Select similar', icon: 'Layers', action: 'selectSimilar',
};
const MOVE_TO_LAYER: ContextMenuItem = {
  id: 'moveToLayer', label: 'Move to layer…', icon: 'Layers2', action: 'moveToLayer',
};

// ── Empty-space context (2D) ──────────────────────────────────────────────────

const EMPTY_2D: ContextMenuGroup = {
  radial: [
    { id: 'paste',    label: 'Paste',        icon: 'Clipboard',  shortcut: '⌘V', action: 'paste' },
    { id: 'line',     label: 'Draw line',    icon: 'Minus',      shortcut: 'L',  action: 'tool:line' },
    { id: 'wall',     label: 'Draw wall',    icon: 'SquareStack',shortcut: 'W',  action: 'tool:wall' },
    { id: 'space',    label: 'Add space',    icon: 'SquareDashed',               action: 'tool:space' },
    { id: 'fitView',  label: 'Fit view',     icon: 'Maximize2',  shortcut: 'H',  action: 'fitToScreen' },
    { id: 'gridSnap', label: 'Snap to grid', icon: 'Grid2x2',                    action: 'toggleSnap' },
  ],
  list: [
    { id: 'selectAll',  label: 'Select all',   icon: 'MousePointer', shortcut: '⌘A', action: 'selectAll' },
    { id: 'import',     label: 'Import file…', icon: 'FileUp',                             action: 'import' },
    { id: 'saveVersion',label: 'Save version', icon: 'GitCommit',           shortcut: '⌘S', action: 'saveVersion', separator: true },
  ],
};

// ── Empty-space context (3D) ──────────────────────────────────────────────────

const EMPTY_3D: ContextMenuGroup = {
  radial: [
    { id: 'paste',     label: 'Paste',        icon: 'Clipboard',   shortcut: '⌘V', action: 'paste' },
    { id: 'wall',      label: 'Place wall',   icon: 'SquareStack', shortcut: 'W',  action: 'tool:wall' },
    { id: 'fitView',   label: 'Fit view',     icon: 'Maximize2',   shortcut: 'H',  action: 'fitToScreen' },
    { id: 'viewTop',   label: 'Top view',     icon: 'ArrowDown',   shortcut: '1',  action: 'view:top' },
    { id: 'view3d',    label: '3D view',      icon: 'Box',         shortcut: '4',  action: 'view:3d' },
    { id: 'wireframe', label: 'Wireframe',    icon: 'ScanLine',                    action: 'toggleWireframe' },
  ],
  list: [
    { id: 'selectAll',   label: 'Select all',  icon: 'MousePointer', shortcut: '⌘A', action: 'selectAll' },
    { id: 'zoomExtents', label: 'Zoom extents',icon: 'Maximize',            shortcut: '0',  action: 'fitToScreen', separator: true },
    { id: 'saveVersion', label: 'Save version',icon: 'GitCommit',           shortcut: '⌘S', action: 'saveVersion' },
  ],
};

// ── Wall context ──────────────────────────────────────────────────────────────

const WALL_CONTEXT: ContextMenuGroup = {
  radial: [
    { id: 'addDoor',   label: 'Add door',    icon: 'DoorOpen',        shortcut: 'D', action: 'addDoor' },
    { id: 'addWindow', label: 'Add window',  icon: 'AppWindow',        shortcut: 'N', action: 'addWindow' },
    COPY_ITEM,
    DUPLICATE_ITEM,
    { id: 'split',     label: 'Split wall',  icon: 'Scissors',                       action: 'splitWall' },
    DELETE_ITEM,
  ],
  list: [
    PROPERTIES_ITEM,
    { id: 'editHeight',  label: 'Edit height…',    icon: 'ArrowUpDown', action: 'editHeight' },
    { id: 'editThick',   label: 'Edit thickness…', icon: 'ChevronsLeftRight', action: 'editThickness' },
    { id: 'joinWall',    label: 'Join wall',        icon: 'Link',        action: 'joinWall' },
    SELECT_SIMILAR_ITEM,
    MOVE_TO_LAYER,
    DELETE_ITEM,
  ],
};

// ── Door / Window context ─────────────────────────────────────────────────────

const DOOR_WINDOW_CONTEXT: ContextMenuGroup = {
  radial: [
    { id: 'flip',      label: 'Flip',       icon: 'FlipHorizontal2', action: 'flip' },
    { id: 'editSize',  label: 'Resize…',    icon: 'Scaling',         action: 'editSize' },
    COPY_ITEM,
    DUPLICATE_ITEM,
    PROPERTIES_ITEM,
    DELETE_ITEM,
  ],
  list: [
    { id: 'flipVert',  label: 'Flip vertical',   icon: 'FlipVertical2',  action: 'flipVertical' },
    { id: 'moveAlong', label: 'Move along wall',  icon: 'MoveHorizontal', action: 'moveAlongWall' },
    SELECT_SIMILAR_ITEM,
    MOVE_TO_LAYER,
  ],
};

// ── Generic element context (line, rect, circle, etc.) ───────────────────────

const GENERIC_2D: ContextMenuGroup = {
  radial: [
    COPY_ITEM,
    DUPLICATE_ITEM,
    { id: 'group',  label: 'Group',   icon: 'Group',   shortcut: '⌘G', action: 'group' },
    PROPERTIES_ITEM,
    { id: 'lock',   label: 'Lock',    icon: 'Lock',                    action: 'lock' },
    DELETE_ITEM,
  ],
  list: [
    { id: 'bringFront', label: 'Bring to front', icon: 'BringToFront', action: 'bringToFront' },
    { id: 'sendBack',   label: 'Send to back',   icon: 'SendToBack',   action: 'sendToBack', separator: true },
    SELECT_SIMILAR_ITEM,
    MOVE_TO_LAYER,
    DELETE_ITEM,
  ],
};

// ── Multi-selection context ───────────────────────────────────────────────────

const MULTI_CONTEXT: ContextMenuGroup = {
  radial: [
    COPY_ITEM,
    DUPLICATE_ITEM,
    { id: 'group',   label: 'Group',    icon: 'Group',    shortcut: '⌘G', action: 'group' },
    { id: 'alignH',  label: 'Align H',  icon: 'AlignHorizontalSpaceBetween', action: 'alignHorizontal' },
    { id: 'alignV',  label: 'Align V',  icon: 'AlignVerticalSpaceBetween',   action: 'alignVertical' },
    DELETE_ITEM,
  ],
  list: [
    { id: 'distribute', label: 'Distribute evenly', icon: 'AlignCenter', action: 'distribute' },
    { id: 'matchProps', label: 'Match properties',  icon: 'Pipette',     action: 'matchProps' },
    SELECT_SIMILAR_ITEM,
    MOVE_TO_LAYER,
  ],
};

// ── 3D element context ────────────────────────────────────────────────────────

const ELEMENT_3D: ContextMenuGroup = {
  radial: [
    { id: 'extrude',   label: 'Extrude',  icon: 'Box',          action: 'extrude' },
    COPY_ITEM,
    DUPLICATE_ITEM,
    { id: 'material',  label: 'Material', icon: 'Layers',        action: 'openMaterials' },
    PROPERTIES_ITEM,
    DELETE_ITEM,
  ],
  list: [
    { id: 'isolate',   label: 'Isolate',     icon: 'Focus',       action: 'isolate' },
    { id: 'hide',      label: 'Hide',        icon: 'EyeOff',      action: 'hide' },
    SELECT_SIMILAR_ITEM,
    MOVE_TO_LAYER,
  ],
};

// ── Lookup table ──────────────────────────────────────────────────────────────

export function getContextMenuItems(
  viewport: ViewportType,
  elementType: ElementContext,
): ContextMenuGroup {
  if (elementType === 'empty') {
    return viewport === '3d' ? EMPTY_3D : EMPTY_2D;
  }
  if (elementType === 'multi') return MULTI_CONTEXT;
  if (elementType === 'wall')  return viewport === '3d' ? ELEMENT_3D : WALL_CONTEXT;
  if (elementType === 'door' || elementType === 'window') return DOOR_WINDOW_CONTEXT;
  if (viewport === '3d') return ELEMENT_3D;
  return GENERIC_2D;
}
