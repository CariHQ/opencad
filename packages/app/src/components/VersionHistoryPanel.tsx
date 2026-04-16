import React, { useState } from 'react';
import { History, Tag, RotateCcw } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

export function VersionHistoryPanel() {
  const { createVersion, restoreVersion, getVersionList } = useDocumentStore();
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState<number | null>(null);

  const versions = getVersionList();

  const handleCreateVersion = () => {
    createVersion(message.trim() || undefined);
    setMessage('');
  };

  const handleRestore = (versionNumber: number) => {
    setRestoring(versionNumber);
    restoreVersion(versionNumber);
    setRestoring(null);
  };

  return (
    <div className="version-history-panel">
      <div className="version-history-header">
        <History size={15} />
        <span>Version History</span>
      </div>

      <div className="version-create">
        <input
          className="version-message-input"
          placeholder="Version description (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateVersion()}
        />
        <button className="btn-create-version" onClick={handleCreateVersion}>
          <Tag size={13} />
          Save Version
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="version-empty">No saved versions yet. Click "Save Version" to create a snapshot.</p>
      ) : (
        <ul className="version-list">
          {[...versions].reverse().map((v) => (
            <li key={v.version} className="version-item">
              <div className="version-meta">
                <span className="version-number">v{v.version}</span>
                <span className="version-time">
                  {new Date(v.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {v.message && <p className="version-msg">{v.message}</p>}
              <button
                className="btn-restore-version"
                onClick={() => handleRestore(v.version)}
                disabled={restoring === v.version}
                title={`Restore to v${v.version}`}
              >
                <RotateCcw size={12} />
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
