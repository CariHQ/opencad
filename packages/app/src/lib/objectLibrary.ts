/**
 * Built-in parametric object library for OpenCAD.
 * Modelled on ArchiCAD's object library structure.
 *
 * Each ObjectDefinition describes a placeable architectural object with
 * default dimensions and properties. The ObjectLibraryPanel turns these
 * into ElementSchema instances via addElement.
 */

import type { ElementType, PropertyValue } from '@opencad/document';

export interface ObjectDimensions {
  width: number;   // mm
  depth: number;   // mm
  height: number;  // mm
}

export interface ObjectDefinition {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  icon: string;           // emoji thumbnail
  elementType: ElementType;
  dimensions: ObjectDimensions;
  /** Default properties to inject when placing the object */
  defaultProperties: Record<string, PropertyValue>;
  description?: string;
}

// ─── Furniture ────────────────────────────────────────────────────────────────

const FURNITURE: ObjectDefinition[] = [
  // Seating
  {
    id: 'chair-office',
    name: 'Office Chair',
    category: 'Furniture', subcategory: 'Seating',
    icon: '🪑',
    elementType: 'rectangle',
    dimensions: { width: 600, depth: 600, height: 900 },
    defaultProperties: {
      X:      { type: 'number', value: 0,   unit: 'mm' },
      Y:      { type: 'number', value: 0,   unit: 'mm' },
      Width:  { type: 'number', value: 600, unit: 'mm' },
      Height: { type: 'number', value: 600, unit: 'mm' },
      ObjHeight: { type: 'number', value: 900, unit: 'mm' },
    },
  },
  {
    id: 'chair-dining',
    name: 'Dining Chair',
    category: 'Furniture', subcategory: 'Seating',
    icon: '🪑',
    elementType: 'rectangle',
    dimensions: { width: 450, depth: 450, height: 850 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 450, unit: 'mm' },
      Height: { type: 'number', value: 450, unit: 'mm' },
      ObjHeight: { type: 'number', value: 850, unit: 'mm' },
    },
  },
  {
    id: 'sofa-2seat',
    name: '2-Seat Sofa',
    category: 'Furniture', subcategory: 'Seating',
    icon: '🛋️',
    elementType: 'rectangle',
    dimensions: { width: 1600, depth: 850, height: 800 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1600, unit: 'mm' },
      Height: { type: 'number', value: 850,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 800, unit: 'mm' },
    },
  },
  {
    id: 'sofa-3seat',
    name: '3-Seat Sofa',
    category: 'Furniture', subcategory: 'Seating',
    icon: '🛋️',
    elementType: 'rectangle',
    dimensions: { width: 2200, depth: 900, height: 800 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 2200, unit: 'mm' },
      Height: { type: 'number', value: 900,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 800, unit: 'mm' },
    },
  },
  {
    id: 'armchair',
    name: 'Armchair',
    category: 'Furniture', subcategory: 'Seating',
    icon: '🛋️',
    elementType: 'rectangle',
    dimensions: { width: 800, depth: 800, height: 800 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 800, unit: 'mm' },
      Height: { type: 'number', value: 800, unit: 'mm' },
      ObjHeight: { type: 'number', value: 800, unit: 'mm' },
    },
  },

  // Tables
  {
    id: 'table-dining-4seat',
    name: 'Dining Table (4 seat)',
    category: 'Furniture', subcategory: 'Tables',
    icon: '🍽️',
    elementType: 'rectangle',
    dimensions: { width: 1400, depth: 800, height: 750 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1400, unit: 'mm' },
      Height: { type: 'number', value: 800,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 750, unit: 'mm' },
    },
  },
  {
    id: 'table-dining-6seat',
    name: 'Dining Table (6 seat)',
    category: 'Furniture', subcategory: 'Tables',
    icon: '🍽️',
    elementType: 'rectangle',
    dimensions: { width: 1800, depth: 900, height: 750 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1800, unit: 'mm' },
      Height: { type: 'number', value: 900,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 750, unit: 'mm' },
    },
  },
  {
    id: 'table-coffee',
    name: 'Coffee Table',
    category: 'Furniture', subcategory: 'Tables',
    icon: '☕',
    elementType: 'rectangle',
    dimensions: { width: 1100, depth: 600, height: 400 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1100, unit: 'mm' },
      Height: { type: 'number', value: 600,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 400, unit: 'mm' },
    },
  },
  {
    id: 'desk-straight',
    name: 'Desk (Straight)',
    category: 'Furniture', subcategory: 'Tables',
    icon: '🖥️',
    elementType: 'rectangle',
    dimensions: { width: 1600, depth: 800, height: 750 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1600, unit: 'mm' },
      Height: { type: 'number', value: 800,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 750, unit: 'mm' },
    },
  },

  // Beds
  {
    id: 'bed-single',
    name: 'Single Bed',
    category: 'Furniture', subcategory: 'Beds',
    icon: '🛏️',
    elementType: 'rectangle',
    dimensions: { width: 950, depth: 2000, height: 500 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 950,  unit: 'mm' },
      Height: { type: 'number', value: 2000, unit: 'mm' },
      ObjHeight: { type: 'number', value: 500, unit: 'mm' },
    },
  },
  {
    id: 'bed-double',
    name: 'Double Bed',
    category: 'Furniture', subcategory: 'Beds',
    icon: '🛏️',
    elementType: 'rectangle',
    dimensions: { width: 1380, depth: 2000, height: 550 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1380, unit: 'mm' },
      Height: { type: 'number', value: 2000, unit: 'mm' },
      ObjHeight: { type: 'number', value: 550, unit: 'mm' },
    },
  },
  {
    id: 'bed-queen',
    name: 'Queen Bed',
    category: 'Furniture', subcategory: 'Beds',
    icon: '🛏️',
    elementType: 'rectangle',
    dimensions: { width: 1530, depth: 2030, height: 550 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1530, unit: 'mm' },
      Height: { type: 'number', value: 2030, unit: 'mm' },
      ObjHeight: { type: 'number', value: 550, unit: 'mm' },
    },
  },
  {
    id: 'bed-king',
    name: 'King Bed',
    category: 'Furniture', subcategory: 'Beds',
    icon: '🛏️',
    elementType: 'rectangle',
    dimensions: { width: 1830, depth: 2030, height: 600 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1830, unit: 'mm' },
      Height: { type: 'number', value: 2030, unit: 'mm' },
      ObjHeight: { type: 'number', value: 600, unit: 'mm' },
    },
  },

  // Storage
  {
    id: 'wardrobe-2door',
    name: 'Wardrobe (2 Door)',
    category: 'Furniture', subcategory: 'Storage',
    icon: '🗄️',
    elementType: 'rectangle',
    dimensions: { width: 1200, depth: 600, height: 2100 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1200, unit: 'mm' },
      Height: { type: 'number', value: 600,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 2100, unit: 'mm' },
    },
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'Furniture', subcategory: 'Storage',
    icon: '📚',
    elementType: 'rectangle',
    dimensions: { width: 900, depth: 300, height: 1800 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 900, unit: 'mm' },
      Height: { type: 'number', value: 300, unit: 'mm' },
      ObjHeight: { type: 'number', value: 1800, unit: 'mm' },
    },
  },
];

