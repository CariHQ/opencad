/**
 * useWebSocket hook
 * Manages a WebSocket connection with automatic reconnect, message queueing,
 * and clean lifecycle management. Used by the collaboration layer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type WSReadyState = 'connecting' | 'open' | 'closing' | 'closed';

export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  reconnectDelay?: number;   // ms between reconnect attempts (default: 2000)
  maxReconnectAttempts?: number; // 0 = unlimited (default: 10)
  onMessage?: (msg: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (err: Event) => void;
}

export interface UseWebSocketResult {
  readyState: WSReadyState;
  send: (msg: WSMessage) => void;
  disconnect: () => void;
  reconnectCount: number;
}

const WS_READY_STATE_MAP: Record<number, WSReadyState> = {
  0: 'connecting',
  1: 'open',
  2: 'closing',
  3: 'closed',
};

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketResult {
  const {
    url,
    enabled = true,
    reconnectDelay = 2000,
    maxReconnectAttempts = 10,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [readyState, setReadyState] = useState<WSReadyState>('closed');
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const sendQueueRef = useRef<WSMessage[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const reconnectCountRef = useRef(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearReconnectTimer();

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setReadyState('connecting');

      ws.onopen = () => {
        if (unmountedRef.current) return;
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        setReadyState('open');
        onConnect?.();
        // Flush queued messages
        const queue = [...sendQueueRef.current];
        sendQueueRef.current = [];
        queue.forEach((msg) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
          }
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        if (unmountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string) as WSMessage;
          onMessage?.(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = (event: Event) => {
        if (unmountedRef.current) return;
        onError?.(event);
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setReadyState('closed');
        onDisconnect?.();

        // Attempt reconnect
        if (
          enabled &&
          (maxReconnectAttempts === 0 || reconnectCountRef.current < maxReconnectAttempts)
        ) {
          reconnectCountRef.current++;
          setReconnectCount(reconnectCountRef.current);
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
        }
      };
    } catch {
      setReadyState('closed');
    }
  }, [url, enabled, reconnectDelay, maxReconnectAttempts, onConnect, onDisconnect, onError, onMessage, clearReconnectTimer]);

  useEffect(() => {
    unmountedRef.current = false;
    if (enabled) connect();
    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, enabled, connect, clearReconnectTimer]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Queue for when connection is restored
      sendQueueRef.current.push(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setReadyState('closed');
  }, [clearReconnectTimer]);

  return {
    readyState: wsRef.current
      ? (WS_READY_STATE_MAP[wsRef.current.readyState] ?? 'closed')
      : readyState,
    send,
    disconnect,
    reconnectCount,
  };
}
