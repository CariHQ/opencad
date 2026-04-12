/**
 * BIM Types
 * Building Information Modeling specific types
 */

import type { ElementType, PropertySet } from './document';

export type IFCEntityType =
  | 'IfcWall'
  | 'IfcWallStandardCase'
  | 'IfcSlab'
  | 'IfcRoof'
  | 'IfcDoor'
  | 'IfcWindow'
  | 'IfcColumn'
  | 'IfcBeam'
  | 'IfcStair'
  | 'IfcRailing'
  | 'IfcSpace'
  | 'IfcBuildingElement'
  | 'IfcCurtainWall'
  | 'IfcPlate'
  | 'IfcMember'
  | 'IfcCovering'
  | 'IfcFurnishingElement'
  | 'IfcDistributionFlowElement'
  | 'IfcAnnotation';

export interface IFCProperty {
  name: string;
  value: string | number | boolean;
  unit?: string;
}

export interface IFCData {
  entityType: IFCEntityType;
  globalId: string;
  name?: string;
  description?: string;
  properties: Record<string, IFCProperty>;
  propertySets: PropertySet[];
  containedInStructure?: string;
  hasOpenings?: string[];
  hasFillings?: string[];
  material?: string;
  layerAssignment?: string[];
}

export type BIMCategory =
  | 'structural'
  | 'architectural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'fire-protection'
  | 'interior'
  | 'landscape';

export interface BIMElement {
  bimId: string;
  category: BIMCategory;
  ifcData: IFCData;
  assemblyInfo?: {
    parentId?: string;
    children: string[];
  };
}

export const BIM_ELEMENT_CATEGORIES: Record<ElementType, BIMCategory> = {
  wall: 'architectural',
  door: 'architectural',
  window: 'architectural',
  slab: 'structural',
  roof: 'architectural',
  column: 'structural',
  beam: 'structural',
  stair: 'architectural',
  railing: 'architectural',
  space: 'architectural',
  annotation: 'architectural',
  dimension: 'architectural',
  grid: 'architectural',
};

export const IFC_MAPPING: Record<ElementType, IFCEntityType> = {
  wall: 'IfcWallStandardCase',
  door: 'IfcDoor',
  window: 'IfcWindow',
  slab: 'IfcSlab',
  roof: 'IfcRoof',
  column: 'IfcColumn',
  beam: 'IfcBeam',
  stair: 'IfcStair',
  railing: 'IfcRailing',
  space: 'IfcSpace',
  annotation: 'IfcAnnotation',
  dimension: 'IfcAnnotation',
  grid: 'IfcAnnotation',
};

export const BIM_MATERIAL_CATEGORIES = [
  'concrete',
  'masonry',
  'metal',
  'wood',
  'glass',
  'plastic',
  'composite',
  'fabric',
  'soil',
  'water',
  'other',
] as const;

export type MaterialCategory = (typeof BIM_MATERIAL_CATEGORIES)[number];

export interface BIMMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  properties: {
    density?: number;
    compressiveStrength?: number;
    tensileStrength?: number;
    thermalConductivity?: number;
    fireRating?: string;
  };
}
