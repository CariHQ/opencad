/**
 * T-DOC-011: Project Templates
 *
 * Predefined DocumentSchema stubs users can start from.
 * Each template contains a name, description, and a partial DocumentSchema
 * with at least one layer and representative elements.
 */
import type { DocumentSchema } from '@opencad/document';

export interface ProjectTemplateEntry {
  id: string;
  name: string;
  description: string;
  schema: DocumentSchema;
}

const NOW = 0; // static for reproducibility in tests

function makeElement(
  id: string,
  type: DocumentSchema['content']['elements'][string]['type'],
  layerId: string,
  props: Record<string, { type: 'number' | 'string'; value: number | string }> = {}
): DocumentSchema['content']['elements'][string] {
  return {
    id,
    type,
    properties: props as DocumentSchema['content']['elements'][string]['properties'],
    propertySets: [],
    geometry: { type: 'mesh', data: null },
    layerId,
    levelId: null,
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 1, y: 1, z: 0, _type: 'Point3D' },
    },
    metadata: {
      id,
      createdBy: 'system',
      createdAt: NOW,
      updatedAt: NOW,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };
}

// ── Residential: 3-bedroom house floor plan stub ──────────────────────────────

const residentialSchema: DocumentSchema = {
  id: 'tpl-residential',
  name: 'Residential — 3-Bedroom House',
  version: { clock: {} },
  metadata: {
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'system',
    schemaVersion: '1.0',
  },
  content: {
    elements: {
      // Exterior walls
      'res-wall-n': makeElement('res-wall-n', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 10000 },
        EndY: { type: 'number', value: 0 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 200 },
      }),
      'res-wall-e': makeElement('res-wall-e', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 10000 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 10000 },
        EndY: { type: 'number', value: 8000 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 200 },
      }),
      'res-wall-s': makeElement('res-wall-s', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 8000 },
        EndX: { type: 'number', value: 10000 },
        EndY: { type: 'number', value: 8000 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 200 },
      }),
      'res-wall-w': makeElement('res-wall-w', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 0 },
        EndY: { type: 'number', value: 8000 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 200 },
      }),
      // Interior walls — bedroom dividers
      'res-wall-i1': makeElement('res-wall-i1', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 5000 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 5000 },
        EndY: { type: 'number', value: 5000 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 150 },
      }),
      'res-wall-i2': makeElement('res-wall-i2', 'wall', 'lyr-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 5000 },
        EndX: { type: 'number', value: 10000 },
        EndY: { type: 'number', value: 5000 },
        Height: { type: 'number', value: 3000 },
        Thickness: { type: 'number', value: 150 },
      }),
      // Front door
      'res-door-front': makeElement('res-door-front', 'door', 'lyr-openings', {
        X: { type: 'number', value: 4550 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 900 },
        Height: { type: 'number', value: 2100 },
      }),
      // Bedroom doors
      'res-door-bed1': makeElement('res-door-bed1', 'door', 'lyr-openings', {
        X: { type: 'number', value: 1000 },
        Y: { type: 'number', value: 5000 },
        Width: { type: 'number', value: 800 },
        Height: { type: 'number', value: 2100 },
      }),
      'res-door-bed2': makeElement('res-door-bed2', 'door', 'lyr-openings', {
        X: { type: 'number', value: 6000 },
        Y: { type: 'number', value: 5000 },
        Width: { type: 'number', value: 800 },
        Height: { type: 'number', value: 2100 },
      }),
      'res-door-bed3': makeElement('res-door-bed3', 'door', 'lyr-openings', {
        X: { type: 'number', value: 8500 },
        Y: { type: 'number', value: 5000 },
        Width: { type: 'number', value: 800 },
        Height: { type: 'number', value: 2100 },
      }),
      // Windows
      'res-win-n1': makeElement('res-win-n1', 'window', 'lyr-openings', {
        X: { type: 'number', value: 1000 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 1200 },
        Height: { type: 'number', value: 1200 },
      }),
      'res-win-n2': makeElement('res-win-n2', 'window', 'lyr-openings', {
        X: { type: 'number', value: 7000 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 1200 },
        Height: { type: 'number', value: 1200 },
      }),
      'res-win-s1': makeElement('res-win-s1', 'window', 'lyr-openings', {
        X: { type: 'number', value: 2000 },
        Y: { type: 'number', value: 8000 },
        Width: { type: 'number', value: 1500 },
        Height: { type: 'number', value: 1200 },
      }),
    },
    spaces: {},
  },
  organization: {
    layers: {
      'lyr-walls': {
        id: 'lyr-walls',
        name: 'Walls',
        color: '#4a5568',
        visible: true,
        locked: false,
        order: 0,
      },
      'lyr-openings': {
        id: 'lyr-openings',
        name: 'Doors & Windows',
        color: '#3182ce',
        visible: true,
        locked: false,
        order: 1,
      },
    },
    levels: {
      'lvl-gf': {
        id: 'lvl-gf',
        name: 'Ground Floor',
        elevation: 0,
        height: 3000,
        order: 0,
      },
    },
  },
  presentation: {
    views: {},
    annotations: {},
  },
  library: {
    materials: {},
  },
};

