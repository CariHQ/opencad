/// OpenCAD Sync WASM — Last-Write-Wins CRDT for document elements.
///
/// ## Design
///
/// Each document element is an LWW register keyed by element ID.  Updates carry
/// a Lamport timestamp + peer ID; the register keeps whichever write has the
/// higher (lamport, peer_id) tuple (peer_id breaks ties deterministically).
///
/// ### Extensions over the baseline LWW
///
/// * **Tombstones** — deletes propagate as tombstone records.  A live entry
///   only wins over a tombstone if its lamport timestamp is strictly higher.
///   This prevents resurrection by concurrent or reordered writes.
///
/// * **Property-level granularity** — `apply_property` writes a single element
///   property rather than replacing the whole value.  Each property is its own
///   LWW register, so concurrent edits to *different* properties of the same
///   element both survive.  `state_json` returns the merged view.
///
/// * **Batch delta** — `full_state_delta_json` serialises the entire local
///   state (entries + property patches + tombstones) as a single JSON batch.
///   New peers call `apply_batch` to fast-forward to the current state.
///
/// * **Presence** — ephemeral cursor positions are tracked per peer via a
///   monotonic sequence number.  Presence is NOT a CRDT; it is last-observed-
///   write-wins and is never included in durable state snapshots.

use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

// ── LWW primitives ────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
struct LwwEntry {
    value: serde_json::Value,
    lamport: u64,
    peer_id: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct Tombstone {
    lamport: u64,
    peer_id: String,
}

// ── Delta (wire format) ───────────────────────────────────────────────────────

/// All operations use a tagged union serialised as `{ "op": "<tag>", ... }`.
#[derive(Serialize, Deserialize)]
#[serde(tag = "op")]
enum Delta {
    /// Replace a whole element value.
    Set {
        element_id: String,
        entry: LwwEntry,
    },
    /// Update a single property of an element (fine-grained LWW).
    SetProp {
        element_id: String,
        prop: String,
        entry: LwwEntry,
    },
    /// Mark an element as deleted (tombstone).
    Delete {
        element_id: String,
        lamport: u64,
        peer_id: String,
    },
    /// Envelope for an ordered list of deltas (used for snapshots).
    Batch {
        deltas: Vec<Delta>,
    },
}

// ── Presence (ephemeral) ──────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
struct CursorState {
    x: f64,
    y: f64,
    /// The element this cursor is hovering over, or `null`.
    element_id: Option<String>,
    /// Monotonically increasing per peer; older updates are dropped.
    seq: u64,
}

/// Outer envelope used by `merge_presence`.
#[derive(Deserialize)]
struct PresenceMessage {
    peer_id: String,
    cursor: CursorState,
}

// ── DocumentCrdt ──────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct DocumentCrdt {
    peer_id: String,
    lamport: u64,
    /// Whole-element LWW entries.
    entries: HashMap<String, LwwEntry>,
    /// Tombstones: element_id → winning delete record.
    tombstones: HashMap<String, Tombstone>,
    /// Property-level LWW: element_id → (prop_name → LwwEntry).
    prop_entries: HashMap<String, HashMap<String, LwwEntry>>,
    /// Vector clock: peer_id → highest observed lamport for that peer.
    vector_clock: HashMap<String, u64>,
    /// Ephemeral cursor state: peer_id → CursorState.
    cursors: HashMap<String, CursorState>,
    /// Local cursor sequence number (incremented on each `update_presence`).
    cursor_seq: u64,
}

// ── Internal helpers ─────────────────────────────────────────────────────────

impl DocumentCrdt {
    /// Increment the local Lamport clock and vector-clock entry, return new value.
    fn advance_lamport(&mut self) -> u64 {
        self.lamport += 1;
        *self.vector_clock.entry(self.peer_id.clone()).or_insert(0) += 1;
        self.lamport
    }

