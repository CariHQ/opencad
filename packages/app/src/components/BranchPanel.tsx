/**
 * BranchPanel — create / switch / delete design branches.
 *
 * Thin UI wrapper over lib/branches. "main" is always present (it's the
 * live document); other branches are frozen snapshots users can switch
 * to for review or merge back in.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { GitBranch, GitMerge, Trash2 } from 'lucide-react';
import type { DocumentSchema } from '@opencad/document';
import { useDocumentStore } from '../stores/documentStore';
import {
  loadBranches,
  saveBranches,
  createBranch,
  deleteBranch,
  switchBranch,
  getBranchDocument,
  diffBranches,
  mergeBranches,
  pushBranchToServer,
  removeBranchFromServer,
  type BranchStore,
} from '../lib/branches';

export function BranchPanel(): React.ReactElement {
  const doc = useDocumentStore((s) => s.document);
  const loadDocumentSchema = useDocumentStore((s) => s.loadDocumentSchema);
  const [store, setStore] = useState<BranchStore | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!doc) return;
    void loadBranches(doc.id).then(setStore);
  }, [doc]);

  const persist = useCallback((next: BranchStore) => {
    setStore(next);
    void saveBranches(next);
  }, []);

  if (!doc || !store) {
    return (
      <div className="branch-panel">
        <div className="panel-header"><span className="panel-title">Design Branches</span></div>
        <p className="empty-hint">Open a project to work with branches.</p>
      </div>
    );
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    // Update the local cache immediately so the UI feels instant, then
    // push to the server. If the push fails we surface it via the
    // useDocumentStore toast pattern — for now we log and keep the
    // optimistic state (next loadBranches reconciles).
    const next = createBranch(store, { name: newName.trim(), document: doc });
    persist(next);
    // Find the record we just created — it's the newly active one.
    const record = next.branches[next.activeBranchId];
    if (record) {
      void pushBranchToServer(doc.id, record, store.activeBranchId).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[branches] push failed, kept local copy:', err);
      });
    }
    setNewName('');
  };

  const handleSwitch = (id: string) => {
    if (id !== 'main') {
      const snap = getBranchDocument(store, id);
      if (snap) loadDocumentSchema(snap);
    }
    // activeBranchId is client-local; no server round-trip.
    persist(switchBranch(store, id));
  };

  const handleDelete = (id: string) => {
    if (id === 'main') return;
    persist(deleteBranch(store, id));
    if (doc) {
      void removeBranchFromServer(doc.id, id).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[branches] delete failed server-side:', err);
      });
    }
  };

  const handleMergeIn = (id: string, strategy: 'prefer-mine' | 'prefer-theirs') => {
    const theirs = getBranchDocument(store, id);
    if (!theirs) return;
    const merged = mergeBranches(doc, theirs, strategy);
    loadDocumentSchema(merged as DocumentSchema);
  };

  const branchList = [
    { id: 'main', name: 'main', createdAt: 0, snapshot: '' } as const,
    ...Object.values(store.branches),
  ];

  return (
    <div className="branch-panel">
      <div className="panel-header">
        <span className="panel-title">Design Branches</span>
      </div>

      <div className="branch-create-row">
        <input
          className="branch-name-input"
          placeholder="New branch name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button className="btn-create-branch" onClick={handleCreate} disabled={!newName.trim()}>
          <GitBranch size={13} /> Create
        </button>
      </div>

      <ul className="branch-list">
        {branchList.map((b) => {
          const isActive = store.activeBranchId === b.id;
          const snap = b.id === 'main' ? null : getBranchDocument(store, b.id);
          const diff = snap ? diffBranches(doc, snap) : null;
          return (
            <li key={b.id} className={`branch-item${isActive ? ' active' : ''}`}>
              <div className="branch-meta">
                <GitBranch size={12} />
                <span className="branch-name">{b.name}</span>
                {isActive && <span className="branch-active-tag">active</span>}
              </div>
              {diff && (
                <div className="branch-diff">
                  <span>+{diff.added.length}</span>
                  <span>~{diff.changed.length}</span>
                  <span>-{diff.removed.length}</span>
                </div>
              )}
              <div className="branch-actions">
                {!isActive && (
                  <button className="btn-branch-switch" onClick={() => handleSwitch(b.id)}>
                    Switch
                  </button>
                )}
                {b.id !== 'main' && (
                  <>
                    <button
                      className="btn-branch-merge"
                      onClick={() => handleMergeIn(b.id, 'prefer-theirs')}
                      title="Merge this branch into the active one — prefer theirs"
                    >
                      <GitMerge size={12} /> Merge
                    </button>
                    <button
                      className="btn-branch-delete"
                      onClick={() => handleDelete(b.id)}
                      title="Delete branch"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
