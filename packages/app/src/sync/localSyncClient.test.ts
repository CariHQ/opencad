/**
 * Local Sync Client Tests
 *
 * Test IDs: T-COL-001 through T-COL-006
 *
 * These tests cover the module-level WebSocket singleton that connects the
 * browser / desktop app to the OpenCAD Rust server for real-time document sync.
 *
 * Protocol (server at ws://localhost:47821/ws/:projectId):
 *   - On connect: server sends {"type":"sync","data":"<json>","version":N}
 *   - Client → server updates: {"type":"update","senderId":"<id>","data":"<json>"}
 *   - Server broadcasts: same {"type":"update",...} envelope to other clients
 *   - Echo prevention: senderId lets us skip our own echoes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  connectToLocalSync,
  disconnectLocalSync,
  broadcastDocumentUpdate,
  setRemoteUpdateHandler,
  getSyncStatus,
  _resetForTest,
} from './localSyncClient';

// ─── Mock WebSocket ───────────────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    instances.push(this);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  send(data: string): void {
    this.sent.push(data);
  }

  receive(data: string): void {
    this.onmessage?.({ data });
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

let instances: MockWebSocket[] = [];

beforeEach(() => {
  instances = [];
  _resetForTest();
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  _resetForTest();
});

// ─── T-COL-001: Connect ───────────────────────────────────────────────────────

describe('T-COL-001: connect opens WebSocket to server', () => {
  it('creates a WebSocket to the correct server URL', () => {
    connectToLocalSync('proj-1');
    expect(instances.length).toBe(1);
    expect(instances[0].url).toBe('ws://localhost:47821/ws/proj-1');
  });

  it('does not send any messages on open (server pushes initial sync)', () => {
    connectToLocalSync('proj-1');
    instances[0].open();
    expect(instances[0].sent.length).toBe(0);
  });

  it('reports connecting status before open', () => {
    connectToLocalSync('proj-1');
    expect(getSyncStatus()).toBe('connecting');
  });

  it('reports connected status after open', () => {
    connectToLocalSync('proj-1');
    instances[0].open();
    expect(getSyncStatus()).toBe('connected');
  });

  it('reports disconnected before any connection', () => {
    expect(getSyncStatus()).toBe('disconnected');
  });
});

// ─── T-COL-002: broadcastDocumentUpdate ──────────────────────────────────────

describe('T-COL-002: broadcastDocumentUpdate sends update message', () => {
  it('sends update envelope with senderId and data when connected', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    const data = JSON.stringify({ elements: {} });
    broadcastDocumentUpdate('proj-1', data);

    const msgs = instances[0].sent.map((s) => JSON.parse(s) as Record<string, unknown>);
    const update = msgs.find((m) => m['type'] === 'update');
    expect(update).toBeTruthy();
    expect(update!['data']).toBe(data);
    expect(typeof update!['senderId']).toBe('string');
    expect((update!['senderId'] as string).length).toBeGreaterThan(0);
  });

  it('is a no-op when disconnected', () => {
    broadcastDocumentUpdate('proj-1', '{}');
    expect(instances.length).toBe(0);
  });

  it('is a no-op for a different projectId', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    broadcastDocumentUpdate('proj-2', '{}');
    const msgs = instances[0].sent.map((s) => JSON.parse(s) as Record<string, unknown>);
    expect(msgs.some((m) => m['type'] === 'update')).toBe(false);
  });

  it('includes stable senderId across multiple sends', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    broadcastDocumentUpdate('proj-1', '{"v":1}');
    broadcastDocumentUpdate('proj-1', '{"v":2}');

    const msgs = instances[0].sent.map((s) => JSON.parse(s) as Record<string, unknown>);
    const updates = msgs.filter((m) => m['type'] === 'update');
    expect(updates[0]!['senderId']).toBe(updates[1]!['senderId']);
  });
});

// ─── T-COL-003: Apply incoming remote updates ─────────────────────────────────

describe('T-COL-003: remote update handler is called on incoming updates', () => {
  it('calls handler on sync message (initial server push on connect)', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    const data = JSON.stringify({ name: 'Remote Project' });
    instances[0].receive(JSON.stringify({ type: 'sync', data, version: 3 }));

    expect(handler).toHaveBeenCalledWith(data);
  });

  it('calls handler on update message from another client', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    const data = JSON.stringify({ elements: { 'wall-1': { type: 'wall' } } });
    instances[0].receive(
      JSON.stringify({ type: 'update', data, senderId: 'other-client-id' })
    );

    expect(handler).toHaveBeenCalledWith(data);
  });

  it('does not call handler for sync with no data', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    instances[0].receive(JSON.stringify({ type: 'sync', data: null, version: 0 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores unknown message types gracefully', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    instances[0].receive(JSON.stringify({ type: 'ping' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── T-COL-004: Echo prevention ──────────────────────────────────────────────

describe('T-COL-004: echo prevention via senderId', () => {
  it('does not call handler for own echo (same senderId)', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    const data = JSON.stringify({ version: 1 });
    broadcastDocumentUpdate('proj-1', data);

    // Extract our senderId from what we sent
    const sentMsgs = instances[0].sent.map((s) => JSON.parse(s) as Record<string, unknown>);
    const updateMsg = sentMsgs.find((m) => m['type'] === 'update')!;
    const ourSenderId = updateMsg['senderId'] as string;

    // Server echoes it back with our senderId
    instances[0].receive(JSON.stringify({ type: 'update', data, senderId: ourSenderId }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler for updates from a different senderId', () => {
    const handler = vi.fn();
    setRemoteUpdateHandler(handler);
    connectToLocalSync('proj-1');
    instances[0].open();

    const data = JSON.stringify({ version: 2 });
    broadcastDocumentUpdate('proj-1', data);

    // Server sends an update from a DIFFERENT client
    instances[0].receive(
      JSON.stringify({ type: 'update', data, senderId: 'completely-different-id' })
    );

    expect(handler).toHaveBeenCalledWith(data);
  });
});

// ─── T-COL-005: Connection deduplication and cleanup ─────────────────────────

describe('T-COL-005: deduplication and cleanup', () => {
  it('does not create a second WebSocket when already connected', () => {
    connectToLocalSync('proj-1');
    instances[0].open();
    connectToLocalSync('proj-1'); // duplicate call

    expect(instances.length).toBe(1);
  });

  it('switching projects closes old WS and opens a new one for the new project', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    connectToLocalSync('proj-2');

    expect(instances.length).toBe(2);
    expect(instances[0].readyState).toBe(3); // closed
    expect(instances[1].url).toBe('ws://localhost:47821/ws/proj-2');
  });

  it('disconnectLocalSync closes the WebSocket and returns disconnected status', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    disconnectLocalSync();

    expect(getSyncStatus()).toBe('disconnected');
  });

  it('disconnect prevents automatic reconnect', () => {
    connectToLocalSync('proj-1');
    instances[0].open();
    disconnectLocalSync();

    // Advance past reconnect delay
    vi.advanceTimersByTime(5000);

    expect(instances.length).toBe(1); // no new connection
  });
});

// ─── T-COL-006: Auto-reconnect on unexpected close ───────────────────────────

describe('T-COL-006: auto-reconnect on unexpected close', () => {
  it('reconnects after 3 seconds on unexpected disconnect', () => {
    connectToLocalSync('proj-1');
    instances[0].open();

    // Simulate unexpected close (server went away)
    instances[0].readyState = 3;
    instances[0].onclose?.();

    expect(instances.length).toBe(1); // not yet reconnected

    vi.advanceTimersByTime(3000);

    expect(instances.length).toBe(2); // reconnected
    expect(instances[1].url).toBe('ws://localhost:47821/ws/proj-1');
  });

  it('reconnects to the same project after close', () => {
    connectToLocalSync('proj-1');
    instances[0].open();
    instances[0].readyState = 3;
    instances[0].onclose?.();

    vi.advanceTimersByTime(3000);

    expect(instances[1].url).toContain('proj-1');
  });
});
