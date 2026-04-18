/**
 * Document Diff
 *
 * Computes element-level differences between two DocumentSchema snapshots.
 * Used by VersionHistoryPanel to show what changed between versions.
 */

import type { DocumentSchema } from './types';

export interface ElementChange {
  elementId: string;
  type: 'added' | 'removed' | 'modified';
  elementType: string;
  changedProperties?: string[];
}

export interface DocumentDiff {
  versionA: number;
  versionB: number;
  added: number;
  removed: number;
  modified: number;
  changes: ElementChange[];
}

/**
 * Diff two document schemas, returning a summary of element-level changes.
 *
 * @param docA - The "before" document (older version)
 * @param docB - The "after" document (newer version)
 * @param versionA - Version number to label docA (default 0)
 * @param versionB - Version number to label docB (default 1)
 */
export function diffDocuments(
  docA: DocumentSchema,
  docB: DocumentSchema,
  versionA = 0,
  versionB = 1
): DocumentDiff {
  const changes: ElementChange[] = [];
  const idsA = new Set(Object.keys(docA.content.elements));
  const idsB = new Set(Object.keys(docB.content.elements));

  // Elements present in B but not A → added
  for (const id of idsB) {
    if (!idsA.has(id)) {
      changes.push({
        elementId: id,
        type: 'added',
        elementType: docB.content.elements[id].type,
      });
    } else {
      // Present in both → check for property changes only
      const elA = docA.content.elements[id];
      const elB = docB.content.elements[id];
      const propsA = elA.properties ?? {};
      const propsB = elB.properties ?? {};
      const allPropKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);
      const changedProps = [...allPropKeys].filter(
        (k) => JSON.stringify(propsB[k]) !== JSON.stringify(propsA[k])
      );
      if (changedProps.length > 0) {
        changes.push({
          elementId: id,
          type: 'modified',
          elementType: elB.type,
          changedProperties: changedProps,
        });
      }
    }
  }

  // Elements present in A but not B → removed
  for (const id of idsA) {
    if (!idsB.has(id)) {
      changes.push({
        elementId: id,
        type: 'removed',
        elementType: docA.content.elements[id].type,
      });
    }
  }

  return {
    versionA,
    versionB,
    added: changes.filter((c) => c.type === 'added').length,
    removed: changes.filter((c) => c.type === 'removed').length,
    modified: changes.filter((c) => c.type === 'modified').length,
    changes,
  };
}
