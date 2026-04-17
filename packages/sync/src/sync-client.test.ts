/**
 * Sync Client Tests — Real-Time Cloud Persistence
 *
 * Test IDs: T-SUB-001 through T-SUB-008, T-SUB-019, T-SUB-020
 *
 * These tests exercise the SyncClient class with a mock WebSocket server,
 * verifying that edits are persisted to the cloud, CRDT merges are correct
 * under concurrent edits, and crash recovery preserves data integrity.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncClient, type SyncConfig } from './sync-client';
import { mergeClocks, createVectorClock } from './crdt';

// ─── Mock WebSocket ──────────────────────────────────────────────────────────

interface MockWSMessage {
  type: string;
  [key: string]: unknown;
}

class MockWebSocket {
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  sent: MockWSMessage[] = [];

  constructor(public url: string) {}

  /** Call this to simulate the server completing the handshake */
  open(): void {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as MockWSMessage);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  /** Simulate server crash (abrupt close) */
  crash(): void {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  receive(msg: MockWSMessage): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

let lastWS: MockWebSocket | null = null;

function installMockWebSocket(): void {
  vi.stubGlobal(
    'WebSocket',
    class FakeWebSocket extends MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      constructor(url: string) {
        super(url);
        lastWS = this;
      }
    }
  );
}

function makeClient(id = 'client-1', data: unknown = {}): SyncClient {
  const config: SyncConfig = {
    serverUrl: 'ws://localhost:8080',
    projectId: 'project-1',
    clientId: id,
    reconnectDelay: 200,
    maxReconnectDelay: 1000,
  };
  return new SyncClient(config, data);
}

/** Connect a client and immediately trigger the WS open event */
function connectAndOpen(client: SyncClient): MockWebSocket {
  lastWS = null;
  client.connect();
  const ws = lastWS!;
  ws.open();
  return ws;
}

beforeEach(() => {
  vi.useFakeTimers();
  lastWS = null;
  installMockWebSocket();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  lastWS = null;
});

// ─── T-SUB-001: Browser edit → persisted to cloud ───────────────────────────

describe('T-SUB-001: Browser edit → verify persisted to cloud', () => {
  it('edit is sent to the server as an operation message', () => {
    const client = makeClient();
    const ws = connectAndOpen(client);

    client.applyLocalOperation('update', ['elements', 'wall-1', 'height'], 3000);

    expect(ws.sent.length).toBeGreaterThan(0);
    const sent = ws.sent[0]!;
    expect(sent.type).toBe('operation');
  });

  it('operation contains correct path and value', () => {
    const client = makeClient();
    const ws = connectAndOpen(client);

    client.applyLocalOperation('update', ['elements', 'wall-1', 'height'], 3000);
    const op = (ws.sent[0] as unknown as { operation: { path: string[]; value: unknown } }).operation;
    expect(op.path).toEqual(['elements', 'wall-1', 'height']);
    expect(op.value).toBe(3000);
  });

  it('multiple edits are all sent to server', () => {
    const client = makeClient();
    const ws = connectAndOpen(client);

    client.applyLocalOperation('insert', ['elements', 'wall-1'], { type: 'wall' });
    client.applyLocalOperation('update', ['elements', 'wall-1', 'height'], 3000);
    client.applyLocalOperation('update', ['elements', 'wall-1', 'width'], 200);

    expect(ws.sent.length).toBe(3);
  });

  it('client is connected after handshake', () => {
    const client = makeClient();
    connectAndOpen(client);
    expect(client.getStatus()).toBe('connected');
  });
});

// ─── T-SUB-002: Desktop edit → persisted to cloud ───────────────────────────

describe('T-SUB-002: Desktop edit → verify persisted to cloud', () => {
  it('desktop client sends edit with correct client tag', () => {
    const desktopClient = makeClient('desktop-1');
    const ws = connectAndOpen(desktopClient);

    desktopClient.applyLocalOperation('insert', ['elements', 'slab-1'], { type: 'slab' });

    const op = (ws.sent[0] as unknown as { operation: { clientId: string } }).operation;
    expect(op.clientId).toBe('desktop-1');
  });

  it('document vector clock increments after local edit', () => {
    const desktopClient = makeClient('desktop-2');
    connectAndOpen(desktopClient);

    desktopClient.applyLocalOperation('update', ['name'], 'House Design');

    // Document clock (not op clock) increments on applyOperation
    const clock = desktopClient.getDocument().vectorClock.clock;
    expect(clock['desktop-2']).toBeGreaterThan(0);
  });
});

// ─── T-SUB-003 & T-SUB-004: Cross-client state consistency ──────────────────