// ── Commercial: Open office floor plan stub ───────────────────────────────────

const commercialSchema: DocumentSchema = {
  id: 'tpl-commercial',
  name: 'Commercial — Open Office',
  version: { clock: {} },
  metadata: {
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'system',
    schemaVersion: '1.0',
  },
  content: {
    elements: {
      // Perimeter walls
      'com-wall-n': makeElement('com-wall-n', 'wall', 'lyr-ext', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 20000 },
        EndY: { type: 'number', value: 0 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 300 },
      }),
      'com-wall-e': makeElement('com-wall-e', 'wall', 'lyr-ext', {
        StartX: { type: 'number', value: 20000 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 20000 },
        EndY: { type: 'number', value: 15000 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 300 },
      }),
      'com-wall-s': makeElement('com-wall-s', 'wall', 'lyr-ext', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 15000 },
        EndX: { type: 'number', value: 20000 },
        EndY: { type: 'number', value: 15000 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 300 },
      }),
      'com-wall-w': makeElement('com-wall-w', 'wall', 'lyr-ext', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 0 },
        EndY: { type: 'number', value: 15000 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 300 },
      }),
      // Meeting room partitions
      'com-wall-mr1': makeElement('com-wall-mr1', 'wall', 'lyr-int', {
        StartX: { type: 'number', value: 14000 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 14000 },
        EndY: { type: 'number', value: 7000 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 100 },
      }),
      'com-wall-mr2': makeElement('com-wall-mr2', 'wall', 'lyr-int', {
        StartX: { type: 'number', value: 14000 },
        StartY: { type: 'number', value: 7000 },
        EndX: { type: 'number', value: 20000 },
        EndY: { type: 'number', value: 7000 },
        Height: { type: 'number', value: 3600 },
        Thickness: { type: 'number', value: 100 },
      }),
      // Entry doors
      'com-door-main': makeElement('com-door-main', 'door', 'lyr-openings', {
        X: { type: 'number', value: 9000 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 1800 },
        Height: { type: 'number', value: 2400 },
      }),
      'com-door-mr': makeElement('com-door-mr', 'door', 'lyr-openings', {
        X: { type: 'number', value: 14000 },
        Y: { type: 'number', value: 3000 },
        Width: { type: 'number', value: 1000 },
        Height: { type: 'number', value: 2400 },
      }),
      // Curtain wall windows (open office glazing)
      'com-win-n1': makeElement('com-win-n1', 'window', 'lyr-openings', {
        X: { type: 'number', value: 1000 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 2400 },
        Height: { type: 'number', value: 2400 },
      }),
      'com-win-n2': makeElement('com-win-n2', 'window', 'lyr-openings', {
        X: { type: 'number', value: 5000 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 2400 },
        Height: { type: 'number', value: 2400 },
      }),
      'com-win-e1': makeElement('com-win-e1', 'window', 'lyr-openings', {
        X: { type: 'number', value: 20000 },
        Y: { type: 'number', value: 1000 },
        Width: { type: 'number', value: 2400 },
        Height: { type: 'number', value: 2400 },
      }),
    },
    spaces: {},
  },
  organization: {
    layers: {
      'lyr-ext': {
        id: 'lyr-ext',
        name: 'External Walls',
        color: '#2d3748',
        visible: true,
        locked: false,
        order: 0,
      },
      'lyr-int': {
        id: 'lyr-int',
        name: 'Internal Partitions',
        color: '#718096',
        visible: true,
        locked: false,
        order: 1,
      },
      'lyr-openings': {
        id: 'lyr-openings',
        name: 'Doors & Windows',
        color: '#3182ce',
        visible: true,
        locked: false,
        order: 2,
      },
    },
    levels: {
      'lvl-gf': {
        id: 'lvl-gf',
        name: 'Ground Floor',
        elevation: 0,
        height: 3600,
        order: 0,
      },
    },
  },
  presentation: {
    views: {},
    annotations: {},
  },
  library: {
    materials: {},
  },
};

