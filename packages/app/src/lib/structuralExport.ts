/**
 * Structural analytical model export — T-ANA-043 (#336).
 *
 * Walks the document and emits a simplified analytical structural
 * model: columns + beams as line elements, slabs + shear walls as
 * area elements, joints at connection points. The result feeds
 * exporters that write CIS/2, SAF, or IFC-structural files.
 */

import type { DocumentSchema, ElementSchema } from '@opencad/document';

export interface Joint {
  id: string;
  x: number; y: number; z: number;
  /** Element ids that terminate at this joint. */
  incident: string[];
}

export interface LineElement {
  id: string;
  sourceElementId: string;
  kind: 'column' | 'beam';
  startJointId: string;
  endJointId: string;
  profile?: string;
  material?: string;
}

export interface AreaElement {
  id: string;
  sourceElementId: string;
  kind: 'slab' | 'wall' | 'roof';
  vertices: Array<{ x: number; y: number; z: number }>;
  thickness: number;
  material?: string;
}

export interface AnalyticalModel {
  joints: Joint[];
  lines: LineElement[];
  areas: AreaElement[];
  unsupportedSourceIds: string[];
}

function num(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}
function str(el: ElementSchema, key: string): string | undefined {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'string' ? (p.value as string) : undefined;
}

/** Snap-to-existing joint or add a new one; returns the joint id. */
function getOrCreateJoint(
  joints: Joint[],
  x: number, y: number, z: number,
  incidentElId: string,
  tolerance = 20,
): string {
  for (const j of joints) {
    if (Math.hypot(j.x - x, j.y - y, j.z - z) <= tolerance) {
      if (!j.incident.includes(incidentElId)) j.incident.push(incidentElId);
      return j.id;
    }
  }
  const id = `j${joints.length + 1}`;
  joints.push({ id, x, y, z, incident: [incidentElId] });
  return id;
}

/**
 * Build the analytical model from a document.
 */
export function buildAnalyticalModel(doc: DocumentSchema): AnalyticalModel {
  const joints: Joint[] = [];
  const lines: LineElement[] = [];
  const areas: AreaElement[] = [];
  const unsupportedSourceIds: string[] = [];

  for (const el of Object.values(doc.content.elements)) {
    switch (el.type) {
      case 'column': {
        const x = num(el, 'X'), y = num(el, 'Y');
        const h = num(el, 'Height', 3000);
        const elev = num(el, 'ElevationOffset', 0);
        const sj = getOrCreateJoint(joints, x, y, elev, el.id);
        const ej = getOrCreateJoint(joints, x, y, elev + h, el.id);
        lines.push({
          id: `line-${el.id}`, sourceElementId: el.id, kind: 'column',
          startJointId: sj, endJointId: ej,
          profile: str(el, 'SectionType'), material: str(el, 'Material'),
        });
        break;
      }
      case 'beam': {
        const x1 = num(el, 'StartX'), y1 = num(el, 'StartY');
        const x2 = num(el, 'EndX',   x1 + 1000), y2 = num(el, 'EndY', y1);
        const elev = num(el, 'ElevationOffset', 0);
        const sj = getOrCreateJoint(joints, x1, y1, elev, el.id);
        const ej = getOrCreateJoint(joints, x2, y2, elev, el.id);
        lines.push({
          id: `line-${el.id}`, sourceElementId: el.id, kind: 'beam',
          startJointId: sj, endJointId: ej,
          material: str(el, 'Material'),
        });
        break;
      }
      case 'slab':
      case 'roof': {
        const raw = str(el, 'Points');
        if (!raw) break;
        try {
          const pts = JSON.parse(raw) as Array<{ x: number; y: number }>;
          const elev = num(el, 'ElevationOffset', 0);
          areas.push({
            id: `area-${el.id}`, sourceElementId: el.id,
            kind: el.type === 'slab' ? 'slab' : 'roof',
            vertices: pts.map((p) => ({ x: p.x, y: p.y, z: elev })),
            thickness: num(el, 'Thickness', 200),
            material: str(el, 'Material'),
          });
        } catch { unsupportedSourceIds.push(el.id); }
        break;
      }
      case 'wall': {
        // Walls only enter the analytical model when explicitly tagged
        // Structural=true.
        if (str(el, 'Structural') === 'true') {
          const x1 = num(el, 'StartX'), y1 = num(el, 'StartY');
          const x2 = num(el, 'EndX'),   y2 = num(el, 'EndY');
          const h = num(el, 'Height', 3000);
          const elev = num(el, 'ElevationOffset', 0);
          areas.push({
            id: `area-${el.id}`, sourceElementId: el.id, kind: 'wall',
            vertices: [
              { x: x1, y: y1, z: elev }, { x: x2, y: y2, z: elev },
              { x: x2, y: y2, z: elev + h }, { x: x1, y: y1, z: elev + h },
            ],
            thickness: num(el, 'Width', 200),
            material: str(el, 'Material'),
          });
        }
        break;
      }
      default:
        if (['morph', 'shell', 'stair'].includes(el.type)) {
          unsupportedSourceIds.push(el.id);
        }
    }
  }

  return { joints, lines, areas, unsupportedSourceIds };
}

/**
 * Minimal SAF-like CSV export — one row per entity.
 */
export function exportAnalyticalCSV(model: AnalyticalModel): string {
  const lines: string[] = [];
  lines.push('entity,id,p1x,p1y,p1z,p2x,p2y,p2z,kind,material');
  for (const j of model.joints) {
    lines.push(`joint,${j.id},${j.x},${j.y},${j.z},,,,,`);
  }
  for (const ln of model.lines) {
    const a = model.joints.find((j) => j.id === ln.startJointId)!;
    const b = model.joints.find((j) => j.id === ln.endJointId)!;
    lines.push(`line,${ln.id},${a.x},${a.y},${a.z},${b.x},${b.y},${b.z},${ln.kind},${ln.material ?? ''}`);
  }
  for (const a of model.areas) {
    // First vertex as p1, last as p2 — placeholder; real SAF carries all verts
    const v1 = a.vertices[0]!, v2 = a.vertices[a.vertices.length - 1]!;
    lines.push(`area,${a.id},${v1.x},${v1.y},${v1.z},${v2.x},${v2.y},${v2.z},${a.kind},${a.material ?? ''}`);
  }
  return lines.join('\n') + '\n';
}
