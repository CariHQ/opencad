export type RoleId =
  | 'architect'
  | 'structural'
  | 'mep'
  | 'contractor'
  | 'owner'
  | 'pm'
  | 'admin';

/** Alias used by AdminPanel component */
export type RoleName = RoleId;

export interface RoleConfig {
  label: string;
  tools: string[];
  panels: string[];
  writableLayers: string[] | 'all';
  viewportMode: 'interactive' | 'view-only';
  /** Which viewport views are accessible ('floor-plan' | '3d' | 'section') */
  views: string[];
}

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  architect: {
    label: 'Architect',
    tools: [
      // Selection
      'select',
      // 2D drafting
      'line', 'rectangle', 'circle', 'arc', 'ellipse', 'polygon', 'polyline', 'spline', 'hotspot',
      // Structural / BIM
      'wall', 'curtain_wall', 'column', 'beam', 'slab', 'roof', 'stair', 'ramp', 'railing',
      'ceiling', 'foundation', 'zone', 'truss', 'brace', 'mass',
      // Openings
      'door', 'window', 'skylight',
      // MEP
      'duct', 'pipe', 'cable_tray', 'conduit', 'lamp', 'air_terminal', 'sprinkler',
      // Site
      'topo', 'property_line', 'room_separator',
      // Documentation / annotation
      'dimension', 'text', 'model_text', 'label', 'section', 'elevation', 'detail', 'revision_cloud',
      // Misc
      'hatch', 'compliance', 'ai',
    ],
    panels: [
      // core
      'navigator', 'levels', 'layers', 'properties',
      // design tools
      'schedule', 'spaces', 'render', 'sheets', 'hatch', 'symbols', 'shadow', 'section', 'site', 'photo',
      // analysis
      'compliance', 'carbon', 'cost', 'wind',
      // collaboration
      'comments', 'bcf',
      // materials & content
      'materials', 'specs', 'marketplace',
      // ai
      'ai',
    ],
    writableLayers: 'all',
    viewportMode: 'interactive',
    // view access
    views: ['floor-plan', '3d', 'section'],
  },

  structural: {
    label: 'Structural Engineer',
    tools: ['select', 'dimension', 'section', 'compliance', 'annotation'],
    panels: [
      'navigator', 'levels', 'layers', 'properties',
      'schedule', 'section', 'compliance', 'bcf', 'comments', 'specs',
    ],
    writableLayers: ['structural', 'grids', 'foundations'],
    viewportMode: 'interactive',
    views: ['floor-plan', '3d', 'section'],
  },

  mep: {
    label: 'MEP Engineer',
    tools: ['select', 'dimension', 'section', 'annotation'],
    panels: [
      'navigator', 'levels', 'layers', 'properties',
      'schedule', 'section', 'clash', 'bcf', 'comments', 'specs',
    ],
    writableLayers: ['mechanical', 'electrical', 'plumbing'],
    viewportMode: 'interactive',
    views: ['floor-plan', '3d', 'section'],
  },

  contractor: {
    label: 'Contractor / Builder',
    tools: ['select', 'dimension', 'section', 'compliance', 'annotation'],
    panels: [
      'navigator', 'levels', 'layers',
      'schedule', 'compliance', 'cost', 'bcf', 'comments', 'specs', 'marketplace',
    ],
    writableLayers: [],
    viewportMode: 'interactive',
    views: ['floor-plan', '3d', 'section'],
  },

  owner: {
    label: 'Owner / Client',
    tools: [],
    panels: ['navigator', 'comments', 'marketplace'],
    writableLayers: [],
    viewportMode: 'view-only',
    views: ['3d'],
  },

  pm: {
    label: 'Project Manager',
    tools: ['select', 'annotation'],
    panels: ['navigator', 'schedule', 'cost', 'comments', 'bcf', 'marketplace'],
    writableLayers: [],
    viewportMode: 'view-only',
    views: ['floor-plan', '3d', 'section'],
  },

  admin: {
    label: 'Administrator',
    tools: ['select'],
    panels: ['navigator', 'schedule', 'comments', 'admin', 'marketplace'],
    writableLayers: [],
    viewportMode: 'view-only',
    views: ['floor-plan', '3d', 'section'],
  },
};

export const DEFAULT_ROLE: RoleId = 'architect';
