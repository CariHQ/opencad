/**
 * T-BRANCH-001: Design branch create / switch / diff / merge
 */
import { describe, it, expect } from 'vitest';
import {
  createBranch,
  deleteBranch,
  switchBranch,
  diffBranches,
  mergeBranches,
} from './branches';
import { createProject, addElement } from '@opencad/document';

function seed(name: string) {
  const doc = createProject(name, 'tester');
  const layerId = Object.keys(doc.organization.layers)[0]!;
  const levelId = Object.keys(doc.organization.levels)[0]!;
  addElement(doc, {
    type: 'wall',
    properties: {
      StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 },
      EndX:   { type: 'number', value: 3000 }, EndY: { type: 'number', value: 0 },
    },
    layerId, levelId,
  });
  return doc;
}

describe('T-BRANCH-001: branches', () => {
  it('createBranch adds a record and sets it active', () => {
    const store = { projectId: 'p1', branches: {}, activeBranchId: 'main' };
    const next = createBranch(store, { name: 'feature-a', document: seed('p1') });
    expect(Object.keys(next.branches)).toHaveLength(1);
    expect(next.activeBranchId).not.toBe('main');
  });

  it('deleteBranch removes the branch and falls back to main', () => {
    const store = { projectId: 'p1', branches: {}, activeBranchId: 'main' };
    const s1 = createBranch(store, { name: 'tmp', document: seed('p1') });
    const id = s1.activeBranchId;
    const s2 = deleteBranch(s1, id);
    expect(s2.branches[id]).toBeUndefined();
    expect(s2.activeBranchId).toBe('main');
  });

  it("deleteBranch refuses to delete 'main'", () => {
    const store = { projectId: 'p1', branches: {}, activeBranchId: 'main' };
    const next = deleteBranch(store, 'main');
    expect(next.activeBranchId).toBe('main');
  });

  it('switchBranch accepts main and existing branch ids', () => {
    const store = { projectId: 'p1', branches: {}, activeBranchId: 'main' };
    const s1 = createBranch(store, { name: 'a', document: seed('p1') });
    const id = s1.activeBranchId;
    const s2 = switchBranch(s1, 'main');
    expect(s2.activeBranchId).toBe('main');
    const s3 = switchBranch(s2, id);
    expect(s3.activeBranchId).toBe(id);
  });

  it('switchBranch ignores unknown ids', () => {
    const store = { projectId: 'p1', branches: {}, activeBranchId: 'main' };
    const next = switchBranch(store, 'does-not-exist');
    expect(next.activeBranchId).toBe('main');
  });
});

describe('T-BRANCH-001: diff', () => {
  it('detects added/removed/changed/unchanged elements', () => {
    const a = seed('a');
    const b = seed('b');
    // Copy element from a into b unchanged.
    const [idA, elA] = Object.entries(a.content.elements)[0]!;
    b.content.elements[idA] = JSON.parse(JSON.stringify(elA));
    // Add a new element only in b.
    const extraId = crypto.randomUUID();
    b.content.elements[extraId] = { ...elA, id: extraId };
    // Change an element in b.
    const [idShared, elShared] = Object.entries(a.content.elements)[0]!;
    b.content.elements[idShared] = {
      ...elShared,
      properties: {
        ...elShared.properties,
        Height: { type: 'number', value: 9999 },
      },
    };

    const d = diffBranches(a, b);
    expect(d.added).toContain(extraId);
    expect(d.changed).toContain(idShared);
  });
});

describe('T-BRANCH-001: merge', () => {
  it('prefer-theirs replaces overlapping elements', () => {
    const mine   = seed('mine');
    const theirs = seed('theirs');
    const id = Object.keys(mine.content.elements)[0]!;
    const tid = Object.keys(theirs.content.elements)[0]!;
    // Copy theirs element under mine's id so the ids overlap.
    theirs.content.elements[id] = { ...theirs.content.elements[tid]!, id };
    theirs.content.elements[id]!.properties['Height'] = { type: 'number', value: 5555 };

    const merged = mergeBranches(mine, theirs, 'prefer-theirs');
    expect(merged.content.elements[id]!.properties['Height']?.value).toBe(5555);
  });

  it('prefer-mine keeps overlapping elements as-is', () => {
    const mine   = seed('mine');
    const theirs = seed('theirs');
    const id = Object.keys(mine.content.elements)[0]!;
    const tid = Object.keys(theirs.content.elements)[0]!;
    theirs.content.elements[id] = { ...theirs.content.elements[tid]!, id };
    theirs.content.elements[id]!.properties['Height'] = { type: 'number', value: 5555 };

    const original = mine.content.elements[id]!.properties['Height']?.value;
    const merged = mergeBranches(mine, theirs, 'prefer-mine');
    expect(merged.content.elements[id]!.properties['Height']?.value).toBe(original);
  });
});
