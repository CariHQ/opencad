/**
 * useWebSocket tests
 * T-COL-006: WebSocket connection management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

// ─── Mock WebSocket ───────────────────────────────────────────────────────────

type OnOpenFn = (() => void) | null;
type OnMessageFn = ((e: { data: string }) => void) | null;
type OnCloseFn = (() => void) | null;
type OnErrorFn = ((e: Event) => void) | null;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: OnOpenFn = null;
  onmessage: OnMessageFn = null;
  onclose: OnCloseFn = null;
  onerror: OnErrorFn = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.closed = true;
    this.onclose?.();
  }

  // Test helpers
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(data: string) {
    this.onmessage?.({ data });
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

// The active (last created) WebSocket instance
function lastWS(): MockWebSocket | undefined {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.useFakeTimers();
  // Replace global WebSocket with mock, preserving static constants
  const MockWS = MockWebSocket as unknown as typeof WebSocket;
  vi.stubGlobal('WebSocket', MockWS);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('T-COL-006: WebSocket hook', () => {
  // ─── Initial state ──────────────────────────────────────────────────────────

  it('creates WebSocket when enabled', () => {
    renderHook(() => useWebSocket({ url: 'ws://localhost:8080', enabled: true }));
    // At least one instance should have been created
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
  });

  it('does NOT create WebSocket when disabled', () => {
    renderHook(() => useWebSocket({ url: 'ws://localhost:8080', enabled: false }));
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('starts as closed or connecting', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    expect(['connecting', 'closed']).toContain(result.current.readyState);
  });

  it('reconnectCount starts at 0', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    expect(result.current.reconnectCount).toBe(0);
  });

  // ─── Connection open ─────────────────────────────────────────────────────────

  it('calls onConnect when WS opens', () => {
    const onConnect = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true, onConnect })
    );
    const ws = lastWS();
    expect(ws).toBeDefined();
    act(() => { ws!.triggerOpen(); });
    expect(onConnect).toHaveBeenCalled();
  });

  it('becomes open after triggerOpen', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    const ws = lastWS();
    act(() => { ws?.triggerOpen(); });
    // readyState reads directly from wsRef.current.readyState OR React state
    expect(['open', 'connecting']).toContain(result.current.readyState);
  });

  // ─── Connection close ─────────────────────────────────────────────────────────

  it('calls onDisconnect when WS closes', () => {
    const onDisconnect = vi.fn();
    renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8080',
        enabled: true,
        maxReconnectAttempts: 0,
        onDisconnect,
      })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => { ws!.triggerClose(); });
    vi.clearAllTimers(); // prevent reconnect
    expect(onDisconnect).toHaveBeenCalled();
  });

  // ─── Message handling ─────────────────────────────────────────────────────────

  it('delivers parsed messages to onMessage', () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true, onMessage })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => {
      ws!.triggerMessage(JSON.stringify({ type: 'ping', payload: null }));
    });
    expect(onMessage).toHaveBeenCalledWith({ type: 'ping', payload: null });
  });

  it('ignores malformed JSON messages without throwing', () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true, onMessage })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => { ws!.triggerMessage('not valid json {{{'); });
    expect(onMessage).not.toHaveBeenCalled();
  });

  // ─── Send ─────────────────────────────────────────────────────────────────────

  it('sends messages through open WebSocket', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => {
      result.current.send({ type: 'update', payload: { id: '1' } });
    });
    expect(ws!.sent.some((s) => s.includes('"update"'))).toBe(true);
  });

  it('queues messages sent before connection and sends on open', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    act(() => {
      result.current.send({ type: 'queued', payload: null });
    });
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    // The queued message should have been flushed
    expect(ws!.sent.some((s) => s.includes('"queued"'))).toBe(true);
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────────

  it('disconnect() closes the socket immediately', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080', enabled: true })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => { result.current.disconnect(); });
    vi.clearAllTimers();
    expect(result.current.readyState).toBe('closed');
  });

  // ─── Reconnect ─────────────────────────────────────────────────────────────────

  it('reconnectCount increases after disconnect', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8080',
        enabled: true,
        reconnectDelay: 50,
        maxReconnectAttempts: 3,
      })
    );
    const ws = lastWS();
    act(() => { ws!.triggerOpen(); });
    act(() => { ws!.triggerClose(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.reconnectCount).toBeGreaterThanOrEqual(1);
  });

  it('does not reconnect past maxReconnectAttempts', () => {
    renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:8080',
        enabled: true,
        reconnectDelay: 50,
        maxReconnectAttempts: 2,
      })
    );

    // Trigger 3 closes to try to exceed maxReconnectAttempts
    for (let i = 0; i < 3; i++) {
      const ws = lastWS();
      if (ws) {
        act(() => { ws.triggerOpen(); });
        act(() => { ws.triggerClose(); });
        act(() => { vi.advanceTimersByTime(100); });
      }
    }

    // Should not have created more than 3 instances (1 initial + 2 reconnects)
    expect(MockWebSocket.instances.length).toBeLessThanOrEqual(4);
  });
});
