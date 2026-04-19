/**
 * T-COL-005: useEditNotifications
 *
 * Subscribes to `editNotification` WebSocket events and maintains a map of
 * currently-being-edited elements. Broadcasts when the local user
 * starts/stops editing (on selectedIds change + activeTool !== 'select').
 * Auto-clears stale entries after 5 seconds.
 */
import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditNotificationMessage {
  type: 'editNotification';
  userId: string;
  userName: string;
  elementId: string;
  elementType: string;
  action: 'start' | 'stop';
}

export interface EditingEntry {
  userId: string;
  userName: string;
  elementId: string;
  elementType: string;
  timestamp: number;
}

export interface UseEditNotificationsOptions {
  /** A ref pointing to an active WebSocket (may be null when disconnected). */
  wsRef: React.RefObject<WebSocket | null>;
  /** Local user id — used to broadcast this user's edit events. */
  localUserId?: string;
  /** Local user display name — used to broadcast this user's edit events. */
  localUserName?: string;
  /** Currently selected element ids in the document store. */
  selectedIds?: string[];
  /** Active drawing tool in the document store. */
  activeTool?: string;
  /** How long (ms) before a stale notification is cleared (default: 5000). */
  staleAfterMs?: number;
}

export interface UseEditNotificationsResult {
  editingMap: Map<string, EditingEntry>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const STALE_AFTER_MS = 5000;

export function useEditNotifications({
  wsRef,
  localUserId,
  localUserName,
  selectedIds = [],
  activeTool = 'select',
  staleAfterMs = STALE_AFTER_MS,
}: UseEditNotificationsOptions): UseEditNotificationsResult {
  const [editingMap, setEditingMap] = useState<Map<string, EditingEntry>>(new Map());

  // Keep a ref to the previous selectedIds so we can detect which ids were
  // removed (stop editing) vs added (start editing) across renders.
  const prevSelectedIdsRef = useRef<string[]>([]);

  // --------------------------------------------------------------------------
  // Subscribe to incoming WebSocket editNotification messages
  // --------------------------------------------------------------------------
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handleMessage = (event: MessageEvent): void => {
      let msg: unknown;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (
        !msg ||
        typeof msg !== 'object' ||
        (msg as Record<string, unknown>)['type'] !== 'editNotification'
      ) {
        return;
      }

      const notification = msg as EditNotificationMessage;

      if (notification.action === 'start') {
        const entry: EditingEntry = {
          userId: notification.userId,
          userName: notification.userName,
          elementId: notification.elementId,
          elementType: notification.elementType,
          timestamp: Date.now(),
        };
        setEditingMap((prev) => {
          const next = new Map(prev);
          next.set(notification.elementId, entry);
          return next;
        });
      } else {
        // action === 'stop'
        setEditingMap((prev) => {
          if (!prev.has(notification.elementId)) return prev;
          const next = new Map(prev);
          next.delete(notification.elementId);
          return next;
        });
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [wsRef]);

  // --------------------------------------------------------------------------
  // Broadcast local user's edit events on selectedIds / activeTool change
  // --------------------------------------------------------------------------
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      prevSelectedIdsRef.current = selectedIds;
      return;
    }
    if (!localUserId || !localUserName) {
      prevSelectedIdsRef.current = selectedIds;
      return;
    }

    const prev = prevSelectedIdsRef.current;
    const prevSet = new Set(prev);
    const currSet = new Set(selectedIds);

    // Ids that just appeared — broadcast start (only when activeTool !== 'select')
    if (activeTool !== 'select') {
      for (const id of currSet) {
        if (!prevSet.has(id)) {
          const msg: EditNotificationMessage = {
            type: 'editNotification',
            userId: localUserId,
            userName: localUserName,
            elementId: id,
            elementType: 'element',
            action: 'start',
          };
          ws.send(JSON.stringify(msg));
        }
      }
    }

    // Ids that just disappeared — always broadcast stop
    for (const id of prevSet) {
      if (!currSet.has(id)) {
        const msg: EditNotificationMessage = {
          type: 'editNotification',
          userId: localUserId,
          userName: localUserName,
          elementId: id,
          elementType: 'element',
          action: 'stop',
        };
        ws.send(JSON.stringify(msg));
      }
    }

    prevSelectedIdsRef.current = selectedIds;
  }, [selectedIds, activeTool, localUserId, localUserName, wsRef]);

  // --------------------------------------------------------------------------
  // Auto-clear stale notifications every second
  // --------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - staleAfterMs;
      setEditingMap((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, entry] of next) {
          if (entry.timestamp < cutoff) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [staleAfterMs]);

  return { editingMap };
}