    /// Advance local clock to be at least `remote_lamport + 1` and record the
    /// remote peer's clock.
    fn observe_remote(&mut self, remote_lamport: u64, remote_peer: &str) {
        if remote_lamport >= self.lamport {
            self.lamport = remote_lamport + 1;
        }
        let slot = self.vector_clock.entry(remote_peer.to_string()).or_insert(0);
        if remote_lamport > *slot {
            *slot = remote_lamport;
        }
    }

    /// Returns `true` if `incoming` should replace `existing` (LWW rule).
    fn lww_wins(incoming_lamport: u64, incoming_peer: &str,
                existing_lamport: u64, existing_peer: &str) -> bool {
        incoming_lamport > existing_lamport
            || (incoming_lamport == existing_lamport && incoming_peer > existing_peer)
    }

    /// Returns `true` if this element is currently tombstoned.
    ///
    /// Tombstone wins over the whole-element entry using the same LWW rule.
    /// Property-only elements (no whole-element entry) are always deleted by a
    /// tombstone — use `apply_local` to resurrect after deletion.
    fn is_deleted(&self, element_id: &str) -> bool {
        let stone = match self.tombstones.get(element_id) {
            Some(s) => s,
            None => return false,
        };
        match self.entries.get(element_id) {
            None => true, // tombstone wins over absence
            Some(e) => Self::lww_wins(stone.lamport, &stone.peer_id, e.lamport, &e.peer_id),
        }
    }

    /// Build the merged element value from whole-element + property patches.
    ///
    /// Property patches newer than the last whole-element write override
    /// individual keys.  If only property patches exist (no whole-element
    /// entry), the value is built entirely from those patches.
    fn merged_element_value(&self, element_id: &str) -> Option<serde_json::Value> {
        let whole = self.entries.get(element_id);
        let props = self.prop_entries.get(element_id);

        match (whole, props) {
            (None, None) => None,

            (Some(e), None) => Some(e.value.clone()),

            (None, Some(p)) => {
                let mut obj = serde_json::Map::new();
                for (k, v) in p {
                    obj.insert(k.clone(), v.value.clone());
                }
                Some(serde_json::Value::Object(obj))
            }

            (Some(e), Some(p)) => {
                // Start from the whole-element value.
                let mut obj = match &e.value {
                    serde_json::Value::Object(m) => m.clone(),
                    other => {
                        // Non-object whole value: store it under a sentinel key.
                        let mut m = serde_json::Map::new();
                        m.insert("~value".to_string(), other.clone());
                        m
                    }
                };

                // Apply property patches that are newer than the whole-element write.
                for (k, pe) in p {
                    if Self::lww_wins(pe.lamport, &pe.peer_id, e.lamport, &e.peer_id) {
                        obj.insert(k.clone(), pe.value.clone());
                    }
                }

                Some(serde_json::Value::Object(obj))
            }
        }
    }

    /// Recursively apply a single delta (handles Batch by iterating children).
    fn apply_delta(&mut self, delta: Delta) {
        match delta {
            Delta::Set { element_id, entry } => {
                self.observe_remote(entry.lamport, &entry.peer_id.clone());
                let wins = match self.entries.get(&element_id) {
                    None => true,
                    Some(ex) => Self::lww_wins(entry.lamport, &entry.peer_id, ex.lamport, &ex.peer_id),
                };
                if wins {
                    self.entries.insert(element_id, entry);
                }
            }

            Delta::SetProp { element_id, prop, entry } => {
                self.observe_remote(entry.lamport, &entry.peer_id.clone());
                let props = self.prop_entries.entry(element_id).or_default();
                let wins = match props.get(&prop) {
                    None => true,
                    Some(ex) => Self::lww_wins(entry.lamport, &entry.peer_id, ex.lamport, &ex.peer_id),
                };
                if wins {
                    props.insert(prop, entry);
                }
            }

            Delta::Delete { element_id, lamport, peer_id } => {
                self.observe_remote(lamport, &peer_id);
                let wins = match self.tombstones.get(&element_id) {
                    None => true,
                    Some(ex) => Self::lww_wins(lamport, &peer_id, ex.lamport, &ex.peer_id),
                };
                if wins {
                    self.tombstones.insert(element_id, Tombstone { lamport, peer_id });
                }
            }

            Delta::Batch { deltas } => {
                for d in deltas {
                    self.apply_delta(d);
                }
            }
        }
    }
}