// ─── Plumbing Fixtures ─────────────────────────────────────────────────────────

const PLUMBING: ObjectDefinition[] = [
  {
    id: 'toilet-standard',
    name: 'Toilet',
    category: 'Plumbing', subcategory: 'Sanitary',
    icon: '🚽',
    elementType: 'plumbing_fixture',
    dimensions: { width: 380, depth: 700, height: 400 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 380, unit: 'mm' },
      Depth: { type: 'number', value: 700, unit: 'mm' },
      FixtureType: { type: 'string', value: 'Toilet' },
    },
  },
  {
    id: 'basin-standard',
    name: 'Wash Basin',
    category: 'Plumbing', subcategory: 'Sanitary',
    icon: '🚿',
    elementType: 'plumbing_fixture',
    dimensions: { width: 550, depth: 450, height: 850 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 550, unit: 'mm' },
      Depth: { type: 'number', value: 450, unit: 'mm' },
      FixtureType: { type: 'string', value: 'Basin' },
    },
  },
  {
    id: 'bathtub-standard',
    name: 'Bathtub',
    category: 'Plumbing', subcategory: 'Sanitary',
    icon: '🛁',
    elementType: 'plumbing_fixture',
    dimensions: { width: 700, depth: 1700, height: 570 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 700,  unit: 'mm' },
      Depth: { type: 'number', value: 1700, unit: 'mm' },
      FixtureType: { type: 'string', value: 'Bathtub' },
    },
  },
  {
    id: 'shower-standard',
    name: 'Shower Tray (900×900)',
    category: 'Plumbing', subcategory: 'Sanitary',
    icon: '🚿',
    elementType: 'plumbing_fixture',
    dimensions: { width: 900, depth: 900, height: 150 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 900, unit: 'mm' },
      Depth: { type: 'number', value: 900, unit: 'mm' },
      FixtureType: { type: 'string', value: 'ShowerTray' },
    },
  },
  {
    id: 'kitchen-sink',
    name: 'Kitchen Sink',
    category: 'Plumbing', subcategory: 'Kitchen',
    icon: '🚰',
    elementType: 'plumbing_fixture',
    dimensions: { width: 800, depth: 500, height: 200 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 800, unit: 'mm' },
      Depth: { type: 'number', value: 500, unit: 'mm' },
      FixtureType: { type: 'string', value: 'KitchenSink' },
    },
  },
  {
    id: 'urinal',
    name: 'Urinal',
    category: 'Plumbing', subcategory: 'Sanitary',
    icon: '🚽',
    elementType: 'plumbing_fixture',
    dimensions: { width: 370, depth: 350, height: 750 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 370, unit: 'mm' },
      Depth: { type: 'number', value: 350, unit: 'mm' },
      FixtureType: { type: 'string', value: 'Urinal' },
    },
  },
];

