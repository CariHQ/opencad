/**
 * T-COL-005: EditNotifications
 *
 * A small toast-style overlay (top-right) that shows up to 3 active
 * "User X is editing Element Y" notifications. Each toast fades out after 4s.
 * Renders nothing when there are no active notifications.
 */
import React, { useState, useEffect } from 'react';
import type { EditingEntry } from '../hooks/useEditNotifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOASTS = 3;
const FADE_AFTER_MS = 4000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditNotificationsProps {
  editingMap: Map<string, EditingEntry>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditNotifications({ editingMap }: EditNotificationsProps): React.ReactElement | null {
  // Trigger re-renders every second so fade state is updated.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (editingMap.size === 0) return null;

  const entries = Array.from(editingMap.values()).slice(0, MAX_TOASTS);
  const now = Date.now();

  return (
    <div
      className="edit-notifications-container"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {entries.map((entry) => {
        const age = now - entry.timestamp;
        const isFading = age >= FADE_AFTER_MS;

        return (
          <div
            key={entry.elementId}
            className={`edit-notification-toast${isFading ? ' fading' : ''}`}
            style={{
              background: 'rgba(30, 30, 30, 0.85)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.6s ease',
              opacity: isFading ? 0 : 1,
            }}
          >
            <strong>{entry.userName}</strong>
            {' is editing '}
            <span style={{ opacity: 0.85 }}>
              {entry.elementType.charAt(0).toUpperCase() + entry.elementType.slice(1)}-{entry.elementId}
            </span>
          </div>
        );
      })}
    </div>
  );
}
