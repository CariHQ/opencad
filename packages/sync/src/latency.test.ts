/**
 * Latency Tracker Tests
 * T-COL-004: Sync latency < 200ms for remote edits
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LatencyTracker, type LatencySample } from './latency';

describe('T-COL-004: LatencyTracker', () => {
  let tracker: LatencyTracker;

  beforeEach(() => {
    tracker = new LatencyTracker();
  });

  it('starts with no samples', () => {
    expect(tracker.getSamples()).toHaveLength(0);
  });

  it('averageLatencyMs returns 0 when no samples', () => {
    expect(tracker.averageLatencyMs()).toBe(0);
  });

  it('p95LatencyMs returns null when no samples', () => {
    expect(tracker.p95LatencyMs()).toBeNull();
  });

  it('injectSample adds a sample', () => {
    const sample: LatencySample = { opId: 'op-1', latencyMs: 50, timestamp: Date.now() };
    tracker.injectSample(sample);
    expect(tracker.getSamples()).toHaveLength(1);
  });

  it('averageLatencyMs computes mean across samples', () => {
    tracker.injectSample({ opId: 'op-1', latencyMs: 100, timestamp: 1 });
    tracker.injectSample({ opId: 'op-2', latencyMs: 200, timestamp: 2 });
    tracker.injectSample({ opId: 'op-3', latencyMs: 300, timestamp: 3 });
    expect(tracker.averageLatencyMs()).toBe(200);
  });

  it('p95LatencyMs returns correct percentile', () => {
    for (let i = 1; i <= 100; i++) {
      tracker.injectSample({ opId: `op-${i}`, latencyMs: i, timestamp: i });
    }
    const p95 = tracker.p95LatencyMs();
    expect(p95).not.toBeNull();
    expect(p95!).toBeGreaterThanOrEqual(95);
  });

  it('p95LatencyMs with single sample returns that value', () => {
    tracker.injectSample({ opId: 'op-1', latencyMs: 42, timestamp: 1 });
    expect(tracker.p95LatencyMs()).toBe(42);
  });

  it('clear() removes all samples', () => {
    tracker.injectSample({ opId: 'op-1', latencyMs: 50, timestamp: 1 });
    tracker.injectSample({ opId: 'op-2', latencyMs: 100, timestamp: 2 });
    tracker.clear();
    expect(tracker.getSamples()).toHaveLength(0);
    expect(tracker.averageLatencyMs()).toBe(0);
  });

  it('respects maxSamples limit', () => {
    const limited = new LatencyTracker({ maxSamples: 3 });
    for (let i = 0; i < 10; i++) {
      limited.injectSample({ opId: `op-${i}`, latencyMs: i * 10, timestamp: i });
    }
    expect(limited.getSamples()).toHaveLength(3);
  });

  it('keeps most recent samples when max exceeded', () => {
    const limited = new LatencyTracker({ maxSamples: 3 });
    for (let i = 0; i < 5; i++) {
      limited.injectSample({ opId: `op-${i}`, latencyMs: i * 10, timestamp: i });
    }
    const samples = limited.getSamples();
    // The last 3 samples should be retained
    expect(samples.map((s) => s.latencyMs)).toEqual([20, 30, 40]);
  });

  it('getSamples returns a copy (not the internal array)', () => {
    tracker.injectSample({ opId: 'op-1', latencyMs: 50, timestamp: 1 });
    const samples = tracker.getSamples();
    samples.push({ opId: 'injected', latencyMs: 999, timestamp: 999 });
    expect(tracker.getSamples()).toHaveLength(1);
  });

  it('markSent and markAcknowledged compute latency', () => {
    vi.useFakeTimers();
    const now = 1000;
    vi.setSystemTime(now);

    // Mock performance.now to return deterministic values
    let perfNow = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => perfNow);

    perfNow = 0;
    tracker.markSent('op-1');
    perfNow = 75;
    tracker.markAcknowledged('op-1');

    const samples = tracker.getSamples();
    expect(samples).toHaveLength(1);
    expect(samples[0].latencyMs).toBeCloseTo(75, 1);

    vi.useRealTimers();
  });

  it('markAcknowledged for unknown op is a no-op', () => {
    tracker.markAcknowledged('never-sent');
    expect(tracker.getSamples()).toHaveLength(0);
  });

  it('markAcknowledged removes from pending after measurement', () => {
    vi.useFakeTimers();
    let perfNow = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => perfNow);

    tracker.markSent('op-1');
    tracker.markAcknowledged('op-1');
    // Second ack for same op should be no-op
    perfNow = 200;
    tracker.markAcknowledged('op-1');

    expect(tracker.getSamples()).toHaveLength(1);
    vi.useRealTimers();
  });
});
