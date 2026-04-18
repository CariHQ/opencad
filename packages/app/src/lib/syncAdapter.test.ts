/**
 * syncAdapter.test.ts
 *
 * T-COL-001: CRDT offline queue persistence
 * T-COL-002: WebSocket reconnect
 * T-COL-003: Remote delta application
 * T-COL-004: Offline flush on reconnect
 * T-COL-005: isApplyingRemote guard
 * T-COL-006: Presence
 * T-COL-007: State accessors (CRDT not ready)
 * T-COL-008: Callback registration
 *
 * Mocking strategy
 * ─────────────────
 * syncAdapter.ts loads the WASM module via:
 *   Function('s', 'return import(s)')('@opencad/sync-rs/pkg')
 * This bypasses vi.mock() static analysis.  We intercept it by temporarily
 * replacing globalThis.Function so that the body 'return import(s)' is
 * detected and a factory returning our mock module is returned instead.
 *
 * Because vitest 4.x requires constructor mocks to be real functions/classes
 * (not arrow-function vi.fn()), we build the DocumentCrdt stub as a class.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Flush the microtask queue (equivalent to vi.runAllMicrotasksAsync in vitest >=4.2). */
const flushMicrotasks = () => new Promise<void>((resolve) => { queueMicrotask(resolve); });

// ── localStorage mock ─────────────────────────────────────────────────────────

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem:    vi.fn((key: string): string | null => store[key] ?? null),
    setItem:    vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear:      vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key:        vi.fn((i: number): string | null => Object.keys(store)[i] ?? null),
    /** Direct access for test setup. */
    _store: store,
  };
}

// ── WebSocket mock ────────────────────────────────────────────────────────────

interface WsInstance {
  url: string;
  readyState: number;
  sent: string[];
  onopen: ((evt: Event) => void) | null;
  onmessage: ((evt: MessageEvent) => void) | null;
  onclose: ((evt: CloseEvent) => void) | null;
  onerror: ((evt: Event) => void) | null;
  send(data: string): void;
  close(code?: number): void;
  simulateOpen(): void;
  simulateMessage(data: unknown): void;
  simulateAbnormalClose(code?: number): void;
}

function createWebSocketMock() {
  const instances: WsInstance[] = [];

  // Must be a real class (not arrow) so syncAdapter can call `new WebSocket(url)`.
  class MockWS {
    static CONNECTING = 0 as const;
    static OPEN       = 1 as const;
    static CLOSING    = 2 as const;
    static CLOSED     = 3 as const;

    readonly url: string;
    readyState = MockWS.OPEN;
    sent: string[] = [];
    onopen:    ((evt: Event)       => void) | null = null;
    onmessage: ((evt: MessageEvent) => void) | null = null;
    onclose:   ((evt: CloseEvent)  => void) | null = null;
    onerror:   ((evt: Event)       => void) | null = null;

    constructor(url: string) {
      this.url = url;
      instances.push(this as unknown as WsInstance);
    }

    send(data: string) { this.sent.push(data); }

    close(code = 1000) {
      this.readyState = MockWS.CLOSED;
      this.onclose?.({ code, reason: '', wasClean: code === 1000 } as CloseEvent);
    }

    simulateOpen() {
      this.readyState = MockWS.OPEN;
      this.onopen?.(new Event('open'));
    }

    simulateMessage(data: unknown) {
      this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
    }

    simulateAbnormalClose(code = 1006) {
      this.readyState = MockWS.CLOSED;
      this.onclose?.({ code, reason: '', wasClean: false } as CloseEvent);
    }
  }

  return { MockWS, instances };
}

// ── CRDT mock ─────────────────────────────────────────────────────────────────

