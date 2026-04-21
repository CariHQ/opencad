import { describe, it, expect } from 'vitest';
import {
  buildCertFixtureSet,
  buildCertSubmission,
} from './ifcCertFixtures';

describe('T-CERT-002: cert fixture set', () => {
  it('every fixture produces a non-empty IFC string', () => {
    for (const f of buildCertFixtureSet()) {
      expect(f.ifc.length).toBeGreaterThan(100);
      expect(f.ifc).toContain('ISO-10303-21');
      expect(f.ifc).toContain('FILE_SCHEMA');
    }
  });

  it('each fixture element count matches its manifest', () => {
    for (const f of buildCertFixtureSet()) {
      expect(Object.keys(f.document.content.elements).length).toBe(f.manifest.elementCount);
    }
  });

  it('each fixture exercises at least one of its declared entities', () => {
    for (const f of buildCertFixtureSet()) {
      const hasAny = f.manifest.entities.some((ent) => f.ifc.includes(ent));
      expect(hasAny, `${f.manifest.name} did not emit any declared entity`).toBe(true);
    }
  });

  it('submission manifest aggregates every fixture entity', () => {
    const s = buildCertSubmission();
    const allFromFixtures = new Set(s.fixtures.flatMap((m) => m.entities));
    for (const ent of allFromFixtures) {
      expect(s.entitiesCovered).toContain(ent);
    }
  });

  it('submission MVD matches every fixture MVD', () => {
    const s = buildCertSubmission();
    for (const m of s.fixtures) expect(m.mvd).toBe(s.mvd);
  });
});