// ─── Electrical & Lighting ─────────────────────────────────────────────────────

const ELECTRICAL: ObjectDefinition[] = [
  {
    id: 'light-ceiling',
    name: 'Ceiling Light',
    category: 'Electrical', subcategory: 'Lighting',
    icon: '💡',
    elementType: 'electrical_equipment',
    dimensions: { width: 300, depth: 300, height: 100 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 300, unit: 'mm' },
      Depth: { type: 'number', value: 300, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'CeilingLight' },
    },
  },
  {
    id: 'light-recessed',
    name: 'Recessed Downlight',
    category: 'Electrical', subcategory: 'Lighting',
    icon: '💡',
    elementType: 'electrical_equipment',
    dimensions: { width: 100, depth: 100, height: 50 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 100, unit: 'mm' },
      Depth: { type: 'number', value: 100, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'RecessedLight' },
    },
  },
  {
    id: 'light-pendant',
    name: 'Pendant Light',
    category: 'Electrical', subcategory: 'Lighting',
    icon: '🔦',
    elementType: 'electrical_equipment',
    dimensions: { width: 400, depth: 400, height: 400 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 400, unit: 'mm' },
      Depth: { type: 'number', value: 400, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'PendantLight' },
    },
  },
  {
    id: 'socket-outlet',
    name: 'Power Outlet',
    category: 'Electrical', subcategory: 'Power',
    icon: '🔌',
    elementType: 'electrical_equipment',
    dimensions: { width: 86, depth: 86, height: 40 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 86, unit: 'mm' },
      Depth: { type: 'number', value: 86, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'PowerOutlet' },
    },
  },
];

// ─── Kitchen Appliances ────────────────────────────────────────────────────────