// ── Public WASM API ───────────────────────────────────────────────────────────

#[wasm_bindgen]
impl DocumentCrdt {
    /// Create a new CRDT instance for the given peer.  `peer_id` must be
    /// globally unique (e.g. a UUID generated on the client).
    #[wasm_bindgen(constructor)]
    pub fn new(peer_id: &str) -> DocumentCrdt {
        DocumentCrdt {
            peer_id: peer_id.to_string(),
            lamport: 0,
            entries: HashMap::new(),
            tombstones: HashMap::new(),
            prop_entries: HashMap::new(),
            vector_clock: HashMap::new(),
            cursors: HashMap::new(),
            cursor_seq: 0,
        }
    }

    // ── Local writes ─────────────────────────────────────────────────────────

    /// Replace the whole value of an element.  Returns a JSON delta to
    /// broadcast to every connected peer via the sync channel.
    pub fn apply_local(&mut self, element_id: &str, value_json: &str) -> String {
        let lamport = self.advance_lamport();
        let value = serde_json::from_str(value_json).unwrap_or(serde_json::Value::Null);
        let entry = LwwEntry { value, lamport, peer_id: self.peer_id.clone() };
        self.entries.insert(element_id.to_string(), entry.clone());

        let delta = Delta::Set { element_id: element_id.to_string(), entry };
        serde_json::to_string(&delta).unwrap_or_default()
    }

    /// Update a single named property of an element without replacing the rest.
    ///
    /// Concurrent edits to *different* properties of the same element from
    /// different peers will both survive (property-level LWW merge).
    /// Returns a JSON delta to broadcast.
    pub fn apply_property(&mut self, element_id: &str, prop: &str, value_json: &str) -> String {
        let lamport = self.advance_lamport();
        let value = serde_json::from_str(value_json).unwrap_or(serde_json::Value::Null);
        let entry = LwwEntry { value, lamport, peer_id: self.peer_id.clone() };

        self.prop_entries
            .entry(element_id.to_string())
            .or_default()
            .insert(prop.to_string(), entry.clone());

        let delta = Delta::SetProp {
            element_id: element_id.to_string(),
            prop: prop.to_string(),
            entry,
        };
        serde_json::to_string(&delta).unwrap_or_default()
    }

    /// Delete an element (tombstone).
    ///
    /// The tombstone competes with any live entry using the same LWW rule.
    /// A later `apply_local` with a higher lamport will resurrect the element.
    /// Returns a JSON delta to broadcast.
    pub fn delete_element(&mut self, element_id: &str) -> String {
        let lamport = self.advance_lamport();
        self.tombstones.insert(
            element_id.to_string(),
            Tombstone { lamport, peer_id: self.peer_id.clone() },
        );

        let delta = Delta::Delete {
            element_id: element_id.to_string(),
            lamport,
            peer_id: self.peer_id.clone(),
        };
        serde_json::to_string(&delta).unwrap_or_default()
    }

    // ── Remote merge ─────────────────────────────────────────────────────────

    /// Apply a remote delta received from another peer (single op or batch).
    pub fn merge_remote(&mut self, delta_json: &str) {
        let delta: Delta = match serde_json::from_str(delta_json) {
            Ok(d) => d,
            Err(_) => return,
        };
        self.apply_delta(delta);
    }

    /// Convenience alias for merging a batch snapshot (same as `merge_remote`
    /// but named to communicate intent at the call site).
    pub fn apply_batch(&mut self, batch_json: &str) {
        self.merge_remote(batch_json);
    }

    // ── State queries ────────────────────────────────────────────────────────

