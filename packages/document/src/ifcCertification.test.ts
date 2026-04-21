/**
 * T-CERT-001: buildingSMART IFC coverage matrix tests
 *
 * These tests are aimed at keeping the coverage matrix honest. They fail
 * when the adapter changes in a way that breaks the declared conformance
 * (e.g. a previously 'full' entity regresses to 'partial'), forcing a
 * matrix update alongside the code change.
 */

import { describe, it, expect } from 'vitest';
import {
  IFC_COVERAGE_MATRIX,
  coverageFor,
  coverageSummary,
  conformanceScore,
  entitiesWithGaps,
  type MVD,
} from './ifcCertification';

describe('T-CERT-001: IFC coverage matrix', () => {
  it('every entry covers at least one MVD', () => {
    for (const row of IFC_COVERAGE_MATRIX) {
      expect(row.mvds.length, `${row.entity} lists no MVDs`).toBeGreaterThan(0);
    }
  });

  it('every entry has at least one attribute listed when status is full/partial', () => {
    for (const row of IFC_COVERAGE_MATRIX) {
      if (row.status === 'full' || row.status === 'partial') {
        expect(row.attributes.length, `${row.entity} ${row.status} has no attributes`).toBeGreaterThan(0);
      }
    }
  });

  it('covers the IFC2x3 CV 2.0 core entity set', () => {
    const required = [
      'IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY',
      'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCROOF', 'IFCCOLUMN', 'IFCBEAM',
      'IFCDOOR', 'IFCWINDOW', 'IFCSTAIR', 'IFCSPACE',
    ];
    const covered = coverageFor('IFC2x3 CV 2.0').map((e) => e.entity);
    for (const ent of required) expect(covered).toContain(ent);
  });

  it('covers the IFC4 Reference View building-element set', () => {
    const required = [
      'IFCWALL', 'IFCSLAB', 'IFCROOF', 'IFCCOLUMN', 'IFCBEAM',
      'IFCDOOR', 'IFCWINDOW', 'IFCSTAIR', 'IFCCURTAINWALL',
    ];
    const covered = coverageFor('IFC4 RV').map((e) => e.entity);
    for (const ent of required) expect(covered).toContain(ent);
  });

  it('conformance score is above 50% for every MVD', () => {
    const mvds: MVD[] = ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'];
    for (const mvd of mvds) {
      expect(conformanceScore(mvd)).toBeGreaterThanOrEqual(50);
    }
  });

  it('geometry primitives are all fully supported', () => {
    const primitives = [
      'IFCLOCALPLACEMENT', 'IFCAXIS2PLACEMENT3D', 'IFCCARTESIANPOINT',
      'IFCDIRECTION', 'IFCEXTRUDEDAREASOLID', 'IFCARBITRARYCLOSEDPROFILEDEF',
      'IFCPOLYLINE',
    ];
    for (const name of primitives) {
      const row = IFC_COVERAGE_MATRIX.find((e) => e.entity === name);
      expect(row, `${name} missing from matrix`).toBeDefined();
      expect(row!.status, `${name} is ${row!.status}, expected full`).toBe('full');
    }
  });

  it('property-set pipeline is fully supported', () => {
    for (const name of ['IFCPROPERTYSET', 'IFCPROPERTYSINGLEVALUE', 'IFCRELDEFINESBYPROPERTIES']) {
      const row = IFC_COVERAGE_MATRIX.find((e) => e.entity === name);
      expect(row!.status).toBe('full');
    }
  });

  it('coverageSummary totals match row count per MVD', () => {
    const mvds: MVD[] = ['IFC2x3 CV 2.0', 'IFC4 RV', 'IFC4 DTV'];
    for (const mvd of mvds) {
      const rows = coverageFor(mvd);
      const summary = coverageSummary(mvd);
      const total = summary.full + summary.partial + summary.serialize + summary.parse + summary.none;
      expect(total).toBe(rows.length);
    }
  });

  it('entitiesWithGaps surfaces a non-empty punch list', () => {
    const gaps = entitiesWithGaps();
    expect(gaps.length).toBeGreaterThan(0);
    for (const row of gaps) {
      const hasGap = row.status !== 'full' || (row.gaps && row.gaps.length > 0);
      expect(hasGap).toBe(true);
    }
  });
});
