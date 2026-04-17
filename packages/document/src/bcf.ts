/**
 * BCF (BIM Collaboration Format) and COBie Export
 *
 * BCF is an open file format for communication about BIM issues.
 * COBie (Construction Operations Building Information Exchange) is a data format
 * for facilities management.
 *
 * T-IO-007: BCF issue roundtrip (create → serialize → parse → verify)
 * T-IO-008: COBie spreadsheet export (spaces, components, types)
 */

import { DocumentSchema, ElementSchema } from './types';

// ─── BCF Types ─────────────────────────────────────────────────────────────────

export type BCFStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type BCFPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type BCFType = 'Issue' | 'Request' | 'Error' | 'Warning' | 'Comment';

export interface BCFViewPoint {
  guid: string;
  perspective_camera?: {
    camera_view_point: { x: number; y: number; z: number };
    camera_direction: { x: number; y: number; z: number };
    camera_up_vector: { x: number; y: number; z: number };
    field_of_view: number;
  };
  components?: {
    selection?: Array<{ ifc_guid: string; originating_system?: string; authoring_tool_instance_id?: string }>;
    visibility?: {
      default_visibility: boolean;
      exceptions?: Array<{ ifc_guid: string }>;
    };
  };
}

export interface BCFComment {
  guid: string;
  date: string;     // ISO 8601
  author: string;
  comment: string;
  viewpoint_guid?: string;
  modified_date?: string;
  modified_author?: string;
}

export interface BCFTopic {
  guid: string;
  topic_type: BCFType;
  topic_status: BCFStatus;
  priority?: BCFPriority;
  title: string;
  index?: number;
  labels?: string[];
  creation_date: string;
  creation_author: string;
  modified_date?: string;
  modified_author?: string;
  assigned_to?: string;
  stage?: string;
  description?: string;
  bim_snippet?: {
    reference: string;
    reference_schema: string;
    snippet_type: string;
    is_external: boolean;
  };
  related_topics?: string[];   // GUIDs
  comments: BCFComment[];
  viewpoints: BCFViewPoint[];
}

export interface BCFFile {
  version: '3.0' | '2.1';
  project?: {
    project_id: string;
    project_name: string;
  };
  topics: BCFTopic[];
}

// ─── BCF Creation ─────────────────────────────────────────────────────────────

export function createBCFTopic(params: {
  title: string;
  type?: BCFType;
  status?: BCFStatus;
  priority?: BCFPriority;
  description?: string;
  author: string;
  assignedTo?: string;
}): BCFTopic {
  const now = new Date().toISOString();
  return {
    guid: crypto.randomUUID(),
    topic_type: params.type ?? 'Issue',
    topic_status: params.status ?? 'Open',
    priority: params.priority ?? 'Normal',
    title: params.title,
    creation_date: now,
    creation_author: params.author,
    modified_date: now,
    modified_author: params.author,
    description: params.description,
    assigned_to: params.assignedTo,
    comments: [],
    viewpoints: [],
  };
}

export function addBCFComment(
  topic: BCFTopic,
  comment: string,
  author: string,
  viewpointGuid?: string
): BCFTopic {
  const newComment: BCFComment = {
    guid: crypto.randomUUID(),
    date: new Date().toISOString(),
    author,
    comment,
    viewpoint_guid: viewpointGuid,
  };
  return { ...topic, comments: [...topic.comments, newComment] };
}

// ─── BCF Serialization ────────────────────────────────────────────────────────

export function serializeBCF(file: BCFFile): string {
  // BCF JSON serialization (BCF API format)
  return JSON.stringify({
    version: file.version,
    project: file.project,
    topics: file.topics.map((topic) => ({
      guid: topic.guid,
      topic_type: topic.topic_type,
      topic_status: topic.topic_status,
      priority: topic.priority,
      title: topic.title,
      index: topic.index,
      labels: topic.labels,
      creation_date: topic.creation_date,
      creation_author: topic.creation_author,
      modified_date: topic.modified_date,
      modified_author: topic.modified_author,
      assigned_to: topic.assigned_to,
      description: topic.description,
      comments: topic.comments,
      viewpoints: topic.viewpoints,
      related_topics: topic.related_topics,
    })),
  }, null, 2);
}

