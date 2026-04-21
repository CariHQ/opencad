/**
 * syncAdapter — Rust WASM CRDT integration layer.
 *
 * Architecture
 * ────────────
 *  documentStore mutation
 *       │
 *       ▼
 *  crdtApplyLocal / crdtApplyProperty / crdtDeleteElement
 *       │  returns delta JSON
 *       ▼
 *  _enqueue → localStorage + immediate WS send if connected
 *       │
 *       ▼
 *  WebSocket relay  /ws/:projectId?token=...
 *       │
 *       ▼  incoming messages
 *  ┌────────────────────────────────────────────┐
 *  │ type:"sync"   → onDocumentSync callback     │
 *  │ type:"delta"  → crdtMergeRemote + onRemote  │
 *  │ type:"presence" → crdt.merge_presence       │
 *  └────────────────────────────────────────────┘
 */

// ── CRDT delta wire format (mirrors Rust Delta enum) ──────────────────────────

interface LwwEntry {
  value: unknown;
  lamport: number;
  peer_id: string;
}

type CrdtDelta =
  | { op: 'Set';     element_id: string; entry: LwwEntry }
  | { op: 'SetProp'; element_id: string; prop: string; entry: LwwEntry }
  | { op: 'Delete';  element_id: string; lamport: number; peer_id: string }
  | { op: 'Batch';   deltas: CrdtDelta[] };

/** Decoded form passed to the onRemoteDelta callback. */
export type RemoteDelta =
  | { op: 'set';     elementId: string; value: unknown }
  | { op: 'setprop'; elementId: string; prop: string; value: unknown }
  | { op: 'delete';  elementId: string };

// ── WASM DocumentCrdt type ────────────────────────────────────────────────────

interface DocumentCrdtInstance {
  apply_local(element_id: string, value_json: string): string;
  apply_property(element_id: string, prop: string, value_json: string): string;
  delete_element(element_id: string): string;
  merge_remote(delta_json: string): void;
  apply_batch(batch_json: string): void;
  state_json(): string;
  full_state_delta_json(): string;
  vector_clock(): string;
  element_count(): number;
  update_presence(x: number, y: number, element_id: string): string;
  merge_presence(presence_json: string): void;
  cursors_json(): string;
  free(): void;
}

// ── Module state ──────────────────────────────────────────────────────────────

let _crdt: DocumentCrdtInstance | null = null;
let _peerId = '';
let _outbox: string[] = [];
let _ws: WebSocket | null = null;
let _wsProjectId = '';
let _wsGetToken: (() => Promise<string | null>) | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
/** When true, incoming-remote callbacks are suppressed to break echo loops. */
let _applyingRemote = false;

// Callbacks registered by documentStore (avoids circular import)
let _onDocumentSync: ((data: string) => void) | null = null;
let _onRemoteDelta: ((delta: RemoteDelta) => void) | null = null;

const QUEUE_LS_KEY = 'crdt-delta-queue';

// ── Callback registration ─────────────────────────────────────────────────────

/**
 * Register a callback that fires when the server sends a full document sync
 * on initial WebSocket connection.
 */
export function setOnDocumentSync(fn: (data: string) => void): void {
  _onDocumentSync = fn;
}

/**
 * Register a callback that fires for each remote mutation received from a
 * connected peer.  The callback should apply the change to the document store
 * WITHOUT re-emitting to the CRDT (use `isApplyingRemote()` to guard).
 */
export function setOnRemoteDelta(fn: (delta: RemoteDelta) => void): void {
  _onRemoteDelta = fn;
}

/**
 * Returns true while a remote delta is being applied.
 * documentStore uses this to skip re-broadcasting an incoming change.
 */
export function isApplyingRemote(): boolean {
  return _applyingRemote;
}

// ── WASM initialisation ───────────────────────────────────────────────────────