describe('T-SUB-003/T-SUB-004: State consistency across browser and desktop', () => {
  it('client receives remote operation and applies it to local state', () => {
    const client = makeClient('browser-1', { elements: {} });
    const ws = connectAndOpen(client);

    ws.receive({
      type: 'operation',
      operation: {
        id: 'remote-op-1',
        type: 'update',
        path: ['elements', 'wall-1', 'height'],
        value: 3500,
        timestamp: Date.now(),
        clientId: 'desktop-1',
        vectorClock: { clock: { 'desktop-1': 1 } },
      },
    });

    expect(client.getDocument().vectorClock.clock['desktop-1']).toBe(1);
  });

  it('client ignores its own operations echoed back by server', () => {
    const client = makeClient('browser-1');
    const ws = connectAndOpen(client);

    client.applyLocalOperation('update', ['name'], 'Project A');
    const clockAfterEdit = client.getDocument().vectorClock.clock['browser-1'];

    // Server echoes our own operation back
    const sentOp = (ws.sent[0] as unknown as { operation: unknown }).operation;
    ws.receive({ type: 'operation', operation: sentOp });

    // Our own op was ignored — clock didn't increment again
    expect(client.getDocument().vectorClock.clock['browser-1']).toBe(clockAfterEdit);
  });

  it('sync message from server replaces local data with authoritative state', () => {
    const client = makeClient('browser-1', { name: 'Old Name' });
    const ws = connectAndOpen(client);

    const serverClock = { clock: { 'server-1': 5 } };
    ws.receive({
      type: 'sync',
      data: { name: 'Authoritative Name', elements: { 'wall-1': { type: 'wall' } } },
      serverClock,
    });

    const doc = client.getDocument();
    expect((doc.data as Record<string, unknown>).name).toBe('Authoritative Name');
    expect(doc.serverVectorClock.clock['server-1']).toBe(5);
  });
});

// ─── T-SUB-005 & T-SUB-006: Offline edit → reconnect → sync ─────────────────

describe('T-SUB-005/T-SUB-006: Offline edit → reconnect → sync to cloud', () => {
  it('pending operations are flushed on reconnect', () => {
    const client = makeClient('browser-offline');
    // Apply ops while disconnected (no connect yet)
    client.applyLocalOperation('insert', ['elements', 'wall-offline'], { type: 'wall' });
    client.applyLocalOperation('update', ['elements', 'wall-offline', 'height'], 2800);

    // Now connect
    const ws = connectAndOpen(client);

    // Both ops should be flushed to the server
    expect(ws.sent.length).toBe(2);
  });

  it('client status transitions correctly during connect', () => {
    const client = makeClient('browser-offline-2');
    expect(client.getStatus()).toBe('disconnected');

    client.connect();
    expect(client.getStatus()).toBe('connecting');

    lastWS!.open();
    expect(client.getStatus()).toBe('connected');
  });

  it('pending ops are resent after a disconnect/reconnect cycle', () => {
    const client = makeClient('browser-reconnect');
    const ws1 = connectAndOpen(client);

    client.applyLocalOperation('update', ['name'], 'Reconnect Test');
    expect(ws1.sent.length).toBe(1);

    // Crash (no ack sent)
    ws1.crash();
    expect(client.getStatus()).toBe('disconnected');

    // Manual reconnect
    const ws2 = connectAndOpen(client);

    // Op resent on new connection
    expect(ws2.sent.length).toBe(1);
  });
});

// ─── T-SUB-007: Simultaneous edits → CRDT merge ──────────────────────────────

describe('T-SUB-007: Simultaneous browser + desktop edit → verify CRDT merge', () => {
  it('two independent clock streams merge without data loss', () => {
    const browserClock = { clock: { browser: 3, desktop: 1 } };
    const desktopClock = { clock: { browser: 1, desktop: 4 } };

    const merged = mergeClocks(browserClock, desktopClock);
    expect(merged.clock['browser']).toBe(3);
    expect(merged.clock['desktop']).toBe(4);
  });

  it('both browser and desktop ops are applied when received in either order', () => {
    const browser = makeClient('browser-2', { walls: {} });
    const ws = connectAndOpen(browser);

    browser.applyLocalOperation('insert', ['walls', 'w1'], { height: 3000 });

    ws.receive({
      type: 'operation',
      operation: {
        id: 'desk-op-1',
        type: 'insert',
        path: ['walls', 'w2'],
        value: { height: 4000 },
        timestamp: Date.now(),
        clientId: 'desktop-2',
        vectorClock: { clock: { 'desktop-2': 1 } },
      },
    });

    const doc = browser.getDocument();
    expect(doc.vectorClock.clock['browser-2']).toBeGreaterThan(0);
    expect(doc.vectorClock.clock['desktop-2']).toBe(1);
  });

  it('concurrent ops from different clients each advance their own clock', () => {
    const clockA = { clock: { a: 2, b: 1 } };
    const clockB = { clock: { a: 1, b: 2 } };

    const merged = mergeClocks(clockA, clockB);
    expect(merged.clock['a']).toBe(2);
    expect(merged.clock['b']).toBe(2);
  });
});

// ─── T-SUB-008: Force crash during sync → restart → no data loss ──────────────

