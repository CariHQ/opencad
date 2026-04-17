/**
 * Versioning Tests
 * T-DOC-010: Version history operations
 */
import { describe, it, expect } from 'vitest';
import {
  createVersion,
  createVersionFromState,
  listVersions,
  getVersion,
  deleteVersion,
  pruneOldVersions,
  compareVersions,
  type Version,
  type VersionList,
} from './versioning';
import { createProject } from './document';

function makeVersionList(versions: Version[]): VersionList {
  return { versions, currentVersion: versions[0]?.version ?? 0 };
}

describe('T-DOC-010: createVersion', () => {
  it('creates version with unique id', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersion(doc);
    const v2 = createVersion(doc);
    expect(v1.id).not.toBe(v2.id);
  });

  it('creates version with message', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersion(doc, 'Initial draft');
    expect(v.message).toBe('Initial draft');
  });

  it('creates version without message', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersion(doc);
    expect(v.message).toBeUndefined();
  });

  it('deep-clones the document (immutable snapshot)', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersion(doc);
    doc.name = 'Modified';
    expect(v.document.name).not.toBe('Modified');
  });

  it('has positive timestamp', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersion(doc);
    expect(v.timestamp).toBeGreaterThan(0);
  });

  it('has positive version number', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersion(doc);
    expect(v.version).toBeGreaterThan(0);
  });
});

describe('T-DOC-010: createVersionFromState', () => {
  it('uses the provided version number', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersionFromState(doc, 42);
    expect(v.version).toBe(42);
  });

  it('uses the provided message', () => {
    const doc = createProject('p1', 'u1');
    const v = createVersionFromState(doc, 1, 'Checkpoint');
    expect(v.message).toBe('Checkpoint');
  });
});

describe('T-DOC-010: listVersions', () => {
  it('returns versions sorted ascending by version number', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 1);
    const v3 = createVersionFromState(doc, 3);
    const v2 = createVersionFromState(doc, 2);
    const vl = makeVersionList([v3, v1, v2]);
    const sorted = listVersions(vl);
    expect(sorted[0].version).toBe(1);
    expect(sorted[1].version).toBe(2);
    expect(sorted[2].version).toBe(3);
  });

  it('does not mutate the original array', () => {
    const doc = createProject('p1', 'u1');
    const v3 = createVersionFromState(doc, 3);
    const v1 = createVersionFromState(doc, 1);
    const vl = makeVersionList([v3, v1]);
    listVersions(vl);
    expect(vl.versions[0].version).toBe(3);
  });
});

describe('T-DOC-010: getVersion', () => {
  it('returns the matching version', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 100);
    const vl = makeVersionList([v1]);
    const found = getVersion(vl, 100);
    expect(found?.id).toBe(v1.id);
  });

  it('returns undefined for non-existent version', () => {
    const doc = createProject('p1', 'u1');
    const vl = makeVersionList([createVersionFromState(doc, 1)]);
    expect(getVersion(vl, 999)).toBeUndefined();
  });
});

describe('T-DOC-010: deleteVersion', () => {
  it('removes version with given number', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 1);
    const v2 = createVersionFromState(doc, 2);
    const vl = makeVersionList([v1, v2]);
    const updated = deleteVersion(vl, 1);
    expect(updated.versions.some((v) => v.version === 1)).toBe(false);
    expect(updated.versions).toHaveLength(1);
  });

  it('does not mutate the original VersionList', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 1);
    const vl = makeVersionList([v1]);
    deleteVersion(vl, 1);
    expect(vl.versions).toHaveLength(1);
  });

  it('is a no-op for non-existent version number', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 1);
    const vl = makeVersionList([v1]);
    const updated = deleteVersion(vl, 999);
    expect(updated.versions).toHaveLength(1);
  });
});

describe('T-DOC-010: pruneOldVersions', () => {
  it('keeps only the N most recent versions', () => {
    const doc = createProject('p1', 'u1');
    const versions = [1, 2, 3, 4, 5].map((n) => createVersionFromState(doc, n));
    const vl = makeVersionList(versions);
    const pruned = pruneOldVersions(vl, 2);
    expect(pruned.versions).toHaveLength(2);
  });

  it('keeps the highest version numbers', () => {
    const doc = createProject('p1', 'u1');
    const versions = [1, 2, 3, 4, 5].map((n) => createVersionFromState(doc, n));
    const vl = makeVersionList(versions);
    const pruned = pruneOldVersions(vl, 2);
    const kept = pruned.versions.map((v) => v.version).sort((a, b) => a - b);
    expect(kept).toEqual([4, 5]);
  });

  it('does not prune when count >= total versions', () => {
    const doc = createProject('p1', 'u1');
    const v1 = createVersionFromState(doc, 1);
    const vl = makeVersionList([v1]);
    const pruned = pruneOldVersions(vl, 10);
    expect(pruned.versions).toHaveLength(1);
  });
});

describe('T-DOC-010: compareVersions', () => {
  it('detects added elements between versions', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    docB.content.elements['el-new'] = {
      id: 'el-new',
      type: 'wall',
      properties: {},
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId: 'layer-1',
      levelId: 'level-1',
      transform: {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      boundingBox: {
        min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
        max: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      },
      metadata: {
        id: 'el-new',
        createdBy: 'u1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: { clock: {} },
      },
      visible: true,
      locked: false,
    };
    const vA = createVersionFromState(docA, 1);
    const vB = createVersionFromState(docB, 2);
    const diff = compareVersions(vA, vB);
    expect(diff.addedElements).toContain('el-new');
    expect(diff.hasChanges).toBe(true);
  });

  it('detects no changes between identical versions', () => {
    const doc = createProject('p1', 'u1');
    const vA = createVersionFromState(doc, 1);
    const vB = createVersionFromState(doc, 2);
    const diff = compareVersions(vA, vB);
    expect(diff.hasChanges).toBe(false);
  });

  it('returns correct versionA and versionB in diff', () => {
    const doc = createProject('p1', 'u1');
    const vA = createVersionFromState(doc, 10);
    const vB = createVersionFromState(doc, 20);
    const diff = compareVersions(vA, vB);
    expect(diff.versionA).toBe(10);
    expect(diff.versionB).toBe(20);
  });
});
