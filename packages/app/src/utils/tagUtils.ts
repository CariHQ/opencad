/**
 * T-TAG-001…T-TAG-010: Auto-tagging utilities for BIM elements.
 *
 * Taggable types and their format:
 *   door   → D-01, D-02, …
 *   window → W-01, W-02, …
 *   space  → R-101, R-102, …  (100-series room numbers)
 */

interface TagConfig {
  prefix: string;
  baseNum: number;
}

// Tag prefixes per element type
const TAG_PREFIXES: Record<string, TagConfig> = {
  door:   { prefix: 'D', baseNum: 1 },
  window: { prefix: 'W', baseNum: 1 },
  space:  { prefix: 'R', baseNum: 101 },
};

/**
 * Format a tag label for a given element type and 1-based index.
 *
 * - door/window: D-01, W-12 (zero-padded to 2 digits)
 * - space: R-101, R-105 (baseNum 101 + index − 1, no padding needed)
 */
export function formatTagLabel(elementType: string, index: number): string {
  const config = TAG_PREFIXES[elementType];
  if (!config) return '';
  const num = config.baseNum + index - 1;
  // Use at least 2-digit zero-padding for door/window (baseNum === 1); rooms
  // naturally produce 3-digit numbers so no additional padding is applied.
  const formatted = config.baseNum === 1 ? String(num).padStart(2, '0') : String(num);
  return `${config.prefix}-${formatted}`;
}

/**
 * Generate a Map<elementId, tagLabel> for all taggable elements.
 *
 * Elements of the same type are numbered in insertion order (Object.values
 * preserves insertion order in all modern JS engines / ES2015+).
 * Elements whose type is not taggable (e.g. wall, slab) are omitted.
 *
 * The element Name property (when present) is not used as the tag ID —
 * sequential tags are always assigned — but callers may read
 * `element.properties.Name.value` to obtain the display label.
 */
export function generateElementTags(
  elements: Record<string, { id: string; type: string; properties?: Record<string, { value: unknown }> }>
): Map<string, string> {
  const tags = new Map<string, string>();
  const counters: Record<string, number> = {};

  for (const element of Object.values(elements)) {
    const { type } = element;
    if (!TAG_PREFIXES[type]) continue; // untagged type — skip
    counters[type] = (counters[type] ?? 0) + 1;
    tags.set(element.id, formatTagLabel(type, counters[type]));
  }

  return tags;
}
