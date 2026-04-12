/**
 * Presence System
 * User presence and cursor tracking for real-time collaboration
 */

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: string[];
  lastSeen: number;
  isActive: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  z?: number;
  view?: string;
}

export interface PresenceUpdate {
  type: 'join' | 'leave' | 'cursor' | 'selection' | 'heartbeat';
  userId: string;
  userName?: string;
  userColor?: string;
  cursor?: CursorPosition;
  selection?: string[];
  timestamp: number;
}

export class PresenceManager {
  private users: Map<string, UserPresence> = new Map();
  private localUserId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private onUpdate: (users: UserPresence[]) => void;

  constructor(localUserId: string, onUpdate: (users: UserPresence[]) => void) {
    this.localUserId = localUserId;
    this.onUpdate = onUpdate;
  }

  start(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000);
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.users.clear();
  }

  handleUpdate(update: PresenceUpdate): void {
    const existing = this.users.get(update.userId);

    switch (update.type) {
      case 'join':
        this.users.set(update.userId, {
          id: update.userId,
          name: update.userName || 'Anonymous',
          color: update.userColor || this.generateColor(update.userId),
          lastSeen: update.timestamp,
          isActive: true,
        });
        break;

      case 'leave':
        this.users.delete(update.userId);
        break;

      case 'cursor':
        if (existing) {
          existing.cursor = update.cursor;
          existing.lastSeen = update.timestamp;
          existing.isActive = true;
        }
        break;

      case 'selection':
        if (existing) {
          existing.selection = update.selection;
          existing.lastSeen = update.timestamp;
        }
        break;

      case 'heartbeat':
        if (existing) {
          existing.lastSeen = update.timestamp;
          existing.isActive = true;
        }
        break;
    }

    this.notifyUpdate();
  }

  updateLocalCursor(cursor: CursorPosition): void {
    const local = this.users.get(this.localUserId);
    if (local) {
      local.cursor = cursor;
      local.lastSeen = Date.now();
    }
  }

  updateLocalSelection(selection: string[]): void {
    const local = this.users.get(this.localUserId);
    if (local) {
      local.selection = selection;
      local.lastSeen = Date.now();
    }
  }

  getUsers(): UserPresence[] {
    return Array.from(this.users.values()).filter((u) => u.id !== this.localUserId);
  }

  getUser(userId: string): UserPresence | undefined {
    return this.users.get(userId);
  }

  private sendHeartbeat(): void {
    const local = this.users.get(this.localUserId);
    if (local) {
      local.lastSeen = Date.now();
    }
  }

  private cleanupInactiveUsers(): void {
    const now = Date.now();
    const timeout = 120000;

    for (const [id, user] of this.users) {
      if (id !== this.localUserId && now - user.lastSeen > timeout) {
        this.users.delete(id);
      }
    }

    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    this.onUpdate(this.getUsers());
  }

  private generateColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  }
}

export function createPresenceUpdate(
  type: PresenceUpdate['type'],
  userId: string,
  data?: Partial<Omit<PresenceUpdate, 'type' | 'userId' | 'timestamp'>>
): PresenceUpdate {
  return {
    type,
    userId,
    timestamp: Date.now(),
    ...data,
  };
}