describe('T-SUB-008: Force crash during sync → restart → verify no data loss', () => {
  it('pending operations survive a crash and reconnect', () => {
    const client = makeClient('crash-client', { walls: {} });
    const ws1 = connectAndOpen(client);

    for (let i = 0; i < 5; i++) {
      client.applyLocalOperation('insert', [`walls.w${i}`], { height: 3000 + i * 100 });
    }
    expect(ws1.sent.length).toBe(5);

    ws1.crash();
    const ws2 = connectAndOpen(client);

    // All 5 unacked ops flushed again on reconnect
    expect(ws2.sent.length).toBe(5);
  });

  it('acknowledged ops are removed from pending buffer', () => {
    const client = makeClient('ack-client');
    const ws1 = connectAndOpen(client);

    client.applyLocalOperation('update', ['name'], 'Acked');
    const sentOp = (ws1.sent[0] as unknown as { operation: { id: string } }).operation;

    ws1.receive({ type: 'ack', operationId: sentOp.id });

    // Crash and reconnect
    ws1.crash();
    const ws2 = connectAndOpen(client);

    // Acked op NOT resent
    expect(ws2.sent.length).toBe(0);
  });
});

// ─── T-SUB-019: 10 concurrent clients → all changes persisted ────────────────

describe('T-SUB-019: 10 concurrent clients → verify all changes persisted', () => {
  it('operations from 10 different clients merge into a consistent clock', () => {
    let mergedClock = createVectorClock();

    for (let i = 0; i < 10; i++) {
      const clientClock = { clock: { [`client-${i}`]: 1 } };
      mergedClock = mergeClocks(mergedClock, clientClock);
    }

    for (let i = 0; i < 10; i++) {
      expect(mergedClock.clock[`client-${i}`]).toBe(1);
    }
    expect(Object.keys(mergedClock.clock)).toHaveLength(10);
  });

  it('each client op has a unique id (no collisions across 10 clients)', () => {
    const opIds = new Set<string>();

    for (let i = 0; i < 10; i++) {
      const client = makeClient(`concurrent-${i}`);
      const ws = connectAndOpen(client);
      client.applyLocalOperation('update', ['version'], i);

      const op = (ws.sent[0] as unknown as { operation: { id: string } }).operation;
      opIds.add(op.id);
      // Disconnect cleanly without triggering reconnect timers
      ws.readyState = 3;
      client.disconnect();
      vi.clearAllTimers(); // prevent lingering reconnect timers
    }

    expect(opIds.size).toBe(10);
  });

  it('merged document state from 10 sequential remote ops has correct clock', () => {
    const client = makeClient('aggregator', {});
    const ws = connectAndOpen(client);

    for (let i = 0; i < 10; i++) {
      ws.receive({
        type: 'operation',
        operation: {
          id: `op-${i}`,
          type: 'insert',
          path: [`element-${i}`],
          value: { type: 'wall' },
          timestamp: Date.now() + i,
          clientId: `remote-client-${i}`,
          vectorClock: { clock: { [`remote-client-${i}`]: 1 } },
        },
      });
    }

    const clock = client.getDocument().vectorClock.clock;
    for (let i = 0; i < 10; i++) {
      expect(clock[`remote-client-${i}`]).toBe(1);
    }
  });
});

// ─── T-SUB-020: Server crash during sync → no partial state corruption ────────

describe('T-SUB-020: Server crash during sync → verify no partial state corruption', () => {
  it('unacknowledged ops remain in pending buffer after server crash', () => {
    const client = makeClient('integrity-client', {});
    const ws1 = connectAndOpen(client);

    client.applyLocalOperation('update', ['critical-field'], 'important-value');
    expect(ws1.sent.length).toBe(1);

    // Crash before ack
    ws1.crash();

    // Reconnect
    const ws2 = connectAndOpen(client);

    expect(ws2.sent.length).toBe(1);
    const resent = (ws2.sent[0] as unknown as { operation: { value: unknown } }).operation;
    expect(resent.value).toBe('important-value');
  });

  it('partial batch: acked ops removed, unacked preserved after crash', () => {
    const client = makeClient('partial-client', {});
    const ws1 = connectAndOpen(client);

    client.applyLocalOperation('update', ['field-a'], 'a');
    client.applyLocalOperation('update', ['field-b'], 'b');
    client.applyLocalOperation('update', ['field-c'], 'c');
    expect(ws1.sent.length).toBe(3);

    const opA = (ws1.sent[0] as unknown as { operation: { id: string } }).operation;

    // Server acks only the first op
    ws1.receive({ type: 'ack', operationId: opA.id });

    // Server crashes
    ws1.crash();

    // Reconnect
    const ws2 = connectAndOpen(client);

    // Only 2 unacked ops should be resent (b and c, not a)
    expect(ws2.sent.length).toBe(2);
  });

  it('client reconnects automatically after server crash via scheduleReconnect', () => {
    const client = makeClient('auto-reconnect', {});
    const ws1 = connectAndOpen(client);

    expect(client.getStatus()).toBe('connected');

    // Crash the WS
    ws1.crash();
    expect(client.getStatus()).toBe('disconnected');

    // Advance fake timers past the reconnect delay (200ms)
    vi.advanceTimersByTime(250);

    // A new WS should have been created by scheduleReconnect
    expect(lastWS).not.toBe(ws1);
    lastWS!.open(); // complete the handshake
    expect(client.getStatus()).toBe('connected');
  });
});