interface CrdtMock {
  apply_local:          ReturnType<typeof vi.fn>;
  apply_property:       ReturnType<typeof vi.fn>;
  delete_element:       ReturnType<typeof vi.fn>;
  merge_remote:         ReturnType<typeof vi.fn>;
  apply_batch:          ReturnType<typeof vi.fn>;
  state_json:           ReturnType<typeof vi.fn>;
  full_state_delta_json: ReturnType<typeof vi.fn>;
  vector_clock:         ReturnType<typeof vi.fn>;
  element_count:        ReturnType<typeof vi.fn>;
  update_presence:      ReturnType<typeof vi.fn>;
  merge_presence:       ReturnType<typeof vi.fn>;
  cursors_json:         ReturnType<typeof vi.fn>;
  free:                 ReturnType<typeof vi.fn>;
}

function makeCrdtMock(peerId: string): CrdtMock {
  return {
    apply_local:  vi.fn().mockReturnValue(
      `{"op":"Set","element_id":"e1","entry":{"value":{},"lamport":1,"peer_id":"${peerId}"}}`,
    ),
    apply_property: vi.fn().mockReturnValue(
      `{"op":"SetProp","element_id":"e1","prop":"x","entry":{"value":10,"lamport":2,"peer_id":"${peerId}"}}`,
    ),
    delete_element: vi.fn().mockReturnValue(
      `{"op":"Delete","element_id":"e1","lamport":3,"peer_id":"${peerId}"}`,
    ),
    merge_remote:          vi.fn(),
    apply_batch:           vi.fn(),
    state_json:            vi.fn().mockReturnValue('{}'),
    full_state_delta_json: vi.fn().mockReturnValue('{"op":"Batch","deltas":[]}'),
    vector_clock:          vi.fn().mockReturnValue('{}'),
    element_count:         vi.fn().mockReturnValue(0),
    update_presence:       vi.fn().mockReturnValue('{"x":1,"y":2}'),
    merge_presence:        vi.fn(),
    cursors_json:          vi.fn().mockReturnValue('{}'),
    free:                  vi.fn(),
  };
}

// ── importAdapterWithCrdt ─────────────────────────────────────────────────────

/**
 * Reset modules, monkey-patch globalThis.Function so that the `return import(s)`
 * factory used inside initSyncCrdt returns our mock WASM package, then import a
 * fresh copy of syncAdapter and call initSyncCrdt.
 *
 * We build the DocumentCrdt stub as a plain `function` constructor so that
 * `new DocumentCrdt(peerId)` works correctly (vitest 4.x rejects arrow mocks
 * used as constructors).
 */
async function importAdapterWithCrdt(peerId = 'test-peer') {
  vi.resetModules();

  const crdtMock = makeCrdtMock(peerId);
  const OriginalFunction = globalThis.Function;

  // Build a real function-constructor that returns the crdtMock.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const DocumentCrdtStub = function (this: unknown) {
    Object.assign(this as object, crdtMock);
  } as unknown as new (id: string) => CrdtMock;

  const mockWasmModule = {
    default: vi.fn().mockResolvedValue(undefined),
    DocumentCrdt: DocumentCrdtStub,
  };

  // Intercept the specific Function('s','return import(s)') call used by the adapter.
  const patchedFunction = function (...args: unknown[]) {
    const body = args[args.length - 1] as string;
    if (typeof body === 'string' && body.includes('return import(s)')) {
      // Return a no-arg function that resolves with our mock module.
      return () => Promise.resolve(mockWasmModule);
    }
    // Fall through to the real Function for everything else.
    // @ts-expect-error – we intentionally call with unknown args
    return OriginalFunction(...args);
  } as unknown as typeof Function;

  // Copy over all static properties of Function.
  Object.setPrototypeOf(patchedFunction, OriginalFunction);
  Object.assign(patchedFunction, OriginalFunction);
  globalThis.Function = patchedFunction;

  let mod: typeof import('./syncAdapter');
  try {
    mod = await import('./syncAdapter');
    await mod.initSyncCrdt(peerId);
  } finally {
    globalThis.Function = OriginalFunction;
  }

  return { mod, crdtMock };
}

// ── Shared test state ─────────────────────────────────────────────────────────

