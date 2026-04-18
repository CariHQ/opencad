/**
 * syncAdapter — Rust WASM CRDT integration layer.
 *
 * This module owns the singleton DocumentCrdt instance and exposes thin
 * wrappers that documentStore calls on every mutation.  The adapter queues
 * outgoing deltas for broadcast and is ready to connect to a WebSocket relay
 * when one is configured.
 *
 * Architecture
 * ────────────
 *  documentStore mutation
 *       │
 *       ▼
 *  crdtApplyLocal / crdtApplyProperty / crdtDeleteElement
 *       │  returns delta JSON
 *       ▼
 *  _outbox (in-memory queue)  →  persisted to IndexedDB via _persistQueue()
 *       │
 *       ▼
 *  WebSocket relay  (no-op until WS_URL env var is set)
 *       │
 *       ▼
 *  remote peers call mergeRemote() via incoming WS messages
 */

// ── Types mirroring the WASM DocumentCrdt API ─────────────────────────────────

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
let _outbox: string[] = [];        // deltas waiting to be sent
let _ws: WebSocket | null = null;

const QUEUE_IDB_KEY = 'crdt-delta-queue';
const WS_URL: string = (import.meta.env['VITE_SYNC_WS_URL'] as string | undefined) ?? '';

// ── WASM initialisation ───────────────────────────────────────────────────────

/**
 * Load the Rust CRDT WASM module and create the singleton DocumentCrdt.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @param peerId  Globally-unique client ID (defaults to a random UUID).
 */
export async function initSyncCrdt(peerId?: string): Promise<void> {
  if (_crdt) return;
  _peerId = peerId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : `peer-${Date.now()}`);

  try {
    // Same pattern as useGeometryBuilder — indirect import to avoid bundler
    // static analysis from choking on the WASM URL at build time.
    const wasmPkg = '@opencad/sync-rs/pkg';
    type WasmMod = {
      default: (input?: unknown) => Promise<void>;
      DocumentCrdt: new (peerId: string) => DocumentCrdtInstance;
    };
    const mod = await (Function('s', 'return import(s)')(wasmPkg) as Promise<WasmMod>);
    await mod.default();
    _crdt = new mod.DocumentCrdt(_peerId);

    // Restore any persisted offline queue
    _outbox = _loadPersistedQueue();

    // Connect WebSocket if a relay URL is configured
    if (WS_URL) _connectWs();
  } catch (err) {
    console.warn('[sync] CRDT WASM failed to load — running without sync:', err);
  }
}

// ── Outgoing mutations ────────────────────────────────────────────────────────

/** Record a full element create or replace. */
export function crdtApplyLocal(elementId: string, value: unknown): void {
  if (!_crdt) return;
  try {
    const delta = _crdt.apply_local(elementId, JSON.stringify(value));
    _enqueue(delta);
  } catch { /* ignore — CRDT errors must not break the main document path */ }
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

/** Full serialised state for sending to a newly connecting peer. */
export function crdtFullStateDelta(): string | null {
  return _crdt?.full_state_delta_json() ?? null;
}

/** Merged element state as a parsed object, or null if CRDT not ready. */
export function crdtGetState(): Record<string, unknown> | null {
  if (!_crdt) return null;
  try {
    return JSON.parse(_crdt.state_json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Vector clock JSON for conflict detection. */
export function crdtVectorClock(): string | null {
  return _crdt?.vector_clock() ?? null;
}

/** Number of live (non-deleted) elements tracked by the CRDT. */
export function crdtElementCount(): number {
  return _crdt?.element_count() ?? 0;
}

/** Number of deltas waiting to be sent. */
export function crdtOutboxSize(): number {
  return _outbox.length;
}

/** True once the WASM module has been loaded and the CRDT is ready. */
export function crdtIsReady(): boolean {
  return _crdt !== null;
}

// ── Presence ──────────────────────────────────────────────────────────────────

/** Broadcast local cursor position to peers. */
export function crdtUpdatePresence(x: number, y: number, elementId = ''): void {
  if (!_crdt || !_ws || _ws.readyState !== WebSocket.OPEN) return;
  try {
    const presence = _crdt.update_presence(x, y, elementId);
    _ws.send(JSON.stringify({ type: 'presence', payload: presence }));
  } catch { /* ignore */ }
}

/** Current peer cursors as parsed JSON (for rendering collaborator cursors). */
export function crdtCursors(): unknown {
  if (!_crdt) return {};
  try {
    return JSON.parse(_crdt.cursors_json());
  } catch {
    return {};
  }
}

// ── Offline flush ─────────────────────────────────────────────────────────────

/**
 * Attempt to send all queued deltas over the WebSocket.
 * Call this when `isOnline` transitions false → true.
 */
export function crdtFlushOfflineQueue(): void {
  if (!_ws || _ws.readyState !== WebSocket.OPEN || _outbox.length === 0) return;
  const batch = [..._outbox];
  _outbox = [];
  _persistQueue([]);
  for (const delta of batch) {
    try { _ws.send(JSON.stringify({ type: 'delta', payload: delta })); }
    catch { _outbox.unshift(delta); break; } // re-queue on send failure
  }
}

// ── WebSocket transport ───────────────────────────────────────────────────────

function _connectWs(): void {
  if (!WS_URL) return;
  try {
    _ws = new WebSocket(WS_URL);
    _ws.onopen = () => { crdtFlushOfflineQueue(); };
    _ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type: string; payload: string };
        if (msg.type === 'delta') crdtMergeRemote(msg.payload);
        else if (msg.type === 'batch') crdtApplyBatch(msg.payload);
        else if (msg.type === 'presence' && _crdt) _crdt.merge_presence(msg.payload);
      } catch { /* ignore malformed messages */ }
    };
    _ws.onclose = () => {
      _ws = null;
      // Reconnect after 5 s
      setTimeout(_connectWs, 5000);
    };
    _ws.onerror = () => { _ws?.close(); };
  } catch {
    _ws = null;
  }
}

// ── Queue persistence (localStorage) ─────────────────────────────────────────

function _enqueue(delta: string): void {
  _outbox.push(delta);
  if (_outbox.length > 500) _outbox.shift(); // cap to prevent unbounded growth
  _persistQueue(_outbox);
  // Attempt immediate send if connected
  if (_ws?.readyState === WebSocket.OPEN) {
    try { _ws.send(JSON.stringify({ type: 'delta', payload: delta })); _outbox.pop(); }
    catch { /* stay queued */ }
  }
}

function _persistQueue(queue: string[]): void {
  try {
    localStorage.setItem(QUEUE_IDB_KEY, JSON.stringify(queue));
  } catch { /* ignore storage quota errors */ }
}

function _loadPersistedQueue(): string[] {
  try {
    const raw = localStorage.getItem(QUEUE_IDB_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