const KITCHEN: ObjectDefinition[] = [
  {
    id: 'fridge-standard',
    name: 'Refrigerator',
    category: 'Kitchen', subcategory: 'Appliances',
    icon: '🧊',
    elementType: 'mechanical_equipment',
    dimensions: { width: 700, depth: 700, height: 1800 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 700, unit: 'mm' },
      Depth: { type: 'number', value: 700, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'Refrigerator' },
    },
  },
  {
    id: 'oven-standard',
    name: 'Oven / Cooker',
    category: 'Kitchen', subcategory: 'Appliances',
    icon: '🍳',
    elementType: 'mechanical_equipment',
    dimensions: { width: 600, depth: 600, height: 900 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 600, unit: 'mm' },
      Depth: { type: 'number', value: 600, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'Oven' },
    },
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'Kitchen', subcategory: 'Appliances',
    icon: '🍽️',
    elementType: 'mechanical_equipment',
    dimensions: { width: 600, depth: 600, height: 850 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 600, unit: 'mm' },
      Depth: { type: 'number', value: 600, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'Dishwasher' },
    },
  },
  {
    id: 'kitchen-unit-base',
    name: 'Base Unit (600)',
    category: 'Kitchen', subcategory: 'Units',
    icon: '🗄️',
    elementType: 'rectangle',
    dimensions: { width: 600, depth: 600, height: 900 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 600, unit: 'mm' },
      Height: { type: 'number', value: 600, unit: 'mm' },
      ObjHeight: { type: 'number', value: 900, unit: 'mm' },
    },
  },
  {
    id: 'kitchen-island',
    name: 'Kitchen Island',
    category: 'Kitchen', subcategory: 'Units',
    icon: '🍳',
    elementType: 'rectangle',
    dimensions: { width: 1500, depth: 900, height: 900 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 1500, unit: 'mm' },
      Height: { type: 'number', value: 900,  unit: 'mm' },
      ObjHeight: { type: 'number', value: 900, unit: 'mm' },
    },
  },
];

// ─── Site / Landscape ─────────────────────────────────────────────────────────

const SITE: ObjectDefinition[] = [
  {
    id: 'tree-deciduous',
    name: 'Deciduous Tree',
    category: 'Site', subcategory: 'Planting',
    icon: '🌳',
    elementType: 'circle',
    dimensions: { width: 4000, depth: 4000, height: 8000 },
    defaultProperties: {
      CenterX: { type: 'number', value: 0,    unit: 'mm' },
      CenterY: { type: 'number', value: 0,    unit: 'mm' },
      Radius:  { type: 'number', value: 2000, unit: 'mm' },
    },
  },
  {
    id: 'tree-conifer',
    name: 'Conifer Tree',
    category: 'Site', subcategory: 'Planting',
    icon: '🌲',
    elementType: 'circle',
    dimensions: { width: 2000, depth: 2000, height: 8000 },
    defaultProperties: {
      CenterX: { type: 'number', value: 0,    unit: 'mm' },
      CenterY: { type: 'number', value: 0,    unit: 'mm' },
      Radius:  { type: 'number', value: 1000, unit: 'mm' },
    },
  },
  {
    id: 'car-standard',
    name: 'Car (scale)',
    category: 'Site', subcategory: 'Vehicles',
    icon: '🚗',
    elementType: 'rectangle',
    dimensions: { width: 2000, depth: 4500, height: 1500 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 2000, unit: 'mm' },
      Height: { type: 'number', value: 4500, unit: 'mm' },
      ObjHeight: { type: 'number', value: 1500, unit: 'mm' },
    },
  },
  {
    id: 'person-standing',
    name: 'Person (scale)',
    category: 'Site', subcategory: 'Figures',
    icon: '🧍',
    elementType: 'circle',
    dimensions: { width: 500, depth: 500, height: 1750 },
    defaultProperties: {
      CenterX: { type: 'number', value: 0,   unit: 'mm' },
      CenterY: { type: 'number', value: 0,   unit: 'mm' },
      Radius:  { type: 'number', value: 250, unit: 'mm' },
    },
  },
  {
    id: 'parking-space',
    name: 'Parking Space',
    category: 'Site', subcategory: 'Paving',
    icon: '🅿️',
    elementType: 'rectangle',
    dimensions: { width: 2500, depth: 5000, height: 0 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width:  { type: 'number', value: 2500, unit: 'mm' },
      Height: { type: 'number', value: 5000, unit: 'mm' },
      ObjHeight: { type: 'number', value: 10, unit: 'mm' },
    },
  },
];

// ─── Structural ────────────────────────────────────────────────────────────────

