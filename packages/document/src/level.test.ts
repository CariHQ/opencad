/**
 * Level Operations Tests
 * T-DOC-009: Level CRUD operations
 */
import { describe, it, expect } from 'vitest';
import {
  createLevel,
  updateLevelElevation,
  updateLevelHeight,
  updateLevelName,
  reorderLevels,
  getLevelAtElevation,
} from './level';
import type { LevelSchema } from './types';

function makeLevel(overrides: Partial<{ name: string; elevation: number }> = {}): LevelSchema {
  return createLevel({ name: overrides.name || 'Level 1', elevation: overrides.elevation ?? 0 });
}

describe('T-DOC-009: createLevel', () => {
  it('creates a level with the given name', () => {
    const level = createLevel({ name: 'Ground Floor', elevation: 0 });
    expect(level.name).toBe('Ground Floor');
  });

  it('creates a level with the given elevation', () => {
    const level = createLevel({ name: 'L1', elevation: 3000 });
    expect(level.elevation).toBe(3000);
  });

  it('generates a unique id', () => {
    const l1 = makeLevel();
    const l2 = makeLevel();
    expect(l1.id).not.toBe(l2.id);
  });

  it('defaults height to 3000', () => {
    expect(makeLevel().height).toBe(3000);
  });

  it('defaults order to 0', () => {
    expect(makeLevel().order).toBe(0);
  });

  it('accepts custom height and order', () => {
    const level = createLevel({ name: 'L', elevation: 0, height: 4000, order: 3 });
    expect(level.height).toBe(4000);
    expect(level.order).toBe(3);
  });
});

describe('T-DOC-009: updateLevelElevation', () => {
  it('updates elevation', () => {
    const level = makeLevel();
    const updated = updateLevelElevation(level, 6000);
    expect(updated.elevation).toBe(6000);
  });

  it('does not mutate original', () => {
    const level = makeLevel({ elevation: 0 });
    updateLevelElevation(level, 5000);
    expect(level.elevation).toBe(0);
  });
});

describe('T-DOC-009: updateLevelHeight', () => {
  it('updates height', () => {
    const level = makeLevel();
    const updated = updateLevelHeight(level, 4500);
    expect(updated.height).toBe(4500);
  });
});

describe('T-DOC-009: updateLevelName', () => {
  it('updates name', () => {
    const level = makeLevel({ name: 'Old' });
    const updated = updateLevelName(level, 'New');
    expect(updated.name).toBe('New');
  });
});

describe('T-DOC-009: reorderLevels', () => {
  it('reorders levels by given id order', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const l2 = createLevel({ name: 'First', elevation: 3000 });
    const l3 = createLevel({ name: 'Second', elevation: 6000 });

    const levels = { [l1.id]: l1, [l2.id]: l2, [l3.id]: l3 };
    const reordered = reorderLevels(levels, [l3.id, l2.id, l1.id]);

    expect(reordered[l3.id].order).toBe(0);
    expect(reordered[l2.id].order).toBe(1);
    expect(reordered[l1.id].order).toBe(2);
  });

  it('ignores ids not in the levels record', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const levels = { [l1.id]: l1 };
    const reordered = reorderLevels(levels, [l1.id, 'missing']);
    expect(reordered['missing']).toBeUndefined();
  });
});

describe('T-DOC-009: getLevelAtElevation', () => {
  it('returns the level at a given elevation', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const l2 = createLevel({ name: 'First', elevation: 3000 });
    const levels = { [l1.id]: l1, [l2.id]: l2 };
    const level = getLevelAtElevation(levels, 3500);
    expect(level?.name).toBe('First');
  });

  it('returns ground level for elevation 0', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const l2 = createLevel({ name: 'First', elevation: 3000 });
    const levels = { [l1.id]: l1, [l2.id]: l2 };
    const level = getLevelAtElevation(levels, 100);
    expect(level?.name).toBe('Ground');
  });

  it('returns ground level for elevation below all levels', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const l2 = createLevel({ name: 'First', elevation: 3000 });
    const levels = { [l1.id]: l1, [l2.id]: l2 };
    const level = getLevelAtElevation(levels, -100);
    expect(level?.elevation).toBe(0);
  });

  it('returns exact level when elevation matches', () => {
    const l1 = createLevel({ name: 'Ground', elevation: 0 });
    const l2 = createLevel({ name: 'First', elevation: 3000 });
    const levels = { [l1.id]: l1, [l2.id]: l2 };
    const level = getLevelAtElevation(levels, 3000);
    expect(level?.name).toBe('First');
  });
});
