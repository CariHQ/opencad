/**
 * PresenceManager Tests
 * T-COL-002: Real-time presence for multi-user editing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceManager, createPresenceUpdate } from './presence';

describe('T-COL-002: PresenceManager', () => {
  let manager: PresenceManager;
  const onUpdate = vi.fn();
  const now = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    manager = new PresenceManager('local-user', onUpdate);
    onUpdate.mockClear();
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  it('starts with no remote users', () => {
    expect(manager.getUsers()).toEqual([]);
  });

  it('join update adds user to presence', () => {
    manager.handleUpdate({
      type: 'join',
      userId: 'user-1',
      userName: 'Alice',
      userColor: '#ff0000',
      timestamp: now,
    });
    const users = manager.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Alice');
  });

  it('join update sets isActive to true', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    expect(manager.getUser('user-1')!.isActive).toBe(true);
  });

  it('join without name uses Anonymous', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    expect(manager.getUser('user-1')!.name).toBe('Anonymous');
  });

  it('leave update removes user from presence', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', userName: 'Alice', timestamp: now });
    manager.handleUpdate({ type: 'leave', userId: 'user-1', timestamp: now + 1000 });
    expect(manager.getUsers()).toHaveLength(0);
  });

  it('cursor update sets cursor position', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', userName: 'Bob', timestamp: now });
    manager.handleUpdate({
      type: 'cursor',
      userId: 'user-1',
      cursor: { x: 100, y: 200 },
      timestamp: now + 500,
    });
    expect(manager.getUser('user-1')!.cursor).toEqual({ x: 100, y: 200 });
  });

  it('selection update sets selection array', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    manager.handleUpdate({
      type: 'selection',
      userId: 'user-1',
      selection: ['el-1', 'el-2'],
      timestamp: now + 500,
    });
    expect(manager.getUser('user-1')!.selection).toEqual(['el-1', 'el-2']);
  });

  it('heartbeat updates lastSeen', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    manager.handleUpdate({ type: 'heartbeat', userId: 'user-1', timestamp: now + 5000 });
    expect(manager.getUser('user-1')!.lastSeen).toBe(now + 5000);
  });

  it('calls onUpdate callback on each state change', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    manager.handleUpdate({ type: 'leave', userId: 'user-1', timestamp: now + 1000 });
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('getUsers excludes local user', () => {
    manager.handleUpdate({ type: 'join', userId: 'local-user', timestamp: now });
    expect(manager.getUsers()).toHaveLength(0);
  });

  it('getUser returns user by ID', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', userName: 'Charlie', timestamp: now });
    const user = manager.getUser('user-1');
    expect(user?.name).toBe('Charlie');
  });

  it('getUser returns undefined for unknown ID', () => {
    expect(manager.getUser('unknown')).toBeUndefined();
  });

  it('stop clears all users', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    manager.stop();
    expect(manager.getUsers()).toHaveLength(0);
  });

  it('multiple users can join', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', userName: 'Alice', timestamp: now });
    manager.handleUpdate({ type: 'join', userId: 'user-2', userName: 'Bob', timestamp: now });
    manager.handleUpdate({ type: 'join', userId: 'user-3', userName: 'Charlie', timestamp: now });
    expect(manager.getUsers()).toHaveLength(3);
  });

  it('generates deterministic color for same userId', () => {
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    const color1 = manager.getUser('user-1')!.color;
    manager.stop();
    manager = new PresenceManager('local-user', onUpdate);
    manager.handleUpdate({ type: 'join', userId: 'user-1', timestamp: now });
    const color2 = manager.getUser('user-1')!.color;
    expect(color1).toBe(color2);
  });
});

describe('createPresenceUpdate', () => {
  it('creates update with type and userId', () => {
    const update = createPresenceUpdate('join', 'user-1', { userName: 'Alice' });
    expect(update.type).toBe('join');
    expect(update.userId).toBe('user-1');
    expect(update.userName).toBe('Alice');
  });

  it('includes timestamp', () => {
    const before = Date.now();
    const update = createPresenceUpdate('cursor', 'user-1');
    const after = Date.now();
    expect(update.timestamp).toBeGreaterThanOrEqual(before);
    expect(update.timestamp).toBeLessThanOrEqual(after);
  });

  it('spreads additional data', () => {
    const cursor = { x: 50, y: 75 };
    const update = createPresenceUpdate('cursor', 'user-1', { cursor });
    expect(update.cursor).toEqual(cursor);
  });
});
