import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WASM module — tests verify the TS adapter contract, not WASM internals
vi.mock('../pkg/opencad_sync.js', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  DocumentCrdt: class MockCrdt {
    private _state: Record<string, unknown> = {};
    private _clock: Record<string, number> = {};
    private _lamport = 0;
    constructor(private peerId: string) {}
    applyLocal(id: string, json: string) {
      this._lamport++;
      this._state[id] = JSON.parse(json) as unknown;
      this._clock[this.peerId] = (this._clock[this.peerId] ?? 0) + 1;
      return JSON.stringify({
        element_id: id,
        entry: { value: JSON.parse(json) as unknown, lamport: this._lamport, peer_id: this.peerId },
      });
    }
    mergeRemote(deltaJson: string) {
      const d = JSON.parse(deltaJson) as { element_id: string; entry: { value: unknown } };
      this._state[d.element_id] = d.entry.value;
    }
    stateJson()    { return JSON.stringify(this._state); }
    vectorClock()  { return JSON.stringify(this._clock); }
    elementCount() { return Object.keys(this._state).length; }
  },
}));

import { initSync, createDocumentCrdt } from './index';

beforeEach(async () => {
  await initSync();
});

describe('T-COL-TS-001: DocumentCrdt TS adapter', () => {
  it('returns an object with the required API surface', () => {
    const crdt = createDocumentCrdt('p1');
    expect(typeof crdt.applyLocal).toBe('function');
    expect(typeof crdt.mergeRemote).toBe('function');
    expect(typeof crdt.stateJson).toBe('function');
    expect(typeof crdt.vectorClock).toBe('function');
    expect(typeof crdt.elementCount).toBe('function');
  });

  it('applyLocal returns a parseable delta JSON string', () => {
    const crdt = createDocumentCrdt('p1');
    const delta = crdt.applyLocal('elem1', '{"x":10}');
    const parsed = JSON.parse(delta) as { element_id: string };
    expect(parsed.element_id).toBe('elem1');
  });

  it('stateJson reflects applied local updates', () => {
    const crdt = createDocumentCrdt('p1');
    crdt.applyLocal('wall1', '{"type":"wall"}');
    const state = JSON.parse(crdt.stateJson()) as Record<string, unknown>;
    expect(state['wall1']).toBeDefined();
  });

  it('mergeRemote incorporates a delta from another peer', () => {
    const a = createDocumentCrdt('a');
    const b = createDocumentCrdt('b');
    const delta = a.applyLocal('elem1', '{"x":99}');
    b.mergeRemote(delta);
    const state = JSON.parse(b.stateJson()) as Record<string, unknown>;
    expect(state['elem1']).toBeDefined();
  });

  it('elementCount tracks the number of distinct elements', () => {
    const crdt = createDocumentCrdt('p');
    expect(crdt.elementCount()).toBe(0);
    crdt.applyLocal('e1', '{}');
    crdt.applyLocal('e2', '{}');
    expect(crdt.elementCount()).toBe(2);
  });
});
