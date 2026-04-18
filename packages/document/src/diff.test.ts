/**
 * Document Diff Tests
 * T-VER-001: Document diff between two document schemas
 */
import { describe, it, expect } from 'vitest';
import { diffDocuments } from './diff';
import { createProject } from './document';
import type { DocumentSchema } from './types';

function addElement(doc: DocumentSchema, id: string, type = 'wall', props: Record<string, unknown> = {}): void {
  doc.content.elements[id] = {
    id,
    type: type as import('./types').ElementType,
    properties: props as Record<string, import('./types').PropertyValue>,
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
      max: { x: 1, y: 1, z: 1, _type: 'Point3D' },
    },
    metadata: {
      id,
      createdBy: 'u1',
      createdAt: 1000,
      updatedAt: 1000,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
  };
}

describe('T-VER-001: Document diff', () => {
  it('detects added elements', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docB, 'el-new', 'wall');

    const diff = diffDocuments(docA, docB);
    expect(diff.added).toBe(1);
    expect(diff.changes.some((c) => c.elementId === 'el-new' && c.type === 'added')).toBe(true);
  });

  it('detects removed elements', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docA, 'el-gone', 'door');

    const diff = diffDocuments(docA, docB);
    expect(diff.removed).toBe(1);
    expect(diff.changes.some((c) => c.elementId === 'el-gone' && c.type === 'removed')).toBe(true);
  });

  it('detects modified element properties', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docA, 'el-1', 'wall', { Height: { type: 'number', value: 3000 } });
    addElement(docB, 'el-1', 'wall', { Height: { type: 'number', value: 4000 } });

    const diff = diffDocuments(docA, docB);
    expect(diff.modified).toBe(1);
    const change = diff.changes.find((c) => c.elementId === 'el-1');
    expect(change?.type).toBe('modified');
    expect(change?.changedProperties).toContain('Height');
  });

  it('returns zero changes for identical documents', () => {
    const doc = createProject('p1', 'u1');
    addElement(doc, 'el-same', 'slab');

    const diff = diffDocuments(doc, doc);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(0);
    expect(diff.modified).toBe(0);
    expect(diff.changes).toHaveLength(0);
  });

  it('correctly counts added/removed/modified totals', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');

    // 1 removed
    addElement(docA, 'el-removed', 'wall');
    // 1 added
    addElement(docB, 'el-added', 'door');
    // 1 modified (in both)
    addElement(docA, 'el-modified', 'window', { Width: { type: 'number', value: 1200 } });
    addElement(docB, 'el-modified', 'window', { Width: { type: 'number', value: 900 } });
    // 1 unchanged (in both, identical)
    addElement(docA, 'el-same', 'column');
    addElement(docB, 'el-same', 'column');

    const diff = diffDocuments(docA, docB);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.modified).toBe(1);
    expect(diff.changes).toHaveLength(3);
  });

  it('includes correct elementType in added changes', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docB, 'el-door', 'door');

    const diff = diffDocuments(docA, docB);
    const change = diff.changes.find((c) => c.elementId === 'el-door');
    expect(change?.elementType).toBe('door');
  });

  it('includes correct elementType in removed changes', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docA, 'el-slab', 'slab');

    const diff = diffDocuments(docA, docB);
    const change = diff.changes.find((c) => c.elementId === 'el-slab');
    expect(change?.elementType).toBe('slab');
  });

  it('sets versionA and versionB from arguments', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');

    const diff = diffDocuments(docA, docB, 5, 10);
    expect(diff.versionA).toBe(5);
    expect(diff.versionB).toBe(10);
  });

  it('does not report modification when only non-property fields differ', () => {
    const docA = createProject('p1', 'u1');
    const docB = createProject('p1', 'u1');
    addElement(docA, 'el-1', 'wall');
    addElement(docB, 'el-1', 'wall');
    // metadata.updatedAt may differ — should not count as modified properties
    docB.content.elements['el-1'].metadata.updatedAt = 9999999;

    const diff = diffDocuments(docA, docB);
    // properties are the same (both empty), so no modified
    expect(diff.modified).toBe(0);
  });
});
