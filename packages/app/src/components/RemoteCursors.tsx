/**
 * RemoteCursors — overlay that renders each remote peer's cursor pointer
 * on top of the viewport. Coordinates come from crdtCursors() which is
 * kept fresh by incoming `presence` WebSocket messages (see syncAdapter).
 *
 * Presence is ephemeral — absence of cursor entries or of a WebSocket
 * connection silently renders nothing, so this component is safe to
 * mount even in offline / solo-user sessions.
 */
import { useEffect, useState } from 'react';
import { crdtCursors } from '../lib/syncAdapter';

interface RemoteCursor {
  peerId: string;
  x: number;
  y: number;
  elementId: string | null;
}

/**
 * Deterministic HSL color per peer. Same peer id always gets the same
 * color across sessions so you can recognise collaborators at a glance.
 */
function peerColor(peerId: string): string {
  let hash = 0;
  for (let i = 0; i < peerId.length; i++) {
    hash = (hash << 5) - hash + peerId.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}

function peerLabel(peerId: string): string {
  return peerId.length <= 8 ? peerId : `${peerId.slice(0, 8)}…`;
}

export function RemoteCursors() {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const tick = () => {
      const raw = crdtCursors() as Record<
        string,
        { x: number; y: number; element_id: string | null; seq: number } | undefined
      >;
      const list: RemoteCursor[] = [];
      for (const [peerId, c] of Object.entries(raw)) {
        if (!c) continue;
        list.push({
          peerId,
          x: c.x,
          y: c.y,
          elementId: c.element_id ?? null,
        });
      }
      setCursors(list);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  if (cursors.length === 0) return null;

  return (
    <div className="remote-cursors" aria-hidden="true">
      {cursors.map((c) => (
        <div
          key={c.peerId}
          className="remote-cursor"
          style={{
            transform: `translate(${c.x}px, ${c.y}px)`,
            color: peerColor(c.peerId),
          }}
        >
          <svg
            width="18"
            height="20"
            viewBox="0 0 18 20"
            className="remote-cursor-arrow"
            style={{ fill: peerColor(c.peerId) }}
          >
            <path d="M2 2 L2 16 L6 12 L8 18 L11 17 L9 11 L14 11 Z" />
          </svg>
          <span
            className="remote-cursor-label"
            style={{ background: peerColor(c.peerId) }}
          >
            {peerLabel(c.peerId)}
          </span>
        </div>
      ))}
    </div>
  );
}
