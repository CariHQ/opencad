/**
 * T-CERT-001: buildingSMART IFC certification coverage matrix.
 *
 * Codifies the MVD (Model View Definition) conformance scope as a data
 * structure that downstream tooling (docs, CI dashboards, certification
 * submission forms) can consume programmatically.
 *
 * buildingSMART certifies IFC implementations against specific MVDs:
 *   - IFC4 Reference View (RV)    — read-only interop, core BIM entities
 *   - IFC4 Design Transfer View (DTV) — full authoring round-trip
 *   - IFC2x3 Coordination View 2.0 — legacy, still widely used
 *
 * Each entry below declares the MVD it belongs to, the IFC entity being
 * covered, and whether serialize/parse paths are currently supported in
 * packages/document/src/ifc.ts. Keep this file synchronised with the
 * serializer + parser so the matrix stays honest.
 */

export type MVD = 'IFC2x3 CV 2.0' | 'IFC4 RV' | 'IFC4 DTV';

export type ConformanceStatus =
  | 'full'        // serialize + parse both exercise every required attribute
  | 'partial'     // serialize + parse exist but some attributes are lossy
  | 'serialize'   // export-only
  | 'parse'       // import-only
  | 'none';       // entity is not yet handled

export interface IfcEntityCoverage {
  /** IFC entity name (e.g. IFCWALL, IFCDOOR). */
  entity: string;
  /** Which MVDs require this entity. */
  mvds: MVD[];
  /** Current support level in the adapter. */
  status: ConformanceStatus;
  /** Attributes we actively preserve through round-trip. */
  attributes: string[];
  /** Known gaps to flag in the certification submission. */
  gaps?: string[];
}

export const IFC_COVERAGE_MATRIX: IfcEntityCoverage[] = [
  // ── Project / spatial hierarchy ────────────────────────────────────────────
  {
    entity: 'IFCPROJECT',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
    gaps: ['UnitsInContext not emitted — receivers must assume mm'],
  },
  {
    entity: 'IFCSITE',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCBUILDING',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCBUILDINGSTOREY',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['GlobalId', 'Name', 'Elevation'],
  },

  // ── Placement / geometry primitives ────────────────────────────────────────
  {
    entity: 'IFCLOCALPLACEMENT',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['RelativePlacement'],
  },
  {
    entity: 'IFCAXIS2PLACEMENT3D',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['Location', 'Axis', 'RefDirection'],
  },
  {
    entity: 'IFCCARTESIANPOINT',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['Coordinates'],
  },
  {
    entity: 'IFCDIRECTION',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['DirectionRatios'],
  },
  {
    entity: 'IFCEXTRUDEDAREASOLID',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['SweptArea', 'Position', 'ExtrudedDirection', 'Depth'],
  },
  {
    entity: 'IFCARBITRARYCLOSEDPROFILEDEF',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['ProfileType', 'OuterCurve'],
  },
  {
    entity: 'IFCPOLYLINE',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['Points'],
  },

  // ── Building element occurrences ───────────────────────────────────────────
  {
    entity: 'IFCWALL',
    mvds: ['IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['GlobalId', 'Name', 'ObjectPlacement', 'Representation'],
  },
  {
    entity: 'IFCWALLSTANDARDCASE',
    mvds: ['IFC2x3 CV 2.0'],
    status: 'full',
    attributes: ['GlobalId', 'Name', 'ObjectPlacement', 'Representation'],
  },
  {
    entity: 'IFCSLAB',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['GlobalId', 'Name', 'ObjectPlacement', 'Representation'],
  },
  {
    entity: 'IFCROOF',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
    gaps: ['PredefinedType (FLAT/GABLE/...) not yet serialised'],
  },
  {
    entity: 'IFCCOLUMN',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCBEAM',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCDOOR',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
    gaps: ['OverallWidth / OverallHeight not serialised as dedicated attrs'],
  },
  {
    entity: 'IFCWINDOW',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
    gaps: ['OverallWidth / OverallHeight not serialised as dedicated attrs'],
  },
  {
    entity: 'IFCSTAIR',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCRAILING',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCSPACE',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name'],
  },
  {
    entity: 'IFCCURTAINWALL',
    mvds: ['IFC4 RV', 'IFC4 DTV'],
    status: 'partial',
    attributes: ['GlobalId', 'Name', 'ObjectPlacement', 'Representation'],
  },

  // ── Property sets ──────────────────────────────────────────────────────────
  {
    entity: 'IFCPROPERTYSET',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['GlobalId', 'Name', 'HasProperties'],
  },
  {
    entity: 'IFCPROPERTYSINGLEVALUE',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['Name', 'NominalValue'],
  },
  {
    entity: 'IFCRELDEFINESBYPROPERTIES',
    mvds: ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'],
    status: 'full',
    attributes: ['RelatingPropertyDefinition', 'RelatedObjects'],
  },

  // ── IFC4 advanced geometry (RV subset) ─────────────────────────────────────
  {
    entity: 'IFCRATIONALBSPLINECURVEWITHKNOTS',
    mvds: ['IFC4 RV', 'IFC4 DTV'],
    status: 'parse',
    attributes: ['Degree', 'ControlPointsList', 'Knots'],
    gaps: ['No export path yet — NURBS emitted only on IFC4 round-trip'],
  },
  {
    entity: 'IFCBOOLEANRESULT',
    mvds: ['IFC4 DTV'],
    status: 'parse',
    attributes: ['Operator', 'FirstOperand', 'SecondOperand'],
    gaps: ['DTV-only; no serialization of CSG yet'],
  },
];

// ─── Aggregations ────────────────────────────────────────────────────────────

/** Entries required by a given MVD. */
export function coverageFor(mvd: MVD): IfcEntityCoverage[] {
  return IFC_COVERAGE_MATRIX.filter((e) => e.mvds.includes(mvd));
}

/** Summary counts per status for a given MVD. */
export function coverageSummary(mvd: MVD): Record<ConformanceStatus, number> {
  const rows = coverageFor(mvd);
  const summary: Record<ConformanceStatus, number> = {
    full: 0, partial: 0, serialize: 0, parse: 0, none: 0,
  };
  for (const row of rows) summary[row.status]++;
  return summary;
}

/** Boolean percentage score (0–100) — 'full' weighted 1, 'partial' 0.5, else 0. */
export function conformanceScore(mvd: MVD): number {
  const rows = coverageFor(mvd);
  if (rows.length === 0) return 0;
  let score = 0;
  for (const row of rows) {
    if (row.status === 'full') score += 1;
    else if (row.status === 'partial') score += 0.5;
    else if (row.status === 'serialize' || row.status === 'parse') score += 0.25;
  }
  return Math.round((score / rows.length) * 100);
}

/** All entities with open gaps — useful to produce a punch list. */
export function entitiesWithGaps(mvd?: MVD): IfcEntityCoverage[] {
  const rows = mvd ? coverageFor(mvd) : IFC_COVERAGE_MATRIX;
  return rows.filter((e) => e.status !== 'full' || (e.gaps && e.gaps.length > 0));
}
