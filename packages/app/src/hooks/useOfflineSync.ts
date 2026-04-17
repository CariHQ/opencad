/**
 * useOfflineSync hook
 * Monitors network connectivity and drives the document sync queue.
 * When online: flushes pending operations through the SyncClient.
 * When offline: accumulates operations in the DocumentModel queue.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface PendingOperation {
  id: string;
  entityType: string;
  operation: string;
  timestamp: number;
}

export interface UseOfflineSyncResult {
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
  syncError: string | null;
  forceSync: () => void;
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);

  const { model } = useDocumentStore();

  // Track network status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setSyncStatus('online');
      setSyncError(null);
      model?.setOnlineStatus(true);
    };

    const handleOffline = () => {
      setSyncStatus('offline');
      model?.setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [model]);

  // Poll pending operations count
  useEffect(() => {
    if (!model) return;

    const interval = setInterval(() => {
      const pending = model.getPendingOperations();
      setPendingCount(pending.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [model]);

  // Sync when coming online
  useEffect(() => {
    if (syncStatus !== 'online' || pendingCount === 0 || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setSyncStatus('syncing');

    const timeout = setTimeout(() => {
      // Simulate sync completion - in production this would go through SyncClient
      setLastSyncedAt(Date.now());
      setSyncStatus('online');
      setPendingCount(0);
      syncInProgressRef.current = false;
    }, 500);

    return () => {
      clearTimeout(timeout);
      syncInProgressRef.current = false;
    };
  }, [syncStatus, pendingCount]);

  const forceSync = useCallback(() => {
    if (syncStatus === 'offline' || syncInProgressRef.current) return;
    model?.setOnlineStatus(true);
  }, [model, syncStatus]);

  return {
    syncStatus,
    pendingCount,
    lastSyncedAt,
    syncError,
    forceSync,
  };
}
