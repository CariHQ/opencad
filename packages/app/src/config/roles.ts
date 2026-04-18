export type RoleId =
  | 'architect'
  | 'structural'
  | 'mep'
  | 'contractor'
  | 'owner'
  | 'pm'
  | 'admin';

export interface RoleConfig {
  label: string;
  tools: string[];
  panels: string[];
  writableLayers: string[] | 'all';
  viewportMode: 'interactive' | 'view-only';
}

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  architect: {
    label: 'Architect',
    tools: [
      'select', 'line', 'rectangle', 'circle', 'arc', 'polygon', 'polyline',
      'wall', 'column', 'beam', 'slab', 'roof', 'stair', 'door', 'window', 'railing',
      'dimension', 'text', 'hatch', 'section', 'compliance', 'ai',
    ],
    panels: [
      'layers', 'properties', 'ai', 'compliance', 'navigator', 'levels',
      'schedule', 'materials', 'render', 'cost', 'carbon',
    ],
    writableLayers: 'all',
    viewportMode: 'interactive',
  },

  structural: {
    label: 'Structural Engineer',
    tools: ['select', 'dimension', 'section', 'compliance', 'annotation'],
    panels: ['layers', 'properties', 'compliance', 'navigator', 'levels', 'schedule'],
    writableLayers: ['structural', 'grids', 'foundations'],
    viewportMode: 'interactive',
  },

  mep: {
    label: 'MEP Engineer',
    tools: ['select', 'dimension', 'section', 'annotation'],
    panels: ['layers', 'properties', 'navigator', 'levels', 'schedule'],
    writableLayers: ['mechanical', 'electrical', 'plumbing'],
    viewportMode: 'interactive',
  },

  contractor: {
    label: 'Contractor / Builder',
    tools: ['select', 'dimension', 'section', 'compliance', 'annotation'],
    panels: ['layers', 'navigator', 'levels', 'schedule', 'compliance', 'cost'],
    writableLayers: [],
    viewportMode: 'interactive',
  },

  owner: {
    label: 'Owner / Client',
    tools: [],
    panels: ['navigator'],
    writableLayers: [],
    viewportMode: 'view-only',
  },

  pm: {
    label: 'Project Manager',
    tools: ['select', 'annotation'],
    panels: ['navigator', 'schedule', 'cost', 'comments'],
    writableLayers: [],
    viewportMode: 'view-only',
  },

  admin: {
    label: 'Administrator',
    tools: ['select'],
    panels: ['navigator', 'admin'],
    writableLayers: [],
    viewportMode: 'view-only',
  },
};

export const DEFAULT_ROLE: RoleId = 'architect';
