/**
 * Element Operations
 */

import {
  ElementSchema,
  ElementType,
  PropertyValue,
  Transform,
  Point3D,
  BoundingBox3D,
  ElementGeometry,
} from './types';

export function createElement(params: {
  id: string;
  type: ElementType;
  layerId: string;
  levelId?: string;
  properties?: Record<string, PropertyValue>;
  propertySets?: ElementSchema['propertySets'];
  geometry?: ElementGeometry;
  transform?: Partial<Transform>;
}): ElementSchema {
  const now = Date.now();

  return {
    id: params.id,
    type: params.type,
    properties: params.properties || {},
    propertySets: params.propertySets || [],
    geometry: params.geometry || { type: 'brep', data: null },
    layerId: params.layerId,
    levelId: params.levelId || null,
    transform: {
      translation: params.transform?.translation || { x: 0, y: 0, z: 0 },
      rotation: params.transform?.rotation || { x: 0, y: 0, z: 0 },
      scale: params.transform?.scale || { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
      max: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
    },
    metadata: {
      id: params.id,
      createdBy: '',
      createdAt: now,
      updatedAt: now,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };
}

export function updateElementTransform(
  element: ElementSchema,
  transform: Partial<Transform>
): ElementSchema {
  return {
    ...element,
    transform: {
      translation: transform.translation || element.transform.translation,
      rotation: transform.rotation || element.transform.rotation,
      scale: transform.scale || element.transform.scale,
    },
    metadata: {
      ...element.metadata,
      updatedAt: Date.now(),
    },
  };
}

export function updateElementProperty(
  element: ElementSchema,
  key: string,
  value: PropertyValue
): ElementSchema {
  return {
    ...element,
    properties: {
      ...element.properties,
      [key]: value,
    },
    metadata: {
      ...element.metadata,
      updatedAt: Date.now(),
    },
  };
}

export function updateElementBoundingBox(
  element: ElementSchema,
  boundingBox: BoundingBox3D
): ElementSchema {
  return {
    ...element,
    boundingBox,
  };
}

export function setElementVisibility(element: ElementSchema, visible: boolean): ElementSchema {
  return { ...element, visible };
}

export function setElementLocked(element: ElementSchema, locked: boolean): ElementSchema {
  return { ...element, locked };
}

export function moveElementToLayer(element: ElementSchema, layerId: string): ElementSchema {
  return {
    ...element,
    layerId,
    metadata: {
      ...element.metadata,
      updatedAt: Date.now(),
    },
  };
}

export function moveElementToLevel(element: ElementSchema, levelId: string | null): ElementSchema {
  return {
    ...element,
    levelId,
    metadata: {
      ...element.metadata,
      updatedAt: Date.now(),
    },
  };
}

export function getElementVolume(element: ElementSchema): number {
  const bb = element.boundingBox;
  const width = Math.abs(bb.max.x - bb.min.x);
  const height = Math.abs(bb.max.y - bb.min.y);
  const depth = Math.abs(bb.max.z - bb.min.z);
  return width * height * depth;
}

export function getElementCenter(element: ElementSchema): Point3D {
  const bb = element.boundingBox;
  return {
    x: (bb.min.x + bb.max.x) / 2,
    y: (bb.min.y + bb.max.y) / 2,
    z: (bb.min.z + bb.max.z) / 2,
    _type: 'Point3D',
  };
}