// ── Interior: Single room interior layout stub ────────────────────────────────

const interiorSchema: DocumentSchema = {
  id: 'tpl-interior',
  name: 'Interior — Single Room',
  version: { clock: {} },
  metadata: {
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'system',
    schemaVersion: '1.0',
  },
  content: {
    elements: {
      // Four perimeter walls of a room (5m × 4m)
      'int-wall-n': makeElement('int-wall-n', 'wall', 'lyr-room-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 5000 },
        EndY: { type: 'number', value: 0 },
        Height: { type: 'number', value: 2700 },
        Thickness: { type: 'number', value: 100 },
      }),
      'int-wall-e': makeElement('int-wall-e', 'wall', 'lyr-room-walls', {
        StartX: { type: 'number', value: 5000 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 5000 },
        EndY: { type: 'number', value: 4000 },
        Height: { type: 'number', value: 2700 },
        Thickness: { type: 'number', value: 100 },
      }),
      'int-wall-s': makeElement('int-wall-s', 'wall', 'lyr-room-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 4000 },
        EndX: { type: 'number', value: 5000 },
        EndY: { type: 'number', value: 4000 },
        Height: { type: 'number', value: 2700 },
        Thickness: { type: 'number', value: 100 },
      }),
      'int-wall-w': makeElement('int-wall-w', 'wall', 'lyr-room-walls', {
        StartX: { type: 'number', value: 0 },
        StartY: { type: 'number', value: 0 },
        EndX: { type: 'number', value: 0 },
        EndY: { type: 'number', value: 4000 },
        Height: { type: 'number', value: 2700 },
        Thickness: { type: 'number', value: 100 },
      }),
      // Entry door
      'int-door-entry': makeElement('int-door-entry', 'door', 'lyr-openings', {
        X: { type: 'number', value: 2050 },
        Y: { type: 'number', value: 0 },
        Width: { type: 'number', value: 900 },
        Height: { type: 'number', value: 2100 },
      }),
      // Windows
      'int-win-1': makeElement('int-win-1', 'window', 'lyr-openings', {
        X: { type: 'number', value: 5000 },
        Y: { type: 'number', value: 1200 },
        Width: { type: 'number', value: 1200 },
        Height: { type: 'number', value: 1200 },
      }),
      'int-win-2': makeElement('int-win-2', 'window', 'lyr-openings', {
        X: { type: 'number', value: 5000 },
        Y: { type: 'number', value: 2600 },
        Width: { type: 'number', value: 1200 },
        Height: { type: 'number', value: 1200 },
      }),
    },
    spaces: {},
  },
  organization: {
    layers: {
      'lyr-room-walls': {
        id: 'lyr-room-walls',
        name: 'Room Walls',
        color: '#4a5568',
        visible: true,
        locked: false,
        order: 0,
      },
      'lyr-openings': {
        id: 'lyr-openings',
        name: 'Doors & Windows',
        color: '#3182ce',
        visible: true,
        locked: false,
        order: 1,
      },
    },
    levels: {
      'lvl-floor': {
        id: 'lvl-floor',
        name: 'Floor Level',
        elevation: 0,
        height: 2700,
        order: 0,
      },
    },
  },
  presentation: {
    views: {},
    annotations: {},
  },
  library: {
    materials: {},
  },
};

// ── Catalog ───────────────────────────────────────────────────────────────────

export const PROJECT_TEMPLATES: ProjectTemplateEntry[] = [
  {
    id: 'residential',
    name: 'Residential',
    description: '3-bedroom house — basic floor plan with walls, doors, and windows',
    schema: residentialSchema,
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Open office floor plan stub with perimeter walls and meeting room',
    schema: commercialSchema,
  },
  {
    id: 'interior',
    name: 'Interior',
    description: 'Single room interior layout with walls, door, and windows',
    schema: interiorSchema,
  },
];