/**
 * Load the Rust CRDT WASM module and create the singleton DocumentCrdt.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initSyncCrdt(peerId?: string): Promise<void> {
  if (_crdt) return;
  _peerId = peerId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : `peer-${Date.now()}`);

  try {
    type WasmMod = {
      default: (input?: unknown) => Promise<unknown>;
      DocumentCrdt: new (peerId: string) => DocumentCrdtInstance;
    };
    // Direct dynamic import — Vite resolves @opencad/sync-rs/pkg via the
    // package's `exports` map. The earlier Function(...) trick was an attempt
    // to bypass bundler analysis, but it also bypassed Vite's module
    // resolver at runtime in dev, which is why WASM never loaded.
    const mod = (await import('@opencad/sync-rs/pkg')) as unknown as WasmMod;
    await mod.default();
    _crdt = new mod.DocumentCrdt(_peerId);

    // Restore any deltas queued while offline before WASM was loaded.
    _outbox = _loadPersistedQueue();
  } catch (err) {
    console.warn('[sync] CRDT WASM failed to load — running without sync:', err);
  }
}

// ── Project connection ────────────────────────────────────────────────────────

/**
 * Connect (or reconnect) the WebSocket relay to a specific project room.
 *
 * Call this after `initSyncCrdt()` resolves and a project is opened.
 * Safe to call multiple times — an existing connection is closed first.
 *
 * @param projectId  The project UUID.
 * @param getToken   Optional async function returning a Firebase ID token.
 *                   The token is appended as `?token=` for the auth middleware.
 */
export function connectToProject(
  projectId: string,
  getToken?: () => Promise<string | null>,
): void {
  // Close existing connection to the old project (if any).
  if (_ws) {
    _ws.onclose = null; // prevent auto-reconnect on intentional close
    _ws.close();
    _ws = null;
  }
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

  _wsProjectId = projectId;
  _wsGetToken = getToken ?? null;
  void _openWs();
}

// ── Outgoing mutations ────────────────────────────────────────────────────────

/** Record a full element create or replace. */
export function crdtApplyLocal(elementId: string, value: unknown): void {
  if (!_crdt) return;
  try {
    const delta = _crdt.apply_local(elementId, JSON.stringify(value));
    _enqueue(delta);
  } catch { /* CRDT errors must never break the document write path */ }
}

/** Record a single property update (property-level LWW). */
export function crdtApplyProperty(elementId: string, prop: string, value: unknown): void {
  if (!_crdt) return;
  try {
    const delta = _crdt.apply_property(elementId, prop, JSON.stringify(value));
    _enqueue(delta);
  } catch { /* ignore */ }
}

/** Record a delete (tombstone). */
export function crdtDeleteElement(elementId: string): void {
  if (!_crdt) return;
  try {
    const delta = _crdt.delete_element(elementId);
    _enqueue(delta);
  } catch { /* ignore */ }
}

// ── Incoming / state access ───────────────────────────────────────────────────

/** Apply a delta received from a remote peer. */
export function crdtMergeRemote(deltaJson: string): void {
  _crdt?.merge_remote(deltaJson);
}

/** Apply a full-state batch (e.g. from the server on join). */
export function crdtApplyBatch(batchJson: string): void {
  _crdt?.apply_batch(batchJson);
}

/** Full serialised state — send to a newly connecting peer. */
export function crdtFullStateDelta(): string | null {
  return _crdt?.full_state_delta_json() ?? null;
}

/** Merged element state as a parsed object, or null if CRDT not ready. */
export function crdtGetState(): Record<string, unknown> | null {
  if (!_crdt) return null;
  try { return JSON.parse(_crdt.state_json()) as Record<string, unknown>; }
  catch { return null; }
}

export function crdtVectorClock(): string | null {
  return _crdt?.vector_clock() ?? null;
}

export function crdtElementCount(): number {
  return _crdt?.element_count() ?? 0;
}

export function crdtOutboxSize(): number {
  return _outbox.length;
}

export function crdtIsReady(): boolean {
  return _crdt !== null;
}

// ── Presence ──────────────────────────────────────────────────────────────────

export function crdtUpdatePresence(x: number, y: number, elementId = ''): void {
  if (!_crdt || !_ws || _ws.readyState !== WebSocket.OPEN) return;
  try {
    const presence = _crdt.update_presence(x, y, elementId);
    _ws.send(JSON.stringify({ type: 'presence', payload: presence }));
  } catch { /* ignore */ }
}

export function crdtCursors(): unknown {
  if (!_crdt) return {};
  try { return JSON.parse(_crdt.cursors_json()); }
  catch { return {}; }
}

// ── Offline flush ─────────────────────────────────────────────────────────────

/** Send all queued deltas. Call when `isOnline` transitions false → true. */
export function crdtFlushOfflineQueue(): void {
  if (!_ws || _ws.readyState !== WebSocket.OPEN || _outbox.length === 0) return;
  const batch = [..._outbox];
  _outbox = [];
  _persistQueue([]);
  for (const delta of batch) {
    try { _ws.send(JSON.stringify({ type: 'delta', payload: delta })); }
    catch { _outbox.unshift(delta); break; }
  }
}