const STRUCTURAL: ObjectDefinition[] = [
  {
    id: 'column-round-300',
    name: 'Round Column Ø300',
    category: 'Structural', subcategory: 'Columns',
    icon: '🏛️',
    elementType: 'column',
    dimensions: { width: 300, depth: 300, height: 3000 },
    defaultProperties: {
      X:           { type: 'number', value: 0,       unit: 'mm' },
      Y:           { type: 'number', value: 0,       unit: 'mm' },
      Diameter:    { type: 'number', value: 300,     unit: 'mm' },
      Height:      { type: 'number', value: 3000,    unit: 'mm' },
      SectionType: { type: 'string', value: 'Round' },
    },
  },
  {
    id: 'column-square-300',
    name: 'Square Column 300×300',
    category: 'Structural', subcategory: 'Columns',
    icon: '🏛️',
    elementType: 'column',
    dimensions: { width: 300, depth: 300, height: 3000 },
    defaultProperties: {
      X:           { type: 'number', value: 0,       unit: 'mm' },
      Y:           { type: 'number', value: 0,       unit: 'mm' },
      Diameter:    { type: 'number', value: 300,     unit: 'mm' },
      Height:      { type: 'number', value: 3000,    unit: 'mm' },
      SectionType: { type: 'string', value: 'Rectangular' },
    },
  },
  {
    id: 'stair-straight',
    name: 'Straight Stair',
    category: 'Structural', subcategory: 'Stairs',
    icon: '🪜',
    elementType: 'stair',
    dimensions: { width: 1200, depth: 3000, height: 3000 },
    defaultProperties: {
      X:         { type: 'number', value: 0,    unit: 'mm' },
      Y:         { type: 'number', value: 0,    unit: 'mm' },
      Width2D:   { type: 'number', value: 1200, unit: 'mm' },
      Length:    { type: 'number', value: 3000, unit: 'mm' },
      TotalRise: { type: 'number', value: 3000, unit: 'mm' },
      Risers:    { type: 'number', value: 18,   unit: '' },
    },
  },
  {
    id: 'railing-straight',
    name: 'Railing (straight)',
    category: 'Structural', subcategory: 'Railings',
    icon: '🪤',
    elementType: 'railing',
    dimensions: { width: 3000, depth: 100, height: 1000 },
    defaultProperties: {
      Points:  { type: 'string', value: '[{"x":0,"y":0},{"x":3000,"y":0}]' },
      Height:  { type: 'number', value: 1000, unit: 'mm' },
    },
  },
];

// ─── MEP ──────────────────────────────────────────────────────────────────────

const MEP: ObjectDefinition[] = [
  {
    id: 'hvac-unit',
    name: 'HVAC Unit',
    category: 'MEP', subcategory: 'HVAC',
    icon: '❄️',
    elementType: 'mechanical_equipment',
    dimensions: { width: 900, depth: 600, height: 400 },
    defaultProperties: {
      X: { type: 'number', value: 0, unit: 'mm' },
      Y: { type: 'number', value: 0, unit: 'mm' },
      Width: { type: 'number', value: 900, unit: 'mm' },
      Depth: { type: 'number', value: 600, unit: 'mm' },
      EquipmentType: { type: 'string', value: 'HVAC' },
    },
  },
  {
    id: 'duct-supply',
    name: 'Supply Duct (400×200)',
    category: 'MEP', subcategory: 'HVAC',
    icon: '📦',
    elementType: 'duct',
    dimensions: { width: 400, depth: 3000, height: 200 },
    defaultProperties: {
      StartX: { type: 'number', value: 0,    unit: 'mm' },
      StartY: { type: 'number', value: 0,    unit: 'mm' },
      EndX:   { type: 'number', value: 3000, unit: 'mm' },
      EndY:   { type: 'number', value: 0,    unit: 'mm' },
      Width:  { type: 'number', value: 400,  unit: 'mm' },
      Height: { type: 'number', value: 200,  unit: 'mm' },
    },
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export const OBJECT_LIBRARY: ObjectDefinition[] = [
  ...FURNITURE,
  ...PLUMBING,
  ...ELECTRICAL,
  ...KITCHEN,
  ...SITE,
  ...STRUCTURAL,
  ...MEP,
];

export const OBJECT_CATEGORIES: string[] = [
  ...new Set(OBJECT_LIBRARY.map((o) => o.category)),
];
