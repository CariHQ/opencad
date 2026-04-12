import { useDocumentStore } from '../stores/documentStore';

export function StatusBar() {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Not saved';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <footer className="app-status-bar">
      <div className="status-left">
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
            <span>{Object.keys(doc.elements).length} elements</span>
          </div>
        )}
      </div>
    </footer>
  );
}
