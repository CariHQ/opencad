import React from 'react';
import { useDocumentStore } from '../stores/documentStore';

export function StatusBar() {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Not saved';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="status-bar">
      <div className="status-section">
        <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {isSaving && <span className="status-saving">Saving...</span>}
        {!isSaving && lastSaved && (
          <span className="status-saved">Saved {formatTime(lastSaved)}</span>
        )}
      </div>

      <div className="status-section center">
        {selectedIds.length > 0 && (
          <span>
            {selectedIds.length} element{selectedIds.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      <div className="status-section right">
        {doc && (
          <span>
            {Object.keys(doc.elements).length} elements | {Object.keys(doc.layers).length} layers
          </span>
        )}
      </div>
    </div>
  );
}
