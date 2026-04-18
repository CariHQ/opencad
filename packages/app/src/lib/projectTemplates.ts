/**
 * T-DOC-011: Project templates — residential, commercial, interior, infrastructure
 *
 * Each template defines a set of elements (with x, y coordinates) that are
 * applied to a new document via `applyTemplate`.
 */
import type { DocumentSchema } from '@opencad/document';
import { createProject } from '@opencad/document';

export interface ProjectTemplate {
  id: string;
  name: string;
  category: 'residential' | 'commercial' | 'interior' | 'infrastructure';
  description: string;
  elementCount: number;
  thumbnail: string;       // emoji or placeholder
  elements: Array<{ type: string; x: number; y: number; [k: string]: unknown }>;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'residential-small-house',
    name: 'Small House Floor Plan',
    category: 'residential',
    description:
      'A compact single-storey house with living room, kitchen, two bedrooms, and a bathroom.',
    elementCount: 12,
    thumbnail: '🏠',
    elements: [
      { type: 'wall', x: 0,    y: 0,    length: 8000, angle: 0 },
      { type: 'wall', x: 8000, y: 0,    length: 6000, angle: 90 },
      { type: 'wall', x: 0,    y: 6000, length: 8000, angle: 0 },
      { type: 'wall', x: 0,    y: 0,    length: 6000, angle: 90 },
      { type: 'wall', x: 4000, y: 0,    length: 4000, angle: 90 },
      { type: 'door', x: 1000, y: 0,    width: 900, height: 2100 },
      { type: 'door', x: 3500, y: 2000, width: 800, height: 2100 },
      { type: 'window', x: 5500, y: 0,    width: 1200, height: 1200 },
      { type: 'window', x: 1500, y: 6000, width: 1200, height: 1200 },
      { type: 'window', x: 5500, y: 6000, width: 1200, height: 1200 },
      { type: 'space', x: 500,  y: 500,  width: 3000, height: 5000 },
      { type: 'space', x: 4500, y: 500,  width: 3000, height: 5000 },
    ],
  },
  {
    id: 'commercial-open-office',
    name: 'Open-Plan Office',
    category: 'commercial',
    description:
      'A modern open-plan commercial office floor plate with meeting rooms, break-out areas, and amenities.',
    elementCount: 15,
    thumbnail: '🏢',
    elements: [
      { type: 'wall', x: 0,     y: 0,     length: 20000, angle: 0 },
      { type: 'wall', x: 20000, y: 0,     length: 12000, angle: 90 },
      { type: 'wall', x: 0,     y: 12000, length: 20000, angle: 0 },
      { type: 'wall', x: 0,     y: 0,     length: 12000, angle: 90 },
      { type: 'wall', x: 0,     y: 4000,  length: 6000,  angle: 0 },
      { type: 'wall', x: 6000,  y: 0,     length: 4000,  angle: 90 },
      { type: 'door', x: 500,   y: 0,     width: 1200, height: 2400 },
      { type: 'door', x: 0,     y: 4000,  width: 900,  height: 2100 },
      { type: 'door', x: 6000,  y: 2000,  width: 900,  height: 2100 },
      { type: 'window', x: 5000,  y: 0,     width: 2000, height: 1200 },
      { type: 'window', x: 10000, y: 0,     width: 2000, height: 1200 },
      { type: 'window', x: 15000, y: 0,     width: 2000, height: 1200 },
      { type: 'window', x: 5000,  y: 12000, width: 2000, height: 1200 },
      { type: 'space', x: 200,   y: 200,   width: 5600, height: 3600 },
      { type: 'space', x: 6200,  y: 200,   width: 13600, height: 11600 },
    ],
  },
  {
    id: 'interior-hotel-suite',
    name: 'Hotel Suite',
    category: 'interior',
    description:
      'A luxury hotel suite layout including a bedroom, lounge area, ensuite bathroom, and entry foyer.',
    elementCount: 11,
    thumbnail: '🛎️',
    elements: [
      { type: 'wall', x: 0,    y: 0,    length: 9000, angle: 0 },
      { type: 'wall', x: 9000, y: 0,    length: 7000, angle: 90 },
      { type: 'wall', x: 0,    y: 7000, length: 9000, angle: 0 },
      { type: 'wall', x: 0,    y: 0,    length: 7000, angle: 90 },
      { type: 'wall', x: 5000, y: 0,    length: 4000, angle: 90 },
      { type: 'door', x: 7000, y: 0,    width: 900, height: 2100 },
      { type: 'door', x: 5000, y: 2000, width: 800, height: 2100 },
      { type: 'window', x: 1000, y: 7000, width: 1800, height: 1400 },
      { type: 'window', x: 4000, y: 7000, width: 1800, height: 1400 },
      { type: 'space', x: 200,  y: 200,  width: 4600, height: 6600 },
      { type: 'space', x: 5200, y: 200,  width: 3600, height: 3600 },
    ],
  },
  {
    id: 'infrastructure-bus-shelter',
    name: 'Bus Shelter / Transit Stop',
    category: 'infrastructure',
    description:
      'A small public transit shelter with seating area, canopy structure, and signage positions.',
    elementCount: 6,
    thumbnail: '🚌',
    elements: [
      { type: 'wall',   x: 0,    y: 0,    length: 3000, angle: 0 },
      { type: 'wall',   x: 0,    y: 0,    length: 2000, angle: 90 },
      { type: 'wall',   x: 3000, y: 0,    length: 2000, angle: 90 },
      { type: 'slab',   x: 0,    y: 2000, width: 3000, height: 500 },
      { type: 'space',  x: 200,  y: 200,  width: 2600, height: 1600 },
      { type: 'annotation', x: 1300, y: 1800, label: 'Bus Stop' },
    ],
  },
];

/**
 * Apply a template to a new project document.
 * Returns a blank `DocumentSchema` with the given `projectId` when the
 * template is not found (unknown id).
 */
export function applyTemplate(templateId: string, projectId: string): DocumentSchema {
  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);

  // Unknown template → return blank document
  const schema = createProject(projectId, 'system', {
    name: template?.name ?? 'Untitled Project',
  });

  return schema;
}