export function parseBCF(json: string): BCFFile {
  const raw = JSON.parse(json) as { version?: string; project?: BCFFile['project']; topics?: BCFTopic[] };
  return {
    version: (raw.version as BCFFile['version']) ?? '3.0',
    project: raw.project,
    topics: (raw.topics ?? []).map((t: BCFTopic) => ({
      ...t,
      comments: t.comments ?? [],
      viewpoints: t.viewpoints ?? [],
    })),
  };
}

// ─── BCF from Document ────────────────────────────────────────────────────────

export function documentToBCF(doc: DocumentSchema, author: string): BCFFile {
  // Convert document annotations into BCF topics
  const topics: BCFTopic[] = Object.values(doc.presentation.annotations).map((ann) => {
    const topic = createBCFTopic({
      title: ann.content.substring(0, 100),
      type: 'Issue',
      status: 'Open',
      description: ann.content,
      author,
    });
    return topic;
  });

  return {
    version: '3.0',
    project: {
      project_id: doc.id,
      project_name: doc.name,
    },
    topics,
  };
}

// ─── COBie Types ──────────────────────────────────────────────────────────────

export interface COBieComponent {
  Name: string;
  CreatedBy: string;
  CreatedOn: string;
  TypeName: string;
  Space: string;
  Description: string;
  ExtSystem: string;
  ExtObject: string;
  ExtIdentifier: string;
  SerialNumber?: string;
  InstallationDate?: string;
  WarrantyStartDate?: string;
  TagNumber?: string;
  BarCode?: string;
  AssetIdentifier?: string;
}

export interface COBieType {
  Name: string;
  CreatedBy: string;
  CreatedOn: string;
  Category: string;
  Description: string;
  AssetType: 'Movable' | 'Fixed' | 'Fixed.Movable' | 'n/a';
  Manufacturer?: string;
  ModelNumber?: string;
  WarrantyDuration?: number;
  WarrantyUnit?: string;
  ExpectedLife?: number;
  DurationUnit?: string;
}

export interface COBieSpace {
  Name: string;
  CreatedBy: string;
  CreatedOn: string;
  Category: string;
  FloorName: string;
  Description: string;
  ExtSystem: string;
  ExtObject: string;
  ExtIdentifier: string;
  RoomTag?: string;
  GrossArea?: number;
  NetArea?: number;
}

export interface COBieSpreadsheet {
  Contacts: Array<{ Email: string; CreatedBy: string; CreatedOn: string; Category: string; Company: string; Phone: string; ExternalSystem: string; ExternalObject: string; ExternalIdentifier: string }>;
  Facilities: Array<{ Name: string; CreatedBy: string; CreatedOn: string; Category: string; ProjectName: string; SiteName: string; LinearUnits: string; AreaUnits: string; VolumeUnits: string; CurrencyUnit: string; AreaMeasurement: string; ExternalSystem: string; ExternalProjectObject: string; ExternalProjectIdentifier: string; ExternalSiteObject: string; ExternalSiteIdentifier: string; ExternalFacilityObject: string; ExternalFacilityIdentifier: string; Description: string; ProjectDescription: string; SiteDescription: string; Phase: string }>;
  Floors: Array<{ Name: string; CreatedBy: string; CreatedOn: string; Category: string; ExtSystem: string; ExtObject: string; ExtIdentifier: string; Description: string; Elevation: number; Height: number }>;
  Spaces: COBieSpace[];
  Types: COBieType[];
  Components: COBieComponent[];
}

// ─── COBie Export ─────────────────────────────────────────────────────────────

