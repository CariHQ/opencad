/**
 * T-BIM-001: Wall Tool — parametric wall element construction
 */
import type { PropertyValue } from '@opencad/document';

export type WallType = 'interior' | 'exterior' | 'partition' | 'curtain';
export const WALL_TYPES: WallType[] = ['interior', 'exterior', 'partition', 'curtain'];
export const DEFAULT_WALL_HEIGHT = 3000;
export const DEFAULT_WALL_THICKNESS = 200;
export const DEFAULT_WALL_MATERIAL = 'Concrete';
export const DEFAULT_WALL_TYPE: WallType = 'interior';

export interface Point { x: number; y: number; }
export interface WallOptions {
  height?: number; thickness?: number; wallType?: WallType;
  material?: string; layerId?: string;
}
export interface WallElementParams {
  type: 'wall'; layerId?: string; properties: Record<string, PropertyValue>;
}

export function createWallElement(start: Point, end: Point, options: WallOptions = {}): WallElementParams {
  const { height = DEFAULT_WALL_HEIGHT, thickness = DEFAULT_WALL_THICKNESS, wallType = DEFAULT_WALL_TYPE, material = DEFAULT_WALL_MATERIAL, layerId } = options;
  const label = wallType.charAt(0).toUpperCase() + wallType.slice(1);
  return {
    type: 'wall',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: `${label} Wall` },
      StartX: { type: 'number', value: start.x, unit: 'mm' },
      StartY: { type: 'number', value: start.y, unit: 'mm' },
      EndX: { type: 'number', value: end.x, unit: 'mm' },
      EndY: { type: 'number', value: end.y, unit: 'mm' },
      Height: { type: 'number', value: height, unit: 'mm' },
      Thickness: { type: 'number', value: thickness, unit: 'mm' },
      WallType: { type: 'string', value: wallType },
      Material: { type: 'string', value: material },
    },
  };
}