let lsMock: ReturnType<typeof createLocalStorageMock>;
let wsMockFactory: ReturnType<typeof createWebSocketMock>;

beforeEach(() => {
  vi.useFakeTimers();

  lsMock = createLocalStorageMock();
  vi.stubGlobal('localStorage', lsMock);

  wsMockFactory = createWebSocketMock();
  vi.stubGlobal('WebSocket', wsMockFactory.MockWS);

  // Stub window.location so _openWs URL construction doesn't throw.
  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis.window,
      location: { protocol: 'http:', host: 'localhost:5173' },
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-001: CRDT offline queue persistence
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-001: CRDT offline queue persistence', () => {
  it('T-COL-001-001: persists delta to localStorage when WebSocket is not connected', async () => {
    const { mod } = await importAdapterWithCrdt();

    // _ws is null (no connectToProject call) — delta must go to localStorage.
    mod.crdtApplyLocal('e1', { type: 'Wall' });

    // _persistQueue stores JSON.stringify(queue) — the value is a JSON array string.
    const queueWriteCalls = lsMock.setItem.mock.calls.filter(([key]) => key === 'crdt-delta-queue');
    expect(queueWriteCalls.length).toBeGreaterThan(0);
    const storedJson = queueWriteCalls[0]![1] as string;
    const parsedQueue = JSON.parse(storedJson) as string[];
    expect(parsedQueue.length).toBeGreaterThan(0);
    expect(parsedQueue[0]).toContain('"op":"Set"');
    expect(mod.crdtOutboxSize()).toBeGreaterThan(0);
  });

  it('T-COL-001-002: loads persisted queue on WASM init', async () => {
    const queued = [
      '{"op":"Set","element_id":"e1","entry":{"value":{},"lamport":1,"peer_id":"p1"}}',
      '{"op":"Delete","element_id":"e2","lamport":2,"peer_id":"p1"}',
    ];
    // Pre-seed localStorage before initSyncCrdt loads.
    lsMock._store['crdt-delta-queue'] = JSON.stringify(queued);

    const { mod } = await importAdapterWithCrdt();

    // The persisted queue should be loaded into _outbox.
    expect(mod.crdtOutboxSize()).toBe(2);
  });

  it('T-COL-001-003: clears queue entry after successful send via open WebSocket', async () => {
    const { mod } = await importAdapterWithCrdt();

    // Connect and open.
    mod.connectToProject('project-abc');
    await flushMicrotasks();
    const ws = wsMockFactory.instances[0]!;
    ws.simulateOpen();

    // Apply a change — WebSocket is OPEN, so it sends immediately.
    mod.crdtApplyLocal('e1', { type: 'Wall' });

    expect(mod.crdtOutboxSize()).toBe(0);

    // The last setItem call for the queue key should store an empty array.
    const lastQueueWrite = lsMock.setItem.mock.calls
      .filter(([key]) => key === 'crdt-delta-queue')
      .at(-1);
    expect(lastQueueWrite).toBeDefined();
    expect(JSON.parse(lastQueueWrite![1] as string)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-002: WebSocket reconnect
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-002: WebSocket reconnect', () => {
  it('T-COL-002-001: schedules reconnect after WS abnormal close', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.connectToProject('project-xyz');
    await flushMicrotasks();
    const wsFirst = wsMockFactory.instances[0]!;
    wsFirst.simulateOpen();

    const countBefore = wsMockFactory.instances.length;

    // Abnormal close (e.g., network drop).
    wsFirst.simulateAbnormalClose(1006);

    // Reconnect is scheduled after 5 000 ms.
    await vi.advanceTimersByTimeAsync(5500);
    await flushMicrotasks();

    expect(wsMockFactory.instances.length).toBeGreaterThan(countBefore);
  });

  it('T-COL-002-002: reconnects with auth token appended to URL', async () => {
    const { mod } = await importAdapterWithCrdt();

    const getToken = vi.fn().mockResolvedValue('my-auth-token');
    mod.connectToProject('project-token', getToken);
    await flushMicrotasks();

    const wsInstance = wsMockFactory.instances[0]!;
    expect(wsInstance.url).toContain('token=my-auth-token');
  });

  it('T-COL-002-003: does not reconnect after intentional clean close (code 1000)', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.connectToProject('project-intentional');
    await flushMicrotasks();
    const wsFirst = wsMockFactory.instances[0]!;
    wsFirst.simulateOpen();

    const countBefore = wsMockFactory.instances.length;

    // Clean close — should NOT schedule reconnect.
    wsFirst.close(1000);

    await vi.advanceTimersByTimeAsync(10000);
    await flushMicrotasks();

    expect(wsMockFactory.instances.length).toBe(countBefore);
  });

  it('T-COL-002-004: connectToProject closes existing connection before opening new one', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.connectToProject('project-a');
    await flushMicrotasks();

    mod.connectToProject('project-b');
    await flushMicrotasks();

    // At least 2 WebSocket instances — one per project.
    expect(wsMockFactory.instances.length).toBeGreaterThanOrEqual(2);
    const lastWs = wsMockFactory.instances.at(-1)!;
    expect(lastWs.url).toContain('project-b');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-003: Remote delta application
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-003: Remote delta application', () => {
  async function connectAndOpen(mod: Awaited<ReturnType<typeof importAdapterWithCrdt>>['mod']) {
    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();
    return ws;
  }

  it('T-COL-003-001: invokes onRemoteDelta callback for Set op', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);
    const ws = await connectAndOpen(mod);

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Set',
        element_id: 'e42',
        entry: { value: { type: 'Wall' }, lamport: 5, peer_id: 'peer-B' },
      }),
    });

    expect(onDelta).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledWith({
      op: 'set',
      elementId: 'e42',
      value: { type: 'Wall' },
    });
  });

  it('T-COL-003-002: invokes onRemoteDelta callback for SetProp op', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);
    const ws = await connectAndOpen(mod);

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'SetProp',
        element_id: 'e42',
        prop: 'height',
        entry: { value: 3000, lamport: 6, peer_id: 'peer-B' },
      }),
    });

    expect(onDelta).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledWith({
      op: 'setprop',
      elementId: 'e42',
      prop: 'height',
      value: 3000,
    });
  });

  it('T-COL-003-003: invokes onRemoteDelta callback for Delete op', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);
    const ws = await connectAndOpen(mod);

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Delete',
        element_id: 'e42',
        lamport: 7,
        peer_id: 'peer-B',
      }),
    });

    expect(onDelta).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledWith({ op: 'delete', elementId: 'e42' });
  });

  it('T-COL-003-004: skips echo — does not re-emit deltas from own peer', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);
    const ws = await connectAndOpen(mod);

    // Same peer_id as our own — should be silently dropped.
    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Set',
        element_id: 'e1',
        entry: { value: {}, lamport: 1, peer_id: 'peer-A' },
      }),
    });

    expect(onDelta).not.toHaveBeenCalled();
  });

  it('T-COL-003-005: dispatches all deltas inside a Batch op', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);
    const ws = await connectAndOpen(mod);

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Batch',
        deltas: [
          {
            op: 'Set',
            element_id: 'e1',
            entry: { value: { type: 'Wall' }, lamport: 1, peer_id: 'peer-B' },
          },
          {
            op: 'Delete',
            element_id: 'e2',
            lamport: 2,
            peer_id: 'peer-B',
          },
        ],
      }),
    });

    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, {
      op: 'set',
      elementId: 'e1',
      value: { type: 'Wall' },
    });
    expect(onDelta).toHaveBeenNthCalledWith(2, { op: 'delete', elementId: 'e2' });
  });

  it('T-COL-003-006: invokes onDocumentSync callback for type:"sync" message', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onSync = vi.fn();
    mod.setOnDocumentSync(onSync);
    const ws = await connectAndOpen(mod);

    ws.simulateMessage({ type: 'sync', data: '{"elements":{}}' });

    expect(onSync).toHaveBeenCalledOnce();
    expect(onSync).toHaveBeenCalledWith('{"elements":{}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-004: Offline flush on reconnect
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-004: Offline flush on reconnect', () => {
  it('T-COL-004-001: crdtFlushOfflineQueue sends all queued deltas when WS opens', async () => {
    const { mod } = await importAdapterWithCrdt();

    // Queue two changes while disconnected.
    mod.crdtApplyLocal('e1', { type: 'Wall' });
    mod.crdtApplyProperty('e2', 'height', 3000);
    expect(mod.crdtOutboxSize()).toBe(2);

    // Now connect and open — onopen triggers crdtFlushOfflineQueue.
    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    expect(mod.crdtOutboxSize()).toBe(0);

    const deltasSent = ws.sent.filter((s) => {
      const m = JSON.parse(s) as { type: string };
      return m.type === 'delta';
    });
    expect(deltasSent).toHaveLength(2);
  });

  it('T-COL-004-002: crdtFlushOfflineQueue is a no-op when queue is empty', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    const sentBefore = ws.sent.length;
    mod.crdtFlushOfflineQueue();

    expect(ws.sent.length).toBe(sentBefore);
  });

  it('T-COL-004-003: crdtFlushOfflineQueue does nothing when WebSocket is closed', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.crdtApplyLocal('e1', { type: 'Wall' });

    // No WebSocket — flush should be a no-op.
    mod.crdtFlushOfflineQueue();

    expect(mod.crdtOutboxSize()).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-005: isApplyingRemote guard
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-005: isApplyingRemote guard', () => {
  it('T-COL-005-001: returns false when idle', async () => {
    const { mod } = await importAdapterWithCrdt();
    expect(mod.isApplyingRemote()).toBe(false);
  });

  it('T-COL-005-002: is true inside the onRemoteDelta callback', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    let flagDuringCallback = false;

    mod.setOnRemoteDelta(() => {
      flagDuringCallback = mod.isApplyingRemote();
    });

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Set',
        element_id: 'e1',
        entry: { value: {}, lamport: 1, peer_id: 'peer-B' },
      }),
    });

    expect(flagDuringCallback).toBe(true);
    // Resets to false once the callback returns.
    expect(mod.isApplyingRemote()).toBe(false);
  });

  it('T-COL-005-003: resets to false even when onRemoteDelta throws', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');

    mod.setOnRemoteDelta(() => {
      throw new Error('intentional error');
    });

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    // Should not propagate the error.
    expect(() => {
      ws.simulateMessage({
        type: 'delta',
        payload: JSON.stringify({
          op: 'Set',
          element_id: 'e1',
          entry: { value: {}, lamport: 1, peer_id: 'peer-B' },
        }),
      });
    }).not.toThrow();

    expect(mod.isApplyingRemote()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-006: Presence
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-006: Presence', () => {
  it('T-COL-006-001: crdtUpdatePresence sends a presence message when WS is open', async () => {
    const { mod } = await importAdapterWithCrdt();

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    mod.crdtUpdatePresence(100, 200, 'e1');

    const presenceMsg = ws.sent.find((s) => {
      const m = JSON.parse(s) as { type: string };
      return m.type === 'presence';
    });
    expect(presenceMsg).toBeDefined();
    const parsed = JSON.parse(presenceMsg!) as { type: string; payload: unknown };
    expect(parsed.payload).toBeDefined();
  });

  it('T-COL-006-002: crdtUpdatePresence is a no-op when WS is not connected', async () => {
    const { mod } = await importAdapterWithCrdt();

    // No connectToProject — _ws is null.
    mod.crdtUpdatePresence(100, 200, 'e1');

    // No WS created, nothing sent.
    expect(wsMockFactory.instances.length).toBe(0);
  });

  it('T-COL-006-003: presence messages from server are merged into CRDT', async () => {
    const { mod, crdtMock } = await importAdapterWithCrdt();

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    const presencePayload = '{"peer_id":"peer-B","x":50,"y":75}';
    ws.simulateMessage({ type: 'presence', payload: presencePayload });

    expect(crdtMock.merge_presence).toHaveBeenCalledWith(presencePayload);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-007: State accessors when CRDT is not initialized
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-007: State accessors (CRDT not ready)', () => {
  it('T-COL-007-001: crdtGetState returns null before init', async () => {
    vi.resetModules();
    const mod = await import('./syncAdapter');
    expect(mod.crdtGetState()).toBeNull();
  });

  it('T-COL-007-002: crdtIsReady returns false before init', async () => {
    vi.resetModules();
    const mod = await import('./syncAdapter');
    expect(mod.crdtIsReady()).toBe(false);
  });

  it('T-COL-007-003: crdtElementCount returns 0 before init', async () => {
    vi.resetModules();
    const mod = await import('./syncAdapter');
    expect(mod.crdtElementCount()).toBe(0);
  });

  it('T-COL-007-004: crdtVectorClock returns null before init', async () => {
    vi.resetModules();
    const mod = await import('./syncAdapter');
    expect(mod.crdtVectorClock()).toBeNull();
  });

  it('T-COL-007-005: crdtOutboxSize returns 0 when empty', async () => {
    vi.resetModules();
    const mod = await import('./syncAdapter');
    expect(mod.crdtOutboxSize()).toBe(0);
  });

  it('T-COL-007-006: crdtIsReady returns true after successful init', async () => {
    const { mod } = await importAdapterWithCrdt();
    expect(mod.crdtIsReady()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-COL-008: Callback registration
// ─────────────────────────────────────────────────────────────────────────────

describe('T-COL-008: Callback registration', () => {
  it('T-COL-008-001: setOnDocumentSync callback fires for type:"sync" messages', async () => {
    const { mod } = await importAdapterWithCrdt();
    const onSync = vi.fn();
    mod.setOnDocumentSync(onSync);

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    ws.simulateMessage({ type: 'sync', data: 'full-state-json' });

    expect(onSync).toHaveBeenCalledWith('full-state-json');
  });

  it('T-COL-008-002: setOnRemoteDelta callback fires for remote delta messages', async () => {
    const { mod } = await importAdapterWithCrdt('peer-A');
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    ws.simulateMessage({
      type: 'delta',
      payload: JSON.stringify({
        op: 'Set',
        element_id: 'e99',
        entry: { value: { x: 1 }, lamport: 1, peer_id: 'peer-Z' },
      }),
    });

    expect(onDelta).toHaveBeenCalledWith({ op: 'set', elementId: 'e99', value: { x: 1 } });
  });

  it('T-COL-008-003: malformed delta messages do not crash the adapter', async () => {
    const { mod } = await importAdapterWithCrdt();
    const onDelta = vi.fn();
    mod.setOnRemoteDelta(onDelta);

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    // Deliver raw invalid JSON via the onmessage handler.
    expect(() => {
      ws.onmessage?.({ data: 'NOT JSON AT ALL' } as MessageEvent);
    }).not.toThrow();

    expect(onDelta).not.toHaveBeenCalled();
  });

  it('T-COL-008-004: unknown message types are silently ignored', async () => {
    const { mod } = await importAdapterWithCrdt();
    const onSync = vi.fn();
    const onDelta = vi.fn();
    mod.setOnDocumentSync(onSync);
    mod.setOnRemoteDelta(onDelta);

    mod.connectToProject('proj');
    await flushMicrotasks();
    const ws = wsMockFactory.instances.at(-1)!;
    ws.simulateOpen();

    expect(() => {
      ws.simulateMessage({ type: 'unknown-type', data: 'something' });
    }).not.toThrow();

    expect(onSync).not.toHaveBeenCalled();
    expect(onDelta).not.toHaveBeenCalled();
  });
});