    /// Current document state as a JSON object `{ elementId: value, ... }`.
    ///
    /// Deleted (tombstoned) elements are excluded.  Values reflect the merged
    /// view of whole-element and property-level writes.
    pub fn state_json(&self) -> String {
        let mut all_ids: HashSet<&str> = HashSet::new();
        for k in self.entries.keys() {
            all_ids.insert(k);
        }
        for k in self.prop_entries.keys() {
            all_ids.insert(k);
        }

        let mut state = serde_json::Map::new();
        for id in all_ids {
            if self.is_deleted(id) {
                continue;
            }
            if let Some(v) = self.merged_element_value(id) {
                state.insert(id.to_string(), v);
            }
        }
        serde_json::to_string(&state).unwrap_or_default()
    }

    /// JSON array of element IDs that have been tombstoned (deleted).
    pub fn deleted_ids_json(&self) -> String {
        let ids: Vec<&str> = self.tombstones.keys().map(|s| s.as_str()).collect();
        serde_json::to_string(&ids).unwrap_or_default()
    }

    /// Serialise the full local state as a `Batch` delta.
    ///
    /// Use this to bring a newly connected peer up to date: call
    /// `full_state_delta_json()` on the server-side/authoritative replica and
    /// send the result to the joining peer who calls `apply_batch()` on it.
    pub fn full_state_delta_json(&self) -> String {
        let mut deltas: Vec<Delta> = Vec::new();

        for (id, entry) in &self.entries {
            deltas.push(Delta::Set { element_id: id.clone(), entry: entry.clone() });
        }

        for (element_id, props) in &self.prop_entries {
            for (prop, entry) in props {
                deltas.push(Delta::SetProp {
                    element_id: element_id.clone(),
                    prop: prop.clone(),
                    entry: entry.clone(),
                });
            }
        }

        for (id, stone) in &self.tombstones {
            deltas.push(Delta::Delete {
                element_id: id.clone(),
                lamport: stone.lamport,
                peer_id: stone.peer_id.clone(),
            });
        }

        let batch = Delta::Batch { deltas };
        serde_json::to_string(&batch).unwrap_or_default()
    }

    /// Vector clock as JSON: `{ peerId: highestLamport, ... }`.
    pub fn vector_clock(&self) -> String {
        serde_json::to_string(&self.vector_clock).unwrap_or_default()
    }

    /// Number of live (non-deleted) elements.
    pub fn element_count(&self) -> usize {
        let mut all: HashSet<&str> = HashSet::new();
        for k in self.entries.keys() {
            all.insert(k);
        }
        for k in self.prop_entries.keys() {
            all.insert(k);
        }
        all.into_iter().filter(|id| !self.is_deleted(id)).count()
    }

    // ── Presence ─────────────────────────────────────────────────────────────

    /// Record this peer's cursor position and optional hovered element ID.
    ///
    /// Pass an empty string for `element_id` to indicate "no element hovered".
    /// Returns a JSON presence broadcast to send to peers (not a CRDT delta —
    /// peers call `merge_presence` rather than `merge_remote`).
    pub fn update_presence(&mut self, x: f64, y: f64, element_id: &str) -> String {
        self.cursor_seq += 1;
        let eid = if element_id.is_empty() { None } else { Some(element_id.to_string()) };
        let state = CursorState { x, y, element_id: eid, seq: self.cursor_seq };
        self.cursors.insert(self.peer_id.clone(), state.clone());

        let payload = serde_json::json!({
            "peer_id": &self.peer_id,
            "cursor": state,
        });
        serde_json::to_string(&payload).unwrap_or_default()
    }

    /// Apply a remote peer's presence broadcast.  Older sequence numbers are
    /// silently ignored (out-of-order delivery is safe).
    pub fn merge_presence(&mut self, presence_json: &str) {
        let msg: PresenceMessage = match serde_json::from_str(presence_json) {
            Ok(m) => m,
            Err(_) => return,
        };
        let existing_seq = self.cursors.get(&msg.peer_id).map(|c| c.seq).unwrap_or(0);
        if msg.cursor.seq > existing_seq {
            self.cursors.insert(msg.peer_id, msg.cursor);
        }
    }

