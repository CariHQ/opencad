/**
 * VersionHistoryPanel — shows saved version snapshots and change tracking history.
 * T-UI-013: Version snapshots
 * T-HIST-001: Change tracking
 */
import React, { useState } from 'react';
import { Tag, RotateCcw } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import type { ChangeRecord } from '../stores/documentStore';

const CHANGE_DISPLAY_LIMIT = 50;

export function VersionHistoryPanel() {
  const { createVersion, restoreVersion, getVersionList, changeHistory } = useDocumentStore();
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState<number | null>(null);

  const versions = getVersionList();
  const recentChanges = (changeHistory ?? []).slice(-CHANGE_DISPLAY_LIMIT);

  const handleCreateVersion = () => {
    createVersion(message.trim() || undefined);
    setMessage('');
  };

  const handleRestore = (versionNumber: number) => {
    setRestoring(versionNumber);
    restoreVersion(versionNumber);
    setRestoring(null);
  };

  function verbFor(record: ChangeRecord): string {
    if (record.type === 'add') return 'added';
    if (record.type === 'update') return 'updated';
    return 'deleted';
  }

  return (
    <div className="version-history-panel">
      <div className="panel-header">
        <span className="panel-title">Version History</span>
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
        <p className="version-empty">No saved versions yet. Click &quot;Save Version&quot; to create a snapshot.</p>
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

      {/* T-HIST-001: Change tracking history */}
      <div className="panel-header" style={{ marginTop: '16px' }}>
        <span className="panel-title">Change History</span>
      </div>

      {recentChanges.length === 0 ? (
        <p className="version-empty">No changes recorded yet.</p>
      ) : (
        <ul
          className="change-history-list"
          style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', maxHeight: '300px' }}
        >
          {recentChanges.map((record) => {
            const time = new Date(record.timestamp).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <li
                key={record.id}
                className="change-record-item"
                data-testid={`change-record-${record.id}`}
                style={{
                  fontSize: '0.8em',
                  padding: '3px 0',
                  borderBottom: '1px solid var(--border-color, #333)',
                }}
              >
                <span className="change-time" style={{ opacity: 0.6 }}>[{time}]</span>{' '}
                <span className="change-user">{record.userId}</span>{' '}
                <span className={`change-verb change-verb-${record.type}`}>{verbFor(record)}</span>{' '}
                <span className="change-element-type">{record.elementType}</span>{' '}
                <span className="change-element-id" style={{ opacity: 0.7 }}>({record.elementId})</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
