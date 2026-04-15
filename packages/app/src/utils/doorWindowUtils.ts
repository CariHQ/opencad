/**
 * T-BIM-003: Door & Window tools
 */
import type { PropertyValue } from '@opencad/document';

export const DEFAULT_DOOR_WIDTH = 900;
export const DEFAULT_DOOR_HEIGHT = 2100;
export const DEFAULT_DOOR_MATERIAL = 'Timber';
export const DEFAULT_WINDOW_WIDTH = 1200;
export const DEFAULT_WINDOW_HEIGHT = 1200;
export const DEFAULT_WINDOW_SILL_HEIGHT = 900;
export const DEFAULT_WINDOW_MATERIAL = 'Aluminium';

export interface Point { x: number; y: number; }
export interface DoorOptions { width?: number; height?: number; material?: string; swing?: 'left'|'right'; layerId?: string; }
export interface WindowOptions { width?: number; height?: number; sillHeight?: number; material?: string; glazingType?: string; layerId?: string; }
export interface DoorElementParams { type: 'door'; layerId?: string; properties: Record<string, PropertyValue>; }
export interface WindowElementParams { type: 'window'; layerId?: string; properties: Record<string, PropertyValue>; }

export function createDoorElement(position: Point, options: DoorOptions = {}): DoorElementParams {
  const { width = DEFAULT_DOOR_WIDTH, height = DEFAULT_DOOR_HEIGHT, material = DEFAULT_DOOR_MATERIAL, swing = 'left', layerId } = options;
  return {
    type: 'door',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: 'Door' },
      X: { type: 'number', value: position.x, unit: 'mm' },
      Y: { type: 'number', value: position.y, unit: 'mm' },
      Width: { type: 'number', value: width, unit: 'mm' },
      Height: { type: 'number', value: height, unit: 'mm' },
      Material: { type: 'string', value: material },
      Swing: { type: 'string', value: swing },
    },
  };
}

export function createWindowElement(position: Point, options: WindowOptions = {}): WindowElementParams {
  const { width = DEFAULT_WINDOW_WIDTH, height = DEFAULT_WINDOW_HEIGHT, sillHeight = DEFAULT_WINDOW_SILL_HEIGHT, material = DEFAULT_WINDOW_MATERIAL, glazingType = 'Clear', layerId } = options;
  return {
    type: 'window',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: 'Window' },
      X: { type: 'number', value: position.x, unit: 'mm' },
      Y: { type: 'number', value: position.y, unit: 'mm' },
      Width: { type: 'number', value: width, unit: 'mm' },
      Height: { type: 'number', value: height, unit: 'mm' },
      SillHeight: { type: 'number', value: sillHeight, unit: 'mm' },
      Material: { type: 'string', value: material },
      GlazingType: { type: 'string', value: glazingType },
    },
  };
}
