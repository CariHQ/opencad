/**
 * Sync Latency Tracker
 * Measures round-trip operation latency for real-time sync
 * T-COL-004
 */

export interface LatencySample {
  opId: string;
  latencyMs: number;
  timestamp: number;
}

export interface LatencyTrackerOptions {
  maxSamples?: number;
}

export class LatencyTracker {
  private readonly _samples: LatencySample[] = [];
  private readonly _pending = new Map<string, number>();
  private readonly _maxSamples: number;

  constructor(options: LatencyTrackerOptions = {}) {
    this._maxSamples = options.maxSamples ?? 1000;
  }

  /** Record the time an operation was sent. */
  markSent(opId: string): void {
    this._pending.set(opId, performance.now());
  }

  /** Record when the server acknowledged an operation and compute latency. */
  markAcknowledged(opId: string): void {
    const sentAt = this._pending.get(opId);
    if (sentAt === undefined) return;
    this._pending.delete(opId);
    this._addSample({
      opId,
      latencyMs: performance.now() - sentAt,
      timestamp: Date.now(),
    });
  }

  /** Inject a pre-computed sample (for testing / simulation). */
  injectSample(sample: LatencySample): void {
    this._addSample(sample);
  }

  getSamples(): LatencySample[] {
    return [...this._samples];
  }

  averageLatencyMs(): number {
    if (this._samples.length === 0) return 0;
    const sum = this._samples.reduce((acc, s) => acc + s.latencyMs, 0);
    return sum / this._samples.length;
  }

  p95LatencyMs(): number | null {
    if (this._samples.length === 0) return null;
    const sorted = [...this._samples].map((s) => s.latencyMs).sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)]!;
  }

  clear(): void {
    this._samples.length = 0;
    this._pending.clear();
  }

  private _addSample(sample: LatencySample): void {
    this._samples.push(sample);
    // Trim oldest samples if over limit
    if (this._samples.length > this._maxSamples) {
      this._samples.splice(0, this._samples.length - this._maxSamples);
    }
  }
}
