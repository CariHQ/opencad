/**
 * T-EXT-01: Public `defineFamily()` API for plugin authors.
 *
 * Usage:
 *   import { defineFamily } from '../plugins/defineFamily';
 *
 *   defineFamily({
 *     id: 'my-door',
 *     name: 'Custom Door',
 *     category: 'door',
 *     version: '1.0.0',
 *     parameters: [
 *       { id: 'width',  label: 'Width',  type: 'dimension', default: 900, min: 600, max: 2400, unit: 'mm' },
 *       { id: 'height', label: 'Height', type: 'dimension', default: 2100, min: 1800, max: 3000, unit: 'mm' },
 *     ],
 *     geometry: ({ width, height }) => buildDoorGeometry(width as number, height as number),
 *   });
 */
import { registerFamily, type FamilyDefinition } from './familyRegistry';

/** Register a parametric family definition. Call this once at module load time. */
export function defineFamily(def: FamilyDefinition): void {
  registerFamily(def);
}

export type { FamilyDefinition } from './familyRegistry';
export type { ParamSchema, ParamValue, FamilyGeometry, FamilyInstance } from '@opencad/document';
