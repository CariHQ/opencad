/**
 * Sync Client
 *
 * Module-level WebSocket singleton that connects the browser (or Tauri webview)
 * to the OpenCAD cloud sync server.
 *
 * URL: ws://localhost:47821/ws/:projectId  (override via VITE_SERVER_URL)
 *
 * Architecture:
 *   - connectToLocalSync(projectId, token?)  — open / reuse the WS and join a project room
 *   - broadcastDocumentUpdate(...)           — send a document snapshot to the server
 *   - setRemoteUpdateHandler(cb)             — receive document snapshots from other clients
 *
 * Auth: pass the Firebase ID token as the second argument.  It is appended as
 *   `?token=<jwt>` because browsers cannot set headers on WebSocket connections.
 *
 * Echo prevention: every outgoing update carries our unique `senderId`.
 * Incoming updates with the same senderId are silently ignored.
 *
 * Reconnect: automatic 3-second retry on close (unless explicitly disconnected).
 */

import { SERVER_WS_URL } from '../lib/serverApi';

// Stable per-session identity — used to filter our own echoes from the server.
const _clientId: string =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Module state ─────────────────────────────────────────────────────────────

let _ws: WebSocket | null = null;
let _projectId: string | null = null;
let _token: string | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

type RemoteUpdateHandler = (data: string) => void;

let _onRemoteUpdate: RemoteUpdateHandler | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export function setRemoteUpdateHandler(handler: RemoteUpdateHandler): void {
  _onRemoteUpdate = handler;
}

/**
 * Connect to the local sync server and join the given project room.
 * If already connected to the same project, this is a no-op.
 * Switching to a different project closes the old connection first.
 *
 * @param projectId  UUID of the project room to join.
 * @param token      Optional Firebase ID token.  Passed as `?token=<jwt>` in
 *                   the WebSocket URL since browsers cannot set auth headers.
 */
export function connectToLocalSync(projectId: string, token?: string | null): void {
  // Already connected (or connecting) to the same project — no-op.
  if (
    _ws &&
    _projectId === projectId &&
    (_ws.readyState === _wsConst('OPEN') || _ws.readyState === _wsConst('CONNECTING'))
  ) {
    return;
  }

  // Switching projects — close existing connection without triggering reconnect.
  if (_ws) {
    _ws.onclose = null;
    _ws.close();
    _ws = null;
  }

  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

  _projectId = projectId;
  _token = token ?? null;

  _openWebSocket(projectId, token ?? null);
}

function _openWebSocket(projectId: string, token: string | null): void {
  const url = token
    ? `${SERVER_WS_URL}/ws/${projectId}?token=${encodeURIComponent(token)}`
    : `${SERVER_WS_URL}/ws/${projectId}`;

  try {
    _ws = new WebSocket(url);
  } catch {
    // WebSocket constructor can throw in non-browser environments.
    return;
  }

  _ws.onopen = () => {
    // Server sends the current document immediately on connect — no explicit join needed.
  };

  _ws.onmessage = (event: MessageEvent) => {
    _handleIncoming(event.data as string);
  };

  // Intentional noop — errors always trigger onclose.
  _ws.onerror = () => {};

  _ws.onclose = () => {
    // Schedule reconnect unless we were explicitly disconnected.
    if (_projectId !== null) {
      _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        if (_projectId !== null) {
          connectToLocalSync(_projectId, _token);
        }
      }, 3000);
    }
  };
}

/**
 * Permanently disconnect from the sync server.
 * Cancels any pending reconnect timer.
 */
export function disconnectLocalSync(): void {
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_ws) {
    _ws.onclose = null; // prevent reconnect loop
    _ws.close();
    _ws = null;
  }
  _projectId = null;
  _token = null;
}

/**
 * Broadcast a full document snapshot to the server (and thus to all other
 * connected clients).  Attaches our `senderId` so the server can broadcast it
 * and we can ignore our own echo on receipt.
 */
export function broadcastDocumentUpdate(projectId: string, data: string): void {
  if (!_ws || _ws.readyState !== _wsConst('OPEN') || _projectId !== projectId) {
    return;
  }
  // Wrap in an envelope so the server can echo back to other clients.
  // The `senderId` lets us skip our own echo on receipt.
  _ws.send(JSON.stringify({ type: 'update', senderId: _clientId, data }));
}

/** Returns the current connection status. */
export function getSyncStatus(): 'connected' | 'connecting' | 'disconnected' {
  if (!_ws) return 'disconnected';
  if (_ws.readyState === _wsConst('OPEN')) return 'connected';
  if (_ws.readyState === _wsConst('CONNECTING')) return 'connecting';
  return 'disconnected';
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _handleIncoming(raw: string): void {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  const type = msg['type'] as string | undefined;

  if ((type === 'sync' || type === 'update') && msg['data']) {
    // Echo prevention: ignore updates that originated from this client.
    if (type === 'update' && (msg['senderId'] as string) === _clientId) {
      return;
    }
    _onRemoteUpdate?.(msg['data'] as string);
    return;
  }
}

/**
 * Read a WebSocket static constant safely — works with both the native browser
 * WebSocket and mock implementations injected in tests.
 */
function _wsConst(name: 'OPEN' | 'CONNECTING' | 'CLOSING' | 'CLOSED'): number {
  const map: Record<string, number> = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };
  // Prefer the static property on the constructor (mocks set it there).
  const ctor = typeof WebSocket !== 'undefined' ? WebSocket : null;
  if (ctor && typeof (ctor as unknown as Record<string, unknown>)[name] === 'number') {
    return (ctor as unknown as Record<string, number>)[name];
  }
  return map[name] ?? 0;
}

// ─── Test utilities ───────────────────────────────────────────────────────────

/** Reset all module state.  Call this in test afterEach to prevent leakage. */
export function _resetForTest(): void {
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  _ws = null;
  _projectId = null;
  _token = null;
  _onRemoteUpdate = null;
}
