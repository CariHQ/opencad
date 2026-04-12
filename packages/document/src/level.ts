/**
 * Level Operations
 */

import { LevelSchema } from './types';

export function createLevel(params: {
  name: string;
  elevation: number;
  height?: number;
  order?: number;
}): LevelSchema {
  return {
    id: crypto.randomUUID(),
    name: params.name,
    elevation: params.elevation,
    height: params.height ?? 3000,
    order: params.order ?? 0,
  };
}

export function updateLevelElevation(level: LevelSchema, elevation: number): LevelSchema {
  return { ...level, elevation };
}

export function updateLevelHeight(level: LevelSchema, height: number): LevelSchema {
  return { ...level, height };
}

export function updateLevelName(level: LevelSchema, name: string): LevelSchema {
  return { ...level, name };
}

export function reorderLevels(
  levels: Record<string, LevelSchema>,
  levelIds: string[]
): Record<string, LevelSchema> {
  const reordered: Record<string, LevelSchema> = {};

  levelIds.forEach((id, index) => {
    if (levels[id]) {
      reordered[id] = { ...levels[id], order: index };
    }
  });

  return reordered;
}

export function getLevelAtElevation(
  levels: Record<string, LevelSchema>,
  elevation: number
): LevelSchema | undefined {
  const sortedLevels = Object.values(levels).sort((a, b) => a.elevation - b.elevation);

  for (let i = sortedLevels.length - 1; i >= 0; i--) {
    if (elevation >= sortedLevels[i].elevation) {
      return sortedLevels[i];
    }
  }

  return sortedLevels[0];
}
