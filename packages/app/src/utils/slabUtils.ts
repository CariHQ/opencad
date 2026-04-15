/**
 * T-BIM-002: Slab Tool
 */
import type { PropertyValue } from '@opencad/document';

export type SlabType = 'floor' | 'roof' | 'landing' | 'ramp';
export const SLAB_TYPES: SlabType[] = ['floor', 'roof', 'landing', 'ramp'];
export const DEFAULT_SLAB_THICKNESS = 200;
export const DEFAULT_SLAB_ELEVATION = 0;
export const DEFAULT_SLAB_MATERIAL = 'Concrete';
export const DEFAULT_SLAB_TYPE: SlabType = 'floor';

export interface Point { x: number; y: number; }
export interface SlabOptions { thickness?: number; elevation?: number; slabType?: SlabType; material?: string; layerId?: string; }
export interface SlabElementParams { type: 'slab'; layerId?: string; properties: Record<string, PropertyValue>; }

export function createSlabElement(points: Point[], options: SlabOptions = {}): SlabElementParams {
  const { thickness = DEFAULT_SLAB_THICKNESS, elevation = DEFAULT_SLAB_ELEVATION, slabType = DEFAULT_SLAB_TYPE, material = DEFAULT_SLAB_MATERIAL, layerId } = options;
  const label = slabType.charAt(0).toUpperCase() + slabType.slice(1);
  return {
    type: 'slab',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: `${label} Slab` },
      Points: { type: 'string', value: JSON.stringify(points) },
      Thickness: { type: 'number', value: thickness, unit: 'mm' },
      Elevation: { type: 'number', value: elevation, unit: 'mm' },
      SlabType: { type: 'string', value: slabType },
      Material: { type: 'string', value: material },
    },
  };
}
