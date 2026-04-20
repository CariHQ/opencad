/**
 * T-DOC-037 story filter tests (GitHub issue #330).
 *
 *   T-DOC-037-001 — 'current' on story 1 returns only elements on story 1
 *   T-DOC-037-002 — 'current-and-below' on story 3 returns stories 1..3
 *   T-DOC-037-003 — 'all' returns every element
 *   T-DOC-037-004 — element on story boundary is classified to lower story
 *   T-DOC-037-006 — 5-story sky-garden tower 'current' returns only floor 3
 */
import { describe, it, expect } from 'vitest';
import type { DocumentSchema, ElementSchema, LevelSchema } from '@opencad/document';
import { filterElementsByStory, storyForElement } from './storyFilter';

function mkDoc(levels: LevelSchema[], els: ElementSchema[]): DocumentSchema {
  const elements: Record<string, ElementSchema> = {};
  for (const e of els) elements[e.id] = e;
  const levelMap: Record<string, LevelSchema> = {};
  for (const l of levels) levelMap[l.id] = l;
  return {
    id: 'doc', name: 't', version: { clock: {} },
    metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
    content: { elements, spaces: {} },
    organization: { layers: {}, levels: levelMap },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  } as DocumentSchema;
}

let __id = 0;
function mkEl(elev: number): ElementSchema {
  return {
    id: `e-${++__id}`, type: 'wall', layerId: 'l1',
    properties: {
      StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 },
      EndX:   { type: 'number', value: 1000 }, EndY: { type: 'number', value: 0 },
      ElevationOffset: { type: 'number', value: elev },
    },
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    createdAt: 0, updatedAt: 0,
  } as ElementSchema;
}

const STORY = 3000;
const levels: LevelSchema[] = [
  { id: 'l1', name: 'Floor 1', elevation: 0 * STORY, height: STORY, order: 0 },
  { id: 'l2', name: 'Floor 2', elevation: 1 * STORY, height: STORY, order: 1 },
  { id: 'l3', name: 'Floor 3', elevation: 2 * STORY, height: STORY, order: 2 },
  { id: 'l4', name: 'Floor 4', elevation: 3 * STORY, height: STORY, order: 3 },
  { id: 'l5', name: 'Floor 5', elevation: 4 * STORY, height: STORY, order: 4 },
];

describe('T-DOC-037: storyFilter', () => {
  it('T-DOC-037-001: filter "current" on floor 1 returns only floor-1 elements', () => {
    const e1 = mkEl(0);
    const e2 = mkEl(STORY);
    const e3 = mkEl(2 * STORY);
    const doc = mkDoc(levels, [e1, e2, e3]);
    const r = filterElementsByStory(doc, { kind: 'current', currentLevelId: 'l1' });
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe(e1.id);
  });

  it('T-DOC-037-002: "current-and-below" on floor 3 returns floors 1..3', () => {
    const elements = levels.map((l) => mkEl(l.elevation));
    const doc = mkDoc(levels, elements);
    const r = filterElementsByStory(doc, { kind: 'current-and-below', currentLevelId: 'l3' });
    expect(r).toHaveLength(3);
  });

  it('T-DOC-037-002b: "current-and-above" on floor 3 returns floors 3..5', () => {
    const elements = levels.map((l) => mkEl(l.elevation));
    const doc = mkDoc(levels, elements);
    const r = filterElementsByStory(doc, { kind: 'current-and-above', currentLevelId: 'l3' });
    expect(r).toHaveLength(3);
  });

  it('T-DOC-037-003: "all" returns every element', () => {
    const elements = levels.map((l) => mkEl(l.elevation));
    const doc = mkDoc(levels, elements);
    const r = filterElementsByStory(doc, { kind: 'all' });
    expect(r).toHaveLength(5);
  });

  it('T-DOC-037-004: element exactly on boundary is assigned to the upper story', () => {
    // An element at elevation 3000 should land on floor 2.
    const el = mkEl(STORY);
    const story = storyForElement(el, levels);
    expect(story?.id).toBe('l2');
  });

  it('falls back to first level for elements with no ElevationOffset', () => {
    const el: ElementSchema = {
      id: 'plain', type: 'wall', layerId: 'l',
      properties: {}, boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      createdAt: 0, updatedAt: 0,
    } as ElementSchema;
    const story = storyForElement(el, levels);
    expect(story?.id).toBe('l1');
  });

  it('T-DOC-037-006: 5-story tower "current" filter on floor 3 returns only floor-3 elements', () => {
    // Three elements per floor
    const elements: ElementSchema[] = [];
    for (const l of levels) {
      elements.push(mkEl(l.elevation));
      elements.push(mkEl(l.elevation));
      elements.push(mkEl(l.elevation));
    }
    const doc = mkDoc(levels, elements);
    const r = filterElementsByStory(doc, { kind: 'current', currentLevelId: 'l3' });
    expect(r).toHaveLength(3);
    for (const e of r) expect(storyForElement(e, levels)?.id).toBe('l3');
  });
});
