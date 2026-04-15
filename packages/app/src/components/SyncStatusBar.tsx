import React from 'react';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface SyncStatusBarProps {
  status: SyncStatus;
  pendingOps: number;
  lastSynced: number | null;
  errorMessage?: string;
}

function formatRelativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_LABELS: Record<SyncStatus, string> = {
  connected: 'Connected',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync Error',
};

export function SyncStatusBar({ status, pendingOps, lastSynced, errorMessage }: SyncStatusBarProps) {
  return (
    <div className={`sync-status-bar sync-${status}`} role="status" aria-live="polite">
      <span className={`status-dot status-dot-${status}`} aria-hidden="true" />
      <span className="status-label">{STATUS_LABELS[status]}</span>

      {status === 'error' && errorMessage && (
        <span className="status-error-msg"> — {errorMessage}</span>
      )}

      {pendingOps > 0 && (
        <span className="pending-ops">{pendingOps} pending</span>
      )}

      {status === 'connected' && lastSynced !== null && (
        <span className="last-synced">Last synced {formatRelativeTime(lastSynced)}</span>
      )}
    </div>
  );
}