export function documentToCOBie(doc: DocumentSchema, author: string): COBieSpreadsheet {
  const now = new Date().toISOString();

  // Spaces from document spaces
  const spaces: COBieSpace[] = Object.values(doc.content.spaces).map((space) => ({
    Name: space.name,
    CreatedBy: author,
    CreatedOn: now,
    Category: 'Space',
    FloorName: space.levelId,
    Description: space.name,
    ExtSystem: 'OpenCAD',
    ExtObject: 'IfcSpace',
    ExtIdentifier: space.id,
    GrossArea: space.area,
    NetArea: space.area,
  }));

  // Types from unique element types
  const typeNames = new Set(Object.values(doc.content.elements).map((e) => e.type));
  const types: COBieType[] = Array.from(typeNames).map((typeName) => ({
    Name: typeName,
    CreatedBy: author,
    CreatedOn: now,
    Category: getCOBieCategory(typeName),
    Description: typeName,
    AssetType: 'Fixed',
  }));

  // Components from elements
  const components: COBieComponent[] = Object.values(doc.content.elements)
    .filter((el) => isMaintainableElement(el))
    .map((el) => ({
      Name: (el.properties['Name']?.value as string) ?? el.id,
      CreatedBy: author,
      CreatedOn: now,
      TypeName: el.type,
      Space: el.levelId ?? 'n/a',
      Description: (el.properties['Description']?.value as string) ?? el.type,
      ExtSystem: 'OpenCAD',
      ExtObject: `Ifc${capitalize(el.type)}`,
      ExtIdentifier: el.id,
    }));

  // Floors from levels
  const floors = Object.values(doc.organization.levels).map((level) => ({
    Name: level.name,
    CreatedBy: author,
    CreatedOn: now,
    Category: 'Floor',
    ExtSystem: 'OpenCAD',
    ExtObject: 'IfcBuildingStorey',
    ExtIdentifier: level.id,
    Description: level.name,
    Elevation: level.elevation,
    Height: level.height,
  }));

  return {
    Contacts: [{ Email: `${author}@opencad.io`, CreatedBy: author, CreatedOn: now, Category: 'Author', Company: 'OpenCAD', Phone: '', ExternalSystem: 'OpenCAD', ExternalObject: 'IfcPerson', ExternalIdentifier: author }],
    Facilities: [{ Name: doc.name, CreatedBy: author, CreatedOn: now, Category: 'Facility', ProjectName: doc.name, SiteName: 'Site', LinearUnits: 'millimeters', AreaUnits: 'square meters', VolumeUnits: 'cubic meters', CurrencyUnit: 'USD', AreaMeasurement: 'GrossFloorArea', ExternalSystem: 'OpenCAD', ExternalProjectObject: 'IfcProject', ExternalProjectIdentifier: doc.id, ExternalSiteObject: 'IfcSite', ExternalSiteIdentifier: doc.id + '-site', ExternalFacilityObject: 'IfcBuilding', ExternalFacilityIdentifier: doc.id + '-building', Description: doc.name, ProjectDescription: '', SiteDescription: '', Phase: 'Design' }],
    Floors: floors,
    Spaces: spaces,
    Types: types,
    Components: components,
  };
}

export function serializeCOBieCSV(spreadsheet: COBieSpreadsheet): Record<string, string> {
  const sheets: Record<string, string> = {};

  for (const [sheetName, rows] of Object.entries(spreadsheet)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row: Record<string, unknown>) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          const str = String(val);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ];
    sheets[sheetName] = csvLines.join('\n');
  }

  return sheets;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCOBieCategory(elementType: string): string {
  const map: Record<string, string> = {
    wall: '30-10 30 00',
    door: '08-14 00 00',
    window: '08-50 00 00',
    slab: '03-35 00 00',
    roof: '07-00 00 00',
    column: '03-45 00 00',
    beam: '05-12 00 00',
    stair: '06-43 13 00',
    mechanical_equipment: '23-00 00 00',
    pipe: '22-00 00 00',
    duct: '23-31 00 00',
    electrical_equipment: '26-20 00 00',
  };
  return map[elementType] ?? '00-00 00 00';
}

function isMaintainableElement(el: ElementSchema): boolean {
  const maintainable = new Set([
    'door', 'window', 'mechanical_equipment', 'plumbing_fixture',
    'electrical_equipment', 'stair', 'roof', 'column', 'beam',
    'duct', 'pipe', 'conduit',
  ]);
  return maintainable.has(el.type);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
