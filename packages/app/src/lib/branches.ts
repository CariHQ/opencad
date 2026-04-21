/**
 * Design branches — Phase-3 collaboration feature.
 *
 * A branch is a named snapshot of a document's serialized JSON. Branches live
 * in OPFS / localStorage keyed by projectId; switching a branch reloads the
 * active document from that snapshot. Diffing compares element-by-element
 * membership and property content.
 */

import type { DocumentSchema } from '@opencad/document';
import { opfsRead, opfsWrite } from './opfs';

export interface BranchRecord {
  /** Stable internal id; 'main' is reserved for the original branch. */
  id: string;
  /** Human-friendly name, editable. */
  name: string;
  createdAt: number;
  /** Optional short message explaining why the branch was created. */
  message?: string;
  /** Full serialized document at the time this branch was created. */
  snapshot: string;
}

export interface BranchStore {
  projectId: string;
  branches: Record<string, BranchRecord>;
  activeBranchId: string;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const lsKey = (projectId: string): string => `opencad-branches-${projectId}`;
const opfsKey = (projectId: string): string => `branches-${projectId}.json`;

export async function loadBranches(projectId: string): Promise<BranchStore> {
  try {
    const fromOpfs = await opfsRead(opfsKey(projectId));
    if (fromOpfs) return JSON.parse(fromOpfs) as BranchStore;
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(lsKey(projectId));
    if (raw) return JSON.parse(raw) as BranchStore;
  } catch { /* fall through */ }
  return { projectId, branches: {}, activeBranchId: 'main' };
}

export async function saveBranches(store: BranchStore): Promise<void> {
  const serialized = JSON.stringify(store);
  await opfsWrite(opfsKey(store.projectId), serialized);
  try { localStorage.setItem(lsKey(store.projectId), serialized); } catch { /* quota */ }
}

// ─── Branch operations ──────────────────────────────────────────────────────

export function createBranch(
  store: BranchStore,
  params: { name: string; message?: string; document: DocumentSchema },
): BranchStore {
  const id = crypto.randomUUID();
  const record: BranchRecord = {
    id,
    name: params.name,
    createdAt: Date.now(),
    message: params.message,
    snapshot: JSON.stringify(params.document),
  };
  return {
    ...store,
    branches: { ...store.branches, [id]: record },
    activeBranchId: id,
  };
}

export function deleteBranch(store: BranchStore, id: string): BranchStore {
  if (id === 'main') return store; // main is immutable
  const { [id]: _removed, ...rest } = store.branches;
  void _removed;
  return {
    ...store,
    branches: rest,
    activeBranchId: store.activeBranchId === id ? 'main' : store.activeBranchId,
  };
}

export function switchBranch(store: BranchStore, id: string): BranchStore {
  if (id !== 'main' && !store.branches[id]) return store;
  return { ...store, activeBranchId: id };
}

export function getBranchDocument(
  store: BranchStore,
  id: string,
): DocumentSchema | null {
  if (id === 'main') return null; // caller reads the live document for main
  const rec = store.branches[id];
  if (!rec) return null;
  try { return JSON.parse(rec.snapshot) as DocumentSchema; } catch { return null; }
}

// ─── Diff ───────────────────────────────────────────────────────────────────

export interface BranchDiff {
  added: string[];    // element ids present in B but not in A
  removed: string[];  // element ids present in A but not in B
  changed: string[];  // element ids whose JSON differs between A and B
  unchanged: string[];
}

export function diffBranches(a: DocumentSchema, b: DocumentSchema): BranchDiff {
  const aEls = a.content.elements;
  const bEls = b.content.elements;
  const aIds = new Set(Object.keys(aEls));
  const bIds = new Set(Object.keys(bEls));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const id of bIds) if (!aIds.has(id)) added.push(id);
  for (const id of aIds) if (!bIds.has(id)) removed.push(id);
  for (const id of aIds) {
    if (!bIds.has(id)) continue;
    const same = JSON.stringify(aEls[id]) === JSON.stringify(bEls[id]);
    (same ? unchanged : changed).push(id);
  }
  return { added, removed, changed, unchanged };
}

// ─── Merge (simple three-way prefer-theirs / prefer-mine) ───────────────────

export type MergeStrategy = 'prefer-mine' | 'prefer-theirs';

export function mergeBranches(
  mine: DocumentSchema,
  theirs: DocumentSchema,
  strategy: MergeStrategy,
): DocumentSchema {
  const merged: DocumentSchema = JSON.parse(JSON.stringify(mine));
  const theirEls = theirs.content.elements;

  for (const [id, el] of Object.entries(theirEls)) {
    const existing = merged.content.elements[id];
    if (!existing) {
      merged.content.elements[id] = el;
      continue;
    }
    if (strategy === 'prefer-theirs') merged.content.elements[id] = el;
    // prefer-mine: keep existing as-is.
  }
  // Removed-on-theirs: prefer-theirs drops them from merged; prefer-mine keeps.
  if (strategy === 'prefer-theirs') {
    for (const id of Object.keys(merged.content.elements)) {
      if (!theirEls[id]) delete merged.content.elements[id];
    }
  }
  return merged;
}
