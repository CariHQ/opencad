import React from 'react';

export interface CollaboratorPresence {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number };
  activeTool: string;
}

interface PresenceOverlayProps {
  collaborators: CollaboratorPresence[];
}

export function PresenceOverlay({ collaborators }: PresenceOverlayProps) {
  return (
    <div className="presence-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {collaborators.map((c) => (
        <div
          key={c.userId}
          className="collaborator-cursor"
          style={{
            position: 'absolute',
            left: c.cursor.x,
            top: c.cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill={c.color}>
            <path d="M0 0 L0 16 L4 12 L8 20 L10 19 L6 11 L12 11 Z" />
          </svg>
          <div
            className="collaborator-label"
            style={{
              position: 'absolute',
              top: 16,
              left: 8,
              background: c.color,
              color: '#fff',
              padding: '1px 6px',
              borderRadius: 3,
              fontSize: 11,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{c.name}</span>
            <span style={{ opacity: 0.8, marginLeft: 4 }}>· {c.activeTool}</span>
          </div>
          <div
            className="collaborator-avatar"
            style={{
              position: 'absolute',
              top: -18,
              left: 8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c.color,
              color: '#fff',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            {c.name[0]?.toUpperCase()}
          </div>
        </div>
      ))}

      <div className="presence-avatar-bar" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        {collaborators.map((c) => (
          <div
            key={c.userId}
            title={c.name}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: c.color,
              color: '#fff',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              border: '2px solid #fff',
            }}
          >
            {c.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
