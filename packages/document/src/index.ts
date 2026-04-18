/**
 * OpenCAD Document Model
 *
 * CRDT-based document model for browser-native, AI-powered BIM platform.
 * Implements real-time collaboration with offline-first architecture.
 *
 * @package @opencad/document
 */

export * from './types';
export * from './document';
export * from './layer';
export * from './level';
export * from './element';
export * from './storage';
export * from './ifc';
export * from './versioning';
export * from './io';
export * from './material';
export * from './dwg';
export * from './pdf';
export * from './mep';
export * from './diff';

// ArchiCAD adapter — explicit exports to avoid name collisions with ./io#detectFormat
export {
  parsePLN,
  parsePLA,
  parseGDL,
  type PLAObject,
} from './archicad';

// Revit adapter
export { parseRVT } from './revit';

// SketchUp adapter
export { parseSKP, serializeSKP } from './sketchup';
