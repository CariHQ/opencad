/**
 * T-COL-005: useEditNotifications — real-time "user is editing element" notifications
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditNotifications, type EditNotificationMessage } from './useEditNotifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<EditNotificationMessage> = {}): EditNotificationMessage {
  return {
    type: 'editNotification',
    userId: 'user-2',
    userName: 'Ana',
    elementId: 'wall-01',
    elementType: 'wall',
    action: 'start',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('T-COL-005: useEditNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns an empty map initially', () => {
    const { result } = renderHook(() => useEditNotifications({ wsRef: { current: null } }));
    expect(result.current.editingMap.size).toBe(0);
  });

  it('adds a notification when a start editNotification event fires', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage()) }));
    });

    expect(result.current.editingMap.size).toBe(1);
    expect(result.current.editingMap.get('wall-01')).toMatchObject({
      userId: 'user-2',
      userName: 'Ana',
    });
  });

  it('removes a notification when a stop editNotification event fires', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    // Start editing
    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage({ action: 'start' })) }));
    });
    expect(result.current.editingMap.size).toBe(1);

    // Stop editing
    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage({ action: 'stop' })) }));
    });
    expect(result.current.editingMap.size).toBe(0);
  });

  it('auto-clears stale notifications after 5 seconds', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const startTime = Date.now();
    vi.setSystemTime(startTime);

    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage()) }));
    });
    expect(result.current.editingMap.size).toBe(1);

    // Advance both the fake clock and system time past the 5s stale threshold
    act(() => {
      vi.setSystemTime(startTime + 6000);
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.editingMap.size).toBe(0);
  });

  it('handles multiple elements being edited simultaneously', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage({ elementId: 'wall-01', userId: 'user-2', userName: 'Ana' })) }));
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage({ elementId: 'slab-05', userId: 'user-3', userName: 'Bob' })) }));
    });

    expect(result.current.editingMap.size).toBe(2);
    expect(result.current.editingMap.get('wall-01')?.userName).toBe('Ana');
    expect(result.current.editingMap.get('slab-05')?.userName).toBe('Bob');
  });

  it('ignores messages with wrong type', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify({ type: 'presence', userId: 'user-2' }) }));
    });

    expect(result.current.editingMap.size).toBe(0);
  });

  it('handles null wsRef gracefully (no crash)', () => {
    expect(() => {
      renderHook(() => useEditNotifications({ wsRef: { current: null } }));
    }).not.toThrow();
  });

  it('stores timestamp on each notification entry', () => {
    const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
    const mockWs = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event]!.push(handler);
      }),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket;

    const before = Date.now();
    const { result } = renderHook(() =>
      useEditNotifications({ wsRef: { current: mockWs } })
    );

    act(() => {
      const handler = listeners['message']?.[0];
      handler?.(new MessageEvent('message', { data: JSON.stringify(makeMessage()) }));
    });

    const entry = result.current.editingMap.get('wall-01');
    expect(entry?.timestamp).toBeGreaterThanOrEqual(before);
  });

  it('broadcasts start event when local user selects an element with non-select tool', () => {
    const mockSend = vi.fn();
    const mockWs = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: mockSend,
    } as unknown as WebSocket;

    renderHook(() =>
      useEditNotifications({
        wsRef: { current: mockWs },
        localUserId: 'user-1',
        localUserName: 'LocalUser',
        selectedIds: ['wall-01'],
        activeTool: 'wall',
      })
    );

    // send should have been called with a start notification
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"action":"start"')
    );
  });

  it('broadcasts stop event when local user deselects (selectedIds becomes empty)', () => {
    const mockSend = vi.fn();
    const mockWs = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: mockSend,
    } as unknown as WebSocket;

    const { rerender } = renderHook(
      ({ ids, tool }: { ids: string[]; tool: string }) =>
        useEditNotifications({
          wsRef: { current: mockWs },
          localUserId: 'user-1',
          localUserName: 'LocalUser',
          selectedIds: ids,
          activeTool: tool,
        }),
      { initialProps: { ids: ['wall-01'], tool: 'wall' } }
    );

    mockSend.mockClear();

    rerender({ ids: [], tool: 'wall' });

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"action":"stop"')
    );
  });

  it('does not broadcast when activeTool is select', () => {
    const mockSend = vi.fn();
    const mockWs = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      send: mockSend,
    } as unknown as WebSocket;

    renderHook(() =>
      useEditNotifications({
        wsRef: { current: mockWs },
        localUserId: 'user-1',
        localUserName: 'LocalUser',
        selectedIds: ['wall-01'],
        activeTool: 'select',
      })
    );

    expect(mockSend).not.toHaveBeenCalledWith(
      expect.stringContaining('"action":"start"')
    );
  });
});