// ── WebSocket transport ───────────────────────────────────────────────────────

async function _openWs(): Promise<void> {
  if (!_wsProjectId) return;
  // Guard against Node / SSR contexts (tests) where `window` is undefined —
  // without this, the unit test that provokes connectToProject raises an
  // unhandled rejection and flips vitest's exit code even though every
  // assertion passes, which then blocks the husky pre-commit gate.
  if (typeof window === 'undefined' || !window.location) return;

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let url = `${proto}//${window.location.host}/ws/${_wsProjectId}`;

  if (_wsGetToken) {
    try {
      const token = await _wsGetToken();
      if (token) url += `?token=${encodeURIComponent(token)}`;
    } catch { /* proceed without token (dev mode) */ }
  }

  try {
    _ws = new WebSocket(url);

    _ws.onopen = () => {
      console.info(`[sync] connected to project ${_wsProjectId}`);
      crdtFlushOfflineQueue();
    };

    _ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as {
          type: string;
          data?: string;
          version?: number;
          payload?: string;
        };

        if (msg.type === 'sync' && msg.data) {
          // Initial full document sent by the server on connect.
          _onDocumentSync?.(msg.data);
          return;
        }

        if (msg.type === 'delta' && msg.payload) {
          // Apply the CRDT delta, then notify the document store.
          _handleRemoteDelta(msg.payload);
          return;
        }

        if (msg.type === 'presence' && msg.payload && _crdt) {
          _crdt.merge_presence(msg.payload);
          return;
        }
      } catch { /* ignore malformed messages */ }
    };

    _ws.onclose = (evt) => {
      _ws = null;
      if (evt.code !== 1000 && _wsProjectId) {
        // Not a clean close — schedule reconnect.
        _reconnectTimer = setTimeout(() => { void _openWs(); }, 5000);
      }
    };

    _ws.onerror = () => { _ws?.close(); };

  } catch {
    _ws = null;
  }
}

function _handleRemoteDelta(payload: string): void {
  // Apply to CRDT first (idempotent for own echoes).
  crdtMergeRemote(payload);

  // Parse to determine the operation and originating peer.
  let delta: CrdtDelta;
  try { delta = JSON.parse(payload) as CrdtDelta; }
  catch { return; }

  // Skip own echoes — the server broadcasts back to the sender too.
  const originPeer =
    delta.op === 'Delete' ? delta.peer_id :
    delta.op === 'Batch'  ? null :
    delta.entry.peer_id;
  if (originPeer === _peerId) return;

  // Translate to RemoteDelta and dispatch.
  if (!_onRemoteDelta) return;
  _applyingRemote = true;
  try {
    _dispatchDelta(delta);
  } finally {
    _applyingRemote = false;
  }
}

function _dispatchDelta(delta: CrdtDelta): void {
  if (!_onRemoteDelta) return;
  switch (delta.op) {
    case 'Set':
      _onRemoteDelta({ op: 'set', elementId: delta.element_id, value: delta.entry.value });
      break;
    case 'SetProp':
      _onRemoteDelta({ op: 'setprop', elementId: delta.element_id, prop: delta.prop, value: delta.entry.value });
      break;
    case 'Delete':
      _onRemoteDelta({ op: 'delete', elementId: delta.element_id });
      break;
    case 'Batch':
      for (const d of delta.deltas) _dispatchDelta(d);
      break;
  }
}

// ── Queue persistence ─────────────────────────────────────────────────────────

function _enqueue(delta: string): void {
  _outbox.push(delta);
  if (_outbox.length > 500) _outbox.shift();
  _persistQueue(_outbox);
  if (_ws?.readyState === WebSocket.OPEN) {
    try {
      _ws.send(JSON.stringify({ type: 'delta', payload: delta }));
      _outbox.pop();
      _persistQueue(_outbox);
    } catch { /* stay queued */ }
  }
}

function _persistQueue(queue: string[]): void {
  try { localStorage.setItem(QUEUE_LS_KEY, JSON.stringify(queue)); }
  catch { /* ignore quota errors */ }
}

function _loadPersistedQueue(): string[] {
  try {
    const raw = localStorage.getItem(QUEUE_LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
