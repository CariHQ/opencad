import { useEffect, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { SyncStatusBar, type SyncStatus } from './SyncStatusBar';
import { getStorageUsage, isStorageQuotaWarning } from '@opencad/document';
import { useRole } from '../hooks/useRole';
import { RoleSwitcher } from './RoleSwitcher';

export function StatusBar() {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();
  const [storageWarning, setStorageWarning] = useState(false);
  const { role, config } = useRole();

  const syncStatus: SyncStatus = !isOnline ? 'offline' : isSaving ? 'syncing' : 'connected';

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const { used, quota } = await getStorageUsage();
        if (active) setStorageWarning(isStorageQuotaWarning(used, quota));
      } catch { /* non-fatal */ }
    };
    void check();
    const id = setInterval(() => { void check(); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <footer className="app-status-bar">
      <div className="status-left">
        <SyncStatusBar
          status={syncStatus}
          pendingOps={0}
          lastSynced={lastSaved}
        />
        {storageWarning && (
          <span className="status-storage-warning" title="Storage usage is above 80% — consider exporting your projects">
            ⚠ Storage almost full
          </span>
        )}
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
        <div className="status-item" title={`Current role: ${config.label}`}>
          <span className={`role-badge role-badge--${role}`}>{config.label}</span>
        </div>
        {import.meta.env.DEV && <RoleSwitcher />}
      </div>
    </footer>
  );
}
