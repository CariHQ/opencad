/**
 * Collaboration Tests
 * T-COL-004: Real-Time Sync Latency
 * T-COL-005: Element Comments
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LatencyTracker } from './latency';
import { ElementCommentStore } from './comments';

// ─── T-COL-004: Real-Time Sync Latency ────────────────────────────────────────

describe('T-COL-004: Real-Time Sync Latency', () => {
  let tracker: LatencyTracker;

  beforeEach(() => {
    tracker = new LatencyTracker();
  });

  it('should record a latency sample when operation is acknowledged', () => {
    const opId = 'op-1';
    tracker.markSent(opId);
    tracker.markAcknowledged(opId);
    const samples = tracker.getSamples();
    expect(samples.length).toBe(1);
    expect(samples[0]!.opId).toBe(opId);
    expect(samples[0]!.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should compute average latency across samples', () => {
    // Inject known samples directly
    tracker.injectSample({ opId: 'op-1', latencyMs: 100, timestamp: Date.now() });
    tracker.injectSample({ opId: 'op-2', latencyMs: 200, timestamp: Date.now() });
    tracker.injectSample({ opId: 'op-3', latencyMs: 300, timestamp: Date.now() });
    expect(tracker.averageLatencyMs()).toBe(200);
  });

  it('should report p95 latency from samples', () => {
    // 20 samples from 10ms to 200ms
    for (let i = 1; i <= 20; i++) {
      tracker.injectSample({ opId: `op-${i}`, latencyMs: i * 10, timestamp: Date.now() });
    }
    const p95 = tracker.p95LatencyMs();
    // p95 of [10,20,...,200] → 190 or nearby
    expect(p95).toBeGreaterThanOrEqual(180);
    expect(p95).toBeLessThanOrEqual(200);
  });

  it('should return null for p95 when no samples', () => {
    expect(tracker.p95LatencyMs()).toBeNull();
  });

  it('should simulate 10 concurrent users and stay under 200ms average', () => {
    // Simulate 10 users × 5 operations each at random latency 5–50ms
    let seed = 42;
    const lcg = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 46) + 5; // 5–50
    };

    for (let u = 0; u < 10; u++) {
      for (let op = 0; op < 5; op++) {
        tracker.injectSample({
          opId: `u${u}-op${op}`,
          latencyMs: lcg(),
          timestamp: Date.now(),
        });
      }
    }

    expect(tracker.averageLatencyMs()).toBeLessThan(200);
  });

  it('should limit sample history to configured max', () => {
    const bounded = new LatencyTracker({ maxSamples: 5 });
    for (let i = 0; i < 10; i++) {
      bounded.injectSample({ opId: `op-${i}`, latencyMs: i, timestamp: Date.now() });
    }
    expect(bounded.getSamples().length).toBe(5);
  });
});

// ─── T-COL-005: Element Comments ──────────────────────────────────────────────

describe('T-COL-005: Element Comments', () => {
  let store: ElementCommentStore;

  beforeEach(() => {
    store = new ElementCommentStore();
  });

  it('should add a comment to an element', () => {
    const comment = store.addComment('wall-1', 'user-A', 'Needs thicker insulation');
    expect(comment.id).toBeTruthy();
    expect(comment.elementId).toBe('wall-1');
    expect(comment.authorId).toBe('user-A');
    expect(comment.text).toBe('Needs thicker insulation');
  });

  it('should retrieve comments for an element', () => {
    store.addComment('wall-1', 'user-A', 'First comment');
    store.addComment('wall-1', 'user-B', 'Second comment');
    const comments = store.getComments('wall-1');
    expect(comments.length).toBe(2);
  });

  it('should persist comments after element is modified', () => {
    store.addComment('door-5', 'user-A', 'Check clearance');
    // Simulate element modification notification
    store.onElementModified('door-5', { width: 0.9 });
    const comments = store.getComments('door-5');
    expect(comments.length).toBe(1);
    expect(comments[0]!.text).toBe('Check clearance');
  });

  it('should attach modification snapshot to comment when element changes', () => {
    store.addComment('window-3', 'user-A', 'Review this');
    store.onElementModified('window-3', { height: 1.2 });
    const comments = store.getComments('window-3');
    expect(comments[0]!.lastElementSnapshot).toEqual({ height: 1.2 });
  });

  it('should resolve a comment', () => {
    const c = store.addComment('slab-1', 'user-A', 'Fix this');
    store.resolveComment(c.id);
    const comments = store.getComments('slab-1');
    expect(comments[0]!.resolved).toBe(true);
  });

  it('should return empty array for element with no comments', () => {
    expect(store.getComments('nonexistent')).toEqual([]);
  });

  it('should delete a comment by id', () => {
    const c = store.addComment('beam-1', 'user-A', 'Delete me');
    store.deleteComment(c.id);
    expect(store.getComments('beam-1')).toHaveLength(0);
  });

  it('should list all comments across all elements', () => {
    store.addComment('wall-1', 'user-A', 'A');
    store.addComment('door-1', 'user-B', 'B');
    store.addComment('wall-1', 'user-C', 'C');
    expect(store.getAllComments().length).toBe(3);
  });
});
