import { useDocumentStore } from '../stores/documentStore';
import { SyncStatusBar, type SyncStatus } from './SyncStatusBar';

export function StatusBar() {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();

  const syncStatus: SyncStatus = !isOnline ? 'offline' : isSaving ? 'syncing' : 'connected';

  return (
    <footer className="app-status-bar">
      <div className="status-left">
        <SyncStatusBar
          status={syncStatus}
          pendingOps={0}
          lastSynced={lastSaved}
        />
      </div>

      <div className="status-right">
        {selectedIds.length > 0 && (
          <div className="status-item">
            <span>{selectedIds.length} selected</span>
          </div>
        )}
        {doc && (
          <div className="status-item">
            <span>{Object.keys(doc.content.elements).length} elements</span>
          </div>
        )}
      </div>
    </footer>
  );
}
