/**
 * Story filter — T-DOC-037 (#330).
 *
 * A "story" is the existing LevelSchema (with elevation + height) reframed
 * as a floor of the building. Views can filter which stories are visible:
 *
 *   'all'                — show every element
 *   'current'            — only elements whose elevation lies within the
 *                          current story's [elevation, elevation+height).
 *   'current-and-below'  — current + every story with lower elevation.
 *   'current-and-above'  — current + every story with higher elevation.
 *
 * Element-to-story mapping:
 *   - If the element carries ElevationOffset (walls/slabs/roofs), that's
 *     the reference point.
 *   - Otherwise, the element is treated as belonging to the first story.
 */
import type { DocumentSchema, ElementSchema, LevelSchema } from '@opencad/document';

export type StoryFilterKind = 'all' | 'current' | 'current-and-below' | 'current-and-above';

export interface StoryFilter {
  kind: StoryFilterKind;
  /** Current level id — required for anything other than 'all'. */
  currentLevelId?: string;
}

function numProp(el: ElementSchema, key: string, fb = 0): number {
  const p = (el.properties as Record<string, { value: unknown }>)[key];
  return p && typeof p.value === 'number' ? (p.value as number) : fb;
}

/** Pick the story an element belongs to based on its ElevationOffset. */
export function storyForElement(
  el: ElementSchema,
  levels: LevelSchema[],
): LevelSchema | null {
  if (levels.length === 0) return null;
  const elev = numProp(el, 'ElevationOffset', 0);
  // Sort by elevation ascending so we can find the topmost level <= elev.
  const sorted = [...levels].sort((a, b) => a.elevation - b.elevation);
  let assigned = sorted[0]!;
  for (const lvl of sorted) {
    if (elev >= lvl.elevation) assigned = lvl;
  }
  return assigned;
}

/** Return the subset of elements visible under the given filter. */
export function filterElementsByStory(
  doc: DocumentSchema,
  filter: StoryFilter,
): ElementSchema[] {
  const elements = Object.values(doc.content.elements);
  if (filter.kind === 'all') return elements;

  const levels = Object.values(doc.organization.levels);
  if (levels.length === 0 || !filter.currentLevelId) return elements;

  const currentLevel = levels.find((l) => l.id === filter.currentLevelId);
  if (!currentLevel) return elements;

  const sorted = [...levels].sort((a, b) => a.elevation - b.elevation);
  const currentIdx = sorted.findIndex((l) => l.id === currentLevel.id);

  const allowedLevelIds = new Set<string>();
  if (filter.kind === 'current') {
    allowedLevelIds.add(currentLevel.id);
  } else if (filter.kind === 'current-and-below') {
    for (let i = 0; i <= currentIdx; i++) allowedLevelIds.add(sorted[i]!.id);
  } else if (filter.kind === 'current-and-above') {
    for (let i = currentIdx; i < sorted.length; i++) allowedLevelIds.add(sorted[i]!.id);
  }

  return elements.filter((el) => {
    const story = storyForElement(el, levels);
    return story !== null && allowedLevelIds.has(story.id);
  });
}
