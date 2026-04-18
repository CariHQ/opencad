import { useDocumentStore } from '../stores/documentStore';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { useRole } from '../hooks/useRole';
import { RoleSwitcher } from './RoleSwitcher';

export function StatusBar() {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();
  const { wasOffline } = useOfflineDetection();
  const { role, config } = useRole();

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Not saved';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Offline indicator dot class: green=online, amber=offline-with-pending, grey=offline
  const offlineDotClass = isOnline
    ? (wasOffline ? 'offline-dot offline-dot--amber' : 'offline-dot offline-dot--green')
    : 'offline-dot offline-dot--grey';

  return (
    <footer className="app-status-bar">
      <div className="status-left">
        {/* Offline indicator dot: green=online, amber=back-online-with-pending, grey=offline */}
        <span
          className={offlineDotClass}
          aria-label={isOnline ? (wasOffline ? 'Back online — syncing pending edits' : 'Online') : 'Offline'}
          title={isOnline ? (wasOffline ? 'Back online — syncing pending edits' : 'Online') : 'Offline'}
        />
        <div className="status-item">
          <span className={`status-indicator ${isOnline ? '' : 'offline'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        {isSaving && (
          <div className="status-item">
            <span>Saving...</span>
          </div>
        )}
        {!isSaving && lastSaved && (
          <div className="status-item">
            <span>Saved {formatTime(lastSaved)}</span>
          </div>
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
