/**
 * T-BIM-004: Column & Beam tools
 */
import type { PropertyValue } from '@opencad/document';

export type ColumnSection = 'square' | 'round' | 'rectangular' | 'H-section' | 'L-section';
export const COLUMN_SECTIONS: ColumnSection[] = ['square', 'round', 'rectangular', 'H-section', 'L-section'];
export const DEFAULT_COLUMN_WIDTH = 400;
export const DEFAULT_COLUMN_DEPTH = 400;
export const DEFAULT_COLUMN_HEIGHT = 3000;
export const DEFAULT_COLUMN_MATERIAL = 'Concrete';
export const DEFAULT_BEAM_WIDTH = 300;
export const DEFAULT_BEAM_DEPTH = 500;
export const DEFAULT_BEAM_ELEVATION_Z = 3000;
export const DEFAULT_BEAM_MATERIAL = 'Steel';

export interface Point { x: number; y: number; }
export interface ColumnOptions { width?: number; depth?: number; height?: number; material?: string; sectionType?: ColumnSection; layerId?: string; }
export interface BeamOptions { width?: number; depth?: number; elevationZ?: number; material?: string; layerId?: string; }
export interface ColumnElementParams { type: 'column'; layerId?: string; properties: Record<string, PropertyValue>; }
export interface BeamElementParams { type: 'beam'; layerId?: string; properties: Record<string, PropertyValue>; }

export function createColumnElement(position: Point, options: ColumnOptions = {}): ColumnElementParams {
  const { width = DEFAULT_COLUMN_WIDTH, depth = DEFAULT_COLUMN_DEPTH, height = DEFAULT_COLUMN_HEIGHT, material = DEFAULT_COLUMN_MATERIAL, sectionType = 'square', layerId } = options;
  return {
    type: 'column',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: 'Column' },
      X: { type: 'number', value: position.x, unit: 'mm' },
      Y: { type: 'number', value: position.y, unit: 'mm' },
      Width: { type: 'number', value: width, unit: 'mm' },
      Depth: { type: 'number', value: depth, unit: 'mm' },
      Height: { type: 'number', value: height, unit: 'mm' },
      Material: { type: 'string', value: material },
      SectionType: { type: 'string', value: sectionType },
    },
  };
}

export function createBeamElement(start: Point, end: Point, options: BeamOptions = {}): BeamElementParams {
  const { width = DEFAULT_BEAM_WIDTH, depth = DEFAULT_BEAM_DEPTH, elevationZ = DEFAULT_BEAM_ELEVATION_Z, material = DEFAULT_BEAM_MATERIAL, layerId } = options;
  return {
    type: 'beam',
    ...(layerId ? { layerId } : {}),
    properties: {
      Name: { type: 'string', value: 'Beam' },
      StartX: { type: 'number', value: start.x, unit: 'mm' },
      StartY: { type: 'number', value: start.y, unit: 'mm' },
      EndX: { type: 'number', value: end.x, unit: 'mm' },
      EndY: { type: 'number', value: end.y, unit: 'mm' },
      Width: { type: 'number', value: width, unit: 'mm' },
      Depth: { type: 'number', value: depth, unit: 'mm' },
      ElevationZ: { type: 'number', value: elevationZ, unit: 'mm' },
      Material: { type: 'string', value: material },
    },
  };
}
