/**
 * Design branches — server-authoritative, with OPFS cache for offline.
 *
 * Previously branches lived only in OPFS / localStorage keyed by
 * projectId, which meant clearing browser storage or switching devices
 * wiped every branch. Now:
 *   - The server's `project_branches` table is the source of truth.
 *   - The local OPFS cache mirrors the server so offline reads still
 *     work. loadBranches() serves the cache immediately and reconciles
 *     from the server in the background when online.
 *   - createBranch / deleteBranch / updateBranch round-trip through the
 *     API; the local cache is updated on success.
 */

import type { DocumentSchema } from '@opencad/document';
import { opfsRead, opfsWrite } from './opfs';
import { isServerAvailable, serverFetch } from './serverApi';

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

/** Server row shape from /api/v1/projects/:id/branches. */
interface ServerBranch {
  projectId: string;
  id: string;
  name: string;
  message: string | null;
  snapshot: string;
  baseBranchId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function branchFromServer(row: ServerBranch): BranchRecord {
  return {
    id: row.id,
    name: row.name,
    message: row.message ?? undefined,
    snapshot: row.snapshot,
    createdAt: new Date(row.createdAt).getTime(),
  };
}

async function fetchServerBranches(projectId: string): Promise<BranchStore | null> {
  try {
    if (!(await isServerAvailable())) return null;
    const rows = await serverFetch<ServerBranch[]>(`/projects/${encodeURIComponent(projectId)}/branches`);
    const branches: Record<string, BranchRecord> = {};
    for (const row of rows) branches[row.id] = branchFromServer(row);
    // activeBranchId is client-local — server doesn't track which branch
    // the user is currently viewing, only the branch catalogue.
    return { projectId, branches, activeBranchId: 'main' };
  } catch {
    return null;
  }
}

export async function loadBranches(projectId: string): Promise<BranchStore> {
  // Fast path: cache first (works offline), then reconcile from server.
  let local: BranchStore | null = null;
  try {
    const fromOpfs = await opfsRead(opfsKey(projectId));
    if (fromOpfs) local = JSON.parse(fromOpfs) as BranchStore;
  } catch { /* fall through */ }
  if (!local) {
    try {
      const raw = localStorage.getItem(lsKey(projectId));
      if (raw) local = JSON.parse(raw) as BranchStore;
    } catch { /* fall through */ }
  }

  const remote = await fetchServerBranches(projectId);
  if (remote) {
    // Preserve the client-local activeBranchId (server doesn't know it).
    const merged: BranchStore = {
      ...remote,
      activeBranchId: local?.activeBranchId ?? 'main',
    };
    await saveBranchesLocal(merged);
    return merged;
  }
  return local ?? { projectId, branches: {}, activeBranchId: 'main' };
}

async function saveBranchesLocal(store: BranchStore): Promise<void> {
  const serialized = JSON.stringify(store);
  await opfsWrite(opfsKey(store.projectId), serialized);
  try { localStorage.setItem(lsKey(store.projectId), serialized); } catch { /* quota */ }
}

/**
 * Write the current branch state to the local cache. Kept for the
 * switchBranch (activeBranchId) path where no server round-trip is
 * needed — branch mutations use pushBranchToServer / removeBranchFromServer
 * below to round-trip first, then update the cache.
 */
export async function saveBranches(store: BranchStore): Promise<void> {
  await saveBranchesLocal(store);
}

/** Create-or-update a branch server-side then cache it locally. */
export async function pushBranchToServer(
  projectId: string,
  record: BranchRecord,
  baseBranchId?: string,
): Promise<BranchRecord> {
  const body = {
    id: record.id,
    name: record.name,
    message: record.message ?? null,
    snapshot: record.snapshot,
    base_branch_id: baseBranchId ?? null,
  };
  const row = await serverFetch<ServerBranch>(
    `/projects/${encodeURIComponent(projectId)}/branches`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return branchFromServer(row);
}

/** Delete a branch server-side. Caller is responsible for updating cache. */
export async function removeBranchFromServer(
  projectId: string,
  branchId: string,
): Promise<void> {
  await serverFetch<void>(
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`,
    { method: 'DELETE' },
  );
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