    /// All known peer cursor positions as JSON:
    /// `{ peerId: { x, y, element_id, seq }, ... }`.
    pub fn cursors_json(&self) -> String {
        serde_json::to_string(&self.cursors).unwrap_or_default()
    }

    /// Remove a peer from the presence map (call on disconnect).
    pub fn remove_peer_presence(&mut self, peer_id: &str) {
        self.cursors.remove(peer_id);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Original baseline tests (unchanged) ───────────────────────────────────

    #[test]
    fn t_col_rs_001_concurrent_updates_converge() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        let da = a.apply_local("elem1", r#"{"x":0}"#);
        let db = b.apply_local("elem1", r#"{"x":100}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        assert_eq!(a.state_json(), b.state_json(), "Both peers must converge");
    }

    #[test]
    fn t_col_rs_002_non_conflicting_updates_both_preserved() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        let da = a.apply_local("wall1", r#"{"type":"wall"}"#);
        let db = b.apply_local("wall2", r#"{"type":"wall"}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert!(state.get("wall1").is_some(), "wall1 must be in peer_a");
        assert!(state.get("wall2").is_some(), "wall2 must be in peer_a");
        assert_eq!(a.element_count(), 2);
        assert_eq!(b.element_count(), 2);
    }

    #[test]
    fn t_col_rs_003_higher_lamport_wins_conflict() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        b.apply_local("elem1", r#"{"x":1}"#);
        let db = b.apply_local("elem1", r#"{"x":999}"#);
        let da = a.apply_local("elem1", r#"{"x":0}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        let sa: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        let sb: serde_json::Value = serde_json::from_str(&b.state_json()).unwrap();
        assert_eq!(sa["elem1"]["x"], 999, "peer_a should have x=999");
        assert_eq!(sb["elem1"]["x"], 999, "peer_b should have x=999");
    }

    #[test]
    fn t_col_rs_004_merge_is_idempotent() {
        let mut a = DocumentCrdt::new("a");
        let delta = a.apply_local("elem1", r#"{"x":42}"#);

        let mut b = DocumentCrdt::new("b");
        b.merge_remote(&delta);
        let s1 = b.state_json();
        b.merge_remote(&delta);
        let s2 = b.state_json();
        b.merge_remote(&delta);
        let s3 = b.state_json();

        assert_eq!(s1, s2);
        assert_eq!(s2, s3);
    }

    #[test]
    fn t_col_rs_005_vector_clock_advances() {
        let mut peer = DocumentCrdt::new("alice");
        peer.apply_local("e1", "{}");
        peer.apply_local("e2", "{}");
        peer.apply_local("e3", "{}");

        let vc: serde_json::Value = serde_json::from_str(&peer.vector_clock()).unwrap();
        assert_eq!(vc["alice"], 3, "alice clock should be 3 after 3 updates");
    }

    // ── Tombstone / delete ────────────────────────────────────────────────────

    #[test]
    fn t_col_rs_006_tombstone_wins_over_older_live_entry() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        // a creates elem1 at lamport=1
        let da = a.apply_local("elem1", r#"{"x":10}"#);
        b.merge_remote(&da);

        // b deletes elem1 at lamport=2
        let del = b.delete_element("elem1");

        // a applies b's delete — tombstone (lamport=2) wins over entry (lamport=1)
        a.merge_remote(&del);

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert!(state.get("elem1").is_none(), "deleted element must not appear in state");
        assert_eq!(a.element_count(), 0, "element_count must be 0");
    }

    #[test]
    fn t_col_rs_007_newer_write_resurrects_tombstoned_element() {
        let mut a = DocumentCrdt::new("a");

        // Create, delete, then re-create with a higher lamport
        a.apply_local("e1", r#"{"v":1}"#);
        a.delete_element("e1");
        a.apply_local("e1", r#"{"v":2}"#); // lamport=3 > tombstone lamport=2

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert!(state.get("e1").is_some(), "re-created element should be live");
        assert_eq!(state["e1"]["v"], 2, "resurrected value should be v=2");
    }

    #[test]
    fn t_col_rs_008_concurrent_delete_and_update_peer_id_tiebreak() {
        // Scenario: update and delete are issued at the *same* Lamport timestamp
        // (neither peer has observed the other yet).  Peer-ID is used as a
        // deterministic tiebreak — lexicographically larger peer_id wins.
        let mut a = DocumentCrdt::new("z_peer"); // lexicographically larger
        let mut b = DocumentCrdt::new("a_peer"); // lexicographically smaller

        // Neither peer has observed the other → both produce lamport=1.
        let upd = a.apply_local("e1", r#"{"v":99}"#); // lamport=1, peer=z_peer
        let del = b.delete_element("e1");              // lamport=1, peer=a_peer

        a.merge_remote(&del);
        b.merge_remote(&upd);

        // z_peer > a_peer → z_peer's update wins over a_peer's tombstone.
        let sa: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        let sb: serde_json::Value = serde_json::from_str(&b.state_json()).unwrap();
        assert!(sa.get("e1").is_some(), "larger peer_id write should beat smaller peer_id tombstone");
        assert_eq!(sa["e1"]["v"], 99);
        assert_eq!(sa, sb, "both peers must converge on the same state");
    }

    // ── Property-level granularity ────────────────────────────────────────────

    #[test]
    fn t_col_rs_009_concurrent_property_edits_both_survive() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        // Bootstrap element on both peers
        let init = a.apply_local("wall1", r#"{"x":0,"y":0,"w":100,"h":10}"#);
        b.merge_remote(&init);

        // Concurrent property edits to different fields
        let da = a.apply_property("wall1", "x", "50.0");
        let db = b.apply_property("wall1", "w", "200.0");

        a.merge_remote(&db);
        b.merge_remote(&da);

        let sa: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        let sb: serde_json::Value = serde_json::from_str(&b.state_json()).unwrap();

        assert_eq!(sa["wall1"]["x"], 50.0, "peer_a: x should be 50");
        assert_eq!(sa["wall1"]["w"], 200.0, "peer_a: w should be 200");
        assert_eq!(sb["wall1"]["x"], 50.0, "peer_b: x should be 50");
        assert_eq!(sb["wall1"]["w"], 200.0, "peer_b: w should be 200");
        assert_eq!(sa, sb, "peers must converge");
    }

    #[test]
    fn t_col_rs_010_whole_element_write_beats_older_property_patches() {
        let mut a = DocumentCrdt::new("a");

        // Two property patches at lamport=1 and lamport=2
        a.apply_property("e1", "x", "10.0");
        a.apply_property("e1", "y", "20.0");
        // Whole-element replace at lamport=3 — should override both patches
        a.apply_local("e1", r#"{"x":99,"y":99,"z":0}"#);

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert_eq!(state["e1"]["x"], 99.0, "whole-element write should override old property patch");
        assert_eq!(state["e1"]["y"], 99.0, "whole-element write should override old property patch");
    }

    #[test]
    fn t_col_rs_011_property_patch_beats_older_whole_element_write() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        // a writes whole element at lamport=1
        let init = a.apply_local("e1", r#"{"x":0,"y":0}"#);
        b.merge_remote(&init);

        // b patches property x at lamport=2 (newer)
        let patch = b.apply_property("e1", "x", "55.0");
        a.merge_remote(&patch);

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert_eq!(state["e1"]["x"], 55.0, "newer property patch should override older whole-element x");
        assert_eq!(state["e1"]["y"], 0.0, "unpatched property y should keep whole-element value");
    }

    // ── Batch sync (initial peer catch-up) ────────────────────────────────────

    #[test]
    fn t_col_rs_012_full_snapshot_brings_new_peer_up_to_date() {
        let mut a = DocumentCrdt::new("a");
        a.apply_local("e1", r#"{"type":"wall"}"#);
        a.apply_local("e2", r#"{"type":"door"}"#);
        a.apply_property("e1", "height", "3.0");
        a.delete_element("e2");

        let snapshot = a.full_state_delta_json();

        let mut b = DocumentCrdt::new("b");
        b.apply_batch(&snapshot);

        // e1 is live with height=3.0 from the property patch
        assert_eq!(b.element_count(), 1, "only e1 should be live after sync");
        let state: serde_json::Value = serde_json::from_str(&b.state_json()).unwrap();
        assert!(state.get("e1").is_some());
        assert!(state.get("e2").is_none(), "e2 should be deleted");
        assert_eq!(state["e1"]["height"], 3.0);
    }

    #[test]
    fn t_col_rs_013_batch_apply_is_idempotent() {
        let mut a = DocumentCrdt::new("a");
        a.apply_local("e1", r#"{"x":1}"#);
        a.apply_local("e2", r#"{"x":2}"#);

        let snapshot = a.full_state_delta_json();
        let mut b = DocumentCrdt::new("b");
        b.apply_batch(&snapshot);
        let s1 = b.state_json();
        b.apply_batch(&snapshot);
        let s2 = b.state_json();

        assert_eq!(s1, s2, "applying same snapshot twice must be idempotent");
    }

    #[test]
    fn t_col_rs_014_two_snapshots_merge_correctly() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        a.apply_local("e1", r#"{"type":"wall"}"#);
        b.apply_local("e2", r#"{"type":"door"}"#);

        // Cross-merge via snapshots
        let snap_a = a.full_state_delta_json();
        let snap_b = b.full_state_delta_json();

        a.apply_batch(&snap_b);
        b.apply_batch(&snap_a);

        assert_eq!(a.element_count(), 2);
        assert_eq!(b.element_count(), 2);
        assert_eq!(a.state_json(), b.state_json(), "must converge after snapshot exchange");
    }

    // ── Presence (ephemeral) ──────────────────────────────────────────────────

    #[test]
    fn t_col_rs_015_presence_update_visible_to_remote_peer() {
        let mut a = DocumentCrdt::new("alice");
        let mut b = DocumentCrdt::new("bob");

        let payload = a.update_presence(10.0, 20.0, "");
        b.merge_presence(&payload);

        let cursors: serde_json::Value = serde_json::from_str(&b.cursors_json()).unwrap();
        assert_eq!(cursors["alice"]["x"], 10.0);
        assert_eq!(cursors["alice"]["y"], 20.0);
        assert!(cursors["alice"]["element_id"].is_null(), "no element hovered");
    }

    #[test]
    fn t_col_rs_016_presence_older_update_ignored() {
        let mut a = DocumentCrdt::new("alice");
        let mut b = DocumentCrdt::new("bob");

        let p1 = a.update_presence(10.0, 20.0, "");
        let p2 = a.update_presence(30.0, 40.0, "wall1");

        // Apply in reverse order — older must not overwrite newer
        b.merge_presence(&p2);
        b.merge_presence(&p1);

        let cursors: serde_json::Value = serde_json::from_str(&b.cursors_json()).unwrap();
        assert_eq!(cursors["alice"]["x"], 30.0, "newer presence should win");
        assert_eq!(cursors["alice"]["element_id"], "wall1");
    }

    #[test]
    fn t_col_rs_017_presence_removed_on_disconnect() {
        let mut a = DocumentCrdt::new("alice");
        let mut b = DocumentCrdt::new("bob");

        let payload = a.update_presence(5.0, 5.0, "");
        b.merge_presence(&payload);

        b.remove_peer_presence("alice");

        let cursors: serde_json::Value = serde_json::from_str(&b.cursors_json()).unwrap();
        assert!(cursors.get("alice").is_none(), "disconnected peer must be removed from cursors");
    }

    #[test]
    fn t_col_rs_018_presence_with_element_id() {
        let mut a = DocumentCrdt::new("alice");
        let mut b = DocumentCrdt::new("bob");

        let payload = a.update_presence(100.0, 200.0, "wall-42");
        b.merge_presence(&payload);

        let cursors: serde_json::Value = serde_json::from_str(&b.cursors_json()).unwrap();
        assert_eq!(cursors["alice"]["element_id"], "wall-42");
    }
}
