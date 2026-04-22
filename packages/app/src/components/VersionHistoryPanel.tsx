/**
 * VersionHistoryPanel — server-persisted version snapshots + in-session
 * change history.
 *
 * T-UI-013 / T-HIST-001: previously this panel used only the documentStore's
 * in-memory version list, so saved versions died with the browser tab and
 * didn't follow the user across devices. Now:
 *   - createVersion writes to `/api/v1/projects/:id/versions` on the
 *     server and also records a local entry so the list updates instantly.
 *   - The visible list is the merged server + local list, de-duped by
 *     version_number (server wins).
 *   - Restore reads the server version's serialized document and feeds
 *     it into documentStore.loadDocumentSchema. Falls back to local
 *     restoreVersion when offline or for session-only entries.
 *   - Change history (recent element edits) is still derived from the
 *     local documentStore — that's a separate stream and still useful.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Tag, RotateCcw, CloudOff, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DocumentSchema } from '@opencad/document';
import { useDocumentStore } from '../stores/documentStore';
import type { ChangeRecord } from '../stores/documentStore';
import { versionsApi, type ServerVersionInfo } from '../lib/serverApi';

const CHANGE_DISPLAY_LIMIT = 50;

interface MergedVersion {
  key: string;
  /** Sequential version number — from server when available, else local. */
  version: number;
  timestamp: number;
  message?: string;
  source: 'server' | 'local';
  /** Server row id needed to fetch the payload on restore. */
  serverId?: string;
}

export function VersionHistoryPanel(): React.ReactElement {
  const { t } = useTranslation('panels');
  const {
    document: doc,
    createVersion,
    restoreVersion,
    getVersionList,
    loadDocumentSchema,
    changeHistory,
  } = useDocumentStore();

  const [serverVersions, setServerVersions] = useState<ServerVersionInfo[]>([]);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState<boolean>(true);

  // Fetch the server-side version list on mount / when the project changes.
  const refreshServer = useCallback(async (projectId: string): Promise<void> => {
    try {
      const rows = await versionsApi.list(projectId);
      setServerVersions(rows);
      setOnline(true);
    } catch {
      // Offline or 404 — fall back to local versions only.
      setServerVersions([]);
      setOnline(false);
    }
  }, []);
  useEffect(() => {
    if (!doc?.id) return;
    void refreshServer(doc.id);
  }, [doc?.id, refreshServer]);

  const localVersions = getVersionList();
  const recentChanges = (changeHistory ?? []).slice(-CHANGE_DISPLAY_LIMIT);

  /** Merge server + local by version_number. Server wins on collisions. */
  const merged: MergedVersion[] = React.useMemo(() => {
    const byNumber = new Map<number, MergedVersion>();
    for (const v of localVersions) {
      byNumber.set(v.version, {
        key: `local-${v.version}`,
        version: v.version,
        timestamp: v.timestamp,
        message: v.message,
        source: 'local',
      });
    }
    for (const v of serverVersions) {
      byNumber.set(v.version_number, {
        key: `server-${v.id}`,
        version: v.version_number,
        timestamp: new Date(v.created_at).getTime(),
        message: v.message ?? undefined,
        source: 'server',
        serverId: v.id,
      });
    }
    return [...byNumber.values()].sort((a, b) => b.version - a.version);
  }, [localVersions, serverVersions]);

  const handleCreateVersion = async (): Promise<void> => {
    if (!doc) return;
    setSaving(true);
    try {
      // Local first so the list updates instantly even if the server is
      // slow or offline.
      createVersion(message.trim() || undefined);
      if (doc.id) {
        try {
          await versionsApi.create(doc.id, JSON.stringify(doc), message.trim() || undefined);
          await refreshServer(doc.id);
          setOnline(true);
        } catch {
          setOnline(false);
        }
      }
      setMessage('');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (v: MergedVersion): Promise<void> => {
    if (!doc) return;
    setRestoring(v.key);
    try {
      if (v.source === 'server' && v.serverId) {
        // Pull the full payload and feed it to the documentStore.
        const full = await versionsApi.get(doc.id, v.serverId);
        try {
          const parsed = JSON.parse(full.data) as DocumentSchema;
          loadDocumentSchema(parsed);
        } catch {
          // Bad payload — fall back to local restore.
          restoreVersion(v.version);
        }
      } else {
        restoreVersion(v.version);
      }
    } finally {
      setRestoring(null);
    }
  };

  function verbFor(record: ChangeRecord): string {
    if (record.type === 'add') return 'added';
    if (record.type === 'update') return 'updated';
    return 'deleted';
  }

  return (
    <div className="version-history-panel">
      <div className="panel-header">
        <span className="panel-title">{t('version.title')}</span>
        <span
          className={`version-sync-badge${online ? ' online' : ' offline'}`}
          title={online ? t('version.syncedTitle') : t('version.offlineTitle')}
        >
          {online ? <Cloud size={12} /> : <CloudOff size={12} />}
        </span>
      </div>

      <div className="version-create">
        <input
          className="version-message-input"
          placeholder={t('version.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !saving) void handleCreateVersion();
          }}
          disabled={saving}
        />
        <button
          className="btn-create-version"
          onClick={() => void handleCreateVersion()}
          disabled={saving || !doc}
        >
          <Tag size={13} />
          {saving ? t('version.saving') : t('version.save')}
        </button>
      </div>

      {merged.length === 0 ? (
        <p className="version-empty">{t('version.empty')}</p>
      ) : (
        <ul className="version-list">
          {merged.map((v) => (
            <li key={v.key} className="version-item">
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
                <span
                  className={`version-source version-source--${v.source}`}
                  title={v.source === 'server' ? t('version.onServer') : t('version.localOnly')}
                >
                  {v.source === 'server' ? <Cloud size={10} /> : <CloudOff size={10} />}
                </span>
              </div>
              {v.message && <p className="version-msg">{v.message}</p>}
              <button
                className="btn-restore-version"
                onClick={() => void handleRestore(v)}
                disabled={restoring === v.key}
                title={t('version.restoreTo', { version: v.version })}
              >
                <RotateCcw size={12} />
                {restoring === v.key ? t('version.restoring') : t('version.restore')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* T-HIST-001: Change tracking history */}
      <div className="panel-header" style={{ marginTop: '16px' }}>
        <span className="panel-title">{t('version.changeHistory')}</span>
      </div>

      {recentChanges.length === 0 ? (
        <p className="version-empty">{t('version.noChanges')}</p>
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
