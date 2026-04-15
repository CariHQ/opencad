/**
 * T-COL-001: Presence — track online collaborators and their cursor positions
 */
import { useState, useCallback, useEffect } from 'react';

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number } | null;
  activeTool: string;
  lastSeen: number;
}

export interface UsePresenceOptions {
  userId: string;
  displayName: string;
  color?: string;
  /** How many ms before a user is considered offline (default: 5000) */
  timeoutMs?: number;
}

export interface UsePresenceResult {
  users: PresenceUser[];
  localUser: PresenceUser;
  updateCursor: (x: number, y: number) => void;
  updateTool: (tool: string) => void;
  isOnline: boolean;
}

const DEFAULT_COLORS = [
  '#e53935', '#8e24aa', '#1e88e5', '#00897b',
  '#43a047', '#fb8c00', '#6d4c41', '#546e7a',
];

let colorIndex = 0;
function nextColor(): string {
  return DEFAULT_COLORS[colorIndex++ % DEFAULT_COLORS.length] ?? '#1e88e5';
}

export function usePresence(options: UsePresenceOptions): UsePresenceResult {
  const { userId, displayName, color = nextColor(), timeoutMs = 5000 } = options;
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localUser, setLocalUser] = useState<PresenceUser>({
    userId,
    displayName,
    color,
    cursor: null,
    activeTool: 'select',
    lastSeen: Date.now(),
  });

  // Track online status
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Prune stale users
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - timeoutMs;
      setUsers((prev) => prev.filter((u) => u.userId === userId || u.lastSeen > cutoff));
    }, 1000);
    return () => clearInterval(interval);
  }, [userId, timeoutMs]);

  const updateCursor = useCallback((x: number, y: number) => {
    setLocalUser((prev) => ({ ...prev, cursor: { x, y }, lastSeen: Date.now() }));
  }, []);

  const updateTool = useCallback((tool: string) => {
    setLocalUser((prev) => ({ ...prev, activeTool: tool, lastSeen: Date.now() }));
  }, []);

  return { users, localUser, updateCursor, updateTool, isOnline };
}
