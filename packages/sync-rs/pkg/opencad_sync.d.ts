/* tslint:disable */
/* eslint-disable */

export class DocumentCrdt {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Convenience alias for merging a batch snapshot (same as `merge_remote`
     * but named to communicate intent at the call site).
     */
    apply_batch(batch_json: string): void;
    /**
     * Replace the whole value of an element.  Returns a JSON delta to
     * broadcast to every connected peer via the sync channel.
     */
    apply_local(element_id: string, value_json: string): string;
    /**
     * Update a single named property of an element without replacing the rest.
     *
     * Concurrent edits to *different* properties of the same element from
     * different peers will both survive (property-level LWW merge).
     * Returns a JSON delta to broadcast.
     */
    apply_property(element_id: string, prop: string, value_json: string): string;
    /**
     * All known peer cursor positions as JSON:
     * `{ peerId: { x, y, element_id, seq }, ... }`.
     */
    cursors_json(): string;
    /**
     * Delete an element (tombstone).
     *
     * The tombstone competes with any live entry using the same LWW rule.
     * A later `apply_local` with a higher lamport will resurrect the element.
     * Returns a JSON delta to broadcast.
     */
    delete_element(element_id: string): string;
    /**
     * JSON array of element IDs that have been tombstoned (deleted).
     */
    deleted_ids_json(): string;
    /**
     * Number of live (non-deleted) elements.
     */
    element_count(): number;
    /**
     * Serialise the full local state as a `Batch` delta.
     *
     * Use this to bring a newly connected peer up to date: call
     * `full_state_delta_json()` on the server-side/authoritative replica and
     * send the result to the joining peer who calls `apply_batch()` on it.
     */
    full_state_delta_json(): string;
    /**
     * Apply a remote peer's presence broadcast.  Older sequence numbers are
     * silently ignored (out-of-order delivery is safe).
     */
    merge_presence(presence_json: string): void;
    /**
     * Apply a remote delta received from another peer (single op or batch).
     */
    merge_remote(delta_json: string): void;
    /**
     * Create a new CRDT instance for the given peer.  `peer_id` must be
     * globally unique (e.g. a UUID generated on the client).
     */
    constructor(peer_id: string);
    /**
     * Remove a peer from the presence map (call on disconnect).
     */
    remove_peer_presence(peer_id: string): void;
    /**
     * Current document state as a JSON object `{ elementId: value, ... }`.
     *
     * Deleted (tombstoned) elements are excluded.  Values reflect the merged
     * view of whole-element and property-level writes.
     */
    state_json(): string;
    /**
     * Record this peer's cursor position and optional hovered element ID.
     *
     * Pass an empty string for `element_id` to indicate "no element hovered".
     * Returns a JSON presence broadcast to send to peers (not a CRDT delta —
     * peers call `merge_presence` rather than `merge_remote`).
     */
    update_presence(x: number, y: number, element_id: string): string;
    /**
     * Vector clock as JSON: `{ peerId: highestLamport, ... }`.
     */
    vector_clock(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_documentcrdt_free: (a: number, b: number) => void;
    readonly documentcrdt_new: (a: number, b: number) => number;
    readonly documentcrdt_apply_local: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly documentcrdt_apply_property: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly documentcrdt_delete_element: (a: number, b: number, c: number) => [number, number];
    readonly documentcrdt_merge_remote: (a: number, b: number, c: number) => void;
    readonly documentcrdt_apply_batch: (a: number, b: number, c: number) => void;
    readonly documentcrdt_state_json: (a: number) => [number, number];
    readonly documentcrdt_deleted_ids_json: (a: number) => [number, number];
    readonly documentcrdt_full_state_delta_json: (a: number) => [number, number];
    readonly documentcrdt_vector_clock: (a: number) => [number, number];
    readonly documentcrdt_element_count: (a: number) => number;
    readonly documentcrdt_update_presence: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly documentcrdt_merge_presence: (a: number, b: number, c: number) => void;
    readonly documentcrdt_cursors_json: (a: number) => [number, number];
    readonly documentcrdt_remove_peer_presence: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
